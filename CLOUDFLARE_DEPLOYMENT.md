# Cloudflare Workers Deployment Guide

## Overview
This API is optimized for Cloudflare Workers deployment with the following features:
- **Hono Framework**: Lightweight, fast, and Cloudflare-optimized
- **Scheduled Cron Jobs**: Automatic watcher monitoring every 30 minutes
- **PostgreSQL via Hyperdrive**: Connection pooling for optimal performance
- **Zero Cold Starts**: Sub-50ms response times globally

## Architecture

### Files Structure
```
server/
├── routes-cloudflare.ts       # API routes using Hono
├── worker-cloudflare.ts       # Main worker with fetch + scheduled handlers
├── worker-cron-cloudflare.ts  # Alternative cron-only worker
├── db-cloudflare.ts           # Database connection with Hyperdrive support
├── storage.ts                 # Database operations layer
└── services/
    └── scraper.ts             # Web scraping service

shared/
└── schema.ts                  # Drizzle ORM schema

wrangler.toml                  # Cloudflare Workers config
wrangler-cron.toml            # Alternative cron config
```

## Cloudflare-Compatible API Endpoints

All endpoints use JWT or API key authentication via headers:
- `x-rapidapi-user`: For RapidAPI users (auto-creates account)
- `x-api-key`: Direct API key authentication

### Core Endpoints ✅

#### Health Check
- `GET /api/health` - No auth required

#### Watchers Management
- `GET /api/watchers` - List all watchers
- `POST /api/watchers` - Create new watcher
- `GET /api/watchers/:id` - Get watcher details
- `PUT /api/watchers/:id` - Update watcher
- `DELETE /api/watchers/:id` - Delete watcher
- `POST /api/watchers/:id/check` - Manual check trigger

#### Changes & History
- `GET /api/changes` - Get all changes (limit: 25)
- `GET /api/watchers/:id/changes` - Get watcher changes
- `GET /api/watchers/:id/history` - Full history with snapshots

#### Quick Checks
- `POST /api/check/quick` - Single URL check
- `POST /api/check/batch` - Batch check (max 100 URLs)

#### Import/Export
- `GET /api/watchers/:id/export?format=json|csv` - Export watcher
- `POST /api/watchers/import` - Bulk import watchers

#### Webhooks
- `GET /api/webhooks/deliveries` - Webhook delivery history
- `POST /api/webhooks/deliveries/:id/retry` - Retry failed webhook
- `POST /api/webhooks/test` - Test webhook configuration

#### Dashboard
- `GET /api/dashboard/metrics` - Get user metrics/KPIs

## Deployment Steps

### 1. Prerequisites
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2. Database Setup

#### Option A: Using Hyperdrive (Recommended)
```bash
# Create Hyperdrive connection
wrangler hyperdrive create my-postgres \
  --connection-string="postgresql://user:pass@host:5432/dbname"

# Update wrangler.toml with your Hyperdrive ID
```

Edit `wrangler.toml`:
```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-id-here"
```

#### Option B: Direct Connection
Set DATABASE_URL as a secret:
```bash
wrangler secret put DATABASE_URL
# Paste your PostgreSQL connection string
```

### 3. Set Environment Variables
```bash
# Optional: Set API keys for AI features
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENROUTER_API_KEY
```

### 4. Deploy
```bash
# Deploy to production
wrangler deploy

# Deploy to staging
wrangler deploy --env staging

# Test locally
wrangler dev
```

### 5. Setup Cron Triggers
Cron triggers are configured in `wrangler.toml`:
```toml
[triggers]
crons = ["*/30 * * * *"]  # Every 30 minutes
```

Verify cron setup:
```bash
wrangler deployments list
```

## Performance Characteristics

### Cloudflare Workers Limits
- **Memory**: 128 MB per request
- **CPU Time**: 30 seconds (default), up to 5 minutes with paid plan
- **Request Timeout**: No hard limit (client connection dependent)
- **Subrequests**: 1,000 per request (paid), 50 (free)

### Optimizations Applied
✅ Database connection pooling (max 5 connections)
✅ Request timeout: 30 seconds for scraping
✅ Efficient memory usage with streaming
✅ Hash-based change detection (SHA-256)
✅ Lazy service initialization

## Monitoring & Debugging

### View Logs
```bash
# Real-time logs
wrangler tail

# Production logs
wrangler tail --env production

# Filter by status
wrangler tail --status error
```

### Check Cron Executions
```bash
# View recent cron runs
wrangler deployments list

# Check metrics
wrangler pages deployment list
```

### Common Issues

#### Database Connection Errors
```
Error: DATABASE_URL or HYPERDRIVE connection not configured
```
**Solution**: Set up Hyperdrive or add DATABASE_URL secret

#### CPU Limit Exceeded
```
Error: Worker exceeded CPU limit
```
**Solution**: 
- Reduce batch sizes
- Enable extended CPU time in wrangler.toml
- Optimize scraping selectors

#### Memory Limit Exceeded
```
Error: Worker exceeded memory limit
```
**Solution**:
- Reduce content size in snapshots
- Use streaming for large responses
- Limit batch operations

## Cost Optimization

### Free Tier Limits
- 100,000 requests/day
- 10ms CPU time per request
- 50 subrequests per request

### Paid Plan ($5/month)
- Unlimited requests
- 30s CPU time per request
- 1,000 subrequests per request

### Best Practices
1. Use Hyperdrive for connection pooling (saves $)
2. Implement caching for frequently accessed data
3. Batch operations when possible
4. Use cron triggers instead of polling

## API Testing

### Quick Test
```bash
# Test health endpoint
curl https://your-worker.workers.dev/api/health

# Create a watcher
curl -X POST https://your-worker.workers.dev/api/watchers \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Website",
    "targetType": "webpage",
    "targetUrl": "https://example.com",
    "checkFrequency": "hourly"
  }'
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 https://your-worker.workers.dev/api/health
```

## Security Considerations

✅ **Authentication**: All endpoints require x-rapidapi-user or x-api-key
✅ **HTTPS Only**: Cloudflare enforces TLS
✅ **Rate Limiting**: Cloudflare provides DDoS protection
✅ **Secrets Management**: Use Wrangler secrets (encrypted)
✅ **Database Security**: Connection via Hyperdrive (encrypted)

### Recommended Headers
```javascript
// Already implemented in routes
headers: {
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
}
```

## Scaling

### Horizontal Scaling
Cloudflare Workers automatically scale globally:
- **Edge Locations**: 300+ worldwide
- **Auto-scaling**: Handles traffic spikes automatically
- **No configuration needed**: Just deploy

### Database Scaling
With Hyperdrive:
- Connection pooling across all workers
- Automatic query caching
- Regional database replicas supported

## Next Steps

1. ✅ Deploy to Cloudflare Workers
2. ✅ Set up Hyperdrive for database
3. ✅ Configure cron triggers
4. ✅ Add monitoring/alerting
5. ⬜ Add custom domain
6. ⬜ Set up CI/CD with GitHub Actions
7. ⬜ Enable R2 for screenshot storage (optional)

## Support

For issues or questions:
- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- Hyperdrive: https://developers.cloudflare.com/hyperdrive/
