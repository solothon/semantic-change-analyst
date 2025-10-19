# Semantic Change Alert API - Cloudflare Workers

A production-ready API service that monitors web pages, JSON APIs, and documents, detecting semantic changes and providing intelligent analysis. Optimized for global deployment on Cloudflare Workers.

## 🚀 Features

### Core Monitoring
- **Web Pages**: Monitor HTML content with optional CSS selectors
- **JSON APIs**: Detect schema changes, field additions/removals, type changes
- **Batch Checking**: Process up to 100 URLs simultaneously
- **Multi-location**: Deployed globally across 300+ Cloudflare edge locations

### Intelligent Analysis
- **Hash-based Detection**: SHA-256 content comparison for instant change detection
- **Semantic Summaries**: Structured change analysis with type, impact (1-10), and recommended actions
- **Automated Monitoring**: Scheduled cron jobs every 30 minutes

### Enterprise Ready
- **Webhook Delivery**: Configurable webhook notifications for detected changes
- **Audit Compliance**: Complete snapshot history with timestamps
- **Multi-tenant**: Secure isolation with per-user data segregation
- **Global Edge**: Sub-50ms response times worldwide via Cloudflare's edge network

## 📋 Quick Start

### Prerequisites
- Cloudflare account ([sign up free](https://dash.cloudflare.com/sign-up))
- PostgreSQL database (Neon, Supabase, or any Postgres)
- Node.js 16.17.0 or later

### 1. Install Wrangler CLI
```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2. Clone and Install Dependencies
```bash
git clone <your-repo>
cd <repo-name>
npm install
```

### 3. Database Setup

#### Option A: Using Hyperdrive (Recommended)
```bash
# Create Hyperdrive connection for your Postgres database
wrangler hyperdrive create my-postgres \
  --connection-string="postgresql://user:pass@host:5432/dbname"

# Copy the Hyperdrive ID from the output
# Update wrangler.toml with your Hyperdrive ID
```

Edit `wrangler.toml`:
```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-id-here"
```

#### Option B: Direct Connection
```bash
# Set DATABASE_URL as a secret
wrangler secret put DATABASE_URL
# Paste your PostgreSQL connection string when prompted
```

### 4. Run Database Migrations
```bash
# Push schema to database
npm run db:push
```

### 5. Deploy

#### Local Development
```bash
wrangler dev
```

#### Deploy to Production
```bash
wrangler deploy
```

Your API will be available at: `https://semantic-change-alert-api.your-subdomain.workers.dev`

## 📚 API Documentation

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for complete API reference.

### Quick Example

```bash
# Health check
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

## 🔑 Authentication

All endpoints (except `/api/health`) require authentication via one of:

- **`x-rapidapi-user`** header - For RapidAPI marketplace integration (auto-creates accounts)
- **`x-api-key`** header - Direct API key authentication

When a user first makes a request with `x-rapidapi-user`, an account is automatically created.

## 🌍 Architecture

### File Structure
```
server/
├── routes-cloudflare.ts       # Hono-based API routes
├── worker-cloudflare.ts       # Main worker (fetch + cron)
├── db-cloudflare.ts           # Database connection with Hyperdrive
├── storage.ts                 # Database operations layer
└── services/
    └── scraper.ts             # Web scraping service

shared/
└── schema.ts                  # Drizzle ORM schema

wrangler.toml                  # Cloudflare Workers configuration
```

### Key Technologies
- **Hono**: Ultra-fast web framework optimized for Workers
- **Drizzle ORM**: Type-safe database operations
- **Hyperdrive**: Connection pooling for PostgreSQL
- **Cloudflare Cron Triggers**: Scheduled monitoring jobs

## ⚙️ Configuration

### Cron Monitoring
Configured in `wrangler.toml`:
```toml
[triggers]
crons = ["*/30 * * * *"]  # Every 30 minutes
```

### Environment Variables
Set via Wrangler secrets:
```bash
wrangler secret put DATABASE_URL        # If not using Hyperdrive
wrangler secret put OPENAI_API_KEY      # Optional: For AI features
wrangler secret put ANTHROPIC_API_KEY   # Optional: For AI features
```

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
wrangler tail

# Production logs
wrangler tail --env production

# Filter by status
wrangler tail --status error
```

### Check Deployments
```bash
wrangler deployments list
```

## 🚀 Performance

### Cloudflare Workers Limits
- **Free Tier**: 100,000 requests/day, 10ms CPU time
- **Paid Tier**: Unlimited requests, 30s CPU time (up to 5 min)
- **Memory**: 128 MB per request
- **Global**: 300+ edge locations worldwide

### Optimizations
✅ Database connection pooling via Hyperdrive  
✅ Efficient SHA-256 hash-based change detection  
✅ Request timeout: 30 seconds for scraping  
✅ Lazy service initialization  
✅ Edge caching where applicable

## 🔐 Security

✅ **HTTPS Only**: Enforced by Cloudflare  
✅ **Authentication**: API key or RapidAPI user headers  
✅ **Secrets Management**: Encrypted via Wrangler secrets  
✅ **Database Security**: Encrypted connections via Hyperdrive  
✅ **DDoS Protection**: Built-in Cloudflare protection

## 📖 Additional Documentation

- [Cloudflare Deployment Guide](./CLOUDFLARE_DEPLOYMENT.md) - Complete deployment walkthrough
- [API Endpoints Reference](./API_ENDPOINTS.md) - Full API documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## 🛠️ Development

### Local Testing
```bash
wrangler dev
```

### Type Checking
```bash
npm run check
```

### Database Schema Updates
```bash
# Push schema changes to database
npm run db:push

# Force push (if needed)
npm run db:push -- --force
```

## 🌐 Deployment Environments

### Staging
```bash
wrangler deploy --env staging
```

### Production
```bash
wrangler deploy --env production
```

## 💡 Use Cases

- **Website Monitoring**: Track content changes on competitor websites
- **API Monitoring**: Detect breaking changes in third-party APIs
- **Compliance**: Monitor legal documents and terms of service
- **Content Updates**: Get notified when blog posts or news articles change
- **Price Tracking**: Monitor pricing pages for changes

## 📝 License

MIT

## 🤝 Support

For issues or questions:
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- Hyperdrive: https://developers.cloudflare.com/hyperdrive/
