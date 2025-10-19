import { 
  type User, type InsertUser, type Watcher, type InsertWatcher, 
  type Snapshot, type InsertSnapshot, type Change, type InsertChange,
  type CreditTransaction, type InsertCreditTransaction,
  type WebhookDelivery, type BulkOperation, type IntelligenceReport, type CompetitorTracking
} from "@shared/schema";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private watchers: Map<string, Watcher> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();
  private changes: Map<string, Change> = new Map();
  private creditTransactions: Map<string, CreditTransaction> = new Map();
  private webhookDeliveries: Map<string, WebhookDelivery> = new Map();
  private bulkOperations: Map<string, BulkOperation> = new Map();
  private intelligenceReports: Map<string, IntelligenceReport> = new Map();
  private competitors: Map<string, CompetitorTracking> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.apiKey === apiKey);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      ...insertUser,
      apiKey: randomUUID(),
      freeCredits: 100,
      paidCredits: 0,
      timezone: insertUser.timezone || 'UTC',
      defaultAlertThreshold: insertUser.defaultAlertThreshold || 5,
      preferredNotificationTime: insertUser.preferredNotificationTime || '09:00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserCredits(userId: string, freeCredits: number, paidCredits: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.freeCredits = freeCredits;
    user.paidCredits = paidCredits;
    user.updatedAt = new Date();
    return user;
  }

  // Watchers
  async getWatcher(id: string): Promise<Watcher | undefined> {
    return this.watchers.get(id);
  }

  async getWatchersByUserId(userId: string): Promise<Watcher[]> {
    return Array.from(this.watchers.values()).filter(w => w.userId === userId);
  }

  async createWatcher(insertWatcher: InsertWatcher): Promise<Watcher> {
    const watcher: Watcher = {
      id: randomUUID(),
      ...insertWatcher,
      webhookSecret: randomUUID(),
      monitoringLocations: insertWatcher.monitoringLocations || ['us-east'],
      checkFrequency: insertWatcher.checkFrequency || 'daily',
      timezone: insertWatcher.timezone || 'UTC',
      triageThreshold: insertWatcher.triageThreshold || 0.85,
      visualMonitoringEnabled: insertWatcher.visualMonitoringEnabled || false,
      screenshotComparison: insertWatcher.screenshotComparison || false,
      visualThreshold: insertWatcher.visualThreshold || 0.95,
      competitorMonitoring: insertWatcher.competitorMonitoring || false,
      sentimentAnalysis: insertWatcher.sentimentAnalysis || false,
      archiveEnabled: insertWatcher.archiveEnabled ?? true,
      complianceMonitoring: insertWatcher.complianceMonitoring || false,
      legalChangeDetection: insertWatcher.legalChangeDetection || false,
      minimumImpactForAlert: insertWatcher.minimumImpactForAlert || 3,
      alertCooldownMinutes: insertWatcher.alertCooldownMinutes || 60,
      isActive: insertWatcher.isActive ?? true,
      isPaused: insertWatcher.isPaused || false,
      pausedUntil: insertWatcher.pausedUntil || null,
      cssSelector: insertWatcher.cssSelector || null,
      xpathSelector: insertWatcher.xpathSelector || null,
      regexPattern: insertWatcher.regexPattern || null,
      customCronExpression: insertWatcher.customCronExpression || null,
      webhookUrl: insertWatcher.webhookUrl || null,
      keywordAlerts: insertWatcher.keywordAlerts || null,
      excludeKeywords: insertWatcher.excludeKeywords || null,
      changeCategories: insertWatcher.changeCategories || null,
      lastCheckAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.watchers.set(watcher.id, watcher);
    return watcher;
  }

  async updateWatcher(id: string, updates: Partial<Watcher>): Promise<Watcher> {
    const watcher = this.watchers.get(id);
    if (!watcher) throw new Error('Watcher not found');
    Object.assign(watcher, updates, { updatedAt: new Date() });
    return watcher;
  }

  async deleteWatcher(id: string): Promise<void> {
    this.watchers.delete(id);
  }

  // Snapshots
  async getSnapshot(id: string): Promise<Snapshot | undefined> {
    return this.snapshots.get(id);
  }

  async getLatestSnapshot(watcherId: string): Promise<Snapshot | undefined> {
    const watcherSnapshots = Array.from(this.snapshots.values())
      .filter(s => s.watcherId === watcherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return watcherSnapshots[0];
  }

  async getSnapshotsByWatcher(watcherId: string, limit = 10): Promise<Snapshot[]> {
    return Array.from(this.snapshots.values())
      .filter(s => s.watcherId === watcherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: randomUUID(),
      watcherId: insertSnapshot.watcherId,
      content: insertSnapshot.content,
      contentHash: insertSnapshot.contentHash,
      signature: insertSnapshot.signature ?? null,
      embedding: insertSnapshot.embedding ?? null,
      screenshotUrl: insertSnapshot.screenshotUrl ?? null,
      statusCode: insertSnapshot.statusCode ?? null,
      responseTime: insertSnapshot.responseTime ?? null,
      headers: insertSnapshot.headers ?? null,
      triageScore: insertSnapshot.triageScore ?? null,
      triageDecision: insertSnapshot.triageDecision ?? null,
      llmModelUsed: insertSnapshot.llmModelUsed ?? null,
      llmPromptTokens: insertSnapshot.llmPromptTokens ?? null,
      llmCompletionTokens: insertSnapshot.llmCompletionTokens ?? null,
      visualDiffScore: insertSnapshot.visualDiffScore ?? null,
      legalTermsExtracted: insertSnapshot.legalTermsExtracted ?? null,
      createdAt: new Date(),
    };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async deleteSnapshot(id: string): Promise<void> {
    this.snapshots.delete(id);
  }

  // Changes
  async getChange(id: string): Promise<Change | undefined> {
    return this.changes.get(id);
  }

  async getChangesByWatcher(watcherId: string, limit = 50): Promise<Change[]> {
    return Array.from(this.changes.values())
      .filter(c => c.watcherId === watcherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getChangesByUser(userId: string, limit = 50): Promise<Change[]> {
    const userWatchers = await this.getWatchersByUserId(userId);
    const watcherIds = new Set(userWatchers.map(w => w.id));
    return Array.from(this.changes.values())
      .filter(c => watcherIds.has(c.watcherId))
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getRecentChanges(limit = 50): Promise<(Change & { watcherName: string })[]> {
    const changes = Array.from(this.changes.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
    
    return changes.map(c => {
      const watcher = this.watchers.get(c.watcherId);
      return { ...c, watcherName: watcher?.name || 'Unknown' };
    });
  }

  async createChange(insertChange: InsertChange): Promise<Change> {
    const change: Change = {
      id: randomUUID(),
      type: insertChange.type,
      watcherId: insertChange.watcherId,
      impact: insertChange.impact,
      summary: insertChange.summary,
      whatChanged: insertChange.whatChanged,
      recommendedAction: insertChange.recommendedAction,
      confidence: insertChange.confidence,
      explainability: insertChange.explainability,
      beforeSnapshotId: insertChange.beforeSnapshotId ?? null,
      afterSnapshotId: insertChange.afterSnapshotId ?? null,
      category: insertChange.category ?? null,
      priority: insertChange.priority ?? null,
      userReviewed: insertChange.userReviewed ?? null,
      userFeedback: insertChange.userFeedback ?? null,
      falsePositive: insertChange.falsePositive ?? null,
      acknowledgedAt: insertChange.acknowledgedAt ?? null,
      archivedAt: insertChange.archivedAt ?? null,
      metadata: insertChange.metadata ?? null,
      previousValue: insertChange.previousValue ?? null,
      newValue: insertChange.newValue ?? null,
      affectedFields: insertChange.affectedFields ?? null,
      complianceImpact: insertChange.complianceImpact ?? null,
      businessImpact: insertChange.businessImpact ?? null,
      technicalImpact: insertChange.technicalImpact ?? null,
      sentiment: insertChange.sentiment ?? null,
      keyPhrases: insertChange.keyPhrases ?? null,
      alertSent: insertChange.alertSent ?? null,
      alertSentAt: insertChange.alertSentAt ?? null,
      webhookDeliveredAt: insertChange.webhookDeliveredAt ?? null,
      createdAt: new Date(),
    };
    this.changes.set(change.id, change);
    return change;
  }

  async updateChange(id: string, updates: Partial<Change>): Promise<Change> {
    const change = this.changes.get(id);
    if (!change) throw new Error('Change not found');
    Object.assign(change, updates);
    return change;
  }

  // Credit Transactions
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const tx: CreditTransaction = {
      id: randomUUID(),
      type: transaction.type,
      userId: transaction.userId,
      amount: transaction.amount,
      reason: transaction.reason,
      watcherId: transaction.watcherId ?? null,
      metadata: transaction.metadata ?? null,
      createdAt: new Date(),
    };
    this.creditTransactions.set(tx.id, tx);
    return tx;
  }

  async getCreditTransactionsByUser(userId: string, limit = 50): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Webhook Deliveries
  async createWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery> {
    const wd: WebhookDelivery = {
      id: randomUUID(),
      ...delivery,
      createdAt: new Date(),
    };
    this.webhookDeliveries.set(wd.id, wd);
    return wd;
  }

  async getFailedWebhookDeliveries(): Promise<WebhookDelivery[]> {
    return Array.from(this.webhookDeliveries.values()).filter(d => !d.deliveredAt);
  }

  async updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const delivery = this.webhookDeliveries.get(id);
    if (!delivery) throw new Error('Webhook delivery not found');
    Object.assign(delivery, updates);
    return delivery;
  }

  async getWebhookDeliveriesByUser(userId: string, limit = 50): Promise<WebhookDelivery[]> {
    const userWatchers = await this.getWatchersByUserId(userId);
    const watcherIds = new Set(userWatchers.map(w => w.id));
    const userChanges = Array.from(this.changes.values()).filter(c => watcherIds.has(c.watcherId));
    const changeIds = new Set(userChanges.map(c => c.id));
    return Array.from(this.webhookDeliveries.values())
      .filter(d => changeIds.has(d.changeId))
      .slice(0, limit);
  }

  // Metrics
  async getMetrics(userId?: string): Promise<{
    activeWatchers: number;
    changesDetected: number;
    llmCallsSaved: number;
    avgResponseTime: number;
  }> {
    const watchers = userId 
      ? await this.getWatchersByUserId(userId)
      : Array.from(this.watchers.values());
    
    const changes = userId
      ? await this.getChangesByUser(userId)
      : Array.from(this.changes.values());

    return {
      activeWatchers: watchers.filter(w => w.isActive).length,
      changesDetected: changes.length,
      llmCallsSaved: Math.floor(changes.length * 0.7),
      avgResponseTime: 0.245,
    };
  }

  // Bulk Operations
  async createBulkOperation(operation: Omit<BulkOperation, 'id' | 'createdAt'>): Promise<BulkOperation> {
    const op: BulkOperation = {
      id: randomUUID(),
      ...operation,
      createdAt: new Date(),
    };
    this.bulkOperations.set(op.id, op);
    return op;
  }

  async getBulkOperation(id: string): Promise<BulkOperation | undefined> {
    return this.bulkOperations.get(id);
  }

  async getBulkOperationsByUser(userId: string, limit = 50): Promise<BulkOperation[]> {
    return Array.from(this.bulkOperations.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async updateBulkOperation(id: string, updates: Partial<BulkOperation>): Promise<BulkOperation> {
    const op = this.bulkOperations.get(id);
    if (!op) throw new Error('Bulk operation not found');
    Object.assign(op, updates);
    return op;
  }

  // Intelligence Reports
  async createIntelligenceReport(report: Omit<IntelligenceReport, 'id' | 'createdAt'>): Promise<IntelligenceReport> {
    const ir: IntelligenceReport = {
      id: randomUUID(),
      ...report,
      createdAt: new Date(),
    };
    this.intelligenceReports.set(ir.id, ir);
    return ir;
  }

  async getIntelligenceReport(id: string): Promise<IntelligenceReport | undefined> {
    return this.intelligenceReports.get(id);
  }

  async getIntelligenceReportsByUser(userId: string, limit = 50): Promise<IntelligenceReport[]> {
    return Array.from(this.intelligenceReports.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Competitor Tracking
  async createCompetitor(competitor: Omit<CompetitorTracking, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompetitorTracking> {
    const comp: CompetitorTracking = {
      id: randomUUID(),
      ...competitor,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.competitors.set(comp.id, comp);
    return comp;
  }

  async getCompetitor(id: string): Promise<CompetitorTracking | undefined> {
    return this.competitors.get(id);
  }

  async getCompetitorsByUser(userId: string): Promise<CompetitorTracking[]> {
    return Array.from(this.competitors.values()).filter(c => c.userId === userId);
  }

  async updateCompetitor(id: string, updates: Partial<CompetitorTracking>): Promise<CompetitorTracking> {
    const comp = this.competitors.get(id);
    if (!comp) throw new Error('Competitor not found');
    Object.assign(comp, updates, { updatedAt: new Date() });
    return comp;
  }

  async deleteCompetitor(id: string): Promise<void> {
    this.competitors.delete(id);
  }

  // User Preferences
  async updateUserPreferences(userId: string, preferences: {
    timezone?: string;
    defaultAlertThreshold?: number;
    preferredNotificationTime?: string;
  }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    Object.assign(user, preferences, { updatedAt: new Date() });
    return user;
  }
}
