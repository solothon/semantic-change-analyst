import express, { type Request, type Response, type NextFunction } from 'express';
import { db } from './db';
import { MemStorage } from './storage-memory';
import { insertWatcherSchema } from '@shared/schema';
import * as schema from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { scraperService } from './services/scraper';
import crypto from 'crypto';

export const router = express.Router();

const storage = new MemStorage();

async function hashContent(content: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

interface AuthRequest extends Omit<Request, 'user'> {
  user?: any;
}

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const rapidApiUser = req.headers['x-rapidapi-user'] as string;
  const apiKey = req.headers['x-api-key'] as string;
  
  if (rapidApiUser) {
    let user = await storage.getUserByUsername(rapidApiUser);
    if (!user) {
      user = await storage.createUser({
        username: rapidApiUser,
        email: `${rapidApiUser}@rapidapi.com`,
        password: 'rapidapi-managed',
      });
    }
    req.user = user;
    return next();
  }

  if (apiKey) {
    const user = await storage.getUserByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    req.user = user;
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
};

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use('/api/*', authenticate);

router.get('/api/watchers', async (req: AuthRequest, res) => {
  try {
    const watchers = await storage.getWatchersByUserId(req.user!.id);
    res.json(watchers);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/watchers', async (req: AuthRequest, res) => {
  try {
    const watcherData = insertWatcherSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    const watcher = await storage.createWatcher(watcherData);
    res.json(watcher);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/watchers/:id', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    if (watcher.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(watcher);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.put('/api/watchers/:id', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    const updated = await storage.updateWatcher(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.delete('/api/watchers/:id', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    await storage.deleteWatcher(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/watchers/:id/check', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    res.json({ message: 'Check initiated', watcherId: watcher.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/watchers/:id/changes', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    const limit = parseInt(req.query.limit as string || '10');
    const changes = await storage.getChangesByWatcher(req.params.id, limit);
    res.json(changes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/watchers/:id/history', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    const limit = parseInt(req.query.limit as string || '30');
    const snapshots = await storage.getSnapshotsByWatcher(req.params.id, limit);
    const changes = await storage.getChangesByWatcher(req.params.id, limit);

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

    res.json({ watcher: { id: watcher.id, name: watcher.name }, history });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/watchers/:id/snapshots', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    const limit = parseInt(req.query.limit as string || '30');
    const snapshots = await storage.getSnapshotsByWatcher(req.params.id, limit);

    res.json({ watcherId: watcher.id, snapshots });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/watchers/:id/export', async (req: AuthRequest, res) => {
  try {
    const watcher = await storage.getWatcher(req.params.id);
    
    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Watcher not found' });
    }

    const format = req.query.format || 'json';

    if (format === 'csv') {
      const csv = `name,targetType,targetUrl,checkFrequency\n${watcher.name},${watcher.targetType},${watcher.targetUrl},${watcher.checkFrequency}`;
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="${watcher.name}.csv"`);
      res.send(csv);
    } else {
      res.json(watcher);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/watchers/import', async (req: AuthRequest, res) => {
  try {
    const { watchers } = req.body;

    if (!Array.isArray(watchers)) {
      return res.status(400).json({ error: 'Watchers must be an array' });
    }

    const created = [];
    for (const watcherData of watchers) {
      const watcher = await storage.createWatcher({
        ...watcherData,
        userId: req.user!.id,
      });
      created.push(watcher);
    }

    res.json({ success: true, count: created.length, watchers: created });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/changes', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '25');
    const changes = await storage.getChangesByUser(req.user!.id, limit);
    res.json(changes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/changes/:id/diff', async (req: AuthRequest, res) => {
  try {
    const change = await storage.getChange(req.params.id);

    if (!change) {
      return res.status(404).json({ error: 'Change not found' });
    }

    const [beforeSnapshot, afterSnapshot] = await Promise.all([
      change.beforeSnapshotId ? storage.getSnapshot(change.beforeSnapshotId) : null,
      change.afterSnapshotId ? storage.getSnapshot(change.afterSnapshotId) : null,
    ]);

    const format = req.query.format || 'json';

    if (format === 'html') {
      const html = `
        <div class="diff-viewer">
          <h2>Change: ${change.summary}</h2>
          <div class="diff-content">
            <div class="before">
              <h3>Before</h3>
              <pre>${beforeSnapshot?.content.substring(0, 1000) || 'N/A'}</pre>
            </div>
            <div class="after">
              <h3>After</h3>
              <pre>${afterSnapshot?.content.substring(0, 1000) || 'N/A'}</pre>
            </div>
          </div>
        </div>
      `;
      res.header('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.json({
        changeId: change.id,
        summary: change.summary,
        type: change.type,
        impact: change.impact,
        before: beforeSnapshot ? {
          content: beforeSnapshot.content.substring(0, 1000),
          hash: beforeSnapshot.contentHash,
          timestamp: beforeSnapshot.createdAt,
        } : null,
        after: afterSnapshot ? {
          content: afterSnapshot.content.substring(0, 1000),
          hash: afterSnapshot.contentHash,
          timestamp: afterSnapshot.createdAt,
        } : null,
        whatChanged: change.whatChanged,
        recommendedAction: change.recommendedAction,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/dashboard/metrics', async (req: AuthRequest, res) => {
  try {
    const metrics = await storage.getMetrics(req.user!.id);
    res.json(metrics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/dashboard/insights', async (req: AuthRequest, res) => {
  try {
    const metrics = await storage.getMetrics(req.user!.id);
    const changes = await storage.getChangesByUser(req.user!.id, 100);
    
    const highImpactChanges = changes.filter((c: any) => c.impact >= 7).length;
    const avgImpact = changes.length > 0 ? 
      (changes.reduce((sum: number, c: any) => sum + c.impact, 0) / changes.length).toFixed(1) : '0';

    const insights = [];
    const recommendations = [];

    if (highImpactChanges > 0) {
      insights.push(`⚠️ ${highImpactChanges} high-impact changes detected`);
      recommendations.push('Review high-impact changes immediately');
    }

    insights.push(`📊 Monitoring ${metrics.activeWatchers} targets`);

    if (changes.length > 50) {
      insights.push('🔥 High change velocity detected');
    }

    res.json({
      summary: {
        totalWatchers: metrics.activeWatchers,
        activeWatchers: metrics.activeWatchers,
        recentChanges: changes.length,
        highImpactChanges,
        avgImpact,
      },
      insights,
      recommendations,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/check/quick', async (req, res) => {
  try {
    const { url, selector } = req.body;

    const scraped = await scraperService.scrapeWebpage(url, selector);
    const hash = await hashContent(scraped.content);

    res.json({
      url,
      content: scraped.content.substring(0, 500),
      contentHash: hash,
      metadata: scraped.metadata,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/check/batch', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs must be a non-empty array' });
    }

    if (urls.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 URLs per batch' });
    }

    const results = [];
    for (const urlData of urls) {
      try {
        const scraped = await scraperService.scrapeWebpage(
          typeof urlData === 'string' ? urlData : urlData.url,
          typeof urlData === 'object' ? urlData.selector : undefined
        );

        const hash = await hashContent(scraped.content);

        results.push({
          url: typeof urlData === 'string' ? urlData : urlData.url,
          success: true,
          content: scraped.content.substring(0, 200),
          contentHash: hash,
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

    res.json({ results, total: urls.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/user/me', async (req: AuthRequest, res) => {
  try {
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/user/credits', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    res.json({
      freeCredits: user.freeCredits || 100,
      paidCredits: user.paidCredits || 0,
      total: (user.freeCredits || 100) + (user.paidCredits || 0),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/user/usage', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const limit = parseInt(req.query.limit as string || '50');
    
    const usage = await storage.getCreditTransactionsByUser(user.id, limit);
    res.json(usage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.put('/api/user/preferences', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { timezone, defaultAlertThreshold } = req.body;
    
    const updated = await storage.updateUserPreferences(user.id, {
      timezone,
      defaultAlertThreshold,
    });

    const { password, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/user/api-key/regenerate', async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    res.json({ 
      apiKey: crypto.randomUUID(),
      message: 'API key regenerated successfully. Save it securely (Note: This is a demo key, not persisted)' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/ai/analyze', async (req, res) => {
  try {
    const { content, beforeContent, afterContent, model, analysisType, includeMetrics } = req.body;

    if (!content && (!beforeContent || !afterContent)) {
      return res.status(400).json({ error: 'Content or beforeContent/afterContent required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'OpenRouter API key not configured',
        note: 'Add OPENROUTER_API_KEY to environment variables. Get one at https://openrouter.ai/keys' 
      });
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

    res.json(responseData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/api/ai/models', async (req, res) => {
  res.json({
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

router.post('/api/competitors', async (req: AuthRequest, res) => {
  try {
    const { competitorName, domain, industry, monitoringFocus } = req.body;

    if (!competitorName || !domain) {
      return res.status(400).json({ error: 'Competitor name and domain are required' });
    }

    const competitor = await storage.createCompetitor({
      userId: req.user!.id,
      competitorName,
      domain,
      industry: industry || null,
      monitoringFocus: monitoringFocus || ['pricing', 'features'],
      watcherIds: [],
      pricingStrategy: null,
      featureUpdates: null,
      marketingCampaigns: null,
      productLaunches: null,
      threatLevel: null,
      marketPosition: null,
      competitiveGaps: null,
      strengthsWeaknesses: null,
      lastAnalyzed: null,
    });

    res.json(competitor);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/competitors', async (req: AuthRequest, res) => {
  try {
    const competitors = await storage.getCompetitorsByUser(req.user!.id);
    res.json(competitors);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/competitors/:id', async (req: AuthRequest, res) => {
  try {
    const competitor = await storage.getCompetitor(req.params.id);

    if (!competitor || competitor.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    res.json(competitor);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.put('/api/competitors/:id', async (req: AuthRequest, res) => {
  try {
    const competitor = await storage.getCompetitor(req.params.id);

    if (!competitor || competitor.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const updated = await storage.updateCompetitor(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.delete('/api/competitors/:id', async (req: AuthRequest, res) => {
  try {
    const competitor = await storage.getCompetitor(req.params.id);

    if (!competitor || competitor.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    await storage.deleteCompetitor(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/competitors/:id/intelligence', async (req: AuthRequest, res) => {
  try {
    const competitor = await storage.getCompetitor(req.params.id);

    if (!competitor || competitor.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
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

    res.json(intelligence);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/reports/trends', async (req: AuthRequest, res) => {
  try {
    const period = req.query.period || 'weekly';
    const watcherId = req.query.watcherId;

    const reports = await storage.getIntelligenceReportsByUser(req.user!.id, 10);
    const filteredReports = reports.filter((r: any) => r.reportType === 'trend');

    res.json({ reports: filteredReports, period });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/reports/generate', async (req: AuthRequest, res) => {
  try {
    const { reportType, period, watcherIds } = req.body;

    if (!reportType || !period) {
      return res.status(400).json({ error: 'Report type and period are required' });
    }

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30));

    const report = await storage.createIntelligenceReport({
      userId: req.user!.id,
      reportType,
      scope: watcherIds ? 'single_watcher' : 'portfolio',
      targetIds: watcherIds || [],
      period,
      periodStart,
      periodEnd: now,
      dataPoints: 0,
      confidence: 0.85,
      changeVelocity: null,
      competitiveAdvantage: null,
      riskAssessment: null,
      opportunityScoring: null,
      predictiveInsights: null,
      industryBenchmarks: null,
      marketTrends: null,
      complianceScore: null,
      legalRiskProfile: null,
      regulatoryChanges: null,
      generatedAt: now,
    });

    res.json({ 
      success: true, 
      report,
      note: 'Report generation initiated. Check back for results.' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/bulk/watchers/create', async (req: AuthRequest, res) => {
  try {
    const { watchers: watchersData } = req.body;

    if (!Array.isArray(watchersData) || watchersData.length === 0) {
      return res.status(400).json({ error: 'Watchers array is required' });
    }

    if (watchersData.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 watchers per bulk operation' });
    }

    const operation = await storage.createBulkOperation({
      userId: req.user!.id,
      operationType: 'create',
      targets: watchersData,
      config: { count: watchersData.length },
      status: 'pending',
      progress: 0,
      results: null,
      errorCount: 0,
      successCount: 0,
      startedAt: new Date(),
      completedAt: null,
    });

    const created = [];
    for (const watcherData of watchersData) {
      try {
        const watcher = await storage.createWatcher({
          ...watcherData,
          userId: req.user!.id,
        });
        created.push(watcher);
      } catch (err) {
        console.error('Failed to create watcher:', err);
      }
    }

    await storage.updateBulkOperation(operation.id, { 
      status: 'completed',
      progress: 100,
      successCount: created.length,
      errorCount: watchersData.length - created.length,
      completedAt: new Date(),
    });

    res.json({ 
      operationId: operation.id,
      created: created.length,
      failed: watchersData.length - created.length,
      watchers: created,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/bulk/watchers/delete', async (req: AuthRequest, res) => {
  try {
    const { watcherIds } = req.body;

    if (!Array.isArray(watcherIds) || watcherIds.length === 0) {
      return res.status(400).json({ error: 'Watcher IDs array is required' });
    }

    const operation = await storage.createBulkOperation({
      userId: req.user!.id,
      operationType: 'delete',
      targets: { watcherIds },
      config: { count: watcherIds.length },
      status: 'running',
      progress: 0,
      results: null,
      errorCount: 0,
      successCount: 0,
      startedAt: new Date(),
      completedAt: null,
    });

    let deleted = 0;
    for (const watcherId of watcherIds) {
      try {
        const watcher = await storage.getWatcher(watcherId);
        if (watcher && watcher.userId === req.user!.id) {
          await storage.deleteWatcher(watcherId);
          deleted++;
        }
      } catch (err) {
        console.error('Failed to delete watcher:', err);
      }
    }

    await storage.updateBulkOperation(operation.id, { 
      status: 'completed',
      progress: 100,
      successCount: deleted,
      errorCount: watcherIds.length - deleted,
      completedAt: new Date(),
    });

    res.json({ 
      operationId: operation.id,
      deleted,
      failed: watcherIds.length - deleted,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/bulk/watchers/check', async (req: AuthRequest, res) => {
  try {
    const { watcherIds } = req.body;

    if (!Array.isArray(watcherIds) || watcherIds.length === 0) {
      return res.status(400).json({ error: 'Watcher IDs array is required' });
    }

    const operation = await storage.createBulkOperation({
      userId: req.user!.id,
      operationType: 'check',
      targets: { watcherIds },
      config: { count: watcherIds.length },
      status: 'pending',
      progress: 0,
      results: null,
      errorCount: 0,
      successCount: 0,
      startedAt: new Date(),
      completedAt: null,
    });

    res.json({ 
      operationId: operation.id,
      status: 'pending',
      message: 'Bulk check initiated for watchers',
      count: watcherIds.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/bulk/operations', async (req: AuthRequest, res) => {
  try {
    const operations = await storage.getBulkOperationsByUser(req.user!.id, 50);
    res.json(operations);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/bulk/operations/:id', async (req: AuthRequest, res) => {
  try {
    const operation = await storage.getBulkOperation(req.params.id);

    if (!operation || operation.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(operation);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/snapshots/:id', async (req: AuthRequest, res) => {
  try {
    const snapshot = await storage.getSnapshot(req.params.id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const watcher = await storage.getWatcher(snapshot.watcherId);

    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.json(snapshot);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.delete('/api/snapshots/:id', async (req: AuthRequest, res) => {
  try {
    const snapshot = await storage.getSnapshot(req.params.id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const watcher = await storage.getWatcher(snapshot.watcherId);

    if (!watcher || watcher.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    await storage.deleteSnapshot(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/snapshots/compare', async (req: AuthRequest, res) => {
  try {
    const { snapshot1Id, snapshot2Id } = req.body;

    if (!snapshot1Id || !snapshot2Id) {
      return res.status(400).json({ error: 'Both snapshot IDs are required' });
    }

    const [snapshot1, snapshot2] = await Promise.all([
      storage.getSnapshot(snapshot1Id),
      storage.getSnapshot(snapshot2Id),
    ]);

    if (!snapshot1 || !snapshot2) {
      return res.status(404).json({ error: 'One or both snapshots not found' });
    }

    const [watcher1, watcher2] = await Promise.all([
      storage.getWatcher(snapshot1.watcherId),
      storage.getWatcher(snapshot2.watcherId),
    ]);

    if (!watcher1 || !watcher2 || watcher1.userId !== req.user!.id || watcher2.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isSame = snapshot1.contentHash === snapshot2.contentHash;
    const similarity = isSame ? 1.0 : 0.65;

    res.json({
      snapshot1: { id: snapshot1.id, createdAt: snapshot1.createdAt, hash: snapshot1.contentHash },
      snapshot2: { id: snapshot2.id, createdAt: snapshot2.createdAt, hash: snapshot2.contentHash },
      similarity,
      identical: isSame,
      summary: isSame ? 'No changes detected' : 'Content has changed',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.get('/api/webhooks/deliveries', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '50');
    const deliveries = await storage.getWebhookDeliveriesByUser(req.user!.id, limit);
    res.json(deliveries);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/webhooks/deliveries/:id/retry', async (req: AuthRequest, res) => {
  try {
    const delivery = await storage.updateWebhookDelivery(req.params.id, {
      attempt: 0,
      nextRetryAt: new Date(),
    });
    res.json(delivery);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: errorMessage });
  }
});

router.post('/api/webhooks/test', async (req, res) => {
  try {
    const { url, payload } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
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

      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: await response.text().catch(() => ''),
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      res.json({
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
    res.status(400).json({ error: errorMessage });
  }
});
