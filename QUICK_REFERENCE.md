# Quick Reference - All 48 Endpoints

## 📊 Endpoint Categories

### 1. HEALTH (1) - No Auth Needed
```
GET /api/health → Check if API works
```

### 2. WATCHERS (8) - Create & Manage Monitors
```
POST   /api/watchers                    → Create new monitor
GET    /api/watchers                    → List all monitors
GET    /api/watchers/:id                → Get one monitor
PUT    /api/watchers/:id                → Update monitor
DELETE /api/watchers/:id                → Delete monitor
POST   /api/watchers/:id/check          → Check now
GET    /api/watchers/:id/snapshots      → Get snapshot history
GET    /api/watchers/:id/export         → Export config
```

### 3. CHANGES (3) - See What Changed
```
GET /api/changes                        → All recent changes
GET /api/watchers/:id/changes           → Changes for one monitor
GET /api/watchers/:id/history           → Full history
```

### 4. QUICK CHECKS (2) - One-Time Checks
```
POST /api/check/quick                   → Check one URL
POST /api/check/batch                   → Check many URLs (max 100)
```

### 5. AI ANALYSIS (2) - Smart AI Insights
```
POST /api/ai/analyze                    → Analyze with AI
GET  /api/ai/models                     → List AI models
```

### 6. COMPETITORS (6) - Track Competition
```
POST   /api/competitors                 → Add competitor
GET    /api/competitors                 → List competitors
GET    /api/competitors/:id             → Get competitor
PUT    /api/competitors/:id             → Update competitor
DELETE /api/competitors/:id             → Remove competitor
GET    /api/competitors/:id/intelligence → Get AI insights
```

### 7. REPORTS (2) - Intelligence Reports
```
GET  /api/reports/trends                → Get trend reports
POST /api/reports/generate              → Create new report
```

### 8. BULK OPERATIONS (5) - Do Many at Once
```
POST /api/bulk/watchers/create          → Create many monitors
POST /api/bulk/watchers/delete          → Delete many monitors
POST /api/bulk/watchers/check           → Check many monitors
GET  /api/bulk/operations               → List bulk operations
GET  /api/bulk/operations/:id           → Check operation status
```

### 9. USER (5) - Your Account
```
GET  /api/user/me                       → Your profile
GET  /api/user/credits                  → Credit balance
GET  /api/user/usage                    → Usage history
PUT  /api/user/preferences              → Update settings
POST /api/user/api-key/regenerate       → New API key
```

### 10. SNAPSHOTS (4) - Compare Content
```
GET  /api/snapshots/:id                 → Get snapshot
DELETE /api/snapshots/:id               → Delete snapshot
POST /api/snapshots/compare             → Compare two snapshots
GET  /api/changes/:id/diff              → See differences
```

### 11. DASHBOARD (2) - Overview
```
GET /api/dashboard/metrics              → Your stats
GET /api/dashboard/insights             → AI insights
```

### 12. WEBHOOKS (3) - Notifications
```
GET  /api/webhooks/deliveries           → Delivery history
POST /api/webhooks/deliveries/:id/retry → Retry failed webhook
POST /api/webhooks/test                 → Test webhook
```

### 13. IMPORT/EXPORT (2) - Backup/Restore
```
POST /api/watchers/import               → Import monitors
```

### 14. STORAGE (2) - Manage Space
```
GET  /api/user/storage                  → Check usage
POST /api/user/storage/cleanup          → Delete old data
```

---

## 🎯 Most Used Endpoints

### Start Monitoring
1. `POST /api/watchers` - Create monitor
2. `GET /api/watchers` - See all monitors
3. `GET /api/changes` - Check what changed

### Quick Check (No Monitor)
1. `POST /api/check/quick` - Check any URL once

### Bulk Setup
1. `POST /api/bulk/watchers/create` - Create 100 monitors at once

### AI Analysis
1. `POST /api/ai/analyze` - Use free AI to analyze content

### Check Credits
1. `GET /api/user/credits` - See remaining credits

### Clean Storage
1. `GET /api/user/storage` - Check space used
2. `POST /api/user/storage/cleanup` - Free up space

---

## 💡 How Data Flows

```
1. CREATE MONITOR
   POST /api/watchers → Creates monitor
   ↓
   Returns watcher ID

2. AUTO-CHECK (Every hour/day)
   System checks → Creates snapshot
   ↓
   Compares to previous snapshot
   ↓
   If different → Creates change record
   ↓
   Sends webhook (if configured)

3. YOU CHECK RESULTS
   GET /api/changes → See all changes
   GET /api/watchers/:id/changes → See changes for one monitor
   GET /api/changes/:id/diff → See exact differences

4. STORAGE CLEANUP
   GET /api/user/storage → Check space
   POST /api/user/storage/cleanup → Delete old snapshots
   (Keeps latest snapshot + important changes)
```

---

## 🔑 Authentication

Every request needs ONE of these headers:
```
x-rapidapi-user: your_username
OR
x-api-key: your-api-key
```

Exception: `GET /api/health` needs no auth

---

## 📦 Common Request Examples

### Create Monitor
```json
POST /api/watchers
{
  "name": "My Site",
  "targetType": "webpage",
  "targetUrl": "https://example.com",
  "checkFrequency": "hourly"
}
```

### Quick Check
```json
POST /api/check/quick
{
  "url": "https://example.com",
  "selector": ".price"
}
```

### AI Analyze
```json
POST /api/ai/analyze
{
  "content": "Text to analyze",
  "model": "deepseek/deepseek-r1:free"
}
```

### Cleanup Storage
```json
POST /api/user/storage/cleanup
{
  "retentionDays": 30,
  "keepImportantChanges": true
}
```

---

## ⚡ Quick Tips

- **Impact Score**: 1-3 low, 4-6 medium, 7-10 high
- **Batch Limit**: Max 100 URLs per batch check
- **Retention**: Default 30 days, important changes kept forever
- **Webhooks**: Auto-retry up to 5 times
- **AI Models**: Use `deepseek/deepseek-r1:free` for best results

---

## 🚀 Getting Started (3 Steps)

```bash
# 1. Check API works
GET /api/health

# 2. Create your first monitor
POST /api/watchers
{
  "name": "My Website",
  "targetType": "webpage",
  "targetUrl": "https://mysite.com",
  "checkFrequency": "hourly"
}

# 3. Check for changes
GET /api/changes
```

Done! 🎉

---

**See COMPLETE_API_GUIDE.md for detailed inputs/outputs for all 48 endpoints**
