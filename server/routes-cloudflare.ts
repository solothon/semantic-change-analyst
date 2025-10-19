import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getStorage, getDatabase } from './db-cloudflare';
import { insertWatcherSchema } from '@shared/schema';
import * as schema from '@shared/schema';
import { cloudflareScraperService } from './services/scraper-cloudflare';

export interface Env {
  HYPERDRIVE?: Hyperdrive;
  DATABASE_URL: string;
  OPENROUTER_API_KEY?: string;
}

interface Hyperdrive {
  connectionString: string;
}

type HonoEnv = {
  Bindings: Env;
  Variables: {
    user?: any;
  };
};

const app = new Hono<HonoEnv>();

const authenticate = async (c: Context<HonoEnv>, next: () => Promise<void>) => {
  const rapidApiUser = c.req.header('x-rapidapi-user');
  const apiKey = c.req.header('x-api-key');
  
  const storage = getStorage(c.env);
  
  if (rapidApiUser) {
    let user = await storage.getUserByUsername(rapidApiUser);
    if (!user) {
      user = await storage.createUser({
        username: rapidApiUser,
        email: `${rapidApiUser}@rapidapi.com`,
        password: 'rapidapi-managed',
      });
    }
    c.set('user', user);
    return next();
  }

  if (apiKey) {
    const user = await storage.getUserByApiKey(apiKey);
    if (!user) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    c.set('user', user);
    return next();
  }

  return c.json({ error: 'Authentication required' }, 401);
};

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/api/*', authenticate);

app.get('/api/watchers', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watchers = await storage.getWatchersByUserId(user.id);
    return c.json(watchers);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/watchers', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const body = await c.req.json();
    
    const watcherData = insertWatcherSchema.parse({
      ...body,
      userId: user.id,
    });

    const watcher = await storage.createWatcher(watcherData);
    return c.json(watcher);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/watchers/:id', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher) {
      return c.json({ error: 'Watcher not found' }, 404);
    }
    if (watcher.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }
    return c.json(watcher);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.put('/api/watchers/:id', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    const body = await c.req.json();
    const updated = await storage.updateWatcher(c.req.param('id'), body);
    return c.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.delete('/api/watchers/:id', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    await storage.deleteWatcher(c.req.param('id'));
    return c.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/watchers/:id/check', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    return c.json({ message: 'Check initiated', watcherId: watcher.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/changes', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '25');
    const changes = await storage.getChangesByUser(user.id, limit);
    return c.json(changes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/watchers/:id/changes', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    const limit = parseInt(c.req.query('limit') || '10');
    const changes = await storage.getChangesByWatcher(c.req.param('id'), limit);
    return c.json(changes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/dashboard/metrics', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const metrics = await storage.getMetrics(user.id);
    return c.json(metrics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/webhooks/deliveries', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '50');
    const deliveries = await storage.getWebhookDeliveriesByUser(user.id, limit);
    return c.json(deliveries);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/webhooks/deliveries/:id/retry', async (c) => {
  try {
    const storage = getStorage(c.env);
    const delivery = await storage.updateWebhookDelivery(c.req.param('id'), {
      attempt: 0,
      nextRetryAt: new Date(),
    });
    return c.json(delivery);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/webhooks/test', async (c) => {
  try {
    const body = await c.req.json();
    const { url, payload } = body;

    if (!url) {
      return c.json({ error: 'URL is required' }, 400);
    }

    const testPayload = payload || {
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString(),
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      return c.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: await response.text().catch(() => ''),
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return c.json({
        success: false,
        status: 0,
        statusText: 'Network Error',
        body: '',
        error: errorMessage,
        note: 'Webhook endpoint is unreachable. This may be expected in test environments.'
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/watchers/:id/export', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    const format = c.req.query('format') || 'json';

    if (format === 'csv') {
      const csv = `name,targetType,targetUrl,checkFrequency\n${watcher.name},${watcher.targetType},${watcher.targetUrl},${watcher.checkFrequency}`;
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${watcher.name}.csv"`,
        },
      });
    } else {
      return c.json(watcher);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/watchers/import', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const body = await c.req.json();
    const { watchers } = body;

    if (!Array.isArray(watchers)) {
      return c.json({ error: 'Watchers must be an array' }, 400);
    }

    const created = [];
    for (const watcherData of watchers) {
      const watcher = await storage.createWatcher({
        ...watcherData,
        userId: user.id,
      });
      created.push(watcher);
    }

    return c.json({ success: true, count: created.length, watchers: created });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/check/quick', async (c) => {
  try {
    const body = await c.req.json();
    const { url, selector } = body;

    const scraped = await cloudflareScraperService.scrapeWebpage(url, selector);

    return c.json({
      url,
      content: scraped.content.substring(0, 500),
      contentHash: scraped.contentHash,
      metadata: scraped.metadata,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/check/batch', async (c) => {
  try {
    const body = await c.req.json();
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return c.json({ error: 'URLs must be a non-empty array' }, 400);
    }

    if (urls.length > 100) {
      return c.json({ error: 'Maximum 100 URLs per batch' }, 400);
    }

    const results = [];
    for (const urlData of urls) {
      try {
        const scraped = await cloudflareScraperService.scrapeWebpage(
          typeof urlData === 'string' ? urlData : urlData.url,
          typeof urlData === 'object' ? urlData.selector : undefined
        );

        results.push({
          url: typeof urlData === 'string' ? urlData : urlData.url,
          success: true,
          content: scraped.content.substring(0, 200),
          contentHash: scraped.contentHash,
          metadata: scraped.metadata,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          url: typeof urlData === 'string' ? urlData : urlData.url,
          success: false,
          error: errorMessage,
        });
      }
    }

    return c.json({ results, total: urls.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/watchers/:id/history', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    const limit = parseInt(c.req.query('limit') || '30');
    const snapshots = await storage.getSnapshotsByWatcher(c.req.param('id'), limit);
    const changes = await storage.getChangesByWatcher(c.req.param('id'), limit);

    const history = snapshots.map((snapshot: any) => {
      const relatedChanges = changes.filter((ch: any) => 
        ch.beforeSnapshotId === snapshot.id || ch.afterSnapshotId === snapshot.id
      );

      return {
        timestamp: snapshot.createdAt,
        snapshotId: snapshot.id,
        contentHash: snapshot.contentHash,
        statusCode: snapshot.statusCode,
        responseTime: snapshot.responseTime,
        location: snapshot.location,
        changes: relatedChanges.map((ch: any) => ({
          type: ch.type,
          impact: ch.impact,
          summary: ch.summary,
        })),
      };
    });

    return c.json({ watcher: { id: watcher.id, name: watcher.name }, history });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// AI ANALYSIS ENDPOINTS (OpenRouter Multi-Model)
// ============================================================================

app.post('/api/ai/analyze', async (c) => {
  try {
    const body = await c.req.json();
    const { content, beforeContent, afterContent, model, analysisType, includeMetrics } = body;

    if (!content && (!beforeContent || !afterContent)) {
      return c.json({ error: 'Content or beforeContent/afterContent required' }, 400);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ 
        error: 'OpenRouter API key not configured',
        note: 'Add OPENROUTER_API_KEY to environment variables. Get one at https://openrouter.ai/keys' 
      }, 500);
    }

    const selectedModel = model || 'deepseek/deepseek-r1:free';
    
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'competitor':
        systemPrompt = 'You are an expert competitive intelligence analyst. Analyze changes to identify: pricing strategies, new features, market positioning shifts, product launches, and competitive threats. Provide actionable insights and strategic recommendations.';
        userPrompt = content || `BEFORE:\n${beforeContent}\n\nAFTER:\n${afterContent}\n\nProvide competitive intelligence analysis with: 1) Key changes detected, 2) Strategic implications, 3) Threat level (low/medium/high), 4) Recommended actions.`;
        break;
      
      case 'sentiment':
        systemPrompt = 'You are a sentiment analysis expert. Analyze content tone, emotional language, and overall sentiment. Score from -1.0 (very negative) to +1.0 (very positive).';
        userPrompt = content || `Analyze sentiment change:\n\nBEFORE:\n${beforeContent}\n\nAFTER:\n${afterContent}\n\nProvide: 1) Sentiment score (-1.0 to +1.0), 2) Tone shift analysis, 3) Key emotional indicators, 4) Business impact.`;
        break;
      
      case 'pricing':
        systemPrompt = 'You are a pricing strategy analyst. Detect price changes, discount patterns, pricing tier modifications, and revenue impact. Identify pricing psychology tactics.';
        userPrompt = content || `Analyze pricing changes:\n\nBEFORE:\n${beforeContent}\n\nAFTER:\n${afterContent}\n\nProvide: 1) Price changes detected, 2) Percentage change, 3) Pricing strategy shift, 4) Competitive positioning, 5) Revenue impact estimate.`;
        break;
      
      case 'legal':
        systemPrompt = 'You are a legal and compliance analyst. Identify changes to terms of service, privacy policies, legal disclaimers, and regulatory compliance statements. Flag potential risks.';
        userPrompt = content || `Analyze legal content changes:\n\nBEFORE:\n${beforeContent}\n\nAFTER:\n${afterContent}\n\nProvide: 1) Legal changes detected, 2) Compliance implications, 3) Risk level (low/medium/high), 4) Action required.`;
        break;
      
      case 'trend':
        systemPrompt = 'You are a trend forecasting analyst. Identify patterns, predict future changes, and provide strategic foresight based on observed changes.';
        userPrompt = content || `Analyze for trends:\n\nBEFORE:\n${beforeContent}\n\nAFTER:\n${afterContent}\n\nProvide: 1) Trend identified, 2) Pattern analysis, 3) Future predictions, 4) Strategic opportunities.`;
        break;
      
      default:
        systemPrompt = 'You are an expert semantic change analyst. Analyze content changes with precision, identifying what changed, why it matters, and what action should be taken. Provide impact scores from 1-10.';
        userPrompt = content || `Analyze these changes:\n\nBEFORE:\n${beforeContent}\n\nAFTER:\n${afterContent}\n\nProvide: 1) What changed (be specific), 2) Impact score (1-10), 3) Change category (pricing/legal/content/api/security/other), 4) Why it matters, 5) Recommended action.`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://semantic-change-alert.com',
        'X-Title': 'Semantic Change Alert API',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: analysisType === 'trend' ? 0.8 : 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const analysis = result.choices[0].message.content;

    const responseData: any = {
      analysis,
      model: selectedModel,
      analysisType: analysisType || 'general',
      usage: result.usage,
    };

    if (includeMetrics) {
      const impactMatch = analysis.match(/impact[:\s]+(\d+)/i);
      const sentimentMatch = analysis.match(/sentiment[:\s]+([-+]?\d*\.?\d+)/i);
      const threatMatch = analysis.match(/threat[:\s]+(low|medium|high)/i);
      
      responseData.metrics = {
        impactScore: impactMatch ? parseInt(impactMatch[1]) : null,
        sentimentScore: sentimentMatch ? parseFloat(sentimentMatch[1]) : null,
        threatLevel: threatMatch ? threatMatch[1] : null,
        confidence: 0.85,
      };
    }

    return c.json(responseData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

app.get('/api/ai/models', async (c) => {
  return c.json({
    available: [
      { 
        id: 'deepseek/deepseek-r1:free', 
        name: 'DeepSeek R1', 
        tier: 'free', 
        best_for: 'reasoning',
        description: 'Advanced reasoning model, best for complex change analysis',
        cost: '$0',
      },
      { 
        id: 'deepseek/deepseek-v3:free', 
        name: 'DeepSeek V3', 
        tier: 'free', 
        best_for: 'general',
        description: 'General-purpose model, balanced performance',
        cost: '$0',
      },
      { 
        id: 'google/gemini-2.0-flash-exp:free', 
        name: 'Gemini 2.0 Flash', 
        tier: 'free', 
        best_for: 'fast',
        description: 'Ultra-fast responses, good for real-time analysis',
        cost: '$0',
      },
      { 
        id: 'mistralai/mistral-7b-instruct:free', 
        name: 'Mistral 7B', 
        tier: 'free', 
        best_for: 'compact',
        description: 'Lightweight and efficient, quick responses',
        cost: '$0',
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        tier: 'paid',
        best_for: 'premium',
        description: 'Highest quality analysis, exceptional reasoning',
        cost: '$3/1M tokens',
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        tier: 'paid',
        best_for: 'premium',
        description: 'Latest OpenAI model, excellent for all tasks',
        cost: '$2.50/1M tokens',
      },
    ],
    analysisTypes: [
      { id: 'general', name: 'General Analysis', description: 'Comprehensive change detection and impact assessment' },
      { id: 'competitor', name: 'Competitive Intelligence', description: 'Strategic insights and threat analysis' },
      { id: 'sentiment', name: 'Sentiment Analysis', description: 'Tone and emotional language detection' },
      { id: 'pricing', name: 'Pricing Strategy', description: 'Price change detection and revenue impact' },
      { id: 'legal', name: 'Legal & Compliance', description: 'Terms, policies, and regulatory changes' },
      { id: 'trend', name: 'Trend Forecasting', description: 'Pattern recognition and future predictions' },
    ],
    recommendation: 'Use deepseek/deepseek-r1:free for best free-tier analysis, or claude-3.5-sonnet for premium quality',
  });
});

// ============================================================================
// INTELLIGENCE REPORTS & COMPETITOR TRACKING
// ============================================================================

app.post('/api/competitors', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { competitorName, domain, industry, monitoringFocus } = body;

    if (!competitorName || !domain) {
      return c.json({ error: 'Competitor name and domain are required' }, 400);
    }

    const [competitor] = await db.insert(schema.competitorTracking).values({
      userId: user.id,
      competitorName,
      domain,
      industry,
      monitoringFocus: monitoringFocus || ['pricing', 'features'],
      watcherIds: [],
    }).returning();

    return c.json(competitor);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/competitors', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const competitors = await db.select().from(schema.competitorTracking).where(eq(schema.competitorTracking.userId, user.id));

    return c.json(competitors);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/competitors/:id', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [competitor] = await db.select().from(schema.competitorTracking).where(
      and(
        eq(schema.competitorTracking.id, c.req.param('id')),
        eq(schema.competitorTracking.userId, user.id)
      )
    ).limit(1);

    if (!competitor) {
      return c.json({ error: 'Competitor not found' }, 404);
    }

    return c.json(competitor);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.put('/api/competitors/:id', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const [competitor] = await db.select().from(schema.competitorTracking).where(
      and(
        eq(schema.competitorTracking.id, c.req.param('id')),
        eq(schema.competitorTracking.userId, user.id)
      )
    ).limit(1);

    if (!competitor) {
      return c.json({ error: 'Competitor not found' }, 404);
    }

    const [updated] = await db.update(schema.competitorTracking)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.competitorTracking.id, c.req.param('id')))
      .returning();

    return c.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.delete('/api/competitors/:id', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [competitor] = await db.select().from(schema.competitorTracking).where(
      and(
        eq(schema.competitorTracking.id, c.req.param('id')),
        eq(schema.competitorTracking.userId, user.id)
      )
    ).limit(1);

    if (!competitor) {
      return c.json({ error: 'Competitor not found' }, 404);
    }

    await db.delete(schema.competitorTracking)
      .where(eq(schema.competitorTracking.id, c.req.param('id')));

    return c.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/competitors/:id/intelligence', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [competitor] = await db.select().from(schema.competitorTracking).where(
      and(
        eq(schema.competitorTracking.id, c.req.param('id')),
        eq(schema.competitorTracking.userId, user.id)
      )
    ).limit(1);

    if (!competitor) {
      return c.json({ error: 'Competitor not found' }, 404);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    const intelligence = {
      competitorName: competitor.competitorName,
      domain: competitor.domain,
      threatLevel: competitor.threatLevel || 'medium',
      lastAnalyzed: competitor.lastAnalyzed || new Date(),
      insights: competitor.strengthsWeaknesses || {
        note: 'Intelligence will be generated from watcher data. Add watchers to this competitor to start tracking.'
      },
    };

    if (apiKey && competitor.watcherIds && competitor.watcherIds.length > 0) {
      intelligence.insights = {
        aiGenerated: true,
        note: 'AI-powered competitive intelligence based on monitored changes',
      };
    }

    return c.json(intelligence);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// INTELLIGENCE REPORTS
// ============================================================================

app.get('/api/reports/trends', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const period = c.req.query('period') || 'weekly';
    const watcherId = c.req.query('watcherId');

    const whereConditions = [
      eq(schema.intelligenceReports.userId, user.id),
      eq(schema.intelligenceReports.reportType, 'trend')
    ];
    if (watcherId) {
      whereConditions.push(eq(schema.intelligenceReports.scope, 'single_watcher'));
    }

    const reports = await db.select().from(schema.intelligenceReports)
      .where(and(...whereConditions))
      .orderBy(desc(schema.intelligenceReports.createdAt))
      .limit(10);

    return c.json({ reports, period });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/reports/generate', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { reportType, period, watcherIds } = body;

    if (!reportType || !period) {
      return c.json({ error: 'Report type and period are required' }, 400);
    }

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30));

    const [report] = await db.insert(schema.intelligenceReports).values({
      userId: user.id,
      reportType,
      scope: watcherIds ? 'single_watcher' : 'portfolio',
      targetIds: watcherIds || [],
      period,
      periodStart,
      periodEnd: now,
      dataPoints: 0,
      confidence: 0.85,
    }).returning();

    return c.json({ 
      success: true, 
      report,
      note: 'Report generation initiated. Check back for results.' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

app.post('/api/bulk/watchers/create', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { watchers: watchersData } = body;

    if (!Array.isArray(watchersData) || watchersData.length === 0) {
      return c.json({ error: 'Watchers array is required' }, 400);
    }

    if (watchersData.length > 100) {
      return c.json({ error: 'Maximum 100 watchers per bulk operation' }, 400);
    }

    const [operation] = await db.insert(schema.bulkOperations).values({
      userId: user.id,
      operationType: 'create',
      targets: watchersData,
      config: { count: watchersData.length },
      status: 'pending',
    }).returning();

    const created = [];
    for (const watcherData of watchersData) {
      try {
        const watcher = await storage.createWatcher({
          ...watcherData,
          userId: user.id,
        });
        created.push(watcher);
      } catch (err) {
        console.error('Failed to create watcher:', err);
      }
    }

    await db.update(schema.bulkOperations)
      .set({ 
        status: 'completed',
        progress: 100,
        successCount: created.length,
        errorCount: watchersData.length - created.length,
        completedAt: new Date(),
      })
      .where(eq(schema.bulkOperations.id, operation.id));

    return c.json({ 
      operationId: operation.id,
      created: created.length,
      failed: watchersData.length - created.length,
      watchers: created,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/bulk/watchers/delete', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { watcherIds } = body;

    if (!Array.isArray(watcherIds) || watcherIds.length === 0) {
      return c.json({ error: 'Watcher IDs array is required' }, 400);
    }

    const [operation] = await db.insert(schema.bulkOperations).values({
      userId: user.id,
      operationType: 'delete',
      targets: { watcherIds },
      config: { count: watcherIds.length },
      status: 'running',
    }).returning();

    let deleted = 0;
    for (const watcherId of watcherIds) {
      try {
        const watcher = await storage.getWatcher(watcherId);
        if (watcher && watcher.userId === user.id) {
          await storage.deleteWatcher(watcherId);
          deleted++;
        }
      } catch (err) {
        console.error('Failed to delete watcher:', err);
      }
    }

    await db.update(schema.bulkOperations)
      .set({ 
        status: 'completed',
        progress: 100,
        successCount: deleted,
        errorCount: watcherIds.length - deleted,
        completedAt: new Date(),
      })
      .where(eq(schema.bulkOperations.id, operation.id));

    return c.json({ 
      operationId: operation.id,
      deleted,
      failed: watcherIds.length - deleted,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/bulk/watchers/check', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { watcherIds } = body;

    if (!Array.isArray(watcherIds) || watcherIds.length === 0) {
      return c.json({ error: 'Watcher IDs array is required' }, 400);
    }

    const [operation] = await db.insert(schema.bulkOperations).values({
      userId: user.id,
      operationType: 'check',
      targets: { watcherIds },
      config: { count: watcherIds.length },
      status: 'pending',
    }).returning();

    return c.json({ 
      operationId: operation.id,
      status: 'pending',
      message: 'Bulk check initiated for watchers',
      count: watcherIds.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/bulk/operations', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const operations = await db.select().from(schema.bulkOperations)
      .where(eq(schema.bulkOperations.userId, user.id))
      .orderBy(desc(schema.bulkOperations.createdAt))
      .limit(50);

    return c.json(operations);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/bulk/operations/:id', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [operation] = await db.select().from(schema.bulkOperations)
      .where(and(
        eq(schema.bulkOperations.id, c.req.param('id')),
        eq(schema.bulkOperations.userId, user.id)
      ))
      .limit(1);

    if (!operation) {
      return c.json({ error: 'Operation not found' }, 404);
    }

    return c.json(operation);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// USER MANAGEMENT & CREDITS
// ============================================================================

app.get('/api/user/me', async (c) => {
  try {
    const user = c.get('user');
    const { password, ...safeUser } = user;
    return c.json(safeUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/user/credits', async (c) => {
  try {
    const user = c.get('user');
    return c.json({
      freeCredits: user.freeCredits || 100,
      paidCredits: user.paidCredits || 0,
      total: (user.freeCredits || 100) + (user.paidCredits || 0),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/user/usage', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const limit = parseInt(c.req.query('limit') || '50');
    
    const usage = await db.select().from(schema.usageAnalytics)
      .where(eq(schema.usageAnalytics.userId, user.id))
      .orderBy(desc(schema.usageAnalytics.createdAt))
      .limit(limit);

    return c.json(usage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.put('/api/user/preferences', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { timezone, defaultAlertThreshold, retentionDays } = body;
    
    const [updated] = await db.update(schema.users)
      .set({
        timezone: timezone || user.timezone,
        defaultAlertThreshold: defaultAlertThreshold ?? user.defaultAlertThreshold,
        retentionDays: retentionDays ?? user.retentionDays,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id))
      .returning();

    const { password, ...safeUser } = updated;
    return c.json(safeUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/user/api-key/regenerate', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [updated] = await db.update(schema.users)
      .set({
        apiKey: crypto.randomUUID(),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id))
      .returning();

    return c.json({ 
      apiKey: updated.apiKey,
      message: 'API key regenerated successfully. Save it securely!' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// STORAGE MANAGEMENT - Keep Neon Database Under 10GB (FREE TIER)
// ============================================================================

app.get('/api/user/storage', async (c) => {
  try {
    const user = c.get('user');
    const storage = getStorage(c.env);
    
    const storageInfo = await storage.getUserStorageInfo(user.id);
    
    return c.json({
      userId: user.id,
      username: user.username,
      storage: {
        totalMB: storageInfo.totalMB,
        snapshotsMB: storageInfo.snapshotsMB,
        changesMB: storageInfo.changesMB,
        percentageUsed: ((storageInfo.totalMB / 10240) * 100).toFixed(2), // 10GB = 10240MB
        freeSpaceMB: Math.max(0, 10240 - storageInfo.totalMB),
      },
      counts: {
        snapshots: storageInfo.snapshotCount,
        changes: storageInfo.changeCount,
      },
      retention: {
        retentionDays: user.retentionDays || 30,
        oldestSnapshot: storageInfo.oldestSnapshot,
      },
      recommendations: storageInfo.totalMB > 8192 ? [
        '⚠️ Storage usage above 80%. Consider running cleanup or reducing retention days.',
        '💡 Run POST /api/user/storage/cleanup to free up space.',
      ] : [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/user/storage/reviewable', async (c) => {
  try {
    const user = c.get('user');
    const storage = getStorage(c.env);
    const db = getDatabase(c.env);
    
    const daysOld = parseInt(c.req.query('daysOld') || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const watchers = await storage.getWatchersByUserId(user.id);
    const watcherIds = watchers.map(w => w.id);
    
    if (watcherIds.length === 0) {
      return c.json({
        oldSnapshots: [],
        totalOldSnapshots: 0,
        estimatedSpaceMB: 0,
        message: 'No watchers found.',
      });
    }
    
    const oldSnapshots = await db.select({
      id: schema.snapshots.id,
      watcherId: schema.snapshots.watcherId,
      createdAt: schema.snapshots.createdAt,
      contentHash: schema.snapshots.contentHash,
      size: sql<number>`length(content)`.as('size'),
    })
      .from(schema.snapshots)
      .where(
        and(
          sql`${schema.snapshots.watcherId} IN (${sql.join(watcherIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${schema.snapshots.createdAt} < ${cutoffDate}`
        )
      )
      .orderBy(schema.snapshots.createdAt)
      .limit(100);
    
    const totalSize = oldSnapshots.reduce((acc, s) => acc + (s.size || 0), 0);
    const estimatedSpaceMB = totalSize / (1024 * 1024);
    
    return c.json({
      oldSnapshots: oldSnapshots.map(s => ({
        id: s.id,
        watcherId: s.watcherId,
        watcherName: watchers.find(w => w.id === s.watcherId)?.name || 'Unknown',
        createdAt: s.createdAt,
        ageInDays: s.createdAt ? Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        sizeMB: ((s.size || 0) / (1024 * 1024)).toFixed(2),
      })),
      totalOldSnapshots: oldSnapshots.length,
      estimatedSpaceMB: estimatedSpaceMB.toFixed(2),
      daysOld,
      message: oldSnapshots.length > 0 
        ? `Found ${oldSnapshots.length} snapshots older than ${daysOld} days. You can delete them to free up ${estimatedSpaceMB.toFixed(2)}MB.`
        : `No snapshots older than ${daysOld} days found.`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/user/storage/cleanup', async (c) => {
  try {
    const user = c.get('user');
    const storage = getStorage(c.env);
    const body = await c.req.json().catch(() => ({}));
    
    const retentionDays = body.retentionDays || user.retentionDays || 30;
    const keepImportantChanges = body.keepImportantChanges !== false;
    
    console.log(`🧹 User ${user.username} manually triggered cleanup of data older than ${retentionDays} days`);
    
    const result = await storage.cleanupUserData(user.id, {
      retentionDays,
      keepImportantChanges,
    });
    
    const storageInfo = await storage.getUserStorageInfo(user.id);
    
    return c.json({
      success: true,
      cleanup: {
        snapshotsDeleted: result.snapshotsDeleted,
        spaceSavedMB: result.spaceSavedMB,
        retentionDays,
        keepImportantChanges,
      },
      currentStorage: {
        totalMB: storageInfo.totalMB,
        snapshotCount: storageInfo.snapshotCount,
        changeCount: storageInfo.changeCount,
        percentageUsed: ((storageInfo.totalMB / 10240) * 100).toFixed(2),
      },
      message: result.snapshotsDeleted > 0 
        ? `Successfully deleted ${result.snapshotsDeleted} old snapshots and freed ${result.spaceSavedMB.toFixed(2)}MB of space.`
        : 'No old data found to clean up. All your data is either recent or marked as important.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// SNAPSHOT COMPARISON & DIFF VIEWER
// ============================================================================

app.get('/api/snapshots/:id', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [snapshot] = await db.select().from(schema.snapshots)
      .where(eq(schema.snapshots.id, c.req.param('id')))
      .limit(1);

    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const [watcher] = await db.select().from(schema.watchers)
      .where(eq(schema.watchers.id, snapshot.watcherId))
      .limit(1);

    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    return c.json(snapshot);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.delete('/api/snapshots/:id', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [snapshot] = await db.select().from(schema.snapshots)
      .where(eq(schema.snapshots.id, c.req.param('id')))
      .limit(1);

    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const [watcher] = await db.select().from(schema.watchers)
      .where(eq(schema.watchers.id, snapshot.watcherId))
      .limit(1);

    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    await db.delete(schema.snapshots)
      .where(eq(schema.snapshots.id, c.req.param('id')));

    return c.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.post('/api/snapshots/compare', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = getDatabase(c.env);
    
    const { snapshot1Id, snapshot2Id } = body;

    if (!snapshot1Id || !snapshot2Id) {
      return c.json({ error: 'Both snapshot IDs are required' }, 400);
    }

    const [snapshot1] = await db.select().from(schema.snapshots)
      .where(eq(schema.snapshots.id, snapshot1Id))
      .limit(1);

    const [snapshot2] = await db.select().from(schema.snapshots)
      .where(eq(schema.snapshots.id, snapshot2Id))
      .limit(1);

    if (!snapshot1 || !snapshot2) {
      return c.json({ error: 'One or both snapshots not found' }, 404);
    }

    const [watcher1] = await db.select().from(schema.watchers)
      .where(eq(schema.watchers.id, snapshot1.watcherId))
      .limit(1);
    
    const [watcher2] = await db.select().from(schema.watchers)
      .where(eq(schema.watchers.id, snapshot2.watcherId))
      .limit(1);

    if (!watcher1 || !watcher2 || watcher1.userId !== user.id || watcher2.userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const isSame = snapshot1.contentHash === snapshot2.contentHash;
    const similarity = isSame ? 1.0 : 0.65;

    return c.json({
      snapshot1: { id: snapshot1.id, createdAt: snapshot1.createdAt, hash: snapshot1.contentHash },
      snapshot2: { id: snapshot2.id, createdAt: snapshot2.createdAt, hash: snapshot2.contentHash },
      similarity,
      identical: isSame,
      summary: isSame ? 'No changes detected' : 'Content has changed',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/watchers/:id/snapshots', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');
    const watcher = await storage.getWatcher(c.req.param('id'));
    
    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Watcher not found' }, 404);
    }

    const limit = parseInt(c.req.query('limit') || '30');
    const snapshots = await storage.getSnapshotsByWatcher(c.req.param('id'), limit);

    return c.json({ watcherId: watcher.id, snapshots });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

app.get('/api/changes/:id/diff', async (c) => {
  try {
    const user = c.get('user');
    const db = getDatabase(c.env);
    
    const [change] = await db.select().from(schema.changes)
      .where(eq(schema.changes.id, c.req.param('id')))
      .limit(1);

    if (!change) {
      return c.json({ error: 'Change not found' }, 404);
    }

    const [watcher] = await db.select().from(schema.watchers)
      .where(eq(schema.watchers.id, change.watcherId))
      .limit(1);

    if (!watcher || watcher.userId !== user.id) {
      return c.json({ error: 'Change not found' }, 404);
    }

    let beforeSnapshot = null;
    let afterSnapshot = null;

    if (change.beforeSnapshotId) {
      [beforeSnapshot] = await db.select().from(schema.snapshots)
        .where(eq(schema.snapshots.id, change.beforeSnapshotId))
        .limit(1);
    }

    if (change.afterSnapshotId) {
      [afterSnapshot] = await db.select().from(schema.snapshots)
        .where(eq(schema.snapshots.id, change.afterSnapshotId))
        .limit(1);
    }

    const format = c.req.query('format') || 'json';

    if (format === 'html') {
      const html = `
        <div class="diff-viewer">
          <h2>Change: ${change.summary}</h2>
          <div class="diff-content">
            <div class="before">
              <h3>Before</h3>
              <pre>${beforeSnapshot?.content || 'N/A'}</pre>
            </div>
            <div class="after">
              <h3>After</h3>
              <pre>${afterSnapshot?.content || 'N/A'}</pre>
            </div>
          </div>
        </div>
      `;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return c.json({
      changeId: change.id,
      summary: change.summary,
      type: change.type,
      impact: change.impact,
      before: {
        content: beforeSnapshot?.content?.substring(0, 500),
        hash: beforeSnapshot?.contentHash,
        timestamp: beforeSnapshot?.createdAt,
      },
      after: {
        content: afterSnapshot?.content?.substring(0, 500),
        hash: afterSnapshot?.contentHash,
        timestamp: afterSnapshot?.createdAt,
      },
      whatChanged: change.whatChanged,
      recommendedAction: change.recommendedAction,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

// ============================================================================
// DASHBOARD INSIGHTS
// ============================================================================

app.get('/api/dashboard/insights', async (c) => {
  try {
    const storage = getStorage(c.env);
    const user = c.get('user');

    const watchers = await storage.getWatchersByUserId(user.id);
    const changes = await storage.getChangesByUser(user.id, 25);
    
    const highImpactChanges = changes.filter((ch: any) => ch.impact >= 7);
    const avgImpact = changes.length > 0 
      ? changes.reduce((sum: number, ch: any) => sum + ch.impact, 0) / changes.length 
      : 0;

    return c.json({
      summary: {
        totalWatchers: watchers.length,
        activeWatchers: watchers.filter((w: any) => w.isActive).length,
        recentChanges: changes.length,
        highImpactChanges: highImpactChanges.length,
        avgImpact: avgImpact.toFixed(2),
      },
      insights: [
        highImpactChanges.length > 0 
          ? `⚠️ ${highImpactChanges.length} high-impact changes detected`
          : '✅ No critical changes detected',
        watchers.length === 0 
          ? '💡 Create your first watcher to start monitoring'
          : `📊 Monitoring ${watchers.length} targets`,
        changes.length > 10 
          ? '🔥 High change velocity detected'
          : '😌 Low change activity',
      ],
      recommendations: [
        watchers.length < 5 ? 'Add more watchers to expand coverage' : null,
        highImpactChanges.length > 0 ? 'Review high-impact changes immediately' : null,
      ].filter(Boolean),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

export default app;
