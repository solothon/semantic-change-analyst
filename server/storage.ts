import { 
  users, watchers, snapshots, changes, creditTransactions, usageAnalytics, webhookDeliveries, bulkOperations, changeStream, intelligenceReports, competitorTracking,
  type User, type InsertUser, type Watcher, type InsertWatcher, 
  type Snapshot, type InsertSnapshot, type Change, type InsertChange,
  type CreditTransaction, type InsertCreditTransaction,
  type UsageAnalytics, type WebhookDelivery, type BulkOperation, type ChangeStream, type IntelligenceReport, type CompetitorTracking
} from "@shared/schema";
import { eq, desc, and, gte, sum, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Use Neon serverless database connection

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: string, freeCredits: number, paidCredits: number): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Watchers
  getWatcher(id: string): Promise<Watcher | undefined>;
  getWatchersByUserId(userId: string): Promise<Watcher[]>;
  createWatcher(watcher: InsertWatcher): Promise<Watcher>;
  updateWatcher(id: string, updates: Partial<Watcher>): Promise<Watcher>;
  deleteWatcher(id: string): Promise<void>;
  
  // Snapshots
  getSnapshot(id: string): Promise<Snapshot | undefined>;
  getLatestSnapshot(watcherId: string): Promise<Snapshot | undefined>;
  getSnapshotsByWatcher(watcherId: string, limit?: number): Promise<Snapshot[]>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  
  // Changes
  getChange(id: string): Promise<Change | undefined>;
  getChangesByWatcher(watcherId: string, limit?: number): Promise<Change[]>;
  getChangesByUser(userId: string, limit?: number): Promise<Change[]>;
  getRecentChanges(limit?: number): Promise<(Change & { watcherName: string })[]>;
  createChange(change: InsertChange): Promise<Change>;
  updateChange(id: string, updates: Partial<Change>): Promise<Change>;
  
  // Credit Transactions
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactionsByUser(userId: string, limit?: number): Promise<CreditTransaction[]>;
  
  // Webhook Deliveries
  createWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery>;
  getFailedWebhookDeliveries(): Promise<WebhookDelivery[]>;
  updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery>;
  
  // Metrics
  getMetrics(userId?: string): Promise<{
    activeWatchers: number;
    changesDetected: number;
    llmCallsSaved: number;
    avgResponseTime: number;
  }>;
  
  // Bulk Operations
  createBulkOperation(operation: Omit<BulkOperation, 'id' | 'createdAt'>): Promise<BulkOperation>;
  getBulkOperation(id: string): Promise<BulkOperation | undefined>;
  getBulkOperationsByUser(userId: string, limit?: number): Promise<BulkOperation[]>;
  updateBulkOperation(id: string, updates: Partial<BulkOperation>): Promise<BulkOperation>;
  
  // Intelligence Reports
  createIntelligenceReport(report: Omit<IntelligenceReport, 'id' | 'createdAt'>): Promise<IntelligenceReport>;
  getIntelligenceReport(id: string): Promise<IntelligenceReport | undefined>;
  getIntelligenceReportsByUser(userId: string, limit?: number): Promise<IntelligenceReport[]>;
  
  // Competitor Tracking
  createCompetitor(competitor: Omit<CompetitorTracking, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompetitorTracking>;
  getCompetitor(id: string): Promise<CompetitorTracking | undefined>;
  getCompetitorsByUser(userId: string): Promise<CompetitorTracking[]>;
  updateCompetitor(id: string, updates: Partial<CompetitorTracking>): Promise<CompetitorTracking>;
  deleteCompetitor(id: string): Promise<void>;
  
  // Snapshots Extended
  deleteSnapshot(id: string): Promise<void>;
  
  // Webhook Deliveries Extended
  getWebhookDeliveriesByUser(userId: string, limit?: number): Promise<WebhookDelivery[]>;
  
  // User Preferences
  updateUserPreferences(userId: string, preferences: {
    timezone?: string;
    defaultAlertThreshold?: number;
    preferredNotificationTime?: string;
  }): Promise<User>;
  
  // Storage Management
  getUserStorageInfo(userId: string): Promise<{
    totalMB: number;
    snapshotsMB: number;
    changesMB: number;
    snapshotCount: number;
    changeCount: number;
    oldestSnapshot: Date | null;
  }>;
  
  cleanupUserData(userId: string, options: {
    retentionDays: number;
    keepImportantChanges: boolean;
  }): Promise<{
    snapshotsDeleted: number;
    spaceSavedMB: number;
  }>;
  
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  private db: NodePgDatabase<any>;

  constructor(dbInstance: NodePgDatabase<any>) {
    this.db = dbInstance;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.apiKey, apiKey));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserCredits(userId: string, freeCredits: number, paidCredits: number): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ freeCredits, paidCredits, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getWatcher(id: string): Promise<Watcher | undefined> {
    const [watcher] = await this.db.select().from(watchers).where(eq(watchers.id, id));
    return watcher || undefined;
  }

  async getWatchersByUserId(userId: string): Promise<Watcher[]> {
    return await this.db.select().from(watchers).where(eq(watchers.userId, userId));
  }

  async createWatcher(watcher: InsertWatcher): Promise<Watcher> {
    const [newWatcher] = await this.db.insert(watchers).values(watcher).returning();
    return newWatcher;
  }

  async updateWatcher(id: string, updates: Partial<Watcher>): Promise<Watcher> {
    const [watcher] = await this.db
      .update(watchers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(watchers.id, id))
      .returning();
    return watcher;
  }

  async deleteWatcher(id: string): Promise<void> {
    await this.db.delete(watchers).where(eq(watchers.id, id));
  }

  async getSnapshot(id: string): Promise<Snapshot | undefined> {
    const [snapshot] = await this.db.select().from(snapshots).where(eq(snapshots.id, id));
    return snapshot || undefined;
  }

  async getLatestSnapshot(watcherId: string): Promise<Snapshot | undefined> {
    const [snapshot] = await this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.watcherId, watcherId))
      .orderBy(desc(snapshots.createdAt))
      .limit(1);
    return snapshot || undefined;
  }

  async getSnapshotsByWatcher(watcherId: string, limit = 10): Promise<Snapshot[]> {
    return await this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.watcherId, watcherId))
      .orderBy(desc(snapshots.createdAt))
      .limit(limit);
  }

  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const [newSnapshot] = await this.db.insert(snapshots).values(snapshot).returning();
    return newSnapshot;
  }

  async getChange(id: string): Promise<Change | undefined> {
    const [change] = await this.db.select().from(changes).where(eq(changes.id, id));
    return change || undefined;
  }

  async getChangesByWatcher(watcherId: string, limit = 10): Promise<Change[]> {
    return await this.db
      .select()
      .from(changes)
      .where(eq(changes.watcherId, watcherId))
      .orderBy(desc(changes.createdAt))
      .limit(limit);
  }

  async getChangesByUser(userId: string, limit = 10): Promise<Change[]> {
    const result = await this.db
      .select({
        id: changes.id,
        watcherId: changes.watcherId,
        beforeSnapshotId: changes.beforeSnapshotId,
        afterSnapshotId: changes.afterSnapshotId,
        type: changes.type,
        impact: changes.impact,
        summary: changes.summary,
        whatChanged: changes.whatChanged,
        recommendedAction: changes.recommendedAction,
        confidence: changes.confidence,
        explainability: changes.explainability,
        triageSimilarity: changes.triageSimilarity,
        sentimentScore: changes.sentimentScore,
        urgencyLevel: changes.urgencyLevel,
        businessImpact: changes.businessImpact,
        competitorIntelligence: changes.competitorIntelligence,
        trendPrediction: changes.trendPrediction,
        visualSimilarity: changes.visualSimilarity,
        visualDiffUrl: changes.visualDiffUrl,
        elementsChanged: changes.elementsChanged,
        layoutShift: changes.layoutShift,
        locationDetected: changes.locationDetected,
        geoVariation: changes.geoVariation,
        complianceRisk: changes.complianceRisk,
        legalImplications: changes.legalImplications,
        policyChanges: changes.policyChanges,
        keywordsTriggered: changes.keywordsTriggered,
        webhookDelivered: changes.webhookDelivered,
        webhookDeliveredAt: changes.webhookDeliveredAt,
        createdAt: changes.createdAt,
      })
      .from(changes)
      .innerJoin(watchers, eq(changes.watcherId, watchers.id))
      .where(eq(watchers.userId, userId))
      .orderBy(desc(changes.createdAt))
      .limit(limit);
    
    return result as Change[];
  }

  async getRecentChanges(limit = 10): Promise<(Change & { watcherName: string })[]> {
    const result = await this.db
      .select({
        id: changes.id,
        watcherId: changes.watcherId,
        beforeSnapshotId: changes.beforeSnapshotId,
        afterSnapshotId: changes.afterSnapshotId,
        type: changes.type,
        impact: changes.impact,
        summary: changes.summary,
        whatChanged: changes.whatChanged,
        recommendedAction: changes.recommendedAction,
        confidence: changes.confidence,
        explainability: changes.explainability,
        triageSimilarity: changes.triageSimilarity,
        sentimentScore: changes.sentimentScore,
        urgencyLevel: changes.urgencyLevel,
        businessImpact: changes.businessImpact,
        competitorIntelligence: changes.competitorIntelligence,
        trendPrediction: changes.trendPrediction,
        visualSimilarity: changes.visualSimilarity,
        visualDiffUrl: changes.visualDiffUrl,
        elementsChanged: changes.elementsChanged,
        layoutShift: changes.layoutShift,
        locationDetected: changes.locationDetected,
        geoVariation: changes.geoVariation,
        complianceRisk: changes.complianceRisk,
        legalImplications: changes.legalImplications,
        policyChanges: changes.policyChanges,
        keywordsTriggered: changes.keywordsTriggered,
        webhookDelivered: changes.webhookDelivered,
        webhookDeliveredAt: changes.webhookDeliveredAt,
        createdAt: changes.createdAt,
        watcherName: watchers.name,
      })
      .from(changes)
      .innerJoin(watchers, eq(changes.watcherId, watchers.id))
      .orderBy(desc(changes.createdAt))
      .limit(limit);
    
    return result as any;
  }

  async createChange(change: InsertChange): Promise<Change> {
    const [newChange] = await this.db.insert(changes).values(change).returning();
    return newChange;
  }

  async updateChange(id: string, updates: Partial<Change>): Promise<Change> {
    const [change] = await this.db
      .update(changes)
      .set(updates)
      .where(eq(changes.id, id))
      .returning();
    return change;
  }

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [newTransaction] = await this.db.insert(creditTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getCreditTransactionsByUser(userId: string, limit = 50): Promise<CreditTransaction[]> {
    return await this.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  async createWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery> {
    const [newDelivery] = await this.db.insert(webhookDeliveries).values(delivery).returning();
    return newDelivery;
  }

  async getFailedWebhookDeliveries(): Promise<WebhookDelivery[]> {
    return await this.db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          isNull(webhookDeliveries.deliveredAt),
          gte(webhookDeliveries.nextRetryAt, new Date())
        )
      )
      .orderBy(webhookDeliveries.nextRetryAt);
  }

  async updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const [delivery] = await this.db
      .update(webhookDeliveries)
      .set(updates)
      .where(eq(webhookDeliveries.id, id))
      .returning();
    return delivery;
  }

  async getMetrics(userId?: string): Promise<{
    activeWatchers: number;
    changesDetected: number;
    llmCallsSaved: number;
    avgResponseTime: number;
  }> {
    // Active watchers
    const activeWatchersQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(watchers)
      .where(eq(watchers.isActive, true));
    
    const activeWatchersResult = userId 
      ? await this.db
          .select({ count: sql<number>`count(*)` })
          .from(watchers)
          .where(and(eq(watchers.isActive, true), eq(watchers.userId, userId)))
      : await activeWatchersQuery;
    
    const [{ count: activeWatchers }] = activeWatchersResult;

    // Changes detected (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const changesQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(changes)
      .where(gte(changes.createdAt, thirtyDaysAgo));
    
    const changesResult = userId
      ? await this.db
          .select({ count: sql<number>`count(*)` })
          .from(changes)
          .innerJoin(watchers, eq(changes.watcherId, watchers.id))
          .where(and(gte(changes.createdAt, thirtyDaysAgo), eq(watchers.userId, userId)))
      : await changesQuery;
    
    const [{ count: changesDetected }] = changesResult;

    // LLM calls saved (percentage of checks that were triaged out)
    // This is a simplified calculation - in reality you'd track total checks vs LLM calls
    const llmCallsSaved = 73; // Placeholder - implement based on actual triage metrics

    // Average response time (placeholder)
    const avgResponseTime = 2.4; // Placeholder - implement based on actual metrics

    return {
      activeWatchers: Number(activeWatchers),
      changesDetected: Number(changesDetected),
      llmCallsSaved,
      avgResponseTime,
    };
  }

  // Bulk Operations
  async createBulkOperation(operation: Omit<BulkOperation, 'id' | 'createdAt'>): Promise<BulkOperation> {
    const [newOperation] = await this.db.insert(bulkOperations).values(operation).returning();
    return newOperation;
  }

  async getBulkOperation(id: string): Promise<BulkOperation | undefined> {
    const [operation] = await this.db.select().from(bulkOperations).where(eq(bulkOperations.id, id));
    return operation || undefined;
  }

  async getBulkOperationsByUser(userId: string, limit = 50): Promise<BulkOperation[]> {
    return await this.db
      .select()
      .from(bulkOperations)
      .where(eq(bulkOperations.userId, userId))
      .orderBy(desc(bulkOperations.createdAt))
      .limit(limit);
  }

  async updateBulkOperation(id: string, updates: Partial<BulkOperation>): Promise<BulkOperation> {
    const [operation] = await this.db
      .update(bulkOperations)
      .set(updates)
      .where(eq(bulkOperations.id, id))
      .returning();
    return operation;
  }

  // Intelligence Reports
  async createIntelligenceReport(report: Omit<IntelligenceReport, 'id' | 'createdAt'>): Promise<IntelligenceReport> {
    const [newReport] = await this.db.insert(intelligenceReports).values(report).returning();
    return newReport;
  }

  async getIntelligenceReport(id: string): Promise<IntelligenceReport | undefined> {
    const [report] = await this.db.select().from(intelligenceReports).where(eq(intelligenceReports.id, id));
    return report || undefined;
  }

  async getIntelligenceReportsByUser(userId: string, limit = 50): Promise<IntelligenceReport[]> {
    return await this.db
      .select()
      .from(intelligenceReports)
      .where(eq(intelligenceReports.userId, userId))
      .orderBy(desc(intelligenceReports.createdAt))
      .limit(limit);
  }

  // Competitor Tracking
  async createCompetitor(competitor: Omit<CompetitorTracking, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompetitorTracking> {
    const [newCompetitor] = await this.db.insert(competitorTracking).values(competitor).returning();
    return newCompetitor;
  }

  async getCompetitor(id: string): Promise<CompetitorTracking | undefined> {
    const [competitor] = await this.db.select().from(competitorTracking).where(eq(competitorTracking.id, id));
    return competitor || undefined;
  }

  async getCompetitorsByUser(userId: string): Promise<CompetitorTracking[]> {
    return await this.db
      .select()
      .from(competitorTracking)
      .where(eq(competitorTracking.userId, userId))
      .orderBy(desc(competitorTracking.createdAt));
  }

  async updateCompetitor(id: string, updates: Partial<CompetitorTracking>): Promise<CompetitorTracking> {
    const [competitor] = await this.db
      .update(competitorTracking)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(competitorTracking.id, id))
      .returning();
    return competitor;
  }

  async deleteCompetitor(id: string): Promise<void> {
    await this.db.delete(competitorTracking).where(eq(competitorTracking.id, id));
  }

  // Snapshots Extended
  async deleteSnapshot(id: string): Promise<void> {
    await this.db.delete(snapshots).where(eq(snapshots.id, id));
  }

  // Webhook Deliveries Extended
  async getWebhookDeliveriesByUser(userId: string, limit = 50): Promise<WebhookDelivery[]> {
    const result = await this.db
      .select({
        id: webhookDeliveries.id,
        changeId: webhookDeliveries.changeId,
        webhookUrl: webhookDeliveries.webhookUrl,
        payload: webhookDeliveries.payload,
        signature: webhookDeliveries.signature,
        httpStatus: webhookDeliveries.httpStatus,
        responseBody: webhookDeliveries.responseBody,
        attempt: webhookDeliveries.attempt,
        nextRetryAt: webhookDeliveries.nextRetryAt,
        deliveredAt: webhookDeliveries.deliveredAt,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .innerJoin(changes, eq(webhookDeliveries.changeId, changes.id))
      .innerJoin(watchers, eq(changes.watcherId, watchers.id))
      .where(eq(watchers.userId, userId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
    
    return result as WebhookDelivery[];
  }

  // User Preferences
  async updateUserPreferences(userId: string, preferences: {
    timezone?: string;
    defaultAlertThreshold?: number;
    preferredNotificationTime?: string;
  }): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Storage Management
  async getUserStorageInfo(userId: string): Promise<{
    totalMB: number;
    snapshotsMB: number;
    changesMB: number;
    snapshotCount: number;
    changeCount: number;
    oldestSnapshot: Date | null;
  }> {
    const userWatchers = await this.db
      .select({ id: watchers.id })
      .from(watchers)
      .where(eq(watchers.userId, userId));
    
    const watcherIds = userWatchers.map(w => w.id);
    
    if (watcherIds.length === 0) {
      return {
        totalMB: 0,
        snapshotsMB: 0,
        changesMB: 0,
        snapshotCount: 0,
        changeCount: 0,
        oldestSnapshot: null,
      };
    }
    
    const snapshotStats = await this.db
      .select({
        count: sql<number>`COUNT(*)`.as('count'),
        totalSize: sql<number>`SUM(LENGTH(content))`.as('total_size'),
        oldest: sql<Date>`MIN(created_at)`.as('oldest'),
      })
      .from(snapshots)
      .where(sql`${snapshots.watcherId} IN (${sql.join(watcherIds.map(id => sql`${id}`), sql`, `)})`);
    
    const changeStats = await this.db
      .select({
        count: sql<number>`COUNT(*)`.as('count'),
        totalSize: sql<number>`SUM(LENGTH(summary) + LENGTH(what_changed) + LENGTH(recommended_action))`.as('total_size'),
      })
      .from(changes)
      .where(sql`${changes.watcherId} IN (${sql.join(watcherIds.map(id => sql`${id}`), sql`, `)})`);
    
    const snapshotSizeMB = (snapshotStats[0]?.totalSize || 0) / (1024 * 1024);
    const changeSizeMB = (changeStats[0]?.totalSize || 0) / (1024 * 1024);
    
    return {
      totalMB: snapshotSizeMB + changeSizeMB,
      snapshotsMB: snapshotSizeMB,
      changesMB: changeSizeMB,
      snapshotCount: Number(snapshotStats[0]?.count || 0),
      changeCount: Number(changeStats[0]?.count || 0),
      oldestSnapshot: snapshotStats[0]?.oldest || null,
    };
  }
  
  async cleanupUserData(userId: string, options: {
    retentionDays: number;
    keepImportantChanges: boolean;
  }): Promise<{
    snapshotsDeleted: number;
    spaceSavedMB: number;
  }> {
    const userWatchers = await this.db
      .select({ id: watchers.id })
      .from(watchers)
      .where(eq(watchers.userId, userId));
    
    const watcherIds = userWatchers.map(w => w.id);
    
    if (watcherIds.length === 0) {
      return { snapshotsDeleted: 0, spaceSavedMB: 0 };
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.retentionDays);
    
    const latestSnapshots = await this.db
      .select({ id: snapshots.id, watcherId: snapshots.watcherId })
      .from(snapshots)
      .where(sql`(watcher_id, created_at) IN (
        SELECT watcher_id, MAX(created_at) 
        FROM ${snapshots} 
        WHERE watcher_id IN (${sql.join(watcherIds.map(id => sql`${id}`), sql`, `)})
        GROUP BY watcher_id
      )`);
    
    const latestSnapshotIds = latestSnapshots.map(s => s.id);
    
    let deletedSnapshots;
    if (latestSnapshotIds.length > 0) {
      deletedSnapshots = await this.db
        .delete(snapshots)
        .where(
          and(
            sql`${snapshots.watcherId} IN (${sql.join(watcherIds.map(id => sql`${id}`), sql`, `)})`,
            sql`${snapshots.createdAt} < ${cutoffDate}`,
            sql`${snapshots.id} NOT IN (${sql.join(latestSnapshotIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .returning({ id: snapshots.id, size: sql<number>`length(content)` });
    } else {
      deletedSnapshots = await this.db
        .delete(snapshots)
        .where(
          and(
            sql`${snapshots.watcherId} IN (${sql.join(watcherIds.map(id => sql`${id}`), sql`, `)})`,
            sql`${snapshots.createdAt} < ${cutoffDate}`
          )
        )
        .returning({ id: snapshots.id, size: sql<number>`length(content)` });
    }
    
    const spaceSavedMB = deletedSnapshots.reduce((acc, s) => acc + (s.size || 0), 0) / (1024 * 1024);
    
    return {
      snapshotsDeleted: deletedSnapshots.length,
      spaceSavedMB,
    };
  }
  
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}
