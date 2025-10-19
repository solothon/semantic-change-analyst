# 🚀 Quick Start: Cloudflare + Neon (Copy & Paste Commands)

## Setup Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR API SETUP                          │
│                                                             │
│  ┌────────────────┐         ┌─────────────────┐           │
│  │   User Request │────────▶│ Cloudflare      │           │
│  │   (API Call)   │         │ Workers         │           │
│  └────────────────┘         │ (Your API)      │           │
│                             └────────┬────────┘           │
│                                      │                     │
│                                      │ Connects            │
│                                      ▼                     │
│                             ┌─────────────────┐           │
│                             │ Neon Database   │           │
│                             │ (PostgreSQL)    │           │
│                             │ - 15 Tables     │           │
│                             └─────────────────┘           │
│                                                             │
│  Result: All 48 endpoints working globally!                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Complete Setup (Copy & Paste These Commands)

### STEP 1: Get Neon Database (Web Interface)

1. Go to: **https://neon.tech**
2. Click "Sign Up" (free)
3. Create project: `semantic-change-alert`
4. Region: **US East (Ohio)**
5. **Copy connection string** (looks like this):
   ```
   postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

---

### STEP 2: Create Database Tables

```bash
# Install dependencies
npm install

# Set your Neon connection string
export DATABASE_URL="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Create all 15 tables automatically
npm run db:push
```

**Expected output:**
```
✓ Applied changes successfully!
  Created: users, watchers, snapshots, changes, competitors...
```

---

### STEP 3: Setup Cloudflare

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare (opens browser)
wrangler login

# Set database URL secret
wrangler secret put DATABASE_URL
# → Paste: postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require

# (Optional) Set OpenRouter API key for AI
wrangler secret put OPENROUTER_API_KEY
# → Get key from: https://openrouter.ai/keys
```

---

### STEP 4: Deploy

```bash
# Deploy to Cloudflare
wrangler deploy
```

**Output:**
```
✨ Published semantic-change-alert-api
   https://semantic-change-alert-api.YOUR-NAME.workers.dev
```

**Save this URL!** This is your live API.

---

## ✅ Test Your API

### Test 1: Health Check
```bash
curl https://YOUR-WORKER-URL.workers.dev/api/health
```

**Expected:**
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

### Test 2: Create Watcher (Tests Database Connection)
```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/watchers \
  -H "x-rapidapi-user: testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Monitor",
    "targetType": "webpage",
    "targetUrl": "https://example.com",
    "checkFrequency": "hourly"
  }'
```

**Expected:**
```json
{
  "id": "uuid-here",
  "name": "My First Monitor",
  "isActive": true,
  "createdAt": "..."
}
```

✅ **If you see this = Everything is working!**

---

### Test 3: List Your Watchers
```bash
curl https://YOUR-WORKER-URL.workers.dev/api/watchers \
  -H "x-rapidapi-user: testuser"
```

**Expected:**
```json
[
  {
    "id": "uuid",
    "name": "My First Monitor",
    "targetUrl": "https://example.com",
    "isActive": true
  }
]
```

---

## 🔍 Verify Data in Neon

### Check Database
1. Go to: **https://console.neon.tech**
2. Select your project
3. Click **"SQL Editor"**
4. Run:
   ```sql
   SELECT * FROM users;
   SELECT * FROM watchers;
   SELECT * FROM snapshots;
   ```

You should see your data!

---

## 📊 Monitor Your Setup

### View Cloudflare Logs
```bash
wrangler tail
```

**Output:**
```
GET /api/health - 200 OK (45ms)
POST /api/watchers - 201 Created (120ms)
GET /api/changes - 200 OK (85ms)
```

### View Cloudflare Dashboard
- URL: **https://dash.cloudflare.com**
- Navigate to: Workers & Pages → Your Worker
- See: Requests, Errors, Performance

### View Neon Dashboard
- URL: **https://console.neon.tech**
- See: Storage usage, Queries, Performance

---

## 🔄 Common Tasks

### Deploy Code Updates
```bash
wrangler deploy
```

### View Your Secrets
```bash
wrangler secret list
```

### Add New Secret
```bash
wrangler secret put SECRET_NAME
```

### Delete a Secret
```bash
wrangler secret delete SECRET_NAME
```

### Test Locally (Before Deploy)
```bash
wrangler dev
```

---

## 🚀 Advanced: Hyperdrive (10x Faster)

### Setup Hyperdrive
```bash
# Create Hyperdrive
wrangler hyperdrive create my-neon \
  --connection-string="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Output:**
```
✅ Created Hyperdrive
   ID: abc123-xyz789
```

### Update wrangler.toml
Open `wrangler.toml` and uncomment:
```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "abc123-xyz789"  # ← Your Hyperdrive ID
```

### Deploy with Hyperdrive
```bash
wrangler deploy
```

✅ **Now 10x faster database queries!**

---

## 💰 What You're Using (Free Tier)

### Cloudflare Workers (Free)
- ✅ 100,000 requests/day
- ✅ Global edge deployment (300+ locations)
- ✅ DDoS protection
- ✅ SSL certificates
- **Cost: $0/month**

### Neon Database (Free)
- ✅ 500 MB storage
- ✅ Unlimited compute
- ✅ 3 GB data transfer/month
- **Cost: $0/month**

**Total: $0/month** 🎉

---

## 🆘 Troubleshooting Commands

### Problem: "DATABASE_URL not configured"
```bash
# Set the secret
wrangler secret put DATABASE_URL

# Verify it's set
wrangler secret list
```

### Problem: "Tables don't exist"
```bash
# Create tables
export DATABASE_URL="your-neon-connection"
npm run db:push
```

### Problem: "Can't connect to database"
```bash
# Test connection locally
export DATABASE_URL="your-neon-connection"
node -e "const {Pool}=require('pg');new Pool({connectionString:process.env.DATABASE_URL}).query('SELECT NOW()').then(r=>console.log('✅ Connected:',r.rows[0])).catch(e=>console.log('❌ Error:',e.message))"
```

### Problem: "Deployment failed"
```bash
# Check login
wrangler whoami

# Re-login if needed
wrangler login

# Try deploy again
wrangler deploy
```

---

## 📋 Complete Checklist

- [ ] Neon account created
- [ ] Database project created in Neon
- [ ] Connection string copied
- [ ] `npm install` completed
- [ ] `npm run db:push` completed (15 tables created)
- [ ] Wrangler installed (`npm install -g wrangler`)
- [ ] Cloudflare account created
- [ ] `wrangler login` completed
- [ ] `wrangler secret put DATABASE_URL` completed
- [ ] `wrangler deploy` completed
- [ ] Health check works (curl test)
- [ ] Watcher creation works (curl test)
- [ ] Data visible in Neon SQL Editor

---

## 🎯 Your Working URLs

Replace these with your actual URLs:

**API URL:**
```
https://semantic-change-alert-api.YOUR-NAME.workers.dev
```

**Cloudflare Dashboard:**
```
https://dash.cloudflare.com → Workers & Pages
```

**Neon Console:**
```
https://console.neon.tech → Your Project
```

---

## 📱 All 48 Endpoints Now Live

### Authentication
All endpoints need ONE header:
```
x-rapidapi-user: your-username
OR
x-api-key: your-api-key
```

### Quick Examples

**Health:**
```bash
GET https://YOUR-URL.workers.dev/api/health
```

**Create Monitor:**
```bash
POST https://YOUR-URL.workers.dev/api/watchers
Headers: x-rapidapi-user: yourname
Body: {"name":"Monitor","targetUrl":"https://example.com","targetType":"webpage"}
```

**List Changes:**
```bash
GET https://YOUR-URL.workers.dev/api/changes
Headers: x-rapidapi-user: yourname
```

**Quick Check (No monitor):**
```bash
POST https://YOUR-URL.workers.dev/api/check/quick
Headers: x-rapidapi-user: yourname
Body: {"url":"https://example.com"}
```

**AI Analysis:**
```bash
POST https://YOUR-URL.workers.dev/api/ai/analyze
Headers: x-rapidapi-user: yourname
Body: {"content":"Text to analyze","model":"deepseek/deepseek-r1:free"}
```

See `COMPLETE_API_GUIDE.md` for all 48 endpoints!

---

## 🎉 Success!

Your API is now:
- ✅ Running on Cloudflare Workers (global)
- ✅ Connected to Neon Database (PostgreSQL)
- ✅ All 48 endpoints working
- ✅ Auto-monitoring every 30 minutes
- ✅ 100% FREE (free tier)

**Start using your API!** 🚀
