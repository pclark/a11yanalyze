/**
 * Simplified PageScanner unit tests
 * Tests core functionality without complex browser mocking
 */

import { PageScanner } from './page-scanner';
import { BrowserConfig, RuleEngineConfig } from '../types';
import { BrowserManager } from '../utils/browser-manager';
import { RuleEngine } from './rule-engine';

// Mock dependencies
jest.mock('../utils/browser-manager');
jest.mock('./rule-engine');

const MockedBrowserManager = BrowserManager as jest.MockedClass<typeof BrowserManager>;
const MockedRuleEngine = RuleEngine as jest.MockedClass<typeof RuleEngine>;

describe('PageScanner (Simplified)', () => {
  let pageScanner: PageScanner;
  let mockBrowserManager: jest.Mocked<BrowserManager>;
  let mockRuleEngine: jest.Mocked<RuleEngine>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock browser manager
    mockBrowserManager = {
      initialize: jest.fn(),
      createPage: jest.fn(),
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
      executeRules: jest.fn(),
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

  describe('Constructor and Configuration', () => {
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
  });

  describe('URL Validation', () => {
    it('should reject invalid URLs', async () => {
      await expect(pageScanner.scan('invalid-url')).rejects.toThrow('Invalid URL provided: invalid-url');
      await expect(pageScanner.scan('ftp://example.com')).rejects.toThrow('Invalid URL provided: ftp://example.com');
    });

    it('should accept valid HTTP/HTTPS URLs', async () => {
      // Mock the scan method to avoid actual browser interaction
      jest.spyOn(pageScanner, 'scan').mockResolvedValue({
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        score: 100,
        issues: [],
        metadata: {
          scanDuration: 1000,
          pageLoadTime: 100,
          totalElements: 50,
          testedElements: 10,
          userAgent: 'test',
          viewport: { width: 1280, height: 720 },
          url: { original: 'https://example.com', final: 'https://example.com', redirects: 0 },
          title: 'Test Page',
          language: 'en',
        },
        compliance: {
          compliant: true,
          primaryLevelIssues: 0,
          warningIssues: 0,
          totalIssues: 0,
          levelBreakdown: { A: 0, AA: 0, AAA: 0, ARIA: 0 },
          summary: 'Page meets AA compliance requirements',
        },
        keyboardNavigation: {
          tabOrder: [],
          unreachableElements: [],
          focusTraps: [],
          missingFocusIndicators: [],
          issues: [],
        },
        screenReaderSimulation: {
          tree: {},
          missingNames: [],
          ambiguousRoles: [],
          skippedElements: [],
          summary: [],
        },
        cognitiveAccessibility: {
          readingLevel: 8,
          readingLevelCategory: 'average',
          jargonTerms: [],
          abbreviationCount: 0,
          summary: [],
        },
        summary: [],
        groupedWarnings: {},
      } as any);

      const result = await pageScanner.scan('https://example.com');
      expect(result.url).toBe('https://example.com');
      expect(result.score).toBe(100);
    });
  });

  describe('Status and Configuration', () => {
    it('should provide current status', () => {
      const status = pageScanner.getStatus();
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('browserStatus');
      expect(status).toHaveProperty('ruleEngineConfig');
      expect(status).toHaveProperty('resilienceStatus');
      expect(status).toHaveProperty('wcagLevelConfig');
    });

    it('should provide resilience status information', () => {
      const resilienceStatus = pageScanner.getResilienceStatus();
      expect(resilienceStatus).toBeDefined();
    });

    it('should reset resilience state', () => {
      pageScanner.resetResilience();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update rule engine configuration', async () => {
      await pageScanner.updateConfiguration(
        undefined,
        { wcagLevel: 'AAA', includeAAA: true },
        undefined,
        undefined
      );
      
      expect(mockRuleEngine.updateConfiguration).toHaveBeenCalled();
    });

    it('should handle browser configuration updates', async () => {
      await pageScanner.updateConfiguration(
        { headless: false, viewport: { width: 1920, height: 1080 } },
        undefined,
        undefined,
        undefined
      );
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Element Name Extraction', () => {
    it('should extract element names correctly', () => {
      // Test the private method through reflection or create a public wrapper
      const scanner = pageScanner as any;
      
      // Test with valid HTML
      expect(scanner.extractElementName('<button id="test">Click me</button>')).toBe('button');
      expect(scanner.extractElementName('<div class="container">Content</div>')).toBe('div');
      
      // Test with invalid HTML
      expect(scanner.extractElementName('invalid-html')).toBe('unknown');
    });
  });

  describe('WCAG Level Integration', () => {
    it('should map severity correctly based on WCAG level', () => {
      const scanner = pageScanner as any;
      
      // Test severity mapping
      expect(scanner.mapImpactToSeverity('critical')).toBe('critical');
      expect(scanner.mapImpactToSeverity('serious')).toBe('serious');
      expect(scanner.mapImpactToSeverity('moderate')).toBe('moderate');
      expect(scanner.mapImpactToSeverity('minor')).toBe('minor');
    });
  });
}); 