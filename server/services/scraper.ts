import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

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

export class ScraperService {
  async scrapeWebpage(url: string, cssSelector?: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'SCA-Bot/1.0 (Semantic Change Alert; +https://sca.example.com/bot)',
        },
        validateStatus: (status) => status < 500, // Allow 4xx responses
      });

      const responseTime = Date.now() - startTime;
      
      let content = response.data;
      
      if (response.headers['content-type']?.includes('text/html')) {
        const $ = cheerio.load(content);
        
        // Remove script and style tags
        $('script, style, noscript').remove();
        
        if (cssSelector) {
          const selected = $(cssSelector);
          content = selected.length > 0 ? selected.text().trim() : '';
        } else {
          // Extract main content areas
          const mainContent = $('main, article, .content, .main-content, body').first();
          content = mainContent.length > 0 ? mainContent.text().trim() : $('body').text().trim();
        }
        
        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
      }

      const contentHash = createHash('sha256').update(content).digest('hex');

      return {
        content,
        contentHash,
        metadata: {
          statusCode: response.status,
          contentType: response.headers['content-type'] || '',
          responseTime,
          headers: response.headers as Record<string, string>,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scrape ${url}: ${errorMessage}`);
    }
  }

  async scrapeJsonApi(url: string, headers: Record<string, string> = {}): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SCA-Bot/1.0 (Semantic Change Alert; +https://sca.example.com/bot)',
          ...headers,
        },
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;
      
      let content: string;
      if (typeof response.data === 'object') {
        content = JSON.stringify(response.data, null, 2);
      } else {
        content = String(response.data);
      }

      const contentHash = createHash('sha256').update(content).digest('hex');

      return {
        content,
        contentHash,
        metadata: {
          statusCode: response.status,
          contentType: response.headers['content-type'] || '',
          responseTime,
          headers: response.headers as Record<string, string>,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scrape API ${url}: ${errorMessage}`);
    }
  }

  async scrapeDocument(url: string): Promise<ScrapingResult> {
    // Placeholder for document scraping (PDF/DOCX)
    // In a real implementation, you'd use libraries like pdf-parse or mammoth
    throw new Error('Document scraping not yet implemented');
  }
}

export const scraperService = new ScraperService();
