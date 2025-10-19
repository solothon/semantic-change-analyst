import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, real, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").notNull().unique().default(sql`gen_random_uuid()`),
  // Credit system for billing
  freeCredits: integer("free_credits").default(100), // Free tier: 100 checks/month
  paidCredits: integer("paid_credits").default(0),
  // RapidAPI handles billing, keep preferences only
  timezone: text("timezone").default("UTC"),
  defaultAlertThreshold: integer("default_alert_threshold").default(5),
  preferredNotificationTime: text("preferred_notification_time").default("09:00"),
  // Data retention preferences (for storage management)
  retentionDays: integer("retention_days").default(30), // Auto-delete data older than N days
  keepImportantChanges: boolean("keep_important_changes").default(true), // Never delete high-impact changes
  manualCleanupEnabled: boolean("manual_cleanup_enabled").default(true), // Allow user to manually clear history
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const watchers = pgTable("watchers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetType: text("target_type").notNull(), // webpage, api, document, pdf
  targetUrl: text("target_url").notNull(),
  // KILLER FEATURE 1: Advanced Selectors (Beat Distill.io)
  cssSelector: text("css_selector"),
  xpathSelector: text("xpath_selector"),
  regexPattern: text("regex_pattern"),
  // KILLER FEATURE 2: Multi-location Monitoring (Beat Everyone)
  monitoringLocations: text("monitoring_locations").array().default(['us-east']), // us-east, eu-west, asia-south
  checkFrequency: text("check_frequency").default("daily"),
  customCronExpression: text("custom_cron_expression"),
  timezone: text("timezone").default("UTC"),
  triageThreshold: real("triage_threshold").default(0.85),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret").default(sql`gen_random_uuid()`),
  // KILLER FEATURE 3: Visual Monitoring (Beat VisualPing)
  visualMonitoringEnabled: boolean("visual_monitoring_enabled").default(false),
  screenshotComparison: boolean("screenshot_comparison").default(false),
  visualThreshold: real("visual_threshold").default(0.95), // Visual similarity threshold
  // KILLER FEATURE 4: Advanced Filtering & Intelligence
  keywordAlerts: text("keyword_alerts").array(),
  excludeKeywords: text("exclude_keywords").array(),
  changeCategories: text("change_categories").array(), // pricing, legal, content, api, security
  competitorMonitoring: boolean("competitor_monitoring").default(false),
  sentimentAnalysis: boolean("sentiment_analysis").default(false),
  // KILLER FEATURE 5: Archive & Compliance (Beat ChangeTower)
  archiveEnabled: boolean("archive_enabled").default(true),
  complianceMonitoring: boolean("compliance_monitoring").default(false),
  legalChangeDetection: boolean("legal_change_detection").default(false),
  // Advanced Controls
  minimumImpactForAlert: integer("minimum_impact_for_alert").default(3),
  alertCooldownMinutes: integer("alert_cooldown_minutes").default(60),
  isActive: boolean("is_active").default(true),
  isPaused: boolean("is_paused").default(false),
  pausedUntil: timestamp("paused_until"),
  lastCheckAt: timestamp("last_check_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("watchers_user_id_idx").on(table.userId),
  targetUrlIdx: index("watchers_target_url_idx").on(table.targetUrl),
}));

export const snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  watcherId: uuid("watcher_id").notNull().references(() => watchers.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  contentHash: text("content_hash").notNull(),
  signature: text("signature"),
  embedding: text("embedding"), // JSON array of floats
  // KILLER FEATURE: Visual Snapshots (Beat VisualPing)
  screenshotUrl: text("screenshot_url"),
  screenshotHash: text("screenshot_hash"),
  visualDiff: jsonb("visual_diff"), // Visual differences data
  // KILLER FEATURE: Multi-location Data
  location: text("location").default("us-east"),
  responseTime: integer("response_time"), // milliseconds
  statusCode: integer("status_code"),
  // KILLER FEATURE: Enhanced Metadata
  metadata: jsonb("metadata"), // HTTP headers, response time, etc.
  extractedData: jsonb("extracted_data"), // Structured data extraction
  domStructure: jsonb("dom_structure"), // DOM tree analysis
  // KILLER FEATURE: Archive & Compliance
  archived: boolean("archived").default(true),
  complianceFlags: text("compliance_flags").array(),
  legalTermsExtracted: jsonb("legal_terms_extracted"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  watcherIdIdx: index("snapshots_watcher_id_idx").on(table.watcherId),
  contentHashIdx: index("snapshots_content_hash_idx").on(table.contentHash),
  locationIdx: index("snapshots_location_idx").on(table.location),
  archivedIdx: index("snapshots_archived_idx").on(table.archived),
}));

export const changes = pgTable("changes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  watcherId: uuid("watcher_id").notNull().references(() => watchers.id, { onDelete: "cascade" }),
  beforeSnapshotId: uuid("before_snapshot_id").references(() => snapshots.id),
  afterSnapshotId: uuid("after_snapshot_id").references(() => snapshots.id),
  type: text("type").notNull(), // pricing, legal, product, api, job, security, content, visual, other
  impact: integer("impact").notNull(), // 1-10
  summary: text("summary").notNull(),
  whatChanged: text("what_changed").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  confidence: real("confidence").notNull(), // 0-1
  explainability: text("explainability").notNull(),
  triageSimilarity: real("triage_similarity"),
  // KILLER FEATURE: Advanced AI Analysis (Beat Fluxguard)
  sentimentScore: real("sentiment_score"), // -1 to 1 (negative to positive)
  urgencyLevel: text("urgency_level"), // critical, high, medium, low
  businessImpact: text("business_impact"), // revenue, compliance, brand, operational
  competitorIntelligence: jsonb("competitor_intelligence"), // Competitive insights
  trendPrediction: jsonb("trend_prediction"), // Future trend analysis
  // KILLER FEATURE: Visual Change Analysis
  visualSimilarity: real("visual_similarity"), // Visual similarity score
  visualDiffUrl: text("visual_diff_url"), // URL to visual diff image
  elementsChanged: jsonb("elements_changed"), // Which visual elements changed
  layoutShift: real("layout_shift"), // Cumulative layout shift score
  // KILLER FEATURE: Multi-location Analysis
  locationDetected: text("location_detected"), // Which location detected the change
  geoVariation: boolean("geo_variation").default(false), // Different across locations
  // KILLER FEATURE: Compliance & Legal Analysis
  complianceRisk: text("compliance_risk"), // high, medium, low, none
  legalImplications: jsonb("legal_implications"), // Legal analysis
  policyChanges: jsonb("policy_changes"), // Policy change detection
  // Enhanced Tracking
  keywordsTriggered: text("keywords_triggered").array(),
  webhookDelivered: boolean("webhook_delivered").default(false),
  webhookDeliveredAt: timestamp("webhook_delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  watcherIdIdx: index("changes_watcher_id_idx").on(table.watcherId),
  impactIdx: index("changes_impact_idx").on(table.impact),
  typeIdx: index("changes_type_idx").on(table.type),
  urgencyIdx: index("changes_urgency_idx").on(table.urgencyLevel),
  complianceIdx: index("changes_compliance_idx").on(table.complianceRisk),
  createdAtIdx: index("changes_created_at_idx").on(table.createdAt),
}));

// Credit Transactions for billing tracking
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'debit' for usage, 'credit' for purchases
  amount: integer("amount").notNull(), // Credits added or used
  reason: text("reason").notNull(), // 'check_execution', 'credit_purchase', etc.
  watcherId: uuid("watcher_id").references(() => watchers.id),
  metadata: jsonb("metadata"), // Additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("credit_transactions_user_id_idx").on(table.userId),
  typeIdx: index("credit_transactions_type_idx").on(table.type),
}));

// RapidAPI handles billing, but keep usage tracking for analytics
export const usageAnalytics = pgTable("usage_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(), // check, bulk_check, visual_compare, export
  watcherId: uuid("watcher_id").references(() => watchers.id, { onDelete: "set null" }),
  apiCost: real("api_cost").default(0), // Internal cost tracking
  processingTime: integer("processing_time"), // milliseconds
  location: text("location"),
  success: boolean("success").default(true),
  errorType: text("error_type"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("usage_analytics_user_id_idx").on(table.userId),
  operationIdx: index("usage_analytics_operation_idx").on(table.operation),
  dateIdx: index("usage_analytics_date_idx").on(table.createdAt),
}));

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  changeId: uuid("change_id").notNull().references(() => changes.id, { onDelete: "cascade" }),
  webhookUrl: text("webhook_url").notNull(),
  payload: jsonb("payload").notNull(),
  signature: text("signature").notNull(),
  httpStatus: integer("http_status"),
  responseBody: text("response_body"),
  attempt: integer("attempt").default(1),
  nextRetryAt: timestamp("next_retry_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  changeIdIdx: index("webhook_deliveries_change_id_idx").on(table.changeId),
  nextRetryAtIdx: index("webhook_deliveries_next_retry_at_idx").on(table.nextRetryAt),
}));

// KILLER FEATURE: Bulk Operations (Beat Everyone)
export const bulkOperations = pgTable("bulk_operations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  operationType: text("operation_type").notNull(), // create, update, delete, check, export
  targets: jsonb("targets").notNull(), // Array of watcher IDs or URLs
  config: jsonb("config").notNull(), // Bulk operation configuration
  status: text("status").default("pending"), // pending, running, completed, failed
  progress: integer("progress").default(0), // 0-100
  results: jsonb("results"), // Operation results
  errorCount: integer("error_count").default(0),
  successCount: integer("success_count").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("bulk_operations_user_id_idx").on(table.userId),
  statusIdx: index("bulk_operations_status_idx").on(table.status),
}));

// KILLER FEATURE: Real-time Change Stream (Beat Everyone)  
export const changeStream = pgTable("change_stream", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  watcherId: uuid("watcher_id").notNull().references(() => watchers.id, { onDelete: "cascade" }),
  changeId: uuid("change_id").references(() => changes.id, { onDelete: "cascade" }),
  streamType: text("stream_type").notNull(), // websocket, sse, webhook
  payload: jsonb("payload").notNull(),
  delivered: boolean("delivered").default(false),
  deliveredAt: timestamp("delivered_at"),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("change_stream_user_id_idx").on(table.userId),
  watcherIdIdx: index("change_stream_watcher_id_idx").on(table.watcherId),
  deliveredIdx: index("change_stream_delivered_idx").on(table.delivered),
}));

// KILLER FEATURE: Advanced Analytics & Intelligence (Beat Fluxguard)
export const intelligenceReports = pgTable("intelligence_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(), // trend, competitor, compliance, forecast
  scope: text("scope").notNull(), // single_watcher, portfolio, industry
  targetIds: text("target_ids").array(), // Watcher or competitor IDs
  period: text("period").notNull(), // daily, weekly, monthly, quarterly
  // Advanced Metrics
  changeVelocity: real("change_velocity"), // Changes per time unit
  competitiveAdvantage: jsonb("competitive_advantage"), // vs competitors
  riskAssessment: jsonb("risk_assessment"), // Business risk analysis
  opportunityScoring: jsonb("opportunity_scoring"), // Market opportunities
  predictiveInsights: jsonb("predictive_insights"), // AI predictions
  // Industry Benchmarks
  industryBenchmarks: jsonb("industry_benchmarks"), // Compare to industry
  marketTrends: jsonb("market_trends"), // Macro trend analysis
  // Compliance & Legal
  complianceScore: real("compliance_score"), // 0-100
  legalRiskProfile: jsonb("legal_risk_profile"),
  regulatoryChanges: jsonb("regulatory_changes"),
  // Report Metadata
  confidence: real("confidence").default(0.85),
  dataPoints: integer("data_points").default(0),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("intelligence_reports_user_id_idx").on(table.userId),
  reportTypeIdx: index("intelligence_reports_type_idx").on(table.reportType),
  periodIdx: index("intelligence_reports_period_idx").on(table.period, table.periodStart),
}));

// KILLER FEATURE: Competitor Intelligence (Unique)
export const competitorTracking = pgTable("competitor_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  competitorName: text("competitor_name").notNull(),
  domain: text("domain").notNull(),
  industry: text("industry"),
  monitoringFocus: text("monitoring_focus").array(), // pricing, features, content, legal
  watcherIds: text("watcher_ids").array(), // Associated watchers
  // Intelligence Data
  pricingStrategy: jsonb("pricing_strategy"),
  featureUpdates: jsonb("feature_updates"),
  marketingCampaigns: jsonb("marketing_campaigns"),
  productLaunches: jsonb("product_launches"),
  // Competitive Analysis
  threatLevel: text("threat_level"), // high, medium, low
  marketPosition: text("market_position"), // leader, challenger, follower
  competitiveGaps: jsonb("competitive_gaps"), // Opportunities
  strengthsWeaknesses: jsonb("strengths_weaknesses"),
  lastAnalyzed: timestamp("last_analyzed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("competitor_tracking_user_id_idx").on(table.userId),
  domainIdx: index("competitor_tracking_domain_idx").on(table.domain),
  threatIdx: index("competitor_tracking_threat_idx").on(table.threatLevel),
}));

// Teams for collaboration
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  maxMembers: integer("max_members").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email notifications log
export const emailNotifications = pgTable("email_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  changeId: uuid("change_id").references(() => changes.id, { onDelete: "set null" }),
  watcherId: uuid("watcher_id").notNull().references(() => watchers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").default("pending"), // pending, sent, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("email_notifications_user_id_idx").on(table.userId),
  watcherIdIdx: index("email_notifications_watcher_id_idx").on(table.watcherId),
  statusIdx: index("email_notifications_status_idx").on(table.status),
}));

// Trend analysis for advanced analytics
export const trendAnalysis = pgTable("trend_analysis", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  watcherId: uuid("watcher_id").notNull().references(() => watchers.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // daily, weekly, monthly
  changeCount: integer("change_count").default(0),
  avgImpact: real("avg_impact").default(0),
  highImpactChanges: integer("high_impact_changes").default(0), // impact >= 7
  totalChecks: integer("total_checks").default(0),
  changeRate: real("change_rate").default(0), // changes per check
  trendDirection: text("trend_direction"), // increasing, decreasing, stable
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  watcherIdIdx: index("trend_analysis_watcher_id_idx").on(table.watcherId),
  periodIdx: index("trend_analysis_period_idx").on(table.period, table.periodStart),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  watchers: many(watchers),
  usageAnalytics: many(usageAnalytics),
  bulkOperations: many(bulkOperations),
  changeStream: many(changeStream),
  intelligenceReports: many(intelligenceReports),
  competitorTracking: many(competitorTracking),
}));

export const watchersRelations = relations(watchers, ({ one, many }) => ({
  user: one(users, { fields: [watchers.userId], references: [users.id] }),
  snapshots: many(snapshots),
  changes: many(changes),
  usageAnalytics: many(usageAnalytics),
  changeStream: many(changeStream),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  watcher: one(watchers, { fields: [snapshots.watcherId], references: [watchers.id] }),
}));

export const changesRelations = relations(changes, ({ one, many }) => ({
  watcher: one(watchers, { fields: [changes.watcherId], references: [watchers.id] }),
  beforeSnapshot: one(snapshots, { fields: [changes.beforeSnapshotId], references: [snapshots.id] }),
  afterSnapshot: one(snapshots, { fields: [changes.afterSnapshotId], references: [snapshots.id] }),
  webhookDeliveries: many(webhookDeliveries),
  changeStream: many(changeStream),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  change: one(changes, { fields: [webhookDeliveries.changeId], references: [changes.id] }),
}));

export const usageAnalyticsRelations = relations(usageAnalytics, ({ one }) => ({
  user: one(users, { fields: [usageAnalytics.userId], references: [users.id] }),
  watcher: one(watchers, { fields: [usageAnalytics.watcherId], references: [watchers.id] }),
}));

export const bulkOperationsRelations = relations(bulkOperations, ({ one }) => ({
  user: one(users, { fields: [bulkOperations.userId], references: [users.id] }),
}));

export const changeStreamRelations = relations(changeStream, ({ one }) => ({
  user: one(users, { fields: [changeStream.userId], references: [users.id] }),
  watcher: one(watchers, { fields: [changeStream.watcherId], references: [watchers.id] }),
  change: one(changes, { fields: [changeStream.changeId], references: [changes.id] }),
}));

export const intelligenceReportsRelations = relations(intelligenceReports, ({ one }) => ({
  user: one(users, { fields: [intelligenceReports.userId], references: [users.id] }),
}));

export const competitorTrackingRelations = relations(competitorTracking, ({ one }) => ({
  user: one(users, { fields: [competitorTracking.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  apiKey: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password too long"),
});

export const insertWatcherSchema = createInsertSchema(watchers).omit({
  id: true,
  webhookSecret: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  targetType: z.enum(["webpage", "api", "document"], { 
    errorMap: () => ({ message: "Target type must be one of: webpage, api, document" })
  }),
  targetUrl: z.string().url("Must be a valid URL"),
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
  createdAt: true,
});

export const insertChangeSchema = createInsertSchema(changes).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Watcher = typeof watchers.$inferSelect;
export type InsertWatcher = z.infer<typeof insertWatcherSchema>;
export type Snapshot = typeof snapshots.$inferSelect;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Change = typeof changes.$inferSelect;
export type InsertChange = z.infer<typeof insertChangeSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type UsageAnalytics = typeof usageAnalytics.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type BulkOperation = typeof bulkOperations.$inferSelect;
export type ChangeStream = typeof changeStream.$inferSelect;
export type IntelligenceReport = typeof intelligenceReports.$inferSelect;
export type CompetitorTracking = typeof competitorTracking.$inferSelect;
