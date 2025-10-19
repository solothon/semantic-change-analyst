import { getStorage } from './db-cloudflare';
import { scraperService } from './services/scraper';
import { createHash } from 'crypto';
import type { Env } from './routes-cloudflare';
import type { Watcher } from '@shared/schema';

export default {
  async scheduled(event: any, env: Env, ctx: any) {
    console.log(`🔍 Running scheduled watcher checks at ${new Date().toISOString()}`);

    try {
      const storage = getStorage(env);
      
      const allUsers = await storage.getAllUsers();
      console.log(`📊 Found ${allUsers.length} users to check`);

      let totalChecks = 0;
      let totalChanges = 0;

      for (const user of allUsers) {
        try {
          const watchers = await storage.getWatchersByUserId(user.id);
          const activeWatchers = watchers.filter(w => 
            w.isActive && 
            !w.isPaused && 
            (!w.pausedUntil || new Date(w.pausedUntil) <= new Date())
          );

          console.log(`👤 User ${user.username}: ${activeWatchers.length} active watchers`);

          for (const watcher of activeWatchers) {
            try {
              const shouldCheck = await shouldCheckWatcher(watcher, event.cron);
              
              if (!shouldCheck) {
                continue;
              }

              console.log(`🔍 Checking: ${watcher.name} (${watcher.targetUrl})`);

              const scraped = await scraperService.scrapeWebpage(
                watcher.targetUrl,
                watcher.cssSelector || undefined
              );

              const contentHash = createHash('sha256')
                .update(scraped.content)
                .digest('hex');

              const newSnapshot = await storage.createSnapshot({
                watcherId: watcher.id,
                content: scraped.content,
                contentHash,
                statusCode: scraped.metadata.statusCode,
                responseTime: scraped.metadata.responseTime,
                location: 'cloudflare-edge',
                metadata: scraped.metadata,
                archived: watcher.archiveEnabled ?? true,
              });

              const previousSnapshot = await storage.getLatestSnapshot(watcher.id);

              if (previousSnapshot && previousSnapshot.id !== newSnapshot.id) {
                if (previousSnapshot.contentHash !== newSnapshot.contentHash) {
                  console.log(`📊 Change detected for ${watcher.name}`);
                  
                  await storage.createChange({
                    watcherId: watcher.id,
                    beforeSnapshotId: previousSnapshot.id,
                    afterSnapshotId: newSnapshot.id,
                    type: 'content',
                    impact: 5,
                    summary: 'Content changed',
                    whatChanged: 'Page content has been updated',
                    recommendedAction: 'Review the changes',
                    confidence: 0.95,
                    explainability: 'Hash comparison detected content difference',
                  });

                  totalChanges++;
                } else {
                  console.log(`✅ No change for ${watcher.name}`);
                }
              }

              await storage.updateWatcher(watcher.id, {
                lastCheckAt: new Date(),
              });

              totalChecks++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`❌ Failed to check watcher ${watcher.id}:`, errorMessage);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to process user ${user.id}:`, errorMessage);
        }
      }

      console.log(`✅ Cron completed: ${totalChecks} checks, ${totalChanges} changes detected`);

      // AUTOMATIC CLEANUP - Delete temporary/log data (NOT user snapshots)
      console.log('\n🧹 Running automatic cleanup of temporary data...');
      
      try {
        const db = (storage as any).db;
        const { webhookDeliveries, bulkOperations, usageAnalytics, changeStream } = await import('@shared/schema');
        const { sql } = await import('drizzle-orm');
        
        // 1. Delete webhook delivery logs older than 30 days
        const webhookCutoff = new Date();
        webhookCutoff.setDate(webhookCutoff.getDate() - 30);
        const deletedWebhooks = await db.delete(webhookDeliveries)
          .where(sql`${webhookDeliveries.createdAt} < ${webhookCutoff}`)
          .returning({ id: webhookDeliveries.id });
        
        // 2. Delete completed bulk operations older than 30 days
        const bulkOpCutoff = new Date();
        bulkOpCutoff.setDate(bulkOpCutoff.getDate() - 30);
        const deletedBulkOps = await db.delete(bulkOperations)
          .where(sql`${bulkOperations.status} = 'completed' AND ${bulkOperations.completedAt} < ${bulkOpCutoff}`)
          .returning({ id: bulkOperations.id });
        
        // 3. Delete delivered change stream events older than 7 days
        const streamCutoff = new Date();
        streamCutoff.setDate(streamCutoff.getDate() - 7);
        const deletedStreams = await db.delete(changeStream)
          .where(sql`${changeStream.delivered} = true AND ${changeStream.deliveredAt} < ${streamCutoff}`)
          .returning({ id: changeStream.id });
        
        // 4. Delete old usage analytics older than 90 days (aggregated data, not financial)
        const analyticsCutoff = new Date();
        analyticsCutoff.setDate(analyticsCutoff.getDate() - 90);
        const deletedAnalytics = await db.delete(usageAnalytics)
          .where(sql`${usageAnalytics.createdAt} < ${analyticsCutoff}`)
          .returning({ id: usageAnalytics.id });
        
        console.log(`✅ Automatic cleanup completed:`);
        console.log(`   - ${deletedWebhooks.length} webhook logs deleted (>30 days)`);
        console.log(`   - ${deletedBulkOps.length} bulk operation records deleted (>30 days)`);
        console.log(`   - ${deletedStreams.length} stream events deleted (>7 days)`);
        console.log(`   - ${deletedAnalytics.length} analytics records deleted (>90 days)`);
      } catch (cleanupError) {
        const errorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        console.error(`⚠️ Automatic cleanup warning:`, errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Cron job failed:`, errorMessage);
      throw error;
    }
  }
};

function shouldCheckWatcher(watcher: Watcher, cronExpression: string): boolean {
  if (!watcher.lastCheckAt) {
    return true;
  }

  const now = new Date();
  const lastCheck = new Date(watcher.lastCheckAt);
  const hoursSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);

  switch (watcher.checkFrequency) {
    case 'hourly':
      return hoursSinceLastCheck >= 1;
    case 'daily':
      return hoursSinceLastCheck >= 24;
    case 'weekly':
      return hoursSinceLastCheck >= 168;
    default:
      return hoursSinceLastCheck >= 24;
  }
}
