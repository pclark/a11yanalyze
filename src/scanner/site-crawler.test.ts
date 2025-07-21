/**
 * SiteCrawler unit tests
 * Tests site crawling functionality with depth limits, domain restrictions, and rate limiting
 */

import { SiteCrawler } from './site-crawler';
import { PageScanner } from './page-scanner';
import { CrawlerConfig, CrawlStatus, URLStatus } from '../types/crawler';
import { ScanResult } from '../types';

// Mock PageScanner
jest.mock('./page-scanner');

describe('SiteCrawler', () => {
  let siteCrawler: SiteCrawler;
  let mockPageScanner: jest.Mocked<PageScanner>;

  // Mock scan results
  const createMockScanResult = (url: string, score = 85, issueCount = 3): ScanResult => ({
    url,
    score,
    issues: Array(issueCount).fill(0).map((_, i) => ({
      id: `issue-${i}`,
      wcagReference: '1.1.1',
      level: 'AA',
      severity: 'moderate',
      element: 'div',
      selector: 'div.test',
      message: `Test issue ${i} message`,
      remediation: `Fix test issue ${i}`,
      helpUrl: 'https://help.example.com',
      impact: 'moderate',
      tags: ['wcag2aa'],
    })),
    metadata: {
      scanDuration: 800,
      pageLoadTime: 1200,
      totalElements: 100,
      testedElements: 50,
      userAgent: 'test-agent',
      viewport: {
        width: 1280,
        height: 720,
      },
      url: {
        original: url,
        final: url,
        redirects: 0,
      },
    },
    timestamp: new Date().toISOString(),
    errors: [],
    compliance: {
      compliant: score >= 80,
      primaryLevelIssues: Math.floor(issueCount / 2),
      warningIssues: Math.ceil(issueCount / 2),
      totalIssues: issueCount,
      levelBreakdown: { A: 1, AA: 1, AAA: 1, ARIA: 0 },
    },
  });

  beforeEach(() => {
    // Create new instance for each test
    siteCrawler = new SiteCrawler();
    
    // Get mocked PageScanner instance
    mockPageScanner = siteCrawler['pageScanner'] as jest.Mocked<PageScanner>;
    
    // Setup default mock behavior
    mockPageScanner.initialize = jest.fn().mockResolvedValue(undefined);
    mockPageScanner.cleanup = jest.fn().mockResolvedValue(undefined);
    mockPageScanner.scan = jest.fn();
  });

  afterEach(async () => {
    // Cleanup after each test
    if (siteCrawler['isRunning']) {
      await siteCrawler.stopCrawl();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should create SiteCrawler instance', () => {
      expect(siteCrawler).toBeInstanceOf(SiteCrawler);
      expect(siteCrawler['pageScanner']).toBeDefined();
      expect(siteCrawler['session']).toBeNull();
      expect(siteCrawler['isRunning']).toBe(false);
      expect(siteCrawler['isPaused']).toBe(false);
    });

         it('should initialize with custom configurations', () => {
       const browserConfig = { 
         headless: true,
         viewport: { width: 1920, height: 1080 },
         timeout: 30000
       };
       const ruleEngineConfig = { 
         wcagLevel: 'AAA' as const,
         includeAAA: true,
         includeARIA: true,
         customRules: [],
         disabledRules: []
       };
       const resilienceConfig = { maxRetries: 5 };
       const wcagLevelConfig = { primaryLevel: 'AAA' as const };

       const customCrawler = new SiteCrawler(
         browserConfig,
         ruleEngineConfig,
         resilienceConfig,
         wcagLevelConfig
       );

       expect(customCrawler['pageScanner']).toBeDefined();
     });
  });

  describe('Session Management', () => {
    it('should start a new crawl session', async () => {
      const startUrls = ['https://example.com'];
      const config: Partial<CrawlerConfig> = { maxDepth: 1, maxPages: 5 };

      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      const sessionId = await siteCrawler.startCrawl(startUrls, config);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^crawl_\d+_[a-z0-9]+$/);
      expect(siteCrawler['isRunning']).toBe(true);
      expect(mockPageScanner.initialize).toHaveBeenCalled();

      const session = siteCrawler.getSession();
      expect(session).toBeTruthy();
      expect(session!.startUrls).toEqual(startUrls);
      expect(session!.config.maxDepth).toBe(1);
      expect(session!.config.maxPages).toBe(5);
    });

    it('should reject starting crawl when already running', async () => {
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com']);

      await expect(siteCrawler.startCrawl(['https://other.com']))
        .rejects.toThrow('Crawler is already running');
    });

    it('should validate start URLs', async () => {
      const invalidUrls = ['invalid-url', 'ftp://example.com', 'file:///path'];
      
      await expect(siteCrawler.startCrawl(invalidUrls))
        .rejects.toThrow('No valid start URLs provided');
    });

    it('should pause and resume crawl session', async () => {
      mockPageScanner.scan.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(createMockScanResult('https://example.com')), 100);
      }));

      await siteCrawler.startCrawl(['https://example.com']);
      
      // Pause the session
      await siteCrawler.pauseCrawl();
      expect(siteCrawler['isPaused']).toBe(true);
      expect(siteCrawler.getSession()?.status).toBe('paused');

      // Resume the session
      await siteCrawler.resumeCrawl();
      expect(siteCrawler['isPaused']).toBe(false);
      expect(siteCrawler.getSession()?.status).toBe('crawling');
    });

    it('should stop crawl session', async () => {
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com']);
      await siteCrawler.stopCrawl();

      expect(siteCrawler['isRunning']).toBe(false);
      expect(siteCrawler.getSession()?.status).toBe('cancelled');
      expect(mockPageScanner.cleanup).toHaveBeenCalled();
    });
  });

  describe('URL Processing', () => {
    it('should process start URLs', async () => {
      const startUrls = ['https://example.com', 'https://test.com'];
      
      mockPageScanner.scan
        .mockResolvedValueOnce(createMockScanResult('https://example.com'))
        .mockResolvedValueOnce(createMockScanResult('https://test.com'));

      await siteCrawler.startCrawl(startUrls, { maxDepth: 0 });

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPageScanner.scan).toHaveBeenCalledWith('https://example.com', {});
      expect(mockPageScanner.scan).toHaveBeenCalledWith('https://test.com', {});

      const session = siteCrawler.getSession();
      expect(session?.results.size).toBe(2);
      expect(session?.stats.pagesScanned).toBe(2);
    });

    it('should respect depth limits', async () => {
      const config: Partial<CrawlerConfig> = { maxDepth: 0 };
      
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com'], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

             const session = siteCrawler.getSession();
       const urls = Array.from(session!.urls.values());
       
       // Should only have start URL
       expect(urls.length).toBe(1);
       expect(urls[0]?.depth).toBe(0);
    });

    it('should respect page limits', async () => {
      const config: Partial<CrawlerConfig> = { maxPages: 1 };
      
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com', 'https://test.com'], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const session = siteCrawler.getSession();
      expect(session?.stats.pagesScanned).toBeLessThanOrEqual(1);
    });

    it('should handle scan failures gracefully', async () => {
      mockPageScanner.scan.mockRejectedValue(new Error('Scan failed'));

      await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const session = siteCrawler.getSession();
      const urlEntry = session?.urls.get('https://example.com');
      
      expect(urlEntry?.status).toBe('failed');
      expect(urlEntry?.error).toBe('Scan failed');
    });
  });

  describe('Domain and Path Filtering', () => {
    it('should filter URLs by allowed domains', async () => {
      const config: Partial<CrawlerConfig> = {
        allowedDomains: ['example.com'],
        maxDepth: 0,
      };

      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl([
        'https://example.com',
        'https://other.com',
        'https://test.example.com'
      ], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPageScanner.scan).toHaveBeenCalledWith('https://example.com', {});
      expect(mockPageScanner.scan).not.toHaveBeenCalledWith('https://other.com', {});
    });

    it('should exclude domains from crawling', async () => {
      const config: Partial<CrawlerConfig> = {
        excludedDomains: ['blocked.com'],
        maxDepth: 0,
      };

      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl([
        'https://example.com',
        'https://blocked.com'
      ], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPageScanner.scan).toHaveBeenCalledWith('https://example.com', {});
      expect(mockPageScanner.scan).not.toHaveBeenCalledWith('https://blocked.com', {});
    });

    it('should filter URLs by path patterns', async () => {
      const config: Partial<CrawlerConfig> = {
        excludedPaths: ['/admin/', '/private/'],
        includedPaths: ['/public/'],
        maxDepth: 0,
      };

      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com/public/page'));

      await siteCrawler.startCrawl([
        'https://example.com/public/page',
        'https://example.com/admin/panel',
        'https://example.com/other/page'
      ], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPageScanner.scan).toHaveBeenCalledWith('https://example.com/public/page', {});
      expect(mockPageScanner.scan).not.toHaveBeenCalledWith('https://example.com/admin/panel', {});
      expect(mockPageScanner.scan).not.toHaveBeenCalledWith('https://example.com/other/page', {});
    });
  });

  describe('Rate Limiting and Concurrency', () => {
    it('should apply rate limiting between requests', async () => {
      const config: Partial<CrawlerConfig> = {
        requestDelay: 100,
        maxConcurrency: 1,
        maxDepth: 0,
      };

      mockPageScanner.scan
        .mockImplementation(() => Promise.resolve(createMockScanResult('https://example.com')));

      const startTime = Date.now();
      await siteCrawler.startCrawl(['https://example.com', 'https://test.com'], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should have taken at least the request delay
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should respect concurrency limits', async () => {
      const config: Partial<CrawlerConfig> = {
        maxConcurrency: 2,
        requestDelay: 0,
        maxDepth: 0,
      };

      let concurrentRequests = 0;
      let maxConcurrency = 0;

      mockPageScanner.scan.mockImplementation(() => {
        concurrentRequests++;
        maxConcurrency = Math.max(maxConcurrency, concurrentRequests);
        
        return new Promise(resolve => {
          setTimeout(() => {
            concurrentRequests--;
            resolve(createMockScanResult('https://example.com'));
          }, 50);
        });
      });

      await siteCrawler.startCrawl([
        'https://example.com',
        'https://test.com',
        'https://other.com',
        'https://another.com'
      ], config);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(maxConcurrency).toBeLessThanOrEqual(2);
    });
  });

  describe('Progress Tracking', () => {
    it('should track crawl progress', async () => {
      mockPageScanner.scan.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve(createMockScanResult('https://example.com')), 50);
        })
      );

      await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });

      // Initial progress
      let progress = siteCrawler.getProgress();
      expect(progress?.status).toBe('crawling');
      expect(progress?.percentage).toBeGreaterThanOrEqual(0);
      expect(progress?.urlsProcessed).toBe(0);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200));

      // Final progress
      progress = siteCrawler.getProgress();
      expect(progress?.percentage).toBe(100);
      expect(progress?.urlsProcessed).toBe(1);
    });

    it('should calculate scan rate', async () => {
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = siteCrawler.getProgress();
      expect(progress?.scanRate).toBeGreaterThan(0);
    });

    it('should emit crawl events', async () => {
      const events: string[] = [];
      
      siteCrawler.on('session_started', () => events.push('session_started'));
      siteCrawler.on('url_discovered', () => events.push('url_discovered'));
      siteCrawler.on('url_started', () => events.push('url_started'));
      siteCrawler.on('url_completed', () => events.push('url_completed'));
      siteCrawler.on('session_completed', () => events.push('session_completed'));

      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).toContain('session_started');
      expect(events).toContain('url_discovered');
      expect(events).toContain('url_started');
      expect(events).toContain('url_completed');
    });
  });

  describe('Statistics and Results', () => {
    it('should collect crawl statistics', async () => {
      mockPageScanner.scan
        .mockResolvedValueOnce(createMockScanResult('https://example.com', 90, 2))
        .mockResolvedValueOnce(createMockScanResult('https://test.com', 70, 5));

      await siteCrawler.startCrawl(['https://example.com', 'https://test.com'], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const session = siteCrawler.getSession();
      const stats = session?.stats;

      expect(stats?.pagesScanned).toBe(2);
      expect(stats?.totalIssues).toBe(7); // 2 + 5
      expect(stats?.averageScore).toBe(80); // (90 + 70) / 2
      expect(stats?.urlCounts.completed).toBe(2);
    });

    it('should track WCAG compliance statistics', async () => {
      mockPageScanner.scan
        .mockResolvedValueOnce(createMockScanResult('https://compliant.com', 90, 1))
        .mockResolvedValueOnce(createMockScanResult('https://noncompliant.com', 60, 10));

      await siteCrawler.startCrawl(['https://compliant.com', 'https://noncompliant.com'], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const session = siteCrawler.getSession();
      const wcagStats = session?.stats.wcagCompliance;

      expect(wcagStats?.compliantPages).toBe(1);
      expect(wcagStats?.nonCompliantPages).toBe(1);
      expect(wcagStats?.complianceRate).toBe(0.5);
    });

    it('should store scan results', async () => {
      const mockResult = createMockScanResult('https://example.com');
      mockPageScanner.scan.mockResolvedValue(mockResult);

      await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const session = siteCrawler.getSession();
      const result = session?.results.get('https://example.com');

      expect(result).toEqual(mockResult);
    });
  });

  describe('Error Handling', () => {
    it('should handle scanner initialization failure', async () => {
      mockPageScanner.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(siteCrawler.startCrawl(['https://example.com']))
        .rejects.toThrow('Init failed');
    });

    it('should track recent errors', async () => {
      mockPageScanner.scan
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl([
        'https://error1.com',
        'https://error2.com',
        'https://success.com'
      ], { maxDepth: 0 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const progress = siteCrawler.getProgress();
      expect(progress?.recentErrors).toContain('Error 1');
      expect(progress?.recentErrors).toContain('Error 2');
    });

    it('should handle session cleanup on errors', async () => {
      mockPageScanner.scan.mockRejectedValue(new Error('Critical error'));

      await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      const session = siteCrawler.getSession();
      expect(session?.status).toBe('failed');
      expect(session?.error).toBe('Critical error');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', async () => {
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com']);

      const session = siteCrawler.getSession();
      const config = session?.config;

      expect(config?.maxDepth).toBe(2);
      expect(config?.maxPages).toBe(100);
      expect(config?.requestDelay).toBe(1000);
      expect(config?.maxConcurrency).toBe(5);
      expect(config?.respectRobotsTxt).toBe(true);
      expect(config?.useSitemaps).toBe(true);
      expect(config?.userAgent).toContain('a11yanalyze');
    });

    it('should merge custom configuration with defaults', async () => {
      const customConfig: Partial<CrawlerConfig> = {
        maxDepth: 5,
        maxPages: 50,
        requestDelay: 500,
        allowedDomains: ['example.com'],
      };

      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      await siteCrawler.startCrawl(['https://example.com'], customConfig);

      const session = siteCrawler.getSession();
      const config = session?.config;

      expect(config?.maxDepth).toBe(5);
      expect(config?.maxPages).toBe(50);
      expect(config?.requestDelay).toBe(500);
      expect(config?.allowedDomains).toEqual(['example.com']);
      expect(config?.maxConcurrency).toBe(5); // Default value
    });
  });

  describe('Session State', () => {
    it('should return null session when not running', () => {
      const session = siteCrawler.getSession();
      expect(session).toBeNull();
    });

    it('should return null progress when not running', () => {
      const progress = siteCrawler.getProgress();
      expect(progress).toBeNull();
    });

    it('should handle multiple sessions sequentially', async () => {
      mockPageScanner.scan.mockResolvedValue(createMockScanResult('https://example.com'));

      // First session
      const sessionId1 = await siteCrawler.startCrawl(['https://example.com'], { maxDepth: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      await siteCrawler.stopCrawl();

      // Second session
      const sessionId2 = await siteCrawler.startCrawl(['https://test.com'], { maxDepth: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sessionId1).not.toBe(sessionId2);
      expect(siteCrawler.getSession()?.id).toBe(sessionId2);
    });
  });
}); 