export interface ScrapingResult {
  content: string;
  contentHash: string;
  metadata: {
    statusCode: number;
    contentType: string;
    responseTime: number;
    headers: Record<string, string>;
  };
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function extractTextFromHtml(html: string, cssSelector?: string): string {
  const cleanedHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cssSelector && html.includes(cssSelector.replace(/[.#]/g, ''))) {
    const selectorPattern = cssSelector.replace(/[.#]/g, '');
    const regex = new RegExp(`<[^>]*${selectorPattern}[^>]*>(.*?)<\/[^>]+>`, 'is');
    const match = html.match(regex);
    if (match && match[1]) {
      return match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  
  return cleanedHtml;
}

export class CloudflareScraperService {
  async scrapeWebpage(url: string, cssSelector?: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SCA-Bot/2.0; +https://semantic-change-alert.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      let content = await response.text();
      
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        content = extractTextFromHtml(content, cssSelector);
      } else if (contentType.includes('application/json')) {
        try {
          const jsonData = JSON.parse(content);
          content = JSON.stringify(jsonData, null, 2);
        } catch {
          // Keep as is if not valid JSON
        }
      }

      const contentHash = await hashContent(content);

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        content,
        contentHash,
        metadata: {
          statusCode: response.status,
          contentType,
          responseTime,
          headers,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('abort')) {
        throw new Error(`Timeout: ${url} took longer than 30 seconds`);
      }
      
      throw new Error(`Failed to scrape ${url}: ${errorMessage}`);
    }
  }

  async scrapeJsonApi(url: string, customHeaders: Record<string, string> = {}): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SCA-Bot/2.0 (Semantic Change Alert)',
          ...customHeaders,
        },
      });

      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      let content: string;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const jsonData = await response.json();
        content = JSON.stringify(jsonData, null, 2);
      } else {
        content = await response.text();
      }

      const contentHash = await hashContent(content);

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        content,
        contentHash,
        metadata: {
          statusCode: response.status,
          contentType,
          responseTime,
          headers,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scrape API ${url}: ${errorMessage}`);
    }
  }

  async scrapeDocument(url: string): Promise<ScrapingResult> {
    throw new Error('Document scraping not supported in Cloudflare Workers. Use webpage or API monitoring instead.');
  }
}

export const cloudflareScraperService = new CloudflareScraperService();
