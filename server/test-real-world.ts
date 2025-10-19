import app from './routes-cloudflare';
import type { Env } from './routes-cloudflare';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Please configure your database.');
  console.error('   Run: npm run db:push');
  process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('⚠️  OPENROUTER_API_KEY not set. AI features will be skipped.');
}

const TEST_ENV: Env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
};

const TEST_USER = `test-user-${Date.now()}`;

async function makeRequest(path: string, options: RequestInit = {}) {
  const url = `http://localhost${path}`;
  const request = new Request(url, {
    ...options,
    headers: {
      'x-rapidapi-user': TEST_USER,
      ...(options.headers || {}),
    },
  });
  return await app.fetch(request, TEST_ENV);
}

async function testEndpoint(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 REAL-WORLD API TESTING SUITE\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;

  // ============================================================================
  // HEALTH & AUTHENTICATION
  // ============================================================================
  console.log('\n📊 TESTING: Health & Authentication');
  console.log('-'.repeat(60));

  if (await testEndpoint('Health check returns OK', async () => {
    const res = await makeRequest('/api/health');
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check failed');
  })) passed++; else failed++;

  if (await testEndpoint('Auto-creates user on first request', async () => {
    const res = await makeRequest('/api/user/me');
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.id) throw new Error('User not created');
  })) passed++; else failed++;

  // ============================================================================
  // REAL-WORLD QUICK CHECKS
  // ============================================================================
  console.log('\n🌐 TESTING: Real-World Website Scraping');
  console.log('-'.repeat(60));

  if (await testEndpoint('Check Example.com (Simple HTML)', async () => {
    const res = await makeRequest('/api/check/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const data = await res.json();
    if (!data.contentHash) throw new Error('No hash returned');
    console.log(`   → Content hash: ${data.contentHash.substring(0, 16)}...`);
    console.log(`   → Response time: ${data.metadata.responseTime}ms`);
  })) passed++; else failed++;

  if (await testEndpoint('Check GitHub API (JSON)', async () => {
    const res = await makeRequest('/api/check/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://api.github.com/zen' }),
    });
    const data = await res.json();
    if (!data.content) throw new Error('No content returned');
    console.log(`   → Content: "${data.content.substring(0, 50)}..."`);
  })) passed++; else failed++;

  if (await testEndpoint('Check HTTPBin (Echo Service)', async () => {
    const res = await makeRequest('/api/check/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://httpbin.org/headers' }),
    });
    const data = await res.json();
    if (!data.contentHash) throw new Error('No hash returned');
    console.log(`   → Status: ${data.metadata.statusCode}`);
  })) passed++; else failed++;

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================
  console.log('\n📦 TESTING: Batch URL Checking');
  console.log('-'.repeat(60));

  if (await testEndpoint('Batch check 3 different sites', async () => {
    const res = await makeRequest('/api/check/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [
          'https://example.com',
          'https://httpbin.org/get',
          { url: 'https://example.org', selector: 'h1' }
        ]
      }),
    });
    const data = await res.json();
    if (data.total !== 3) throw new Error('Expected 3 results');
    const successful = data.results.filter((r: any) => r.success).length;
    console.log(`   → Successful: ${successful}/${data.total}`);
  })) passed++; else failed++;

  // ============================================================================
  // WATCHER MANAGEMENT
  // ============================================================================
  console.log('\n👁️ TESTING: Watcher Management');
  console.log('-'.repeat(60));

  let watcherId: string;

  if (await testEndpoint('Create watcher for Example.com', async () => {
    const res = await makeRequest('/api/watchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Example.com Monitor',
        targetType: 'webpage',
        targetUrl: 'https://example.com',
        checkFrequency: 'hourly',
      }),
    });
    const data = await res.json();
    if (!data.id) throw new Error('No watcher ID returned');
    watcherId = data.id;
    console.log(`   → Watcher ID: ${watcherId.substring(0, 8)}...`);
  })) passed++; else failed++;

  if (await testEndpoint('List all watchers', async () => {
    const res = await makeRequest('/api/watchers');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array');
    console.log(`   → Total watchers: ${data.length}`);
  })) passed++; else failed++;

  if (await testEndpoint('Get specific watcher', async () => {
    const res = await makeRequest(`/api/watchers/${watcherId}`);
    const data = await res.json();
    if (data.id !== watcherId) throw new Error('Wrong watcher returned');
  })) passed++; else failed++;

  if (await testEndpoint('Update watcher settings', async () => {
    const res = await makeRequest(`/api/watchers/${watcherId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Example Monitor',
        checkFrequency: 'daily',
      }),
    });
    const data = await res.json();
    if (data.checkFrequency !== 'daily') throw new Error('Update failed');
  })) passed++; else failed++;

  if (await testEndpoint('Manual check trigger', async () => {
    const res = await makeRequest(`/api/watchers/${watcherId}/check`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.message) throw new Error('Check not initiated');
  })) passed++; else failed++;

  // ============================================================================
  // AI ANALYSIS
  // ============================================================================
  console.log('\n🤖 TESTING: AI-Powered Analysis');
  console.log('-'.repeat(60));

  if (await testEndpoint('Get available AI models', async () => {
    const res = await makeRequest('/api/ai/models');
    const data = await res.json();
    if (!Array.isArray(data.available)) throw new Error('No models returned');
    console.log(`   → Available models: ${data.available.length}`);
    data.available.forEach((m: any) => {
      console.log(`      - ${m.name} (${m.tier})`);
    });
  })) passed++; else failed++;

  if (TEST_ENV.OPENROUTER_API_KEY) {
    if (await testEndpoint('AI analysis of content changes', async () => {
      const res = await makeRequest('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'BEFORE: Price $99/month\nAFTER: Price $149/month - New premium features added',
          model: 'deepseek/deepseek-r1:free',
          analysisType: 'competitor',
        }),
      });
      const data = await res.json();
      if (!data.analysis) throw new Error('No analysis returned');
      console.log(`   → Analysis preview: ${data.analysis.substring(0, 100)}...`);
      console.log(`   → Model used: ${data.model}`);
    })) passed++; else failed++;

    if (await testEndpoint('AI sentiment analysis', async () => {
      const res = await makeRequest('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'We are excited to announce major improvements to our service! Better performance, lower prices, and new features coming soon.',
          analysisType: 'general',
        }),
      });
      const data = await res.json();
      if (!data.analysis) throw new Error('No analysis returned');
      console.log(`   → Sentiment detected in analysis`);
    })) passed++; else failed++;
  } else {
    console.log('   ⚠️ Skipping AI tests (OPENROUTER_API_KEY not set)');
    failed += 2;
  }

  // ============================================================================
  // COMPETITOR TRACKING
  // ============================================================================
  console.log('\n🎯 TESTING: Competitor Intelligence');
  console.log('-'.repeat(60));

  let competitorId: string;

  if (await testEndpoint('Add competitor for tracking', async () => {
    const res = await makeRequest('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitorName: 'Acme Corp',
        domain: 'acme.example.com',
        industry: 'SaaS',
        monitoringFocus: ['pricing', 'features'],
      }),
    });
    const data = await res.json();
    if (!data.id) throw new Error('No competitor ID returned');
    competitorId = data.id;
    console.log(`   → Competitor ID: ${competitorId.substring(0, 8)}...`);
  })) passed++; else failed++;

  if (await testEndpoint('List all competitors', async () => {
    const res = await makeRequest('/api/competitors');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array');
    console.log(`   → Tracking ${data.length} competitor(s)`);
  })) passed++; else failed++;

  if (await testEndpoint('Get competitor intelligence', async () => {
    const res = await makeRequest(`/api/competitors/${competitorId}/intelligence`);
    const data = await res.json();
    if (!data.competitorName) throw new Error('No intelligence data');
    console.log(`   → Threat level: ${data.threatLevel}`);
  })) passed++; else failed++;

  // ============================================================================
  // DASHBOARD & METRICS
  // ============================================================================
  console.log('\n📊 TESTING: Dashboard & Analytics');
  console.log('-'.repeat(60));

  if (await testEndpoint('Get dashboard metrics', async () => {
    const res = await makeRequest('/api/dashboard/metrics');
    const data = await res.json();
    if (typeof data.totalWatchers !== 'number') throw new Error('Invalid metrics');
    console.log(`   → Total watchers: ${data.totalWatchers}`);
    console.log(`   → Active watchers: ${data.activeWatchers}`);
  })) passed++; else failed++;

  if (await testEndpoint('Get dashboard insights', async () => {
    const res = await makeRequest('/api/dashboard/insights');
    const data = await res.json();
    if (!data.summary) throw new Error('No insights returned');
    console.log(`   → Insights: ${data.insights.length}`);
    data.insights.forEach((insight: string) => {
      console.log(`      ${insight}`);
    });
  })) passed++; else failed++;

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================
  console.log('\n👤 TESTING: User Management');
  console.log('-'.repeat(60));

  if (await testEndpoint('Get user profile', async () => {
    const res = await makeRequest('/api/user/me');
    const data = await res.json();
    if (!data.username) throw new Error('No user data');
    if (data.password) throw new Error('Password exposed!');
    console.log(`   → Username: ${data.username}`);
  })) passed++; else failed++;

  if (await testEndpoint('Get user credits', async () => {
    const res = await makeRequest('/api/user/credits');
    const data = await res.json();
    if (typeof data.total !== 'number') throw new Error('Invalid credits');
    console.log(`   → Free credits: ${data.freeCredits}`);
    console.log(`   → Total credits: ${data.total}`);
  })) passed++; else failed++;

  if (await testEndpoint('Update user preferences', async () => {
    const res = await makeRequest('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timezone: 'America/New_York',
        defaultAlertThreshold: 7,
      }),
    });
    const data = await res.json();
    if (data.timezone !== 'America/New_York') throw new Error('Update failed');
  })) passed++; else failed++;

  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================
  console.log('\n💾 TESTING: Import/Export');
  console.log('-'.repeat(60));

  if (await testEndpoint('Export watcher as JSON', async () => {
    const res = await makeRequest(`/api/watchers/${watcherId}/export?format=json`);
    const data = await res.json();
    if (!data.id) throw new Error('Export failed');
    console.log(`   → Exported: ${data.name}`);
  })) passed++; else failed++;

  if (await testEndpoint('Export watcher as CSV', async () => {
    const res = await makeRequest(`/api/watchers/${watcherId}/export?format=csv`);
    const text = await res.text();
    if (!text.includes('name,targetType')) throw new Error('Invalid CSV');
    console.log(`   → CSV length: ${text.length} bytes`);
  })) passed++; else failed++;

  if (await testEndpoint('Bulk import watchers', async () => {
    const res = await makeRequest('/api/watchers/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watchers: [
          {
            name: 'GitHub Status',
            targetType: 'webpage',
            targetUrl: 'https://www.githubstatus.com',
            checkFrequency: 'hourly',
          },
          {
            name: 'HTTPBin API',
            targetType: 'api',
            targetUrl: 'https://httpbin.org/status/200',
            checkFrequency: 'daily',
          },
        ]
      }),
    });
    const data = await res.json();
    if (data.count !== 2) throw new Error('Import failed');
    console.log(`   → Imported ${data.count} watchers`);
  })) passed++; else failed++;

  // ============================================================================
  // CLEANUP
  // ============================================================================
  console.log('\n🧹 TESTING: Cleanup Operations');
  console.log('-'.repeat(60));

  if (await testEndpoint('Delete competitor', async () => {
    const res = await makeRequest(`/api/competitors/${competitorId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error('Delete failed');
  })) passed++; else failed++;

  if (await testEndpoint('Delete watcher', async () => {
    const res = await makeRequest(`/api/watchers/${watcherId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error('Delete failed');
  })) passed++; else failed++;

  // ============================================================================
  // RESULTS
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! API is production-ready!\n');
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed. Review errors above.\n`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
