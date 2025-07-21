/**
 * PageScanner unit tests
 * Tests single page accessibility scanning with JavaScript rendering support
 */

import { PageScanner } from './page-scanner';
import { BrowserConfig, RuleEngineConfig, ScanOptions, ViolationNode } from '../types';
import { BrowserManager } from '../utils/browser-manager';
import { RuleEngine } from './rule-engine';

// Helper function to create mock ViolationNode
function createMockViolationNode(html: string, target: string[]): ViolationNode {
  return {
    html,
    target,
    any: [],
    all: [],
    none: [],
  };
}

// Mock dependencies
jest.mock('../utils/browser-manager');
jest.mock('./rule-engine');

const MockedBrowserManager = BrowserManager as jest.MockedClass<typeof BrowserManager>;
const MockedRuleEngine = RuleEngine as jest.MockedClass<typeof RuleEngine>;

describe('PageScanner', () => {
  let pageScanner: PageScanner;
  let mockBrowserManager: jest.Mocked<BrowserManager>;
  let mockRuleEngine: jest.Mocked<RuleEngine>;
  let mockPage: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock page
    mockPage = {
      url: jest.fn(() => 'https://example.com'),
      waitForLoadState: jest.fn(),
      waitForFunction: jest.fn(),
      waitForTimeout: jest.fn(),
      evaluate: jest.fn(),
      screenshot: jest.fn(),
    };

    // Setup mock browser manager
    mockBrowserManager = {
      initialize: jest.fn(),
      createPage: jest.fn(() => Promise.resolve(mockPage)),
      navigateToUrl: jest.fn(),
      closePage: jest.fn(),
      cleanup: jest.fn(),
      getStatus: jest.fn(() => ({
        initialized: true,
        activePagesCount: 0,
        browserConnected: true,
      })),
    } as any;

    // Setup mock rule engine
    mockRuleEngine = {
      executeRules: jest.fn(() => Promise.resolve([])),
      updateConfiguration: jest.fn(),
      getConfiguration: jest.fn(() => ({
        wcagLevel: 'AA',
        includeAAA: false,
        includeARIA: true,
        customRules: [],
        disabledRules: [],
      })),
    } as any;

    MockedBrowserManager.mockImplementation(() => mockBrowserManager);
    MockedRuleEngine.mockImplementation(() => mockRuleEngine);

    pageScanner = new PageScanner();
  });

  afterEach(async () => {
    try {
      await pageScanner.cleanup();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('Constructor and Initialization', () => {
    it('should create PageScanner with default configuration', () => {
      expect(pageScanner).toBeInstanceOf(PageScanner);
      expect(MockedBrowserManager).toHaveBeenCalledWith({
        headless: true,
        viewport: { width: 1280, height: 720 },
        timeout: 30000,
      });
      expect(MockedRuleEngine).toHaveBeenCalledWith({
        wcagLevel: 'AA',
        includeAAA: false,
        includeARIA: true,
        customRules: [],
        disabledRules: [],
      });
    });

    it('should create PageScanner with custom configuration', () => {
      const browserConfig: BrowserConfig = {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
      };
      
      const ruleEngineConfig: RuleEngineConfig = {
        wcagLevel: 'AAA',
        includeAAA: true,
        includeARIA: false,
        customRules: [],
        disabledRules: ['rule1'],
      };

      const scanner = new PageScanner(browserConfig, ruleEngineConfig);
      
      expect(MockedBrowserManager).toHaveBeenCalledWith(browserConfig);
      expect(MockedRuleEngine).toHaveBeenCalledWith(ruleEngineConfig);
    });

    it('should initialize browser manager on first initialize call', async () => {
      await pageScanner.initialize();
      
      expect(mockBrowserManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should not reinitialize if already initialized', async () => {
      await pageScanner.initialize();
      await pageScanner.initialize();
      
      expect(mockBrowserManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      mockBrowserManager.initialize.mockRejectedValue(new Error('Init failed'));
      
      await expect(pageScanner.initialize()).rejects.toThrow('Failed to initialize PageScanner: Init failed');
    });
  });

  describe('URL Validation', () => {
    it('should reject invalid URLs', async () => {
      await expect(pageScanner.scan('invalid-url')).rejects.toThrow('Invalid URL provided: invalid-url');
      await expect(pageScanner.scan('ftp://example.com')).rejects.toThrow('Invalid URL provided: ftp://example.com');
    });

    it('should accept valid HTTP/HTTPS URLs', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 100,
        interactiveElements: 10,
        title: 'Test Page',
        url: 'https://example.com',
        userAgent: 'test-agent',
        viewport: { width: 1280, height: 720 },
      });

      const result1 = await pageScanner.scan('https://example.com');
      const result2 = await pageScanner.scan('http://example.com');

      expect(result1.url).toBe('https://example.com');
      expect(result2.url).toBe('http://example.com');
    });
  });

  describe('Successful Scanning', () => {
    beforeEach(() => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 100,
        interactiveElements: 10,
        title: 'Test Page',
        url: 'https://example.com',
        userAgent: 'test-agent',
        viewport: { width: 1280, height: 720 },
      });
    });

    it('should perform complete accessibility scan', async () => {
      const mockRuleResults = [
                 {
           ruleId: 'image-alt',
           wcagReference: '1.1.1',
           level: 'A' as const,
           impact: 'serious' as const,
           nodes: [
             {
               target: ['img'],
               html: '<img src="test.jpg">',
               any: [],
               all: [],
               none: [],
             },
           ],
           description: 'Images must have alternate text',
           help: 'Images must have an alt attribute',
           helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/image-alt',
         },
      ];

      mockRuleEngine.executeRules.mockResolvedValue(mockRuleResults);

      const result = await pageScanner.scan('https://example.com');

      expect(mockBrowserManager.initialize).toHaveBeenCalled();
      expect(mockBrowserManager.createPage).toHaveBeenCalled();
      expect(mockBrowserManager.navigateToUrl).toHaveBeenCalledWith(
        mockPage,
        'https://example.com',
        expect.objectContaining({
          timeout: 30000,
          waitUntil: 'domcontentloaded',
          retries: 1,
          retryDelay: 500,
        })
      );
      expect(mockRuleEngine.executeRules).toHaveBeenCalledWith(mockPage);
      expect(mockBrowserManager.closePage).toHaveBeenCalledWith(mockPage);

      expect(result).toMatchObject({
        url: 'https://example.com',
        score: expect.any(Number),
        issues: expect.arrayContaining([
          expect.objectContaining({
            id: 'image-alt',
            wcagReference: '1.1.1',
            level: 'A',
            severity: 'serious',
            element: 'img',
          }),
        ]),
        metadata: expect.objectContaining({
          scanDuration: expect.any(Number),
          pageLoadTime: 1000,
          totalElements: 100,
          testedElements: 10,
        }),
      });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle scan options correctly', async () => {
      const options: ScanOptions = {
        wcagLevel: 'AAA',
        includeWarnings: false,
        timeout: 60000,
        includeAAA: true,
        includeARIA: false,
        screenshot: false,
        customRules: ['custom-rule-1'],
        disabledRules: ['disabled-rule-1'],
      };

      mockRuleEngine.executeRules.mockResolvedValue([]);

      await pageScanner.scan('https://example.com', options);

      expect(mockRuleEngine.updateConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          wcagLevel: 'AAA',
          includeAAA: true,
          includeARIA: false,
          disabledRules: ['disabled-rule-1'],
        })
      );

      expect(mockBrowserManager.navigateToUrl).toHaveBeenCalledWith(
        mockPage,
        'https://example.com',
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should calculate accessibility score correctly', async () => {
      // Test with no issues (perfect score)
      mockRuleEngine.executeRules.mockResolvedValue([]);
      const perfectResult = await pageScanner.scan('https://example.com');
      expect(perfectResult.score).toBe(100);

             // Test with issues
       const mockRuleResults = [
         {
           ruleId: 'critical-issue',
           impact: 'critical' as const,
           nodes: [{ target: ['div'], html: '<div></div>', any: [], all: [], none: [] }],
           description: 'Critical issue',
           help: 'Fix this',
           helpUrl: 'https://example.com',
           wcagReference: '1.1.1',
           level: 'AA' as const,
         },
       ];

      mockRuleEngine.executeRules.mockResolvedValue(mockRuleResults);
      const issueResult = await pageScanner.scan('https://example.com');
      expect(issueResult.score).toBeLessThan(100);
      expect(issueResult.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Page Ready Waiting', () => {
    it('should wait for page to be fully loaded', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 50,
        interactiveElements: 5,
        title: 'Test',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

      mockRuleEngine.executeRules.mockResolvedValue([]);

      await pageScanner.scan('https://example.com');

      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 10000 });
      expect(mockPage.waitForFunction).toHaveBeenCalled();
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should continue scan even if page ready wait times out', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.waitForLoadState.mockRejectedValue(new Error('Wait timeout'));
      mockPage.waitForFunction.mockRejectedValue(new Error('Wait timeout'));

      mockPage.evaluate.mockResolvedValue({
        totalElements: 50,
        interactiveElements: 5,
        title: 'Test',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

      mockRuleEngine.executeRules.mockResolvedValue([]);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await pageScanner.scan('https://example.com');

      expect(result.url).toBe('https://example.com');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Page ready wait timeout'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: false,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 0,
        error: {
          type: 'timeout',
          message: 'Navigation timeout',
        },
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 0,
        interactiveElements: 0,
        title: '',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

      mockRuleEngine.executeRules.mockResolvedValue([]);

      const result = await pageScanner.scan('https://example.com');

      expect(result.errors).toEqual([
        expect.objectContaining({
          type: 'timeout',
          message: 'Navigation timeout',
        }),
      ]);
    });

    it('should handle rule execution errors', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 50,
        interactiveElements: 5,
        title: 'Test',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

      mockRuleEngine.executeRules.mockRejectedValue(new Error('Rule execution failed'));

      const result = await pageScanner.scan('https://example.com');

      expect(result.errors).toEqual([
        expect.objectContaining({
          type: 'runtime',
          message: 'Rule execution failed',
          details: expect.stringContaining('Rule execution'),
        }),
      ]);
    });

    it('should handle page metadata extraction errors', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockRejectedValue(new Error('Page evaluation failed'));
      mockRuleEngine.executeRules.mockResolvedValue([]);

      const result = await pageScanner.scan('https://example.com');

      // Should use default metadata when extraction fails
      expect(result.metadata).toMatchObject({
        totalElements: 0,
        testedElements: 0,
        userAgent: 'unknown',
      });
    });

    it('should handle unexpected scan errors', async () => {
      mockBrowserManager.createPage.mockRejectedValue(new Error('Page creation failed'));

      const result = await pageScanner.scan('https://example.com');

      expect(result.score).toBe(0);
      expect(result.errors).toEqual([
        expect.objectContaining({
          type: 'runtime',
          message: 'Page creation failed',
          details: expect.stringContaining('Page scan operation'),
        }),
      ]);
    });
  });

  describe('Screenshot Functionality', () => {
    it('should take screenshot when requested', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 50,
        interactiveElements: 5,
        title: 'Test',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

      mockRuleEngine.executeRules.mockResolvedValue([]);
      mockPage.screenshot.mockResolvedValue(undefined);

             await pageScanner.scan('https://example.com', { screenshot: true } as any);

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: expect.stringMatching(/screenshot-\d+\.png/),
        fullPage: true,
      });
    });

    it('should handle screenshot errors gracefully', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 50,
        interactiveElements: 5,
        title: 'Test',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

      mockRuleEngine.executeRules.mockResolvedValue([]);
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

             const result = await pageScanner.scan('https://example.com', { screenshot: true } as any);

               expect(result.errors).toEqual([
          expect.objectContaining({
            type: 'runtime',
            message: 'Screenshot failed',
            details: expect.stringContaining('Screenshot capture'),
          }),
        ]);
    });
  });

  describe('Cleanup and Status', () => {
    it('should provide current status', async () => {
      const status = pageScanner.getStatus();

      expect(status).toMatchObject({
        initialized: false,
        browserStatus: expect.any(Object),
        ruleEngineConfig: expect.any(Object),
      });
    });

    it('should cleanup resources properly', async () => {
      await pageScanner.initialize();
      await pageScanner.cleanup();

      expect(mockBrowserManager.cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockBrowserManager.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await pageScanner.initialize();
      await pageScanner.cleanup();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error during PageScanner cleanup:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Configuration Updates', () => {
    it('should update rule engine configuration', async () => {
      const newRuleConfig = { wcagLevel: 'AAA' as const };
      
      await pageScanner.updateConfiguration(undefined, newRuleConfig);
      
      expect(mockRuleEngine.updateConfiguration).toHaveBeenCalledWith(newRuleConfig);
    });

    it('should handle browser configuration updates', async () => {
      await pageScanner.initialize();
      
      const newBrowserConfig = { headless: false };
      await pageScanner.updateConfiguration(newBrowserConfig);
      
      expect(mockBrowserManager.cleanup).toHaveBeenCalled();
      // New browser manager should be created with updated config
      expect(MockedBrowserManager).toHaveBeenCalledTimes(2);
    });
  });

  describe('Element Name Extraction', () => {
    it('should extract element names correctly', async () => {
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        finalUrl: 'https://example.com',
        loadTime: 1000,
        resources: [],
      });

      mockPage.evaluate.mockResolvedValue({
        totalElements: 50,
        interactiveElements: 5,
        title: 'Test',
        url: 'https://example.com',
        userAgent: 'test',
        viewport: { width: 1280, height: 720 },
      });

             const mockRuleResults = [
         {
           ruleId: 'test-rule',
           nodes: [
             { target: ['button'], html: '<button>Click me</button>', any: [], all: [], none: [] },
             { target: ['div'], html: '<div class="test">Content</div>', any: [], all: [], none: [] },
             { target: ['span'], html: 'invalid-html', any: [], all: [], none: [] },
           ],
           wcagReference: '1.1.1',
           level: 'AA' as const,
           impact: 'moderate' as const,
           description: 'Test rule',
           help: 'Test help',
           helpUrl: 'https://example.com',
         },
       ];

      mockRuleEngine.executeRules.mockResolvedValue(mockRuleResults);

      const result = await pageScanner.scan('https://example.com');

      expect(result.issues[0]?.element).toBe('button');
      expect(result.issues[1]?.element).toBe('div');
      expect(result.issues[2]?.element).toBe('unknown'); // Invalid HTML
    });
  });

  describe('WCAG Level Integration', () => {
    let pageScanner: PageScanner;
    let mockBrowserManager: jest.Mocked<BrowserManager>;
    let mockRuleEngine: jest.Mocked<RuleEngine>;
    let mockPage: any;

    beforeEach(() => {
      // Create PageScanner with custom WCAG level configuration
      pageScanner = new PageScanner(
        { headless: true, viewport: { width: 1280, height: 720 }, timeout: 30000 },
        { wcagLevel: 'AA', includeAAA: true, includeARIA: true, customRules: [], disabledRules: [] },
        {},
        { primaryLevel: 'AA', includeAAA: true, includeARIA: true }
      );

      // Mock dependencies
      mockBrowserManager = {
        initialize: jest.fn().mockResolvedValue(undefined),
        createPage: jest.fn(),
        navigateToUrl: jest.fn(),
        getStatus: jest.fn().mockReturnValue({ initialized: true }),
        cleanup: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        off: jest.fn(),
      } as any;

      mockRuleEngine = {
        executeRules: jest.fn(),
        getConfiguration: jest.fn().mockReturnValue({
          wcagLevel: 'AA',
          includeAAA: true,
          includeARIA: true,
        }),
        updateConfiguration: jest.fn(),
      } as any;

      mockPage = {
        url: jest.fn().mockReturnValue('https://example.com'),
        evaluate: jest.fn().mockResolvedValue({
          title: 'Test Page',
          description: 'A test page',
          language: 'en',
          totalElements: 100,
          interactiveElements: 20,
          headings: 5,
          links: 10,
          images: 15,
          errors: [],
        }),
        waitForFunction: jest.fn().mockResolvedValue(undefined),
        waitForLoadState: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
      };

      // Inject mocks
      pageScanner['browserManager'] = mockBrowserManager;
      pageScanner['ruleEngine'] = mockRuleEngine;
      mockBrowserManager.createPage.mockResolvedValue(mockPage);
      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        status: 200,
        resources: [],
      });
    });

    afterEach(async () => {
      await pageScanner.cleanup();
    });

    it('should include compliance summary in scan results', async () => {
      // Mock rule results with different WCAG levels
      mockRuleEngine.executeRules.mockResolvedValue([
        {
          ruleId: 'color-contrast',
          wcagReference: '1.4.3',
          level: 'AA',
          description: 'Elements must have sufficient color contrast',
          help: 'Ensure sufficient color contrast',
          helpUrl: 'https://example.com/help',
          impact: 'serious',
          nodes: [createMockViolationNode('<div>Test</div>', ['div'])],
        },
        {
          ruleId: 'focus-order-semantics',
          wcagReference: '2.4.3',
          level: 'A',
          description: 'Focus order must be logical',
          help: 'Ensure logical focus order',
          helpUrl: 'https://example.com/help',
          impact: 'moderate',
          nodes: [createMockViolationNode('<button>Test</button>', ['button'])],
        },
        {
          ruleId: 'target-size',
          wcagReference: '2.5.5',
          level: 'AAA',
          description: 'Target size must be adequate',
          help: 'Ensure adequate target size',
          helpUrl: 'https://example.com/help',
          impact: 'minor',
          nodes: [createMockViolationNode('<a>Link</a>', ['a'])],
        },
      ]);

      await pageScanner.initialize();
      const result = await pageScanner.scan('https://example.com');

      expect(result.compliance).toBeDefined();
      expect(result.compliance?.compliant).toBe(false); // Has error-level issues
      expect(result.compliance?.primaryLevelIssues).toBe(2); // A and AA issues
      expect(result.compliance?.warningIssues).toBe(1); // AAA issue
      expect(result.compliance?.totalIssues).toBe(3);
      expect(result.compliance?.levelBreakdown).toEqual({
        A: 1,
        AA: 1,
        AAA: 1,
        ARIA: 0,
      });
    });

    it('should filter issues based on WCAG level configuration', async () => {
      // Create scanner with restrictive WCAG configuration
      const restrictiveScanner = new PageScanner(
        { headless: true, viewport: { width: 1280, height: 720 }, timeout: 30000 },
        { wcagLevel: 'AA', includeAAA: false, includeARIA: false, customRules: [], disabledRules: [] },
        {},
        { primaryLevel: 'AA', includeAAA: false, includeARIA: false }
      );
      restrictiveScanner['browserManager'] = mockBrowserManager;
      restrictiveScanner['ruleEngine'] = mockRuleEngine;

      // Mock rule results with mixed WCAG levels
      mockRuleEngine.executeRules.mockResolvedValue([
        {
          ruleId: 'alt-text',
          wcagReference: '1.1.1',
          level: 'A',
          description: 'Images must have alt text',
          help: 'Add alt text to images',
          impact: 'critical',
          tags: ['wcag2a'],
          nodes: [{ html: '<img src="test.jpg">', target: ['img'] }],
        },
        {
          ruleId: 'color-contrast',
          wcagReference: '1.4.3',
          level: 'AA',
          description: 'Sufficient color contrast',
          help: 'Improve color contrast',
          impact: 'serious',
          tags: ['wcag2aa'],
          nodes: [{ html: '<div>Text</div>', target: ['div'] }],
        },
        {
          ruleId: 'target-size',
          wcagReference: '2.5.5',
          level: 'AAA',
          description: 'Adequate target size',
          help: 'Increase target size',
          impact: 'minor',
          tags: ['wcag2aaa'],
          nodes: [{ html: '<button>Small</button>', target: ['button'] }],
        },
        {
          ruleId: 'aria-label',
          wcagReference: '4.1.2',
          level: 'ARIA',
          description: 'ARIA labels must be meaningful',
          help: 'Improve ARIA labels',
          impact: 'moderate',
          tags: ['aria'],
          nodes: [{ html: '<div aria-label=""></div>', target: ['div'] }],
        },
      ]);

      await restrictiveScanner.initialize();
      const result = await restrictiveScanner.scan('https://example.com');

      // Should only include A and AA issues (AAA and ARIA filtered out)
      expect(result.issues).toHaveLength(2);
      expect(result.issues.map(i => i.level)).toEqual(['A', 'AA']);
      expect(result.compliance?.levelBreakdown.AAA).toBe(0);
      expect(result.compliance?.levelBreakdown.ARIA).toBe(0);

      await restrictiveScanner.cleanup();
    });

    it('should map severity correctly based on WCAG level', async () => {
      // Mock rule results
      mockRuleEngine.executeRules.mockResolvedValue([
        {
          ruleId: 'critical-error',
          wcagReference: '1.1.1',
          level: 'A', // Error level
          description: 'Critical accessibility issue',
          help: 'Fix critical issue',
          impact: 'critical',
          tags: ['wcag2a'],
          nodes: [{ html: '<img>', target: ['img'] }],
        },
        {
          ruleId: 'aaa-issue',
          wcagReference: '2.5.5',
          level: 'AAA', // Warning level
          description: 'AAA level issue',
          help: 'Consider fixing',
          impact: 'critical', // Should be downgraded to warning
          tags: ['wcag2aaa'],
          nodes: [{ html: '<button>Small</button>', target: ['button'] }],
        },
      ]);

      await pageScanner.initialize();
      const result = await pageScanner.scan('https://example.com');

      expect(result.issues).toHaveLength(2);
      
      // Error-level issue should maintain full severity
      const errorIssue = result.issues.find(i => i.level === 'A');
      expect(errorIssue?.severity).toBe('critical');
      
      // Warning-level issue should be capped at warning severity
      const warningIssue = result.issues.find(i => i.level === 'AAA');
      expect(warningIssue?.severity).toBe('warning');
    });
  });

  describe('Resilience Integration Tests', () => {
    let pageScanner: PageScanner;
    let mockBrowserManager: jest.Mocked<BrowserManager>;
    let mockRuleEngine: jest.Mocked<RuleEngine>;

    beforeEach(() => {
      pageScanner = new PageScanner(
        { headless: true, viewport: { width: 1280, height: 720 }, timeout: 30000 },
        { wcagLevel: 'AA', includeAAA: true, includeARIA: true, customRules: [], disabledRules: [] },
        { maxRetries: 2, baseRetryDelay: 50 } // Fast retries for testing
      );

      mockBrowserManager = {
        initialize: jest.fn().mockResolvedValue(undefined),
        createPage: jest.fn(),
        navigateToUrl: jest.fn(),
        getStatus: jest.fn().mockReturnValue({ initialized: true }),
        cleanup: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        off: jest.fn(),
      } as any;

      mockRuleEngine = {
        executeRules: jest.fn(),
        getConfiguration: jest.fn().mockReturnValue({
          wcagLevel: 'AA',
          includeAAA: true,
          includeARIA: true,
        }),
        updateConfiguration: jest.fn(),
      } as any;

      pageScanner['browserManager'] = mockBrowserManager;
      pageScanner['ruleEngine'] = mockRuleEngine;
    });

    afterEach(async () => {
      await pageScanner.cleanup();
    });

    it('should retry failed operations', async () => {
      // Mock page creation to fail twice, then succeed
      mockBrowserManager.createPage
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValue({
          url: jest.fn().mockReturnValue('https://example.com'),
          evaluate: jest.fn().mockResolvedValue({
            title: 'Test Page',
            description: 'A test page',
            language: 'en',
            totalElements: 50,
            interactiveElements: 10,
            headings: 2,
            links: 5,
            images: 8,
            errors: [],
          }),
          waitForFunction: jest.fn().mockResolvedValue(undefined),
          waitForLoadState: jest.fn().mockResolvedValue(undefined),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
        });

      mockBrowserManager.navigateToUrl.mockResolvedValue({
        success: true,
        url: 'https://example.com',
        status: 200,
        resources: [],
      });

      mockRuleEngine.executeRules.mockResolvedValue([]);

      await pageScanner.initialize();
      const result = await pageScanner.scan('https://example.com');

      expect(result.url).toBe('https://example.com');
      expect(result.score).toBeGreaterThan(0);
      expect(mockBrowserManager.createPage).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it('should provide resilience status information', async () => {
      await pageScanner.initialize();
      
      const status = pageScanner.getStatus();
      expect(status.resilienceStatus).toBeDefined();
      expect(status.resilienceStatus.config).toBeDefined();
      expect(status.resilienceStatus.activeOperations).toBeDefined();
      expect(status.resilienceStatus.circuitBreakers).toBeDefined();

      const resilienceStatus = pageScanner.getResilienceStatus();
      expect(resilienceStatus.config.maxRetries).toBe(2);
      expect(resilienceStatus.config.baseRetryDelay).toBe(50);
    });

    it('should reset resilience state', async () => {
      await pageScanner.initialize();
      
      // Reset resilience state
      pageScanner.resetResilience();
      
      const status = pageScanner.getResilienceStatus();
      expect(status.activeOperations).toBe(0);
      expect(status.circuitBreakers).toHaveLength(0);
    });
  });
}); 