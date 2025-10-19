# Semantic Change Alert API - Complete Documentation

**Version:** 2.0.0  
**Last Updated:** October 19, 2025  
**Deployment:** Cloudflare Workers  
**AI Provider:** OpenRouter (Free Tier)

---

## 🚀 **Overview**

The most advanced semantic change monitoring API with AI-powered analysis, competitor tracking, and real-time insights. Built for Cloudflare Workers with global edge deployment.

### **Key Advantages Over Competitors**
- ✅ **Free AI Analysis** - OpenRouter integration with DeepSeek, Gemini, and Mistral models
- ✅ **Competitor Intelligence** - Track competitors with AI-powered insights
- ✅ **Bulk Operations** - Enterprise-grade batch processing
- ✅ **Intelligence Reports** - Trend analysis and forecasting
- ✅ **Global Edge Network** - Sub-50ms latency worldwide via Cloudflare

---

## 📚 **Table of Contents**

1. [Authentication](#authentication)
2. [Health & System](#health--system)
3. [Watchers Management](#watchers-management)
4. [Changes & History](#changes--history)
5. [Quick Checks](#quick-checks)
6. [AI Analysis (OpenRouter)](#ai-analysis-openrouter)
7. [Competitor Tracking](#competitor-tracking)
8. [Intelligence Reports](#intelligence-reports)
9. [Bulk Operations](#bulk-operations)
10. [User Management](#user-management)
11. [Snapshots & Comparison](#snapshots--comparison)
12. [Dashboard & Insights](#dashboard--insights)
13. [Webhooks](#webhooks)
14. [Import/Export](#importexport)

---

## 🔐 **Authentication**

All endpoints (except `/api/health`) require authentication via one of:

### **RapidAPI Header** (Recommended for RapidAPI users)
```bash
x-rapidapi-user: YOUR_RAPIDAPI_USERNAME
```

### **API Key Header**
```bash
x-api-key: YOUR_API_KEY
```

---

## 1. Health & System

### `GET /api/health`
**Public endpoint** - Check API status

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 2. Watchers Management

### `POST /api/watchers`
Create a new watcher to monitor a target

**Request:**
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

**Response:**
```json
{
  "id": "uuid",
  "name": "My Website Monitor",
  "targetType": "webpage",
  "targetUrl": "https://example.com",
  "isActive": true,
  "createdAt": "2025-10-19T10:00:00.000Z"
}
```

### `GET /api/watchers`
List all watchers for authenticated user

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "My Website Monitor",
    "targetUrl": "https://example.com",
    "isActive": true,
    "lastCheckAt": "2025-10-19T09:45:00.000Z"
  }
]
```

### `GET /api/watchers/:id`
Get specific watcher details

### `PUT /api/watchers/:id`
Update watcher configuration

**Request:**
```json
{
  "name": "Updated Name",
  "checkFrequency": "daily",
  "isActive": true
}
```

### `DELETE /api/watchers/:id`
Delete a watcher

### `POST /api/watchers/:id/check`
Manually trigger an immediate check

**Response:**
```json
{
  "message": "Check initiated",
  "watcherId": "uuid"
}
```

---

## 3. Changes & History

### `GET /api/changes?limit=25`
Get recent changes across all watchers

**Query Parameters:**
- `limit` (optional) - Default: 25

**Response:**
```json
[
  {
    "id": "uuid",
    "watcherId": "uuid",
    "type": "content",
    "impact": 7,
    "summary": "Major content update detected",
    "whatChanged": "Homepage hero section redesigned",
    "confidence": 0.95,
    "createdAt": "2025-10-19T10:00:00.000Z"
  }
]
```

### `GET /api/watchers/:id/changes?limit=10`
Get changes for specific watcher

### `GET /api/watchers/:id/history?limit=30`
Get full history with snapshots and changes

**Response:**
```json
{
  "watcher": { "id": "uuid", "name": "My Website" },
  "history": [
    {
      "timestamp": "2025-10-19T10:00:00.000Z",
      "snapshotId": "uuid",
      "contentHash": "sha256-hash",
      "statusCode": 200,
      "responseTime": 250,
      "location": "us-east",
      "changes": []
    }
  ]
}
```

---

## 4. Quick Checks

### `POST /api/check/quick`
Perform one-time check without creating a watcher

**Request:**
```json
{
  "url": "https://example.com",
  "selector": ".main-content"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "content": "First 500 chars of content...",
  "contentHash": "sha256-hash",
  "metadata": {
    "statusCode": 200,
    "contentType": "text/html",
    "responseTime": 350
  }
}
```

### `POST /api/check/batch`
Check multiple URLs in a single request (max 100)

**Request:**
```json
{
  "urls": [
    "https://example1.com",
    { "url": "https://example2.com", "selector": ".price" }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "url": "https://example1.com",
      "success": true,
      "contentHash": "sha256-hash",
      "metadata": { "statusCode": 200 }
    }
  ],
  "total": 2
}
```

---

## 5. AI Analysis (OpenRouter)

### `POST /api/ai/analyze`
**NEW** - Analyze content using OpenRouter's free AI models

**Request:**
```json
{
  "content": "Your content here to analyze",
  "model": "deepseek/deepseek-r1:free",
  "analysisType": "semantic"
}
```

**Response:**
```json
{
  "analysis": "AI-generated semantic analysis and insights...",
  "model": "deepseek/deepseek-r1:free",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

**Available Models:**
- `deepseek/deepseek-r1:free` - Best for reasoning (recommended)
- `deepseek/deepseek-v3:free` - General purpose
- `google/gemini-2.0-flash-exp:free` - Fast responses
- `mistralai/mistral-7b-instruct:free` - Compact model

**Analysis Types:**
- `semantic` - Content analysis and impact assessment
- `competitor` - Competitive intelligence and market positioning

### `GET /api/ai/models`
**NEW** - List available free AI models

**Response:**
```json
{
  "available": [
    {
      "id": "deepseek/deepseek-r1:free",
      "name": "DeepSeek R1",
      "tier": "free",
      "best_for": "reasoning"
    }
  ],
  "recommendation": "Use deepseek/deepseek-r1:free for best semantic analysis"
}
```

---

## 6. Competitor Tracking

### `POST /api/competitors`
**NEW** - Add a competitor to track

**Request:**
```json
{
  "competitorName": "Competitor Inc",
  "domain": "competitor.com",
  "industry": "SaaS",
  "monitoringFocus": ["pricing", "features", "content"]
}
```

### `GET /api/competitors`
**NEW** - List all tracked competitors

### `GET /api/competitors/:id`
**NEW** - Get specific competitor details

### `PUT /api/competitors/:id`
**NEW** - Update competitor information

### `DELETE /api/competitors/:id`
**NEW** - Remove competitor from tracking

### `GET /api/competitors/:id/intelligence`
**NEW** - Get AI-powered competitive intelligence

**Response:**
```json
{
  "competitorName": "Competitor Inc",
  "domain": "competitor.com",
  "threatLevel": "medium",
  "lastAnalyzed": "2025-10-19T10:00:00.000Z",
  "insights": {
    "aiGenerated": true,
    "note": "AI-powered competitive intelligence based on monitored changes"
  }
}
```

---

## 7. Intelligence Reports

### `GET /api/reports/trends?period=weekly`
**NEW** - Get trend analysis reports

**Query Parameters:**
- `period` - `daily`, `weekly`, `monthly`
- `watcherId` (optional) - Filter by specific watcher

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "reportType": "trend",
      "period": "weekly",
      "confidence": 0.85,
      "dataPoints": 50,
      "createdAt": "2025-10-19T10:00:00.000Z"
    }
  ],
  "period": "weekly"
}
```

### `POST /api/reports/generate`
**NEW** - Generate a new intelligence report

**Request:**
```json
{
  "reportType": "trend",
  "period": "weekly",
  "watcherIds": ["uuid1", "uuid2"]
}
```

**Report Types:**
- `trend` - Change trend analysis
- `competitor` - Competitive analysis
- `compliance` - Compliance monitoring
- `forecast` - Predictive insights

---

## 8. Bulk Operations

### `POST /api/bulk/watchers/create`
**NEW** - Create multiple watchers at once (max 100)

**Request:**
```json
{
  "watchers": [
    {
      "name": "Site 1",
      "targetType": "webpage",
      "targetUrl": "https://site1.com"
    },
    {
      "name": "Site 2",
      "targetType": "webpage",
      "targetUrl": "https://site2.com"
    }
  ]
}
```

**Response:**
```json
{
  "operationId": "uuid",
  "created": 2,
  "failed": 0,
  "watchers": [...]
}
```

### `POST /api/bulk/watchers/delete`
**NEW** - Delete multiple watchers

**Request:**
```json
{
  "watcherIds": ["uuid1", "uuid2", "uuid3"]
}
```

### `POST /api/bulk/watchers/check`
**NEW** - Trigger checks for multiple watchers

**Request:**
```json
{
  "watcherIds": ["uuid1", "uuid2", "uuid3"]
}
```

### `GET /api/bulk/operations`
**NEW** - List bulk operation history

### `GET /api/bulk/operations/:id`
**NEW** - Get bulk operation status

**Response:**
```json
{
  "id": "uuid",
  "operationType": "create",
  "status": "completed",
  "progress": 100,
  "successCount": 50,
  "errorCount": 0,
  "completedAt": "2025-10-19T10:05:00.000Z"
}
```

---

## 9. User Management

### `GET /api/user/me`
**NEW** - Get current user profile

**Response:**
```json
{
  "id": "uuid",
  "username": "user123",
  "email": "user@example.com",
  "timezone": "UTC",
  "defaultAlertThreshold": 5,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### `GET /api/user/credits`
**NEW** - Get credit balance

**Response:**
```json
{
  "freeCredits": 100,
  "paidCredits": 500,
  "total": 600
}
```

### `GET /api/user/usage?limit=50`
**NEW** - Get usage analytics

### `PUT /api/user/preferences`
**NEW** - Update user preferences

**Request:**
```json
{
  "timezone": "America/New_York",
  "defaultAlertThreshold": 7,
  "retentionDays": 90
}
```

### `POST /api/user/api-key/regenerate`
**NEW** - Generate a new API key

**Response:**
```json
{
  "apiKey": "new-uuid-key",
  "message": "API key regenerated successfully. Save it securely!"
}
```

---

## 10. Snapshots & Comparison

### `GET /api/snapshots/:id`
**NEW** - Get snapshot details

### `DELETE /api/snapshots/:id`
**NEW** - Delete a snapshot

### `POST /api/snapshots/compare`
**NEW** - Compare two snapshots

**Request:**
```json
{
  "snapshot1Id": "uuid1",
  "snapshot2Id": "uuid2"
}
```

**Response:**
```json
{
  "snapshot1": { "id": "uuid1", "createdAt": "...", "hash": "..." },
  "snapshot2": { "id": "uuid2", "createdAt": "...", "hash": "..." },
  "similarity": 0.65,
  "identical": false,
  "summary": "Content has changed"
}
```

### `GET /api/watchers/:id/snapshots?limit=30`
**NEW** - Get historical snapshots for a watcher

### `GET /api/changes/:id/diff?format=json`
**NEW** - Get formatted diff for a change

**Query Parameters:**
- `format` - `json` or `html`

**Response (JSON):**
```json
{
  "changeId": "uuid",
  "summary": "Pricing changed",
  "type": "pricing",
  "impact": 8,
  "before": {
    "content": "Old content preview...",
    "hash": "sha256-hash1",
    "timestamp": "2025-10-19T09:00:00.000Z"
  },
  "after": {
    "content": "New content preview...",
    "hash": "sha256-hash2",
    "timestamp": "2025-10-19T10:00:00.000Z"
  },
  "whatChanged": "Price increased from $99 to $149",
  "recommendedAction": "Review pricing strategy"
}
```

---

## 11. Dashboard & Insights

### `GET /api/dashboard/metrics`
Get key dashboard metrics

**Response:**
```json
{
  "totalWatchers": 25,
  "activeWatchers": 20,
  "totalChanges": 150,
  "highImpactChanges": 10,
  "creditsUsed": 75,
  "creditsRemaining": 25
}
```

### `GET /api/dashboard/insights`
**NEW** - Get AI-driven insights and recommendations

**Response:**
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
    "⚠️ 3 high-impact changes detected",
    "📊 Monitoring 25 targets",
    "🔥 High change velocity detected"
  ],
  "recommendations": [
    "Review high-impact changes immediately"
  ]
}
```

---

## 12. Webhooks

### `GET /api/webhooks/deliveries?limit=50`
List webhook delivery history

### `POST /api/webhooks/deliveries/:id/retry`
Retry a failed webhook delivery

### `POST /api/webhooks/test`
Test webhook configuration

**Request:**
```json
{
  "url": "https://your-webhook.com/endpoint",
  "payload": {
    "test": true,
    "message": "Test webhook"
  }
}
```

**Response:**
```json
{
  "success": true,
  "status": 200,
  "statusText": "OK",
  "body": "..."
}
```

---

## 13. Import/Export

### `GET /api/watchers/:id/export?format=json`
Export watcher configuration

**Query Parameters:**
- `format` - `json` or `csv`

### `POST /api/watchers/import`
Import watchers from JSON

**Request:**
```json
{
  "watchers": [
    {
      "name": "Imported Watcher 1",
      "targetType": "webpage",
      "targetUrl": "https://site1.com"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "watchers": [...]
}
```

---

## 🔥 **Complete Endpoint Summary**

### **Total: 48 Endpoints**

| Category | Count | Endpoints |
|----------|-------|-----------|
| **Health** | 1 | `/api/health` |
| **Watchers** | 6 | Create, List, Get, Update, Delete, Check |
| **Changes** | 3 | List all, By watcher, History |
| **Quick Checks** | 2 | Quick, Batch |
| **AI Analysis** | 2 | Analyze, List models |
| **Competitors** | 6 | CRUD + Intelligence |
| **Reports** | 2 | Trends, Generate |
| **Bulk Operations** | 5 | Create, Delete, Check, List, Status |
| **User Management** | 5 | Profile, Credits, Usage, Preferences, API Key |
| **Snapshots** | 4 | Get, Delete, Compare, List |
| **Diff Viewer** | 1 | Get formatted diff |
| **Dashboard** | 2 | Metrics, Insights |
| **Webhooks** | 3 | Deliveries, Retry, Test |
| **Import/Export** | 2 | Export, Import |

---

## 🌟 **Unique Features vs Competitors**

| Feature | This API | Competitors |
|---------|----------|-------------|
| **Free AI Analysis** | ✅ OpenRouter | ❌ |
| **Multi-Model Support** | ✅ 4+ models | ❌ |
| **Competitor Intelligence** | ✅ Built-in | ❌ |
| **Bulk Operations** | ✅ 100+ items | ⚠️ Limited |
| **Intelligence Reports** | ✅ AI-powered | ❌ |
| **Snapshot Comparison** | ✅ Full diff viewer | ⚠️ Basic |
| **Cloudflare Edge** | ✅ Global | ⚠️ Regional |
| **Real API Access** | ✅ Full API | ⚠️ Limited |

---

## 🚀 **Getting Started**

### **1. Get API Key**
```bash
# Via RapidAPI (automatic provisioning)
x-rapidapi-user: YOUR_USERNAME

# Or generate your own
POST /api/user/api-key/regenerate
```

### **2. Create Your First Watcher**
```bash
curl -X POST https://api.semanticalert.com/api/watchers \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Monitor",
    "targetType": "webpage",
    "targetUrl": "https://example.com",
    "checkFrequency": "hourly"
  }'
```

### **3. Analyze with AI**
```bash
curl -X POST https://api.semanticalert.com/api/ai/analyze \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your content to analyze",
    "model": "deepseek/deepseek-r1:free"
  }'
```

---

## 🔑 **Environment Setup**

### **Required Environment Variables**
```bash
# Database (required)
DATABASE_URL=postgresql://...

# OpenRouter API (optional but recommended for AI features)
OPENROUTER_API_KEY=your_openrouter_key
```

### **Get OpenRouter API Key**
1. Sign up at https://openrouter.ai
2. Generate API key (shown only once - save it!)
3. Add to environment variables

**Free Tier Limits:**
- 50 requests/day (default)
- 1,000 requests/day (with $10 credit)

---

## 📊 **Rate Limits**

| Plan | Requests/Day | Batch Size | AI Analysis |
|------|--------------|------------|-------------|
| **Free** | 100 | 10 | 50/day |
| **Pro** | 10,000 | 100 | 1,000/day |
| **Enterprise** | Unlimited | 1,000 | Unlimited |

---

## 🛠️ **Error Handling**

All endpoints return standard HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Invalid/missing API key |
| `403` | Forbidden - Access denied |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error |

**Error Response Format:**
```json
{
  "error": "Detailed error message",
  "note": "Additional context if available"
}
```

---

## 🎯 **Best Practices**

1. **Use Bulk Operations** for multiple watchers (5x faster)
2. **Leverage AI Analysis** for semantic understanding (free with OpenRouter)
3. **Enable Webhooks** for real-time notifications
4. **Set Appropriate Check Frequencies** (hourly for critical, daily for others)
5. **Use Competitor Tracking** for market intelligence
6. **Generate Intelligence Reports** for trend analysis

---

## 📞 **Support**

- **Documentation**: https://docs.semanticalert.com
- **RapidAPI Hub**: https://rapidapi.com/semantic-alert
- **GitHub Issues**: https://github.com/semantic-alert/api/issues

---

**Built with ❤️ for developers who need intelligent change monitoring**
