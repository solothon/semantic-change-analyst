# API Endpoints - Cloudflare Workers Ready

## Authentication
All endpoints (except `/api/health`) require one of:
- `x-rapidapi-user` header - Auto-creates user account
- `x-api-key` header - Direct API key authentication

## Endpoints Summary

### Health Check (No Auth)
```
GET /api/health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### Watchers Management

#### List Watchers
```
GET /api/watchers
```
Returns all watchers for authenticated user.

#### Create Watcher
```
POST /api/watchers
Content-Type: application/json

{
  "name": "My Website Monitor",
  "targetType": "webpage",
  "targetUrl": "https://example.com",
  "checkFrequency": "hourly",
  "cssSelector": ".main-content",
  "webhookUrl": "https://your-webhook.com/alerts"
}
```

#### Get Watcher
```
GET /api/watchers/:id
```

#### Update Watcher
```
PUT /api/watchers/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "checkFrequency": "daily"
}
```

#### Delete Watcher
```
DELETE /api/watchers/:id
```

#### Manual Check
```
POST /api/watchers/:id/check
```
Triggers immediate check for the watcher.

---

### Changes & History

#### Get All Changes
```
GET /api/changes?limit=25
```
Returns recent changes across all watchers (default limit: 25).

#### Get Watcher Changes
```
GET /api/watchers/:id/changes?limit=10
```
Returns changes for specific watcher (default limit: 10).

#### Get Watcher History
```
GET /api/watchers/:id/history?limit=30
```
Returns full history with snapshots and changes (default limit: 30).

**Response:**
```json
{
  "watcher": {
    "id": "uuid",
    "name": "My Website"
  },
  "history": [
    {
      "timestamp": "2025-10-19T10:00:00Z",
      "snapshotId": "uuid",
      "contentHash": "sha256-hash",
      "statusCode": 200,
      "responseTime": 250,
      "location": "cloudflare-edge",
      "changes": [
        {
          "type": "content",
          "impact": 7,
          "summary": "Major content update detected"
        }
      ]
    }
  ]
}
```

---

### Quick Checks

#### Quick Check
```
POST /api/check/quick
Content-Type: application/json

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
    "responseTime": 350,
    "headers": {}
  }
}
```

#### Batch Check
```
POST /api/check/batch
Content-Type: application/json

{
  "urls": [
    "https://example.com",
    { "url": "https://example.org", "selector": ".content" },
    "https://example.net"
  ]
}
```
Max 100 URLs per batch.

**Response:**
```json
{
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "content": "First 200 chars...",
      "contentHash": "sha256-hash",
      "metadata": {}
    },
    {
      "url": "https://failed.com",
      "success": false,
      "error": "Failed to scrape..."
    }
  ],
  "total": 2
}
```

---

### Import/Export

#### Export Watcher
```
GET /api/watchers/:id/export?format=json
GET /api/watchers/:id/export?format=csv
```
Export watcher configuration as JSON or CSV.

#### Import Watchers
```
POST /api/watchers/import
Content-Type: application/json

{
  "watchers": [
    {
      "name": "Site 1",
      "targetType": "webpage",
      "targetUrl": "https://example.com",
      "checkFrequency": "hourly"
    },
    {
      "name": "Site 2",
      "targetType": "api",
      "targetUrl": "https://api.example.com",
      "checkFrequency": "daily"
    }
  ]
}
```

---

### Webhooks

#### Get Webhook Deliveries
```
GET /api/webhooks/deliveries?limit=50
```
Returns webhook delivery history (default limit: 50).

#### Retry Webhook
```
POST /api/webhooks/deliveries/:id/retry
```
Retry a failed webhook delivery.

#### Test Webhook
```
POST /api/webhooks/test
Content-Type: application/json

{
  "url": "https://your-webhook.com/test",
  "payload": {
    "custom": "data"
  }
}
```
Test webhook configuration with custom payload.

---

### Dashboard

#### Get Metrics
```
GET /api/dashboard/metrics
```
Returns user dashboard metrics and KPIs.

**Response:**
```json
{
  "totalWatchers": 10,
  "activeWatchers": 8,
  "totalChanges": 45,
  "changesLastWeek": 12,
  "checksToday": 24
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limits

Cloudflare Workers Free Tier:
- 100,000 requests/day
- 10ms CPU time per request
- 50 subrequests per request

Cloudflare Workers Paid Plan:
- Unlimited requests
- 30s CPU time per request (extendable to 5min)
- 1,000 subrequests per request

---

## Example Usage

### cURL
```bash
# Health check
curl https://your-worker.workers.dev/api/health

# Create watcher
curl -X POST https://your-worker.workers.dev/api/watchers \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Site",
    "targetType": "webpage",
    "targetUrl": "https://example.com",
    "checkFrequency": "hourly"
  }'

# List watchers
curl https://your-worker.workers.dev/api/watchers \
  -H "x-api-key: your-api-key"
```

### JavaScript/TypeScript
```typescript
const API_URL = 'https://your-worker.workers.dev';
const API_KEY = 'your-api-key';

async function createWatcher() {
  const response = await fetch(`${API_URL}/api/watchers`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'My Monitor',
      targetType: 'webpage',
      targetUrl: 'https://example.com',
      checkFrequency: 'hourly'
    })
  });
  
  return response.json();
}
```

### Python
```python
import requests

API_URL = 'https://your-worker.workers.dev'
API_KEY = 'your-api-key'

def create_watcher():
    response = requests.post(
        f'{API_URL}/api/watchers',
        headers={
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
        },
        json={
            'name': 'My Monitor',
            'targetType': 'webpage',
            'targetUrl': 'https://example.com',
            'checkFrequency': 'hourly'
        }
    )
    return response.json()
```

---

## Cron Monitoring

The API includes automatic scheduled monitoring:
- **Frequency**: Every 30 minutes (configurable in `wrangler.toml`)
- **Process**: Checks all active watchers, creates snapshots, detects changes
- **Locations**: Runs from Cloudflare edge network
- **Webhooks**: Sends notifications for detected changes

View cron executions:
```bash
wrangler tail --format pretty
```
