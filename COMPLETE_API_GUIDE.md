# Complete API Guide - All 48 Endpoints with Inputs & Outputs

## 🔐 Authentication
**All endpoints (except health check) need ONE of these headers:**
```
x-rapidapi-user: your_username
OR
x-api-key: your-api-key
```

---

## 📋 **ALL 48 ENDPOINTS** 

### 1️⃣ HEALTH & SYSTEM (1 endpoint)

#### `GET /api/health` ✅ No Auth Required
**What it does:** Check if API is working  
**Input:** None  
**Output:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### 2️⃣ WATCHERS MANAGEMENT (8 endpoints)

#### `POST /api/watchers`
**What it does:** Create a new website/API monitor  
**Input:**
```json
{
  "name": "My Website Monitor",
  "targetType": "webpage",
  "targetUrl": "https://example.com",
  "checkFrequency": "hourly",
  "cssSelector": ".main-content",
  "webhookUrl": "https://your-webhook.com/alerts"
}
```
**Output:**
```json
{
  "id": "abc-123-uuid",
  "name": "My Website Monitor",
  "targetType": "webpage",
  "targetUrl": "https://example.com",
  "isActive": true,
  "createdAt": "2025-10-19T10:00:00.000Z"
}
```

#### `GET /api/watchers`
**What it does:** Get all your monitors  
**Input:** None  
**Output:**
```json
[
  {
    "id": "abc-123",
    "name": "My Website Monitor",
    "targetUrl": "https://example.com",
    "isActive": true,
    "lastCheckAt": "2025-10-19T09:45:00.000Z"
  },
  {
    "id": "xyz-456",
    "name": "Another Monitor",
    "targetUrl": "https://competitor.com",
    "isActive": true,
    "lastCheckAt": "2025-10-19T09:50:00.000Z"
  }
]
```

#### `GET /api/watchers/:id`
**What it does:** Get details of one specific monitor  
**Input:** ID in URL (e.g., `/api/watchers/abc-123`)  
**Output:**
```json
{
  "id": "abc-123",
  "name": "My Website Monitor",
  "targetType": "webpage",
  "targetUrl": "https://example.com",
  "checkFrequency": "hourly",
  "cssSelector": ".main-content",
  "isActive": true,
  "lastCheckAt": "2025-10-19T09:45:00.000Z",
  "createdAt": "2025-10-18T10:00:00.000Z"
}
```

#### `PUT /api/watchers/:id`
**What it does:** Update monitor settings  
**Input:**
```json
{
  "name": "Updated Name",
  "checkFrequency": "daily",
  "isActive": false
}
```
**Output:**
```json
{
  "id": "abc-123",
  "name": "Updated Name",
  "checkFrequency": "daily",
  "isActive": false,
  "updatedAt": "2025-10-19T10:30:00.000Z"
}
```

#### `DELETE /api/watchers/:id`
**What it does:** Delete a monitor (also deletes all its snapshots and changes)  
**Input:** ID in URL  
**Output:**
```json
{
  "message": "Watcher deleted successfully"
}
```

#### `POST /api/watchers/:id/check`
**What it does:** Check website right now (don't wait for scheduled check)  
**Input:** ID in URL  
**Output:**
```json
{
  "message": "Check initiated",
  "watcherId": "abc-123",
  "timestamp": "2025-10-19T10:35:00.000Z"
}
```

#### `GET /api/watchers/:id/snapshots?limit=30`
**What it does:** Get history of all snapshots for this monitor  
**Input:** ID in URL, optional `limit` query (default 30)  
**Output:**
```json
{
  "watcher": {
    "id": "abc-123",
    "name": "My Website Monitor"
  },
  "snapshots": [
    {
      "id": "snap-1",
      "contentHash": "abc123def",
      "statusCode": 200,
      "responseTime": 245,
      "createdAt": "2025-10-19T10:00:00.000Z"
    },
    {
      "id": "snap-2",
      "contentHash": "abc123def",
      "statusCode": 200,
      "responseTime": 198,
      "createdAt": "2025-10-19T09:00:00.000Z"
    }
  ],
  "total": 2
}
```

#### `GET /api/watchers/:id/export?format=json`
**What it does:** Export monitor configuration  
**Input:** ID in URL, `format=json` or `format=csv` in query  
**Output (JSON):**
```json
{
  "watcher": {
    "name": "My Website Monitor",
    "targetType": "webpage",
    "targetUrl": "https://example.com",
    "checkFrequency": "hourly",
    "cssSelector": ".main-content"
  }
}
```

---

### 3️⃣ CHANGES & HISTORY (3 endpoints)

#### `GET /api/changes?limit=25`
**What it does:** Get recent changes from ALL your monitors  
**Input:** Optional `limit` query (default 25)  
**Output:**
```json
[
  {
    "id": "change-1",
    "watcherId": "abc-123",
    "watcherName": "My Website Monitor",
    "type": "content",
    "impact": 7,
    "summary": "Major content update detected",
    "whatChanged": "Homepage hero section redesigned",
    "recommendedAction": "Review changes immediately",
    "confidence": 0.95,
    "createdAt": "2025-10-19T10:00:00.000Z"
  },
  {
    "id": "change-2",
    "watcherId": "xyz-456",
    "watcherName": "Competitor Monitor",
    "type": "pricing",
    "impact": 9,
    "summary": "Pricing increased",
    "whatChanged": "Pro plan went from $99 to $149",
    "recommendedAction": "Update pricing strategy",
    "confidence": 0.98,
    "createdAt": "2025-10-19T09:30:00.000Z"
  }
]
```

#### `GET /api/watchers/:id/changes?limit=10`
**What it does:** Get changes for ONE specific monitor  
**Input:** ID in URL, optional `limit` query (default 10)  
**Output:**
```json
[
  {
    "id": "change-1",
    "type": "content",
    "impact": 7,
    "summary": "Major content update",
    "createdAt": "2025-10-19T10:00:00.000Z"
  }
]
```

#### `GET /api/watchers/:id/history?limit=30`
**What it does:** Get complete history (snapshots + changes)  
**Input:** ID in URL, optional `limit` query (default 30)  
**Output:**
```json
{
  "watcher": {
    "id": "abc-123",
    "name": "My Website Monitor"
  },
  "history": [
    {
      "timestamp": "2025-10-19T10:00:00.000Z",
      "snapshotId": "snap-1",
      "contentHash": "abc123",
      "statusCode": 200,
      "responseTime": 245,
      "location": "us-east",
      "changes": [
        {
          "type": "content",
          "impact": 7,
          "summary": "Major update detected"
        }
      ]
    },
    {
      "timestamp": "2025-10-19T09:00:00.000Z",
      "snapshotId": "snap-2",
      "contentHash": "abc123",
      "statusCode": 200,
      "responseTime": 210,
      "location": "us-east",
      "changes": []
    }
  ]
}
```

---

### 4️⃣ QUICK CHECKS (2 endpoints)

#### `POST /api/check/quick`
**What it does:** Check a URL once without creating a monitor  
**Input:**
```json
{
  "url": "https://example.com",
  "selector": ".main-content"
}
```
**Output:**
```json
{
  "url": "https://example.com",
  "content": "First 500 characters of the webpage content...",
  "contentHash": "sha256-abc123def456",
  "metadata": {
    "statusCode": 200,
    "contentType": "text/html",
    "responseTime": 350
  }
}
```

#### `POST /api/check/batch`
**What it does:** Check multiple URLs at once (max 100)  
**Input:**
```json
{
  "urls": [
    "https://example.com",
    { "url": "https://example.org", "selector": ".price" },
    "https://example.net"
  ]
}
```
**Output:**
```json
{
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "content": "First 200 chars...",
      "contentHash": "sha256-abc123",
      "metadata": {
        "statusCode": 200,
        "responseTime": 340
      }
    },
    {
      "url": "https://example.org",
      "success": true,
      "content": "$99/month",
      "contentHash": "sha256-xyz789",
      "metadata": {
        "statusCode": 200,
        "responseTime": 280
      }
    },
    {
      "url": "https://failed.com",
      "success": false,
      "error": "Failed to scrape: timeout"
    }
  ],
  "total": 3
}
```

---

### 5️⃣ AI ANALYSIS (2 endpoints)

#### `POST /api/ai/analyze`
**What it does:** Use AI to analyze content  
**Input:**
```json
{
  "content": "Your webpage content or text to analyze",
  "model": "deepseek/deepseek-r1:free",
  "analysisType": "semantic"
}
```
**Output:**
```json
{
  "analysis": "This content discusses pricing changes. The tone is professional and the impact appears significant. Key changes include a 50% price increase which may affect customer retention...",
  "model": "deepseek/deepseek-r1:free",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

**Available Models:**
- `deepseek/deepseek-r1:free` - Best for reasoning
- `deepseek/deepseek-v3:free` - General purpose
- `google/gemini-2.0-flash-exp:free` - Fast
- `mistralai/mistral-7b-instruct:free` - Compact

#### `GET /api/ai/models`
**What it does:** List all available AI models  
**Input:** None  
**Output:**
```json
{
  "available": [
    {
      "id": "deepseek/deepseek-r1:free",
      "name": "DeepSeek R1",
      "tier": "free",
      "best_for": "reasoning"
    },
    {
      "id": "google/gemini-2.0-flash-exp:free",
      "name": "Gemini Flash",
      "tier": "free",
      "best_for": "speed"
    }
  ],
  "recommendation": "Use deepseek/deepseek-r1:free for best semantic analysis"
}
```

---

### 6️⃣ COMPETITOR TRACKING (6 endpoints)

#### `POST /api/competitors`
**What it does:** Add a competitor to track  
**Input:**
```json
{
  "competitorName": "Competitor Inc",
  "domain": "competitor.com",
  "industry": "SaaS",
  "monitoringFocus": ["pricing", "features", "content"]
}
```
**Output:**
```json
{
  "id": "comp-123",
  "competitorName": "Competitor Inc",
  "domain": "competitor.com",
  "industry": "SaaS",
  "threatLevel": "medium",
  "createdAt": "2025-10-19T10:00:00.000Z"
}
```

#### `GET /api/competitors`
**What it does:** Get all tracked competitors  
**Input:** None  
**Output:**
```json
[
  {
    "id": "comp-123",
    "competitorName": "Competitor Inc",
    "domain": "competitor.com",
    "industry": "SaaS",
    "threatLevel": "medium",
    "lastAnalyzed": "2025-10-19T09:00:00.000Z"
  }
]
```

#### `GET /api/competitors/:id`
**What it does:** Get details of one competitor  
**Input:** ID in URL  
**Output:**
```json
{
  "id": "comp-123",
  "competitorName": "Competitor Inc",
  "domain": "competitor.com",
  "industry": "SaaS",
  "monitoringFocus": ["pricing", "features"],
  "threatLevel": "medium",
  "notes": "They increased prices last month",
  "createdAt": "2025-09-15T10:00:00.000Z"
}
```

#### `PUT /api/competitors/:id`
**What it does:** Update competitor info  
**Input:**
```json
{
  "threatLevel": "high",
  "notes": "They launched a new feature that competes directly with us"
}
```
**Output:**
```json
{
  "id": "comp-123",
  "threatLevel": "high",
  "notes": "They launched a new feature that competes directly with us",
  "updatedAt": "2025-10-19T10:30:00.000Z"
}
```

#### `DELETE /api/competitors/:id`
**What it does:** Stop tracking a competitor  
**Input:** ID in URL  
**Output:**
```json
{
  "message": "Competitor deleted successfully"
}
```

#### `GET /api/competitors/:id/intelligence`
**What it does:** Get AI insights about competitor  
**Input:** ID in URL  
**Output:**
```json
{
  "competitorName": "Competitor Inc",
  "domain": "competitor.com",
  "threatLevel": "medium",
  "lastAnalyzed": "2025-10-19T10:00:00.000Z",
  "insights": {
    "aiGenerated": true,
    "summary": "Competitor has been aggressive with pricing changes",
    "recommendations": [
      "Monitor their pricing page daily",
      "Consider adjusting our pricing strategy"
    ]
  }
}
```

---

### 7️⃣ INTELLIGENCE REPORTS (2 endpoints)

#### `GET /api/reports/trends?period=weekly`
**What it does:** Get trend analysis reports  
**Input:** Query params: `period` (daily/weekly/monthly), optional `watcherId`  
**Output:**
```json
{
  "reports": [
    {
      "id": "report-123",
      "reportType": "trend",
      "period": "weekly",
      "confidence": 0.85,
      "dataPoints": 50,
      "insights": "Increased change frequency detected",
      "createdAt": "2025-10-19T10:00:00.000Z"
    }
  ],
  "period": "weekly"
}
```

#### `POST /api/reports/generate`
**What it does:** Create a new intelligence report  
**Input:**
```json
{
  "reportType": "trend",
  "period": "weekly",
  "watcherIds": ["abc-123", "xyz-456"]
}
```
**Output:**
```json
{
  "id": "report-789",
  "reportType": "trend",
  "period": "weekly",
  "status": "generated",
  "confidence": 0.87,
  "insights": "Your monitored sites show 30% more changes this week",
  "createdAt": "2025-10-19T10:35:00.000Z"
}
```

**Report Types:**
- `trend` - Change trends
- `competitor` - Competitive analysis
- `compliance` - Compliance monitoring
- `forecast` - Predictions

---

### 8️⃣ BULK OPERATIONS (5 endpoints)

#### `POST /api/bulk/watchers/create`
**What it does:** Create many monitors at once (max 100)  
**Input:**
```json
{
  "watchers": [
    {
      "name": "Site 1",
      "targetType": "webpage",
      "targetUrl": "https://site1.com",
      "checkFrequency": "hourly"
    },
    {
      "name": "Site 2",
      "targetType": "webpage",
      "targetUrl": "https://site2.com",
      "checkFrequency": "daily"
    }
  ]
}
```
**Output:**
```json
{
  "operationId": "bulk-op-123",
  "created": 2,
  "failed": 0,
  "watchers": [
    {
      "id": "new-1",
      "name": "Site 1"
    },
    {
      "id": "new-2",
      "name": "Site 2"
    }
  ]
}
```

#### `POST /api/bulk/watchers/delete`
**What it does:** Delete many monitors at once  
**Input:**
```json
{
  "watcherIds": ["abc-123", "xyz-456", "def-789"]
}
```
**Output:**
```json
{
  "operationId": "bulk-op-456",
  "deleted": 3,
  "failed": 0
}
```

#### `POST /api/bulk/watchers/check`
**What it does:** Check many monitors right now  
**Input:**
```json
{
  "watcherIds": ["abc-123", "xyz-456"]
}
```
**Output:**
```json
{
  "operationId": "bulk-op-789",
  "initiated": 2,
  "message": "Checks initiated for 2 watchers"
}
```

#### `GET /api/bulk/operations`
**What it does:** See history of bulk operations  
**Input:** Optional `limit` query (default 50)  
**Output:**
```json
[
  {
    "id": "bulk-op-123",
    "operationType": "create",
    "status": "completed",
    "successCount": 50,
    "errorCount": 0,
    "createdAt": "2025-10-19T09:00:00.000Z"
  }
]
```

#### `GET /api/bulk/operations/:id`
**What it does:** Check status of a bulk operation  
**Input:** ID in URL  
**Output:**
```json
{
  "id": "bulk-op-123",
  "operationType": "create",
  "status": "completed",
  "progress": 100,
  "successCount": 50,
  "errorCount": 0,
  "completedAt": "2025-10-19T09:05:00.000Z"
}
```

---

### 9️⃣ USER MANAGEMENT (5 endpoints)

#### `GET /api/user/me`
**What it does:** Get your profile  
**Input:** None  
**Output:**
```json
{
  "id": "user-123",
  "username": "john_doe",
  "email": "john@example.com",
  "timezone": "America/New_York",
  "defaultAlertThreshold": 5,
  "retentionDays": 30,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### `GET /api/user/credits`
**What it does:** Check how many credits you have left  
**Input:** None  
**Output:**
```json
{
  "freeCredits": 100,
  "paidCredits": 500,
  "total": 600,
  "message": "You have 600 credits remaining"
}
```

#### `GET /api/user/usage?limit=50`
**What it does:** See your usage history  
**Input:** Optional `limit` query (default 50)  
**Output:**
```json
{
  "transactions": [
    {
      "type": "check",
      "amount": -1,
      "description": "Watcher check: My Website Monitor",
      "createdAt": "2025-10-19T10:00:00.000Z"
    },
    {
      "type": "purchase",
      "amount": 100,
      "description": "Credit purchase",
      "createdAt": "2025-10-18T15:00:00.000Z"
    }
  ],
  "total": 2
}
```

#### `PUT /api/user/preferences`
**What it does:** Update your settings  
**Input:**
```json
{
  "timezone": "America/Los_Angeles",
  "defaultAlertThreshold": 7,
  "retentionDays": 90
}
```
**Output:**
```json
{
  "id": "user-123",
  "timezone": "America/Los_Angeles",
  "defaultAlertThreshold": 7,
  "retentionDays": 90,
  "updatedAt": "2025-10-19T10:30:00.000Z"
}
```

#### `POST /api/user/api-key/regenerate`
**What it does:** Get a new API key  
**Input:** None  
**Output:**
```json
{
  "apiKey": "new-api-key-abc-123-def-456",
  "message": "API key regenerated successfully. Save it securely!",
  "warning": "Your old API key will no longer work"
}
```

---

### 🔟 SNAPSHOTS & COMPARISON (4 endpoints)

#### `GET /api/snapshots/:id`
**What it does:** Get details of a snapshot  
**Input:** ID in URL  
**Output:**
```json
{
  "id": "snap-123",
  "watcherId": "abc-123",
  "content": "Full webpage content here...",
  "contentHash": "sha256-abc123",
  "statusCode": 200,
  "responseTime": 245,
  "location": "us-east",
  "createdAt": "2025-10-19T10:00:00.000Z"
}
```

#### `DELETE /api/snapshots/:id`
**What it does:** Delete a snapshot  
**Input:** ID in URL  
**Output:**
```json
{
  "message": "Snapshot deleted successfully"
}
```

#### `POST /api/snapshots/compare`
**What it does:** Compare two snapshots  
**Input:**
```json
{
  "snapshot1Id": "snap-old",
  "snapshot2Id": "snap-new"
}
```
**Output:**
```json
{
  "snapshot1": {
    "id": "snap-old",
    "createdAt": "2025-10-19T09:00:00.000Z",
    "hash": "abc123"
  },
  "snapshot2": {
    "id": "snap-new",
    "createdAt": "2025-10-19T10:00:00.000Z",
    "hash": "xyz789"
  },
  "similarity": 0.65,
  "identical": false,
  "summary": "Content has changed significantly"
}
```

#### `GET /api/changes/:id/diff?format=json`
**What it does:** See what changed between snapshots  
**Input:** Change ID in URL, optional `format` query (json or html)  
**Output (JSON):**
```json
{
  "changeId": "change-123",
  "summary": "Pricing changed",
  "type": "pricing",
  "impact": 8,
  "before": {
    "content": "Pro Plan: $99/month...",
    "hash": "abc123",
    "timestamp": "2025-10-19T09:00:00.000Z"
  },
  "after": {
    "content": "Pro Plan: $149/month...",
    "hash": "xyz789",
    "timestamp": "2025-10-19T10:00:00.000Z"
  },
  "whatChanged": "Price increased from $99 to $149 (50% increase)",
  "recommendedAction": "Review pricing strategy and notify sales team"
}
```

---

### 1️⃣1️⃣ DASHBOARD & INSIGHTS (2 endpoints)

#### `GET /api/dashboard/metrics`
**What it does:** Get your dashboard stats  
**Input:** None  
**Output:**
```json
{
  "totalWatchers": 25,
  "activeWatchers": 20,
  "totalChanges": 150,
  "highImpactChanges": 10,
  "creditsUsed": 75,
  "creditsRemaining": 525,
  "checksToday": 48,
  "changesThisWeek": 23
}
```

#### `GET /api/dashboard/insights`
**What it does:** Get AI insights about your monitoring  
**Input:** None  
**Output:**
```json
{
  "summary": {
    "totalWatchers": 25,
    "activeWatchers": 20,
    "recentChanges": 15,
    "highImpactChanges": 3,
    "avgImpact": "5.2"
  },
  "insights": [
    "⚠️ 3 high-impact changes detected in last 24 hours",
    "📊 Monitoring 25 targets across 5 industries",
    "🔥 High change velocity on competitor.com",
    "✅ All monitors are healthy and active"
  ],
  "recommendations": [
    "Review high-impact changes immediately",
    "Consider increasing check frequency for competitor.com",
    "Storage usage at 45% - no action needed"
  ]
}
```

---

### 1️⃣2️⃣ WEBHOOKS (3 endpoints)

#### `GET /api/webhooks/deliveries?limit=50`
**What it does:** See webhook delivery history  
**Input:** Optional `limit` query (default 50)  
**Output:**
```json
{
  "deliveries": [
    {
      "id": "delivery-123",
      "changeId": "change-456",
      "webhookUrl": "https://your-webhook.com/alert",
      "httpStatus": 200,
      "attempt": 1,
      "deliveredAt": "2025-10-19T10:00:30.000Z",
      "createdAt": "2025-10-19T10:00:00.000Z"
    },
    {
      "id": "delivery-789",
      "changeId": "change-101",
      "webhookUrl": "https://your-webhook.com/alert",
      "httpStatus": 500,
      "attempt": 3,
      "deliveredAt": null,
      "nextRetryAt": "2025-10-19T10:45:00.000Z",
      "createdAt": "2025-10-19T10:15:00.000Z"
    }
  ],
  "total": 2
}
```

#### `POST /api/webhooks/deliveries/:id/retry`
**What it does:** Retry a failed webhook  
**Input:** Delivery ID in URL  
**Output:**
```json
{
  "message": "Webhook delivery retry initiated",
  "deliveryId": "delivery-789",
  "attempt": 4
}
```

#### `POST /api/webhooks/test`
**What it does:** Test if your webhook works  
**Input:**
```json
{
  "url": "https://your-webhook.com/test",
  "payload": {
    "test": true,
    "message": "Testing webhook configuration"
  }
}
```
**Output:**
```json
{
  "success": true,
  "status": 200,
  "statusText": "OK",
  "responseTime": 145,
  "body": "Webhook received successfully"
}
```

---

### 1️⃣3️⃣ IMPORT/EXPORT (2 endpoints)

#### `POST /api/watchers/import`
**What it does:** Import multiple monitors from JSON  
**Input:**
```json
{
  "watchers": [
    {
      "name": "Imported Monitor 1",
      "targetType": "webpage",
      "targetUrl": "https://site1.com",
      "checkFrequency": "hourly"
    },
    {
      "name": "Imported Monitor 2",
      "targetType": "api",
      "targetUrl": "https://api.site2.com",
      "checkFrequency": "daily"
    }
  ]
}
```
**Output:**
```json
{
  "success": true,
  "count": 2,
  "watchers": [
    {
      "id": "new-abc",
      "name": "Imported Monitor 1"
    },
    {
      "id": "new-xyz",
      "name": "Imported Monitor 2"
    }
  ]
}
```

---

### 1️⃣4️⃣ STORAGE MANAGEMENT (2 endpoints)

#### `GET /api/user/storage`
**What it does:** Check how much storage you're using  
**Input:** None  
**Output:**
```json
{
  "storage": {
    "totalMB": 125.5,
    "snapshotsMB": 100.2,
    "changesMB": 25.3,
    "snapshotCount": 450,
    "changeCount": 89,
    "oldestSnapshot": "2025-09-19T10:00:00.000Z"
  },
  "preferences": {
    "retentionDays": 30,
    "keepImportantChanges": true
  },
  "insights": [
    "💾 Using 125.5MB of storage",
    "📦 450 snapshots stored",
    "🗑️ 45 snapshots older than 30 days can be cleaned"
  ]
}
```

#### `POST /api/user/storage/cleanup`
**What it does:** Delete old data to free space  
**Input:**
```json
{
  "retentionDays": 30,
  "keepImportantChanges": true
}
```
**Output:**
```json
{
  "cleanup": {
    "snapshotsDeleted": 45,
    "spaceSavedMB": 35.2
  },
  "storage": {
    "totalMB": 90.3,
    "snapshotsMB": 65.0,
    "changesMB": 25.3
  },
  "message": "Successfully deleted 45 old snapshots and freed 35.2MB of space"
}
```

---

## 🎯 Common Use Cases

### Monitor a Website
```bash
1. POST /api/watchers - Create monitor
2. POST /api/watchers/:id/check - Check immediately
3. GET /api/watchers/:id/changes - See what changed
```

### Track Competitor
```bash
1. POST /api/competitors - Add competitor
2. POST /api/watchers - Create monitor for their site
3. GET /api/competitors/:id/intelligence - Get AI insights
```

### Bulk Setup
```bash
1. POST /api/bulk/watchers/create - Create 50 monitors at once
2. GET /api/bulk/operations/:id - Check progress
```

### Check Storage
```bash
1. GET /api/user/storage - See usage
2. POST /api/user/storage/cleanup - Clean old data
```

---

## ⚡ Quick Tips

**Creating Monitors:**
- `targetType`: webpage, api, document, pdf
- `checkFrequency`: hourly, daily, weekly, custom
- Add `cssSelector` to monitor specific parts only

**Understanding Impact:**
- 1-3 = Low (minor changes)
- 4-6 = Medium (notable changes)
- 7-10 = High (critical changes)

**Storage Management:**
- Default retention: 30 days
- Important changes (impact ≥7) are kept forever
- Run cleanup to free space

**Webhooks:**
- Automatic retry up to 5 times
- 1 hour between retries
- Check delivery status regularly

---

## 🔒 Error Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request (check your input) |
| `401` | Missing/invalid API key |
| `404` | Not found |
| `500` | Server error |

**Error Format:**
```json
{
  "error": "Detailed error message here"
}
```

---

**Need help?** All endpoints are tested and ready to use!
