import { chromium, Browser, Page, BrowserContext, LaunchOptions } from 'playwright';
import { BrowserConfig, NavigationOptions, PageLoadResult, PageError, ResourceInfo, JavaScriptError, ConsoleMessage, BrowserManagerEvents } from '../types';
import { EventEmitter } from 'events';

/**
 * Headless browser lifecycle management
 * Handles Playwright browser instances and page management
 */
export class BrowserManager extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: BrowserConfig;
  private activePagesCount = 0;

  constructor(config: BrowserConfig) {
    super();
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      viewport: config.viewport ?? {
        width: 1280,
        height: 720,
      },
      userAgent: config.userAgent,
      slowMo: config.slowMo,
      args: config.args,
    };
  }

  /**
   * Initialize browser instance
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      throw new Error('Browser already initialized');
    }

    try {
      const launchOptions: LaunchOptions = {
        headless: this.config.headless,
        args: this.config.args || [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
        slowMo: this.config.slowMo,
      };

      this.browser = await chromium.launch(launchOptions);
      
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      });

      // Set default timeouts
      this.context.setDefaultTimeout(this.config.timeout);
      this.context.setDefaultNavigationTimeout(this.config.timeout);

      this.emit('browserInitialized', { browser: this.browser });
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create new page instance with event handlers
   * @returns Page instance
   */
  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    try {
      const page = await this.context.newPage();
      this.activePagesCount++;

      // Set up page event handlers
      this.setupPageEventHandlers(page);

      this.emit('pageCreated', { page, activePagesCount: this.activePagesCount });
      return page;
    } catch (error) {
      throw new Error(`Failed to create page: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Navigate to URL with comprehensive error handling and monitoring
   * @param page - Page instance
   * @param url - URL to navigate to
   * @param options - Navigation options
   */
  async navigateToUrl(
    page: Page, 
    url: string, 
    options: NavigationOptions = {
      timeout: this.config.timeout,
      waitUntil: 'domcontentloaded',
      retries: 3,
      retryDelay: 1000,
    }
  ): Promise<PageLoadResult> {
    const startTime = Date.now();
    const resources: ResourceInfo[] = [];
    let finalUrl = url;
    let statusCode: number | undefined;
    let redirectCount = 0;

    // Track resources
    page.on('response', (response) => {
      const request = response.request();
      resources.push({
        url: request.url(),
        type: request.resourceType(),
        status: response.status(),
        size: parseInt(response.headers()['content-length'] || '0', 10),
        loadTime: Date.now() - startTime,
      });
    });

    // Track redirects
    page.on('response', (response) => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectCount++;
      }
      if (response.url() === url || response.request().isNavigationRequest()) {
        statusCode = response.status();
        finalUrl = response.url();
      }
    });

    let lastError: PageError | undefined;

    for (let attempt = 1; attempt <= options.retries; attempt++) {
      try {
        const response = await page.goto(url, {
          timeout: options.timeout,
          waitUntil: options.waitUntil,
        });

        if (response) {
          statusCode = response.status();
          finalUrl = response.url();
        }

        // Wait for network to be idle for better stability
        try {
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch {
          // Continue if networkidle fails - not critical
        }

        const loadTime = Date.now() - startTime;

        this.emit('pageLoaded', {
          url,
          finalUrl,
          loadTime,
          attempt,
          statusCode,
        });

        return {
          success: true,
          url,
          finalUrl,
          statusCode,
          loadTime,
          resources,
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        lastError = {
          type: this.categorizeError(errorMessage),
          message: errorMessage,
          details: {
            attempt,
            url,
            timeout: options.timeout,
          },
        };

        this.emit('pageError', lastError);

        if (attempt < options.retries) {
          await this.wait(options.retryDelay);
        }
      }
    }

    const loadTime = Date.now() - startTime;
    
    return {
      success: false,
      url,
      finalUrl,
      statusCode,
      loadTime,
      error: lastError,
      resources,
    };
  }

  /**
   * Close a specific page and update tracking
   * @param page - Page to close
   */
  async closePage(page: Page): Promise<void> {
    try {
      await page.close();
      this.activePagesCount = Math.max(0, this.activePagesCount - 1);
      this.emit('pageClosed', { activePagesCount: this.activePagesCount });
    } catch (error) {
      // Page might already be closed, that's okay
    }
  }

  /**
   * Get current browser and context status
   */
  getStatus(): { 
    initialized: boolean; 
    activePagesCount: number;
    browserConnected: boolean;
  } {
    return {
      initialized: !!this.browser && !!this.context,
      activePagesCount: this.activePagesCount,
      browserConnected: this.browser?.isConnected() || false,
    };
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.activePagesCount = 0;
      this.emit('browserClosed');
    } catch (error) {
      // Log error but don't throw during cleanup
      this.emit('error', { 
        type: 'cleanup', 
        message: `Error during cleanup: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  }

  /**
   * Set storage state (cookies, localStorage, etc.) for the browser context
   */
  public async setStorageState(storageState: any): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    // Close existing context if any
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    // Create new context with storage state
    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
      storageState,
    });
    this.context.setDefaultTimeout(this.config.timeout);
    this.context.setDefaultNavigationTimeout(this.config.timeout);
  }

  /**
   * Set up comprehensive page event handlers
   * @private
   */
  private setupPageEventHandlers(page: Page): void {
    // JavaScript errors
    page.on('pageerror', (error: Error) => {
      const jsError: JavaScriptError = {
        message: error.message,
        source: 'page',
        line: 0,
        column: 0,
        stack: error.stack,
      };
      this.emit('javascriptError', jsError);
    });

    // Console messages
    page.on('console', (message) => {
      const consoleMessage: ConsoleMessage = {
        type: message.type() as any,
        text: message.text(),
        location: message.location() ? {
          url: message.location().url,
          lineNumber: message.location().lineNumber,
          columnNumber: message.location().columnNumber,
        } : undefined,
      };
      this.emit('consoleMessage', consoleMessage);
    });

    // Request failures
    page.on('requestfailed', (request) => {
      this.emit('requestFailed', {
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText,
      });
    });

    // Dialog handling (alerts, confirms, prompts)
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
      this.emit('dialogDismissed', {
        type: dialog.type(),
        message: dialog.message(),
      });
    });
  }

  /**
   * Categorize error types for better error handling
   * @private
   */
  private categorizeError(errorMessage: string): PageError['type'] {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('net::') || message.includes('dns') || message.includes('connection')) return 'network';
    if (message.includes('navigation')) return 'navigation';
    if (message.includes('security') || message.includes('ssl') || message.includes('cert')) return 'security';
    
    return 'javascript';
  }

  /**
   * Simple wait utility
   * @private
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 