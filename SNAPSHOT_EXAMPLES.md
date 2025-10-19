# 📸 SNAPSHOT SYSTEM - Complete Examples & Inputs/Outputs

## What Are Snapshots?
Snapshots are **text content captures** of web pages, APIs, or documents at specific points in time.
They store the HTML/JSON/text content in your PostgreSQL database.

## Real-World Example Flow

### Step 1: Create a Watcher
**Input:**
```bash
POST /api/watchers
Headers: x-rapidapi-user: youruser
Content-Type: application/json

{
  "name": "Monitor Competitor Pricing",
  "targetType": "webpage",
  "targetUrl": "https://competitor.com/pricing",
  "cssSelector": "#pricing-table"
}
```

**Output:**
```json
{
  "id": "watcher-123",
  "userId": "user-456",
  "name": "Monitor Competitor Pricing",
  "targetType": "webpage",
  "targetUrl": "https://competitor.com/pricing",
  "cssSelector": "#pricing-table",
  "checkFrequency": "daily",
  "isActive": true,
  "lastCheckAt": null,
  "createdAt": "2025-10-19T10:00:00Z"
}
```

### Step 2: System Takes First Snapshot (Automated)
The system scrapes the URL and creates a snapshot:

**What happens in the database:**
```sql
INSERT INTO snapshots (
  id,
  watcher_id,
  content,
  content_hash,
  status_code,
  response_time,
  created_at
) VALUES (
  'snapshot-1',
  'watcher-123',
  '<table id="pricing-table"><tr><td>Starter: $29/mo</td></tr></table>',
  'a1b2c3d4e5f6789...',  -- SHA-256 hash
  200,
  450,
  '2025-10-19 10:00:00'
);
```

### Step 3: Later, Content Changes
24 hours later, competitor raises price to $49/mo

**New snapshot created:**
```sql
INSERT INTO snapshots (
  id,
  watcher_id,
  content,
  content_hash,
  status_code,
  response_time,
  created_at
) VALUES (
  'snapshot-2',
  'watcher-123',
  '<table id="pricing-table"><tr><td>Starter: $49/mo</td></tr></table>',
  'z9y8x7w6v5u4321...',  -- Different hash!
  200,
  480,
  '2025-10-20 10:00:00'
);
```

### Step 4: System Detects Change
Compares hashes: `a1b2c3d4e5f6...` ≠ `z9y8x7w6v5u4...`

**Change record created:**
```sql
INSERT INTO changes (
  id,
  watcher_id,
  before_snapshot_id,
  after_snapshot_id,
  type,
  impact,
  summary,
  what_changed,
  recommended_action,
  created_at
) VALUES (
  'change-123',
  'watcher-123',
  'snapshot-1',
  'snapshot-2',
  'content',
  8,  -- High impact!
  'Pricing change detected',
  'Starter plan price increased from $29/mo to $49/mo (69% increase)',
  'Review pricing strategy immediately. Consider matching or highlighting our value proposition.',
  '2025-10-20 10:00:05'
);
```

### Step 5: Retrieve Snapshot History

**Input:**
```bash
GET /api/watchers/watcher-123/snapshots?limit=10
Headers: x-rapidapi-user: youruser
```

**Output:**
```json
{
  "watcherId": "watcher-123",
  "snapshots": [
    {
      "id": "snapshot-2",
      "watcherId": "watcher-123",
      "content": "<table id=\"pricing-table\"><tr><td>Starter: $49/mo</td></tr></table>",
      "contentHash": "z9y8x7w6v5u4321...",
      "statusCode": 200,
      "responseTime": 480,
      "createdAt": "2025-10-20T10:00:00Z"
    },
    {
      "id": "snapshot-1",
      "watcherId": "watcher-123",
      "content": "<table id=\"pricing-table\"><tr><td>Starter: $29/mo</td></tr></table>",
      "contentHash": "a1b2c3d4e5f6789...",
      "statusCode": 200,
      "responseTime": 450,
      "createdAt": "2025-10-19T10:00:00Z"
    }
  ]
}
```

### Step 6: Compare Snapshots

**Input:**
```bash
POST /api/snapshots/compare
Headers: x-rapidapi-user: youruser
Content-Type: application/json

{
  "snapshot1Id": "snapshot-1",
  "snapshot2Id": "snapshot-2"
}
```

**Output:**
```json
{
  "snapshot1": {
    "id": "snapshot-1",
    "createdAt": "2025-10-19T10:00:00Z",
    "hash": "a1b2c3d4e5f6789..."
  },
  "snapshot2": {
    "id": "snapshot-2",
    "createdAt": "2025-10-20T10:00:00Z",
    "hash": "z9y8x7w6v5u4321..."
  },
  "similarity": 0.65,
  "identical": false,
  "summary": "Content has changed"
}
```

### Step 7: View Formatted Diff

**Input (JSON format):**
```bash
GET /api/changes/change-123/diff?format=json
Headers: x-rapidapi-user: youruser
```

**Output:**
```json
{
  "changeId": "change-123",
  "summary": "Pricing change detected",
  "type": "content",
  "impact": 8,
  "before": {
    "content": "<table id=\"pricing-table\"><tr><td>Starter: $29/mo</td></tr></table>",
    "hash": "a1b2c3d4e5f6789...",
    "timestamp": "2025-10-19T10:00:00Z"
  },
  "after": {
    "content": "<table id=\"pricing-table\"><tr><td>Starter: $49/mo</td></tr></table>",
    "hash": "z9y8x7w6v5u4321...",
    "timestamp": "2025-10-20T10:00:00Z"
  },
  "whatChanged": "Starter plan price increased from $29/mo to $49/mo (69% increase)",
  "recommendedAction": "Review pricing strategy immediately."
}
```

**Input (HTML format):**
```bash
GET /api/changes/change-123/diff?format=html
```

**Output (HTML):**
```html
<div class="diff-viewer">
  <h2>Change: Pricing change detected</h2>
  <div class="diff-content">
    <div class="before">
      <h3>Before</h3>
      <pre>&lt;table id="pricing-table"&gt;
  &lt;tr&gt;&lt;td&gt;Starter: $29/mo&lt;/td&gt;&lt;/tr&gt;
&lt;/table&gt;</pre>
    </div>
    <div class="after">
      <h3>After</h3>
      <pre>&lt;table id="pricing-table"&gt;
  &lt;tr&gt;&lt;td&gt;Starter: $49/mo&lt;/td&gt;&lt;/tr&gt;
&lt;/table&gt;</pre>
    </div>
  </div>
</div>
```

---

## 📊 Storage Details

### Database Table Schema (PostgreSQL)
```sql
CREATE TABLE snapshots (
  id VARCHAR PRIMARY KEY,
  watcher_id VARCHAR REFERENCES watchers(id),
  content TEXT,              -- The actual HTML/JSON content
  content_hash VARCHAR,       -- SHA-256 hash for comparison
  signature TEXT,             -- Digital signature (optional)
  screenshot_url VARCHAR,     -- If visual screenshots enabled
  status_code INTEGER,        -- HTTP 200, 404, etc.
  response_time INTEGER,      -- Milliseconds
  headers JSONB,              -- HTTP headers
  created_at TIMESTAMP
);
```

### Storage Size Examples
| Content Type | Average Size | Example |
|--------------|--------------|---------|
| Small webpage | 5-10 KB | Simple landing page |
| Medium webpage | 50-100 KB | Product page with images |
| Large webpage | 200-500 KB | Full e-commerce site |
| API response | 1-50 KB | JSON data |

**Example: 100 watchers checking daily for 1 year**
- Snapshots: 100 watchers × 365 days = 36,500 snapshots
- Average size: 50 KB
- Total storage: 36,500 × 50 KB = **1.8 GB**
- ✅ Easily fits in free PostgreSQL tiers (Neon free = 3 GB)

---

## ☁️ Cloudflare Workers Compatibility

### ✅ FULLY COMPATIBLE!

**Why snapshots work perfectly with Cloudflare:**

#### 1. **PostgreSQL Database** - Multiple Options:

**Option A: Neon (Recommended)**
```bash
# Install driver
npm install @neondatabase/serverless

# .env or Cloudflare secrets
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname
```

**Option B: Cloudflare Hyperdrive (Fastest)**
```bash
# Create Hyperdrive binding
wrangler hyperdrive create my-hyperdrive \
  --connection-string="postgresql://user:pass@host/db"

# wrangler.toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-id"
```

**Option C: Supabase**
```bash
# Works with Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres
```

#### 2. **Text-only Storage** - No special storage needed:
- ✅ Snapshots = TEXT column in PostgreSQL
- ✅ Hashes = VARCHAR(64) for SHA-256
- ✅ Metadata = JSONB column
- ✅ No file storage required
- ✅ No S3/R2 needed (unless you want visual screenshots)

#### 3. **Cloudflare Workers Benefits:**
- 🌍 Global edge network (faster checks)
- 📈 Auto-scaling (unlimited watchers)
- ⏰ Cron triggers (scheduled checks)
- 💰 Free tier: 100,000 requests/day

---

## 🚀 What You Need for Cloudflare Deployment

### Minimal Setup (Text Snapshots Only):

**1. Database (Choose one):**
- Neon Serverless Postgres (Free tier: 3 GB)
- Supabase Postgres (Free tier: 500 MB)
- Cloudflare Hyperdrive + any Postgres

**2. Environment Variables:**
```bash
# In Cloudflare Dashboard > Workers > Settings > Variables
DATABASE_URL=postgresql://user:pass@host/database

# Or use Secrets for sensitive data
wrangler secret put DATABASE_URL
```

**3. Deploy:**
```bash
npm run build
wrangler deploy
```

**That's it!** Snapshots work out of the box.

---

## 🖼️ Optional: Visual Screenshots

If you want **actual image screenshots** (not just HTML text):

### Option 1: Cloudflare R2 Storage

**Setup:**
```bash
# Create R2 bucket
wrangler r2 bucket create snapshots

# wrangler.toml
[[r2_buckets]]
binding = "SNAPSHOTS_BUCKET"
bucket_name = "snapshots"
```

**Code:**
```typescript
// Take screenshot with API
const screenshot = await fetch('https://api.screenshotone.com/take', {
  method: 'POST',
  body: JSON.stringify({ 
    url: targetUrl,
    format: 'png'
  })
});

const imageBuffer = await screenshot.arrayBuffer();

// Store in R2
const key = `screenshots/${snapshotId}.png`;
await env.SNAPSHOTS_BUCKET.put(key, imageBuffer);

// Save URL in snapshot
snapshot.screenshotUrl = `https://your-r2-domain.com/${key}`;
```

**Cloudflare R2 Pricing:**
- ✅ Free tier: 10 GB storage, 1M Class A operations/month
- ✅ $0.015/GB/month after free tier
- ✅ **No egress fees** (unlike AWS S3!)
- ✅ Perfect for screenshots

### Option 2: External Screenshot Services

Free/cheap options:
- **ScreenshotOne**: $9/month for 1000 screenshots
- **ApiFlash**: Free tier available
- **Screenshot.rocks**: Self-hosted, free

---

## 💡 Summary

### Current Implementation (Text Snapshots):
✅ **Works in Cloudflare Workers** - Uses PostgreSQL  
✅ **Free** - No additional storage costs  
✅ **Scalable** - Handles millions of snapshots  
✅ **Fast** - Hash-based comparison  
✅ **Complete** - Full content history  

### If You Want Visual Screenshots:
📸 Add Cloudflare R2 storage  
📸 Use screenshot API service  
📸 Store image URLs in `screenshot_url` column  
📸 Still works perfectly with Cloudflare Workers!

---

## 🧪 Test the Snapshot System

**Create a test watcher and trigger a check:**
```bash
# 1. Create watcher
curl -X POST http://localhost:5000/api/watchers \
  -H "x-rapidapi-user: testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Snapshot",
    "targetType": "webpage",
    "targetUrl": "https://example.com"
  }'

# 2. Trigger manual check (creates snapshot)
curl -X POST http://localhost:5000/api/watchers/WATCHER_ID/check \
  -H "x-rapidapi-user: testuser"

# 3. View snapshots
curl http://localhost:5000/api/watchers/WATCHER_ID/snapshots \
  -H "x-rapidapi-user: testuser"
```

Your snapshots are ready to use in both Express and Cloudflare Workers! 🎉
