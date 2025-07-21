/**
 * BrowserManager unit tests
 * Tests Playwright integration and browser lifecycle management
 */

import { BrowserManager } from './browser-manager';
import { BrowserConfig, NavigationOptions } from '../types';

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

const mockPage = {
  goto: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  waitForLoadState: jest.fn(),
};

const mockContext = {
  newPage: jest.fn(() => Promise.resolve(mockPage)),
  close: jest.fn(),
  setDefaultTimeout: jest.fn(),
  setDefaultNavigationTimeout: jest.fn(),
};

const mockBrowser = {
  newContext: jest.fn(() => Promise.resolve(mockContext)),
  close: jest.fn(),
  isConnected: jest.fn(() => true),
};

describe('BrowserManager', () => {
  let browserManager: BrowserManager;
  let mockConfig: BrowserConfig;

  beforeEach(() => {
    mockConfig = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000,
    };
    
    browserManager = new BrowserManager(mockConfig);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    const { chromium } = require('playwright');
    chromium.launch.mockResolvedValue(mockBrowser);
    mockBrowser.newContext.mockResolvedValue(mockContext);
    mockContext.newPage.mockResolvedValue(mockPage);
  });

  afterEach(async () => {
    try {
      await browserManager.cleanup();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('Configuration', () => {
    it('should apply default configuration values', () => {
      const manager = new BrowserManager({} as BrowserConfig);
      const status = manager.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.activePagesCount).toBe(0);
    });

    it('should override defaults with provided config', () => {
      const customConfig: BrowserConfig = {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
        userAgent: 'custom-agent',
      };
      
      const manager = new BrowserManager(customConfig);
      expect(manager).toBeInstanceOf(BrowserManager);
    });
  });

  describe('Browser Initialization', () => {
    it('should initialize browser successfully', async () => {
      await browserManager.initialize();
      
      const { chromium } = require('playwright');
      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining(['--no-sandbox']),
        })
      );
      
      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          viewport: { width: 1280, height: 720 },
          ignoreHTTPSErrors: true,
          javaScriptEnabled: true,
        })
      );
      
      const status = browserManager.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('should throw error if browser already initialized', async () => {
      await browserManager.initialize();
      
      await expect(browserManager.initialize()).rejects.toThrow(
        'Browser already initialized'
      );
    });

    it('should handle browser launch failure', async () => {
      const { chromium } = require('playwright');
      chromium.launch.mockRejectedValue(new Error('Launch failed'));
      
      await expect(browserManager.initialize()).rejects.toThrow(
        'Failed to initialize browser: Launch failed'
      );
    });
  });

  describe('Page Management', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should create page successfully', async () => {
      const page = await browserManager.createPage();
      
      expect(mockContext.newPage).toHaveBeenCalled();
      expect(page).toBe(mockPage);
      expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('console', expect.any(Function));
      
      const status = browserManager.getStatus();
      expect(status.activePagesCount).toBe(1);
    });

    it('should throw error when creating page without initialization', async () => {
      const uninitializedManager = new BrowserManager(mockConfig);
      
      await expect(uninitializedManager.createPage()).rejects.toThrow(
        'Browser not initialized'
      );
    });

    it('should close page and update count', async () => {
      const page = await browserManager.createPage();
      
      await browserManager.closePage(page);
      
      expect(mockPage.close).toHaveBeenCalled();
      const status = browserManager.getStatus();
      expect(status.activePagesCount).toBe(0);
    });

    it('should handle page creation failure', async () => {
      mockContext.newPage.mockRejectedValue(new Error('Page creation failed'));
      
      await expect(browserManager.createPage()).rejects.toThrow(
        'Failed to create page: Page creation failed'
      );
    });
  });

  describe('Navigation', () => {
    let page: any;

    beforeEach(async () => {
      await browserManager.initialize();
      page = await browserManager.createPage();
    });

    it('should navigate successfully', async () => {
      const mockResponse = {
        status: () => 200,
        url: () => 'https://example.com',
      };
      mockPage.goto.mockResolvedValue(mockResponse);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await browserManager.navigateToUrl(page, 'https://example.com');

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          timeout: 30000,
          waitUntil: 'domcontentloaded',
        })
      );

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
      expect(result.statusCode).toBe(200);
      expect(typeof result.loadTime).toBe('number');
      expect(result.loadTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle navigation timeout with retries', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const options: NavigationOptions = {
        timeout: 5000,
        waitUntil: 'domcontentloaded',
        retries: 2,
        retryDelay: 100,
      };

      const result = await browserManager.navigateToUrl(page, 'https://example.com', options);

      expect(mockPage.goto).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        type: 'timeout',
        message: 'Navigation timeout',
      });
    });

    it('should categorize different error types', async () => {
      // Test network error
      mockPage.goto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));
      
      const result = await browserManager.navigateToUrl(page, 'https://example.com', {
        timeout: 5000,
        waitUntil: 'domcontentloaded',
        retries: 1,
        retryDelay: 0,
      });

      expect(result.error?.type).toBe('network');
    });

    it('should return navigation result with resources array', async () => {
      const mockResponse = {
        status: () => 200,
        url: () => 'https://example.com',
      };
      mockPage.goto.mockResolvedValue(mockResponse);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await browserManager.navigateToUrl(page, 'https://example.com');
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await browserManager.initialize();
    });

    it('should emit browser events', (done) => {
      browserManager.on('browserInitialized', (data) => {
        expect(data.browser).toBeDefined();
        done();
      });

      // Re-initialize to trigger event
      browserManager.cleanup().then(() => {
        browserManager.initialize();
      });
    });

    it('should emit page events', (done) => {
      browserManager.on('pageCreated', (data) => {
        expect(data.page).toBeDefined();
        expect(data.activePagesCount).toBe(1);
        done();
      });

      browserManager.createPage();
    });

    it('should handle page JavaScript errors', async () => {
      const page = await browserManager.createPage();
      
      const jsErrorHandler = mockPage.on.mock.calls.find(
        call => call[0] === 'pageerror'
      )?.[1];

      expect(jsErrorHandler).toBeDefined();

      const mockError = new Error('JavaScript error');
      
      browserManager.on('javascriptError', (error) => {
        expect(error.message).toBe('JavaScript error');
        expect(error.source).toBe('page');
      });

      if (jsErrorHandler) {
        jsErrorHandler(mockError);
      }
    });

    it('should handle console messages', async () => {
      const page = await browserManager.createPage();
      
      const consoleHandler = mockPage.on.mock.calls.find(
        call => call[0] === 'console'
      )?.[1];

      expect(consoleHandler).toBeDefined();

      const mockConsoleMessage = {
        type: () => 'error',
        text: () => 'Console error message',
        location: () => ({
          url: 'https://example.com',
          lineNumber: 42,
          columnNumber: 10,
        }),
      };

      browserManager.on('consoleMessage', (message) => {
        expect(message.type).toBe('error');
        expect(message.text).toBe('Console error message');
        expect(message.location?.lineNumber).toBe(42);
      });

      if (consoleHandler) {
        consoleHandler(mockConsoleMessage);
      }
    });
  });

  describe('Status and Cleanup', () => {
    it('should report correct status when uninitialized', () => {
      const status = browserManager.getStatus();
      
      expect(status.initialized).toBe(false);
      expect(status.activePagesCount).toBe(0);
      expect(status.browserConnected).toBe(false);
    });

    it('should report correct status when initialized', async () => {
      await browserManager.initialize();
      await browserManager.createPage();
      
      const status = browserManager.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.activePagesCount).toBe(1);
      expect(status.browserConnected).toBe(true);
    });

    it('should cleanup resources properly', async () => {
      await browserManager.initialize();
      await browserManager.createPage();
      
      await browserManager.cleanup();
      
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
      
      const status = browserManager.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.activePagesCount).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      await browserManager.initialize();
      
      mockContext.close.mockRejectedValue(new Error('Cleanup failed'));
      
      const errorSpy = jest.fn();
      browserManager.on('error', errorSpy);
      
      await browserManager.cleanup();
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cleanup',
          message: expect.stringContaining('Cleanup failed'),
        })
      );
    });
  });
}); 