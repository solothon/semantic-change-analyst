# Complete Guide: Cloudflare Workers + Neon Database

## 🎯 Perfect Combination!

**Cloudflare Workers** (Your API) + **Neon Database** (Your Data) = Production-Ready API

This guide shows **exactly** how to connect them together.

---

## 📋 What You'll Have

✅ API running on Cloudflare (300+ global locations)  
✅ PostgreSQL database on Neon (serverless, auto-scaling)  
✅ All 48 endpoints working perfectly  
✅ Automatic monitoring every 30 minutes  
✅ 100% FREE to start (generous free tiers)

---

## 🚀 Step-by-Step Setup

### **STEP 1: Create Neon Database (3 minutes)**

#### 1.1 Sign Up for Neon
1. Go to **https://neon.tech**
2. Click "Sign Up" (use Google/GitHub for fastest signup)
3. Free tier includes:
   - 500 MB storage
   - Unlimited compute hours
   - 3 GB data transfer/month
   - No credit card required!

#### 1.2 Create Your Project
1. After login, click **"Create a project"**
2. Give it a name: `semantic-change-alert` (or any name)
3. Select region: **US East (Ohio)** (recommended for best Cloudflare connectivity)
4. Click **"Create project"**

#### 1.3 Get Your Connection String
After project creation, you'll see a connection string:

```
postgresql://username:password@ep-xyz-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Important:** Copy this entire string! You'll need it soon.

**Where to find it later:**
- Dashboard → Your Project → Connection Details → Connection String

---

### **STEP 2: Create Database Tables (2 minutes)**

Now we'll create all 15 tables in your Neon database.

#### 2.1 Install Dependencies (if not already)
```bash
npm install
```

#### 2.2 Set Database URL
**Option A: In Terminal**
```bash
export DATABASE_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Option B: In Replit**
1. Click "Secrets" (lock icon in sidebar)
2. Add: `DATABASE_URL` = your connection string
3. The terminal will pick it up automatically

#### 2.3 Create All Tables
```bash
npm run db:push
```

**You'll see output like:**
```
✓ Pulling schema from database...
✓ Changes:
  + Created table "users"
  + Created table "watchers"
  + Created table "snapshots"
  + Created table "changes"
  + Created table "competitors"
  + Created table "intelligence_reports"
  + Created table "webhooks"
  ... and 8 more tables
✓ Applied successfully!
```

**Done!** Your Neon database now has all 15 tables ready.

---

### **STEP 3: Deploy to Cloudflare (5 minutes)**

#### 3.1 Install Wrangler CLI
```bash
npm install -g wrangler
```

#### 3.2 Login to Cloudflare
```bash
wrangler login
```

This will:
- Open your browser
- Ask you to login/signup to Cloudflare (free account)
- Authorize Wrangler

**Don't have Cloudflare account?**
- Go to https://dash.cloudflare.com
- Sign up (free!)
- Verify email
- Then run `wrangler login` again

#### 3.3 Configure Database Connection

**Set your Neon database URL as a secret:**
```bash
wrangler secret put DATABASE_URL
```

When prompted, **paste your Neon connection string:**
```
postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Press Enter. You'll see:
```
✨ Success! Uploaded secret DATABASE_URL
```

#### 3.4 (Optional) Set OpenRouter API Key for AI Features
```bash
wrangler secret put OPENROUTER_API_KEY
```

**How to get OpenRouter key:**
1. Go to https://openrouter.ai
2. Sign up (free)
3. Go to Settings → Keys
4. Create new key
5. Copy and paste when prompted

**Note:** This is optional. AI features won't work without it, but all other endpoints will work fine.

---

### **STEP 4: Deploy Your API! 🚀**

```bash
wrangler deploy
```

**You'll see:**
```
 ⛅️ wrangler 3.x.x
------------------
Your worker has access to the following bindings:
- Secrets:
  - DATABASE_URL: (hidden)
  - OPENROUTER_API_KEY: (hidden)

✨ Success! Uploaded semantic-change-alert-api (x.xx sec)
   Published semantic-change-alert-api (0.xx sec)
   
   https://semantic-change-alert-api.YOUR-SUBDOMAIN.workers.dev
   
🎉 Deployment complete!
```

**Save your API URL!** This is your live API endpoint.

---

## ✅ Test Everything Works

### Test 1: Health Check (No Database)
```bash
curl https://semantic-change-alert-api.YOUR-SUBDOMAIN.workers.dev/api/health
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "version": "1.0.0"
}
```

✅ If you see this, your Cloudflare Worker is running!

---

### Test 2: Create User & Watcher (Tests Database)
```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/watchers \
  -H "x-rapidapi-user: testuser123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub Status Monitor",
    "targetType": "webpage",
    "targetUrl": "https://www.githubstatus.com",
    "checkFrequency": "hourly"
  }'
```

**Expected:**
```json
{
  "id": "abc-123-uuid",
  "name": "GitHub Status Monitor",
  "targetType": "webpage",
  "targetUrl": "https://www.githubstatus.com",
  "checkFrequency": "hourly",
  "isActive": true,
  "createdAt": "2025-10-19T12:01:00.000Z"
}
```

✅ If you see this, **Cloudflare + Neon are connected!** Your data is being saved!

---

### Test 3: Verify Data in Neon

1. Go to **https://console.neon.tech**
2. Select your project
3. Click **"SQL Editor"**
4. Run this query:
```sql
SELECT * FROM users;
```

You should see your `testuser123` user!

```sql
SELECT * FROM watchers;
```

You should see your "GitHub Status Monitor" watcher!

✅ **Perfect! Everything is working!**

---

## 🔧 How They Work Together

```
1. User makes request
   ↓
2. Cloudflare Worker receives it (300+ global locations)
   ↓
3. Worker connects to Neon Database
   ↓
4. Neon processes query (serverless PostgreSQL)
   ↓
5. Worker returns response
   
⚡ Total time: Usually < 100ms globally!
```

---

## 📊 Connection Details

### How Cloudflare Connects to Neon

**Your code uses:**
```typescript
// server/db-cloudflare.ts
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: env.DATABASE_URL  // ← Your Neon URL
});
```

**Connection pooling:**
- Reuses connections (faster)
- Automatically scales
- No manual management needed

**Security:**
- SSL/TLS encrypted
- Secrets stored securely in Cloudflare
- Never exposed in code

---

## 🚀 Advanced: Hyperdrive (Even Faster!)

Hyperdrive = Cloudflare's database connection optimizer

**Benefits:**
- 10x faster queries
- Connection pooling across all workers
- Reduces Neon costs

### Setup Hyperdrive (Optional)

```bash
wrangler hyperdrive create my-neon-db \
  --connection-string="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Output:**
```
✅ Created Hyperdrive config
   ID: abc123-xyz789-hyperdrive-id
```

**Edit `wrangler.toml`:**
```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "abc123-xyz789-hyperdrive-id"  # ← Your ID here
```

**Deploy again:**
```bash
wrangler deploy
```

✅ Now your API uses Hyperdrive! Queries are 10x faster!

---

## 💰 Cost Breakdown

### Free Tier (What You Start With)

**Cloudflare Workers:**
- ✅ 100,000 requests/day
- ✅ 128 MB memory
- ✅ Global deployment
- ✅ DDoS protection
- ✅ SSL certificates
- **Cost: $0/month**

**Neon Database:**
- ✅ 500 MB storage
- ✅ Unlimited compute hours
- ✅ 3 GB data transfer/month
- ✅ Auto-scaling
- **Cost: $0/month**

**Total: $0/month** for production-ready API! 🎉

### When You Need to Scale

**Cloudflare Workers Paid ($5/month):**
- Unlimited requests
- 30s CPU time per request
- 1,000 subrequests

**Neon Scale ($19/month):**
- 10 GB storage
- Unlimited data transfer
- Automatic backups
- 7-day point-in-time restore

**Total: $24/month** for millions of requests!

---

## 📈 Monitor Your Setup

### Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages"
3. Select your worker
4. View:
   - Request count
   - Error rate
   - Response time
   - Logs

### Neon Dashboard
1. Go to https://console.neon.tech
2. Select your project
3. View:
   - Storage usage
   - Query performance
   - Connection count
   - Database size

---

## 🔍 View Real-Time Logs

### Cloudflare Logs
```bash
wrangler tail
```

**You'll see:**
```
GET /api/health - 200 OK (45ms)
POST /api/watchers - 201 Created (120ms)
GET /api/changes - 200 OK (85ms)
```

### Neon Logs
1. Neon Console → Your Project → Monitoring
2. See all queries in real-time
3. Check slow queries

---

## 🆘 Troubleshooting

### Issue: "DATABASE_URL not configured"

**Solution:**
```bash
# Make sure you set the secret
wrangler secret put DATABASE_URL

# Verify it's set
wrangler secret list
```

**Output should show:**
```
DATABASE_URL: (hidden)
```

---

### Issue: "Connection refused" or "Database doesn't exist"

**Solution:**
1. Check your Neon database is running:
   - Go to https://console.neon.tech
   - Your project should show "Active"

2. Verify connection string is correct:
   - Neon Console → Connection Details
   - Copy the full string including `?sslmode=require`

3. Make sure tables are created:
   ```bash
   npm run db:push
   ```

---

### Issue: "Table 'users' doesn't exist"

**Solution:**
```bash
# Create tables
export DATABASE_URL="your-neon-connection-string"
npm run db:push
```

If that doesn't work:
```bash
# Force create
npm run db:push -- --force
```

---

### Issue: Worker deployment fails

**Solution:**
```bash
# Check you're logged in
wrangler whoami

# If not logged in
wrangler login

# Try deploying again
wrangler deploy
```

---

## 🔄 Update Your Deployment

Made code changes?

```bash
# Just deploy again
wrangler deploy
```

Changes go live in seconds! No downtime.

---

## 📚 What Happens Automatically

### 1. Scheduled Monitoring (Every 30 Minutes)
Your `wrangler.toml` has:
```toml
[triggers]
crons = ["*/30 * * * *"]
```

**This means:**
- Every 30 minutes, Cloudflare runs your worker
- Checks all active watchers
- Creates snapshots
- Detects changes
- Sends webhooks

**No manual intervention needed!**

### 2. Connection Pooling
Cloudflare automatically:
- Reuses database connections
- Closes idle connections
- Scales connections based on load

### 3. Global Distribution
Your API runs in **300+ locations**:
- Americas: New York, Los Angeles, São Paulo...
- Europe: London, Frankfurt, Paris...
- Asia: Tokyo, Singapore, Hong Kong...
- And more!

Users get routed to nearest location automatically!

---

## ✅ Verify Everything is Working

### Check 1: Database Tables Created
```bash
# Login to Neon SQL Editor
# Run this query:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**You should see 15 tables:**
- users
- watchers
- snapshots
- changes
- competitors
- intelligence_reports
- bulk_operations
- webhooks
- credit_transactions
- usage_analytics
- webhook_deliveries
- change_stream
- trend_analysis
- email_notifications
- teams

---

### Check 2: Cloudflare Worker Running
```bash
curl https://YOUR-WORKER-URL.workers.dev/api/health
```

Should return: `{"status":"ok",...}`

---

### Check 3: Database Connection Works
```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/api/watchers \
  -H "x-rapidapi-user: myuser" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","targetType":"webpage","targetUrl":"https://example.com"}'
```

Should return watcher details with an `id`.

---

### Check 4: Data Persists
```bash
# Create a watcher (see above)

# Then list all watchers
curl https://YOUR-WORKER-URL.workers.dev/api/watchers \
  -H "x-rapidapi-user: myuser"
```

Should return array with your watcher!

---

## 🎯 Full Example Workflow

### 1. Create Monitor
```bash
curl -X POST https://YOUR-URL.workers.dev/api/watchers \
  -H "x-rapidapi-user: john" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Competitor Pricing",
    "targetType": "webpage",
    "targetUrl": "https://competitor.com/pricing",
    "checkFrequency": "hourly",
    "cssSelector": ".pricing-table"
  }'
```

### 2. Trigger Immediate Check
```bash
curl -X POST https://YOUR-URL.workers.dev/api/watchers/WATCHER-ID/check \
  -H "x-rapidapi-user: john"
```

### 3. View Changes
```bash
curl https://YOUR-URL.workers.dev/api/changes \
  -H "x-rapidapi-user: john"
```

### 4. Check Your Data in Neon
Go to Neon SQL Editor:
```sql
SELECT * FROM watchers WHERE user_id = (
  SELECT id FROM users WHERE username = 'john'
);

SELECT * FROM snapshots LIMIT 10;

SELECT * FROM changes ORDER BY created_at DESC LIMIT 5;
```

**Everything is saved and queryable!**

---

## 🎉 Success Checklist

- [✅] Neon database created
- [✅] Database tables created (15 tables)
- [✅] Cloudflare account created
- [✅] Wrangler CLI installed
- [✅] DATABASE_URL secret set
- [✅] API deployed to Cloudflare
- [✅] Health check working
- [✅] Watchers can be created
- [✅] Data persists in Neon
- [✅] All 48 endpoints accessible

**Your production API is live!** 🚀

---

## 📖 Quick Reference

### Your API URL
```
https://semantic-change-alert-api.YOUR-NAME.workers.dev
```

### Your Neon Database
```
https://console.neon.tech → Your Project
```

### Deploy Updates
```bash
wrangler deploy
```

### View Logs
```bash
wrangler tail
```

### View Secrets
```bash
wrangler secret list
```

### Set New Secret
```bash
wrangler secret put SECRET_NAME
```

---

## 🔗 Useful Links

- **Your Cloudflare Dashboard**: https://dash.cloudflare.com
- **Your Neon Console**: https://console.neon.tech
- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Neon Docs**: https://neon.tech/docs
- **OpenRouter (AI)**: https://openrouter.ai

---

## 💡 Pro Tips

1. **Use Hyperdrive** for production (10x faster queries)
2. **Monitor Neon usage** in dashboard to avoid hitting free tier limits
3. **Set up alerts** in Cloudflare for errors
4. **Use staging environment** for testing:
   ```bash
   wrangler deploy --env staging
   ```
5. **Check logs regularly** to spot issues early

---

**You're all set! Cloudflare Workers + Neon Database = Production-Ready API!** 🎊
