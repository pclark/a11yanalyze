import { EventEmitter } from 'events';
import { URL } from 'url';
import { PageScanner } from './page-scanner';
import { 
  CrawlerConfig, 
  CrawlSession, 
  URLEntry, 
  URLStatus, 
  CrawlStatus, 
  CrawlEvent, 
  CrawlEventType,
  URLDiscoveryResult,
  URLDiscoverySource,
  CrawlProgress,
  CrawlStats,
  SitemapInfo,
  RobotsInfo
} from '../types/crawler';
import { ScanResult, ScanOptions, BrowserConfig, RuleEngineConfig } from '../types';
import { WCAGLevelConfig } from './wcag-level-handler';
import { ResilienceConfig } from './error-resilience';

/**
 * Site crawler for multi-page accessibility scanning
 * Provides crawling capabilities with depth limits, domain restrictions, and rate limiting
 */
export class SiteCrawler extends EventEmitter {
  private pageScanner: PageScanner;
  private session: CrawlSession | null = null;
  private isRunning = false;
  private isPaused = false;
  private abortController: AbortController | null = null;
  private activeRequests = new Set<string>();
  private requestQueue: URLEntry[] = [];
  private lastRequestTime = 0;
  private robotsCache = new Map<string, RobotsInfo>();
  private sitemapCache = new Map<string, SitemapInfo>();

  constructor(
    browserConfig?: BrowserConfig,
    ruleEngineConfig?: RuleEngineConfig,
    resilienceConfig?: Partial<ResilienceConfig>,
    wcagLevelConfig?: Partial<WCAGLevelConfig>
  ) {
    super();
    this.pageScanner = new PageScanner(
      browserConfig,
      ruleEngineConfig,
      resilienceConfig,
      wcagLevelConfig
    );
  }

  /**
   * Start a new crawl session
   */
  async startCrawl(
    startUrls: string[],
    config: Partial<CrawlerConfig> = {},
    scanOptions: Partial<ScanOptions> = {}
  ): Promise<string> {
    if (this.isRunning) {
      throw new Error('Crawler is already running. Stop the current session first.');
    }

    // Validate and normalize start URLs
    const validatedUrls = this.validateStartUrls(startUrls);
    if (validatedUrls.length === 0) {
      throw new Error('No valid start URLs provided');
    }

    // Create crawl session
    const sessionId = this.generateSessionId();
    const crawlerConfig = this.createDefaultConfig(config);
    
    this.session = {
      id: sessionId,
      startUrls: validatedUrls,
      config: crawlerConfig,
      scanOptions,
      startTime: new Date(),
      status: 'initializing',
      urls: new Map(),
      results: new Map(),
      stats: this.createInitialStats(),
      // Add a recentErrors array to the session for tracking
      recentErrors: []
    } as CrawlSession & { recentErrors: string[] };

    // Initialize scanner
    await this.pageScanner.initialize();

    // Set up session state
    this.isRunning = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    // Emit session started event
    this.emitEvent('session_started', { sessionId });

    // Start crawling process
    this.crawlAsync().catch(error => {
      this.handleCrawlError(error);
    });

    return sessionId;
  }

  /**
   * Pause the current crawl session
   */
  async pauseCrawl(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      throw new Error('No active crawl session to pause');
    }

    this.isPaused = true;
    if (this.session) {
      this.session.status = 'paused';
      this.emitEvent('session_paused');
    }
  }

  /**
   * Resume the paused crawl session
   */
  async resumeCrawl(): Promise<void> {
    if (!this.isRunning || !this.isPaused) {
      throw new Error('No paused crawl session to resume');
    }

    this.isPaused = false;
    if (this.session) {
      this.session.status = 'crawling';
      this.emitEvent('session_resumed');
    }
  }

  /**
   * Stop the current crawl session
   */
  async stopCrawl(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Signal abortion
    if (this.abortController) {
      this.abortController.abort();
    }

    // Wait for active requests to complete
    await this.waitForActiveRequests();

    // Update session status only if not already completed or failed
    if (this.session && this.session.status !== 'completed' && this.session.status !== 'failed') {
      this.session.status = 'cancelled';
      this.session.endTime = new Date();
      this.emitEvent('session_failed', { 
        error: 'Crawl session was manually stopped' 
      });
    }

    // Clean up
    await this.cleanup();
  }

  /**
   * Get current crawl progress
   */
  getProgress(): CrawlProgress | null {
    if (!this.session) {
      return null;
    }

    const stats = this.session.stats;
    const urlCounts = stats.urlCounts;
    const processedUrls = urlCounts.completed + urlCounts.failed + urlCounts.skipped;
    const totalUrls = urlCounts.total;
    
    const percentage = totalUrls > 0 ? Math.round((processedUrls / totalUrls) * 100) : 0;
    
    // Calculate scan rate
    const elapsed = Date.now() - this.session.startTime.getTime();
    const scanRate = elapsed > 0 ? (stats.pagesScanned / (elapsed / 60000)) : 0;

    // Estimate remaining time
    const remainingUrls = urlCounts.pending + urlCounts.processing;
    const estimatedTimeRemaining = scanRate > 0 ? (remainingUrls / scanRate) * 60000 : undefined;

    return {
      status: this.session.status,
      percentage,
      urlsProcessed: processedUrls,
      totalUrls,
      currentDepth: this.getCurrentDepth(),
      scanRate,
      estimatedTimeRemaining,
      currentUrl: this.getCurrentUrl(),
      recentErrors: this.getRecentErrors(),
    };
  }

  /**
   * Get current session information
   */
  getSession(): CrawlSession | null {
    return this.session ? { ...this.session } : null;
  }

  /**
   * Main crawling process
   * @private
   */
  private async crawlAsync(): Promise<void> {
    if (!this.session) {
      throw new Error('No session initialized');
    }

    try {
      // Initialize URLs from start URLs
      await this.initializeUrls();
      
      // Discover additional URLs from sitemaps and robots.txt
      if (this.session.config.useSitemaps) {
        await this.discoverFromSitemaps();
      }

      // Start the main crawling loop
      this.session.status = 'crawling';
      await this.crawlUrls();

      // Complete session
      this.session.status = 'completed';
      this.session.endTime = new Date();
      this.emitEvent('session_completed');

    } catch (error) {
      this.handleCrawlError(error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize URLs from start URLs
   * @private
   */
  private async initializeUrls(): Promise<void> {
    if (!this.session) return;

    this.session.status = 'discovering';

    for (const url of this.session.startUrls) {
      const urlEntry: URLEntry = {
        url,
        depth: 0,
        source: 'initial',
        priority: 100, // High priority for start URLs
        discoveredAt: new Date(),
        attempts: 0,
        status: 'pending',
      };

      this.session.urls.set(url, urlEntry);
      this.requestQueue.push(urlEntry);
      this.emitEvent('url_discovered', { url });
    }

    this.updateStats();
  }

  /**
   * Main URL crawling loop
   * @private
   */
  private async crawlUrls(): Promise<void> {
    if (!this.session) return;

    // --- FIX: Always process all URLs in the queue, even after failures ---
    while ((this.requestQueue.length > 0 || this.activeRequests.size > 0) && !this.abortController?.signal.aborted) {
      // Wait if paused
      if (this.isPaused) {
        await this.sleep(1000);
        continue;
      }

      // Check concurrent request limit
      if (this.activeRequests.size >= this.session.config.maxConcurrency) {
        await this.sleep(100);
        continue;
      }

      // Get next URL to process
      const urlEntry = this.getNextUrl();
      if (!urlEntry) {
        await this.sleep(100);
        continue;
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // Process URL (do not exit loop after failure)
      this.processUrl(urlEntry);
    }

    // Wait for all active requests to complete
    await this.waitForActiveRequests();
  }

  /**
   * Process a single URL
   * @private
   */
  private async processUrl(urlEntry: URLEntry): Promise<void> {
    if (!this.session) return;

    const { url } = urlEntry;
    
    try {
      // Mark as processing
      urlEntry.status = 'processing';
      urlEntry.lastAttempt = new Date();
      urlEntry.attempts++;
      this.activeRequests.add(url);
      this.emitEvent('url_started', { url });

      // Check if we should process this URL
      if (!this.shouldProcessUrl(urlEntry)) {
        urlEntry.status = 'skipped';
        this.emitEvent('url_skipped', { url });
        return;
      }

      // Scan the page
      const scanResult = await this.pageScanner.scan(url, this.session.scanOptions);
      
      // Store result
      this.session.results.set(url, scanResult);
      urlEntry.status = 'completed';
      this.emitEvent('url_completed', { url });

      // Discover new URLs from this page
      if (urlEntry.depth < this.session.config.maxDepth || this.session.config.maxDepth === -1) {
        await this.discoverUrlsFromPage(scanResult, urlEntry);
      }

      // Update statistics
      this.updateStatsForCompletedUrl(scanResult);

    } catch (error) {
      urlEntry.status = 'failed';
      urlEntry.error = error instanceof Error ? error.message : String(error);
      this.emitEvent('url_failed', { url, error: urlEntry.error });
      // --- FIX: Always push every error to recentErrors, never skip or overwrite ---
      if (this.session && 'recentErrors' in this.session) {
        (this.session as any).recentErrors.push(urlEntry.error);
        if ((this.session as any).recentErrors.length > 20) {
          (this.session as any).recentErrors = (this.session as any).recentErrors.slice(-20);
        }
      }
    } finally {
      this.activeRequests.delete(url);
      this.updateStats();
    }
  }

  /**
   * Discover URLs from a scanned page
   * @private
   */
  private async discoverUrlsFromPage(scanResult: ScanResult, parentEntry: URLEntry): Promise<void> {
    if (!this.session) return;

    try {
      // Extract URLs from the page content
      const discoveredUrls = await this.extractUrlsFromPage(scanResult.url);
      
      for (const discoveredUrl of discoveredUrls) {
        if (this.shouldAddUrl(discoveredUrl, parentEntry)) {
          const urlEntry: URLEntry = {
            url: discoveredUrl,
            depth: parentEntry.depth + 1,
            source: 'page',
            parent: parentEntry.url,
            priority: Math.max(1, parentEntry.priority - 10), // Decrease priority with depth
            discoveredAt: new Date(),
            attempts: 0,
            status: 'pending',
          };

          this.session.urls.set(discoveredUrl, urlEntry);
          this.requestQueue.push(urlEntry);
          this.emitEvent('url_discovered', { url: discoveredUrl });
        }
      }

    } catch (error) {
      console.warn(`Failed to discover URLs from ${parentEntry.url}:`, error);
    }
  }

  /**
   * Extract URLs from a page
   * @private
   */
  private async extractUrlsFromPage(pageUrl: string): Promise<string[]> {
    // This would normally use the page content to extract links
    // For now, return empty array as we need the actual page content
    // In a real implementation, this would parse the HTML content
    return [];
  }

  /**
   * Check if URL should be processed
   * @private
   */
  private shouldProcessUrl(urlEntry: URLEntry): boolean {
    if (!this.session) return false;

    const { config } = this.session;
    const url = new URL(urlEntry.url);

    // Check domain restrictions
    if (config.allowedDomains.length > 0) {
      if (!config.allowedDomains.includes(url.hostname)) {
        return false;
      }
    }

    // Check excluded domains
    if (config.excludedDomains.some(domain => url.hostname.includes(domain))) {
      return false;
    }

    // Check path patterns
    if (config.excludedPaths.some(pattern => new RegExp(pattern).test(url.pathname))) {
      return false;
    }

    if (config.includedPaths.length > 0) {
      if (!config.includedPaths.some(pattern => new RegExp(pattern).test(url.pathname))) {
        return false;
      }
    }

    // --- FIX: Only enforce maxPages after all start URLs have been processed at least once ---
    // If this is a start URL (depth 0, source 'initial'), always process it
    if (urlEntry.depth === 0 && urlEntry.source === 'initial') {
      return true;
    }

    // Check depth limit
    if (config.maxDepth !== -1 && urlEntry.depth > config.maxDepth) {
      this.emitEvent('depth_limit_reached', { url: urlEntry.url, depth: urlEntry.depth });
      return false;
    }

    // Check page limit (for non-start URLs)
    if (this.session.stats.pagesScanned >= config.maxPages) {
      this.emitEvent('page_limit_reached', { url: urlEntry.url });
      return false;
    }

    return true;
  }

  /**
   * Check if URL should be added to crawl queue
   * @private
   */
  private shouldAddUrl(url: string, parentEntry: URLEntry): boolean {
    if (!this.session) return false;

    // Skip if already discovered
    if (this.session.urls.has(url)) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const { config } = this.session;

      // Skip non-HTTP(S) URLs
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check domain restrictions
      if (config.allowedDomains.length > 0) {
        if (!config.allowedDomains.includes(urlObj.hostname)) {
          if (!config.discoverExternalLinks) {
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      // Invalid URL
      return false;
    }
  }

  /**
   * Discover URLs from sitemaps
   * @private
   */
  private async discoverFromSitemaps(): Promise<void> {
    if (!this.session) return;

    for (const startUrl of this.session.startUrls) {
      try {
        const url = new URL(startUrl);
        const sitemapUrl = `${url.protocol}//${url.host}/sitemap.xml`;
        
        const sitemap = await this.fetchSitemap(sitemapUrl);
        if (sitemap) {
          for (const sitemapUrl of sitemap.urls) {
            if (this.shouldAddUrl(sitemapUrl.url, { 
              url: startUrl, 
              depth: -1, 
              source: 'initial',
              priority: 100,
              discoveredAt: new Date(),
              attempts: 0,
              status: 'pending'
            })) {
              const urlEntry: URLEntry = {
                url: sitemapUrl.url,
                depth: 0,
                source: 'sitemap',
                priority: Math.round((sitemapUrl.priority || 0.5) * 100),
                discoveredAt: new Date(),
                attempts: 0,
                status: 'pending',
              };

              this.session.urls.set(sitemapUrl.url, urlEntry);
              this.requestQueue.push(urlEntry);
              this.emitEvent('url_discovered', { url: sitemapUrl.url });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch sitemap for ${startUrl}:`, error);
      }
    }
  }

  /**
   * Fetch and parse sitemap
   * @private
   */
  private async fetchSitemap(sitemapUrl: string): Promise<SitemapInfo | null> {
    // Placeholder implementation
    // In a real implementation, this would fetch and parse XML sitemap
    return null;
  }

  /**
   * Apply rate limiting
   * @private
   */
  private async applyRateLimit(): Promise<void> {
    if (!this.session) return;

    const { requestDelay } = this.session.config;
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    if (timeSinceLastRequest < requestDelay) {
      const delayNeeded = requestDelay - timeSinceLastRequest;
      this.emitEvent('rate_limit_applied', { delay: delayNeeded });
      await this.sleep(delayNeeded);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get next URL to process
   * @private
   */
  private getNextUrl(): URLEntry | null {
    // Sort by priority (higher first) and then by discovery time
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.discoveredAt.getTime() - b.discoveredAt.getTime();
    });

    return this.requestQueue.shift() || null;
  }

  /**
   * Check if there's more work to do
   * @private
   */
  private hasWorkToDo(): boolean {
    return this.requestQueue.length > 0 || this.activeRequests.size > 0;
  }

  /**
   * Wait for all active requests to complete
   * @private
   */
  private async waitForActiveRequests(): Promise<void> {
    while (this.activeRequests.size > 0) {
      await this.sleep(100);
    }
  }

  /**
   * Validate start URLs
   * @private
   */
  private validateStartUrls(urls: string[]): string[] {
    const validUrls: string[] = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        if (['http:', 'https:'].includes(urlObj.protocol)) {
          validUrls.push(url);
        }
      } catch (error) {
        console.warn(`Invalid start URL: ${url}`);
      }
    }

    return validUrls;
  }

  /**
   * Create default crawler configuration
   * @private
   */
  private createDefaultConfig(config: Partial<CrawlerConfig>): CrawlerConfig {
    return {
      maxDepth: 2,
      maxPages: 100,
      allowedDomains: [],
      excludedDomains: [],
      excludedPaths: [],
      includedPaths: [],
      requestDelay: 1000,
      maxConcurrency: 5,
      respectRobotsTxt: true,
      discoverExternalLinks: false,
      useSitemaps: true,
      userAgent: 'a11yanalyze/1.0.0 (Accessibility Scanner)',
      requestTimeout: 30000,
      ...config,
    };
  }

  /**
   * Create initial statistics
   * @private
   */
  private createInitialStats(): CrawlStats {
    return {
      urlCounts: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        excluded: 0,
      },
      pagesScanned: 0,
      totalIssues: 0,
      issuesBySeverity: {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
        warning: 0,
      },
      averageScore: 0,
      performance: {
        avgPageLoadTime: 0,
        avgScanTime: 0,
        totalCrawlTime: 0,
        pagesPerMinute: 0,
      },
      wcagCompliance: {
        compliantPages: 0,
        nonCompliantPages: 0,
        complianceRate: 0,
        levelBreakdown: {
          A: 0,
          AA: 0,
          AAA: 0,
          ARIA: 0,
        },
      },
    };
  }

  /**
   * Update statistics
   * @private
   */
  private updateStats(): void {
    if (!this.session) return;

    const urls = Array.from(this.session.urls.values());
    const stats = this.session.stats;

    // Update URL counts
    stats.urlCounts.total = urls.length;
    stats.urlCounts.pending = urls.filter(u => u.status === 'pending').length;
    stats.urlCounts.processing = urls.filter(u => u.status === 'processing').length;
    stats.urlCounts.completed = urls.filter(u => u.status === 'completed').length;
    stats.urlCounts.failed = urls.filter(u => u.status === 'failed').length;
    stats.urlCounts.skipped = urls.filter(u => u.status === 'skipped').length;
    stats.urlCounts.excluded = urls.filter(u => u.status === 'excluded').length;

    // Update performance metrics
    const elapsed = Date.now() - this.session.startTime.getTime();
    stats.performance.totalCrawlTime = elapsed;
    stats.performance.pagesPerMinute = elapsed > 0 ? (stats.pagesScanned / (elapsed / 60000)) : 0;
  }

  /**
   * Update statistics for completed URL
   * @private
   */
  private updateStatsForCompletedUrl(scanResult: ScanResult): void {
    if (!this.session) return;

    const stats = this.session.stats;
    stats.pagesScanned++;
    stats.totalIssues += scanResult.issues.length;

    // Update issues by severity
    for (const issue of scanResult.issues) {
      stats.issuesBySeverity[issue.severity]++;
    }

    // Update average score
    const totalScore = stats.averageScore * (stats.pagesScanned - 1) + scanResult.score;
    stats.averageScore = totalScore / stats.pagesScanned;

    // Update WCAG compliance
    if (scanResult.compliance?.compliant) {
      stats.wcagCompliance.compliantPages++;
    } else {
      stats.wcagCompliance.nonCompliantPages++;
    }

    stats.wcagCompliance.complianceRate = 
      stats.wcagCompliance.compliantPages / stats.pagesScanned;

    // Update level breakdown
    if (scanResult.compliance?.levelBreakdown) {
      for (const [level, count] of Object.entries(scanResult.compliance.levelBreakdown)) {
        if (level in stats.wcagCompliance.levelBreakdown) {
          (stats.wcagCompliance.levelBreakdown as any)[level] += count;
        }
      }
    }
  }

  /**
   * Handle crawl errors
   * @private
   */
  private handleCrawlError(error: any): void {
    if (this.session) {
      this.session.status = 'failed';
      this.session.error = error instanceof Error ? error.message : String(error);
      this.session.endTime = new Date();
      this.emitEvent('session_failed', { error: this.session.error });
    }
  }

  /**
   * Emit crawl event
   * @private
   */
  private emitEvent(type: CrawlEventType, data: any = {}): void {
    const event: CrawlEvent = {
      type,
      timestamp: new Date(),
      sessionId: this.session?.id || '',
      ...data,
    };

    this.emit('crawl_event', event);
    this.emit(type, event);
  }

  /**
   * Get current crawl depth
   * @private
   */
  private getCurrentDepth(): number {
    if (!this.session) return 0;

    const urls = Array.from(this.session.urls.values());
    const processingUrls = urls.filter(u => u.status === 'processing');
    
    return processingUrls.length > 0 
      ? Math.max(...processingUrls.map(u => u.depth))
      : Math.max(...urls.map(u => u.depth));
  }

  /**
   * Get current URL being processed
   * @private
   */
  private getCurrentUrl(): string | undefined {
    if (!this.session) return undefined;

    const urls = Array.from(this.session.urls.values());
    const processingUrl = urls.find(u => u.status === 'processing');
    
    return processingUrl?.url;
  }

  /**
   * Get recent errors
   * @private
   */
  private getRecentErrors(): string[] {
    if (!this.session) return [];
    // Prefer session.recentErrors if available
    if ('recentErrors' in this.session && Array.isArray((this.session as any).recentErrors)) {
      return (this.session as any).recentErrors.slice(0, 10);
    }
    // Fallback to previous logic
    const urls = Array.from(this.session.urls.values());
    const failedUrls = urls
      .filter(u => u.status === 'failed' && u.error)
      .sort((a, b) => (b.lastAttempt?.getTime() || 0) - (a.lastAttempt?.getTime() || 0))
      .slice(0, 10);
    return failedUrls.map(u => u.error!);
  }

  /**
   * Generate session ID
   * @private
   */
  private generateSessionId(): string {
    // Use cryptographically secure random UUID
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for Node.js < v14.17
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  }

  /**
   * Sleep for specified duration
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   * @private
   */
  private async cleanup(): Promise<void> {
    this.isRunning = false;
    this.isPaused = false;
    this.abortController = null;
    this.activeRequests.clear();
    this.requestQueue = [];
    
    await this.pageScanner.cleanup();
  }
} 