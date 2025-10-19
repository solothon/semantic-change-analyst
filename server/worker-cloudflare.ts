import app from './routes-cloudflare';
import type { Env } from './routes-cloudflare';
import { getStorage } from './db-cloudflare';
import { cloudflareScraperService } from './services/scraper-cloudflare';
import type { Watcher } from '@shared/schema';

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function shouldCheckWatcher(watcher: Watcher): boolean {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env);
  },

  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
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
              if (!shouldCheckWatcher(watcher)) {
                continue;
              }

              console.log(`🔍 Checking: ${watcher.name} (${watcher.targetUrl})`);

              const scraped = await cloudflareScraperService.scrapeWebpage(
                watcher.targetUrl,
                watcher.cssSelector || undefined
              );

              const contentHash = scraped.contentHash;

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

              const latestSnapshots = await storage.getSnapshotsByWatcher(watcher.id, 2);
              const previousSnapshot = latestSnapshots.find(s => s.id !== newSnapshot.id);

              if (previousSnapshot) {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Cron job failed:`, errorMessage);
      throw error;
    }
  }
};
