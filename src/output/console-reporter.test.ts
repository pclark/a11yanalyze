/**
 * ConsoleReporter unit tests
 * Tests comprehensive console output with progress indicators
 */

import { ConsoleReporter, ConsoleConfig } from './console-reporter';
import { ScanResult, AccessibilityIssue } from '../types';
import { CrawlSession } from '../types/crawler';
import { ScoreBreakdown, SiteScore } from '../scoring/accessibility-scorer';
import chalk from 'chalk';

jest.mock('chalk', () => {
  const mockChalkFn = (text: any) => text;
  return Object.assign(mockChalkFn, {
    bold: mockChalkFn,
    gray: mockChalkFn,
    blue: mockChalkFn,
    yellow: mockChalkFn,
    red: mockChalkFn,
    green: mockChalkFn,
    magenta: mockChalkFn,
    cyan: mockChalkFn,
    white: mockChalkFn,
    hex: () => mockChalkFn,
    level: 1,
  });
});

jest.mock('cli-progress', () => ({
  MultiBar: jest.fn().mockImplementation(() => ({
    create: jest.fn(() => ({
      update: jest.fn(),
      getTotal: jest.fn(() => 100),
    })),
    stop: jest.fn(),
  })),
}));

jest.mock('figures', () => ({
  play: '▶',
  arrowRight: '→',
  pointer: '❯',
  hamburger: '☰',
  tick: '✓',
  checkboxOn: '☑',
  bullet: '•',
  cross: '✖',
  warning: '⚠',
  info: 'ℹ',
  star: '★',
  circle: '●',
}));

jest.mock('ora', () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
    stop: jest.fn(),
    text: '',
  };
  return jest.fn(() => mockSpinner);
});

let consoleSpy: { log: jest.SpyInstance; error: jest.SpyInstance; warn: jest.SpyInstance };

describe('ConsoleReporter', () => {
  let reporter: ConsoleReporter;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    };
    reporter = new ConsoleReporter();
  });

  afterEach(() => {
    reporter.cleanup();
  });

  // Helper functions
  const createMockIssue = (overrides: Partial<AccessibilityIssue> = {}): AccessibilityIssue => ({
    id: 'issue-1',
    wcagReference: '1.1.1',
    level: 'AA',
    severity: 'serious',
    element: '<img src="test.jpg">',
    selector: 'img',
    message: 'Image missing alt text',
    remediation: 'Add descriptive alt text to the image',
    helpUrl: 'https://help.example.com/alt-text',
    impact: 'Users with screen readers cannot understand the image content',
    tags: ['wcag2aa', 'section508'],
    ...overrides,
  });

  const createMockScanResult = (overrides: Partial<ScanResult> = {}): ScanResult => ({
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    score: 85,
    issues: [createMockIssue()],
    metadata: {
      scanDuration: 1500,
      pageLoadTime: 800,
      totalElements: 100,
      testedElements: 95,
      userAgent: 'test-agent',
      viewport: { width: 1280, height: 720 },
      url: {
        original: 'https://example.com',
        final: 'https://example.com',
        redirects: 0,
      },
    },
    errors: [],
    compliance: {
      compliant: false,
      primaryLevelIssues: 1,
      warningIssues: 0,
      totalIssues: 1,
      levelBreakdown: { A: 0, AA: 1, AAA: 0, ARIA: 0 },
    },
    ...overrides,
  });

  const createMockCrawlSession = (): CrawlSession => ({
    id: 'crawl-session-123',
    startUrls: ['https://example.com'],
    config: {
      maxDepth: 2,
      maxPages: 10,
      allowedDomains: ['example.com'],
      excludedDomains: [],
      excludedPaths: [],
      includedPaths: [],
      requestDelay: 1000,
      maxConcurrency: 3,
      respectRobotsTxt: true,
      discoverExternalLinks: false,
      useSitemaps: true,
      userAgent: 'a11yanalyze/1.0.0',
      requestTimeout: 30000,
    },
    scanOptions: {},
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T10:05:00Z'),
    status: 'completed',
    urls: new Map(),
    results: new Map(),
    stats: {
      urlCounts: {
        total: 2,
        pending: 0,
        processing: 0,
        completed: 2,
        failed: 0,
        skipped: 0,
        excluded: 0,
      },
      pagesScanned: 2,
      totalIssues: 2,
      issuesBySeverity: {
        critical: 0,
        serious: 1,
        moderate: 1,
        minor: 0,
        warning: 0,
      },
      averageScore: 80,
      performance: {
        avgPageLoadTime: 800,
        avgScanTime: 1500,
        totalCrawlTime: 300000,
        pagesPerMinute: 0.4,
      },
      wcagCompliance: {
        compliantPages: 0,
        nonCompliantPages: 2,
        complianceRate: 0,
        levelBreakdown: { A: 0, AA: 2, AAA: 0, ARIA: 0 },
      },
    },
  });

  const createMockScoreBreakdown = (): ScoreBreakdown => ({
    finalScore: 85,
    baseScore: 100,
    issueDeductions: [{
      issueId: 'issue-1',
      wcagReference: '1.1.1',
      severity: 'serious',
      level: 'AA',
      pointsDeducted: 10,
      weight: 2.0,
      reason: 'serious AA issue: 1.1.1',
    }],
    bonuses: [{
      type: 'performance',
      points: 2,
      description: 'Fast page load time',
      criteria: 'Load time: 800ms < 2000ms',
    }],
    penalties: [],
    coverage: {
      testCoverage: 95,
      totalElements: 100,
      testedElements: 95,
      failedElements: 5,
      qualityScore: 90,
      uncoveredAreas: [],
    },
    metadata: {
      algorithmVersion: '1.0.0',
      profile: 'balanced',
      calculatedAt: new Date().toISOString(),
      calculationTime: 5,
      configChecksum: 'abc123',
    },
  });

  const createMockSiteScore = (): SiteScore => ({
    overallScore: 82,
    pageScores: [
      { url: 'https://example.com', score: 85, weight: 1.0, issueCount: 1, importance: 'critical' },
      { url: 'https://example.com/page2', score: 79, weight: 0.8, issueCount: 2, importance: 'medium' },
    ],
    aggregationMethod: 'weighted',
    siteWideBonuses: [{
      type: 'coverage',
      points: 5,
      description: 'Comprehensive site scanning',
      criteria: '2/2 pages scanned (100%)',
    }],
    distribution: {
      average: 82,
      median: 82,
      minimum: 79,
      maximum: 85,
      standardDeviation: 3,
      ranges: {
        excellent: 0,
        good: 2,
        fair: 0,
        poor: 0,
        critical: 0,
      },
    },
    consistency: {
      consistencyScore: 90,
      outlierPages: [],
      commonIssues: ['1.1.1', '2.4.6'],
      scoreVariance: 9,
    },
  });

  describe('Configuration', () => {
    it('should create with default configuration', () => {
      const defaultReporter = ConsoleReporter.createDefault();
      expect(defaultReporter).toBeInstanceOf(ConsoleReporter);
    });

    it('should create verbose reporter', () => {
      const verboseReporter = ConsoleReporter.createVerbose();
      expect(verboseReporter).toBeInstanceOf(ConsoleReporter);
    });

    it('should create quiet reporter', () => {
      const quietReporter = ConsoleReporter.createQuiet();
      expect(quietReporter).toBeInstanceOf(ConsoleReporter);
    });

    it('should create debug reporter', () => {
      const debugReporter = ConsoleReporter.createDebug();
      expect(debugReporter).toBeInstanceOf(ConsoleReporter);
    });

    it('should accept custom configuration', () => {
      const config: Partial<ConsoleConfig> = {
        colors: false,
        verbose: true,
        maxWidth: 120,
      };
      const customReporter = new ConsoleReporter(config);
      expect(customReporter).toBeInstanceOf(ConsoleReporter);
    });
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => reporter.init()).not.toThrow();
    });

    it('should show header on initialization', () => {
      reporter.init();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should not show header in quiet mode', () => {
      const quietReporter = new ConsoleReporter({ quiet: true });
      quietReporter.init();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Phase Management', () => {
    it('should update phase correctly', () => {
      expect(() => reporter.updatePhase('crawling', 'Discovering pages', 10)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should not output in quiet mode', () => {
      const quietReporter = new ConsoleReporter({ quiet: true });
      quietReporter.updatePhase('scanning', 'Processing pages');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should handle all phase types', () => {
      const phases = ['initializing', 'crawling', 'scanning', 'analyzing', 'reporting', 'complete'] as const;
      
      phases.forEach(phase => {
        expect(() => reporter.updatePhase(phase, `${phase} operation`)).not.toThrow();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should create progress bar', () => {
      expect(() => reporter.createProgressBar('test', 'Test Progress', 100)).not.toThrow();
    });

    it('should update progress', () => {
      reporter.createProgressBar('test', 'Test Progress', 100);
      expect(() => reporter.updateProgress('test', 50, 'Halfway done')).not.toThrow();
    });

    it('should complete progress', () => {
      reporter.createProgressBar('test', 'Test Progress', 100);
      expect(() => reporter.completeProgress('test', 'Finished')).not.toThrow();
    });

    it('should handle missing progress bar gracefully', () => {
      expect(() => reporter.updateProgress('nonexistent', 50)).not.toThrow();
      expect(() => reporter.completeProgress('nonexistent')).not.toThrow();
    });
  });

  describe('Spinner Management', () => {
    it('should create spinner', () => {
      expect(() => reporter.createSpinner('test', 'Loading...')).not.toThrow();
    });

    it('should update spinner text', () => {
      reporter.createSpinner('test', 'Loading...');
      expect(() => reporter.updateSpinner('test', 'Processing...')).not.toThrow();
    });

    it('should succeed spinner', () => {
      reporter.createSpinner('test', 'Loading...');
      expect(() => reporter.succeedSpinner('test', 'Success!')).not.toThrow();
    });

    it('should fail spinner', () => {
      reporter.createSpinner('test', 'Loading...');
      expect(() => reporter.failSpinner('test', 'Failed!')).not.toThrow();
    });
  });

  describe('Page Scan Logging', () => {
    it('should log page scan start', () => {
      expect(() => reporter.logPageScanStart('https://example.com', 1, 5)).not.toThrow();
    });

    it('should log page scan completion', () => {
      const scanResult = createMockScanResult();
      expect(() => reporter.logPageScanComplete('https://example.com', scanResult)).not.toThrow();
    });

    it('should handle page with no issues', () => {
      const scanResult = createMockScanResult({ issues: [] });
      expect(() => reporter.logPageScanComplete('https://example.com', scanResult)).not.toThrow();
    });

    it('should highlight critical issues', () => {
      const scanResult = createMockScanResult({
        issues: [createMockIssue({ severity: 'critical' })],
      });
      expect(() => reporter.logPageScanComplete('https://example.com', scanResult)).not.toThrow();
    });
  });

  describe('Page Results Display', () => {
    it('should show page results', () => {
      const scanResult = createMockScanResult();
      expect(() => reporter.showPageResults(scanResult)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should show page results with score breakdown', () => {
      const scanResult = createMockScanResult();
      const scoreBreakdown = createMockScoreBreakdown();
      const verboseReporter = new ConsoleReporter({ verbose: true });
      
      expect(() => verboseReporter.showPageResults(scanResult, scoreBreakdown)).not.toThrow();
    });

    it('should handle perfect page (no issues)', () => {
      const perfectScanResult = createMockScanResult({ issues: [], score: 100 });
      expect(() => reporter.showPageResults(perfectScanResult)).not.toThrow();
    });

    it('should not show results in quiet mode', () => {
      const quietReporter = new ConsoleReporter({ quiet: true });
      const scanResult = createMockScanResult();
      quietReporter.showPageResults(scanResult);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Site Results Display', () => {
    it('should show site results', () => {
      const siteScore = createMockSiteScore();
      const crawlSession = createMockCrawlSession();
      
      expect(() => reporter.showSiteResults(siteScore, crawlSession)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should show detailed site results in verbose mode', () => {
      const verboseReporter = new ConsoleReporter({ verbose: true });
      const siteScore = createMockSiteScore();
      const crawlSession = createMockCrawlSession();
      
      expect(() => verboseReporter.showSiteResults(siteScore, crawlSession)).not.toThrow();
    });

    it('should handle site with many pages', () => {
      const siteScore = createMockSiteScore();
      // Add more pages to test pagination
      for (let i = 3; i <= 15; i++) {
        siteScore.pageScores.push({
          url: `https://example.com/page${i}`,
          score: 75 + (i % 10),
          weight: 0.5,
          issueCount: i % 3,
          importance: 'low',
        });
      }
      
      const verboseReporter = new ConsoleReporter({ verbose: true });
      expect(() => verboseReporter.showSiteResults(siteScore, createMockCrawlSession())).not.toThrow();
    });
  });

  describe('Final Summary', () => {
    it('should show final summary', () => {
      const siteScore = createMockSiteScore();
      const crawlSession = createMockCrawlSession();
      
      expect(() => reporter.showFinalSummary(siteScore, crawlSession)).not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should show different recommendations based on score', () => {
      const crawlSession = createMockCrawlSession();
      
      // Test excellent score
      const excellentScore = createMockSiteScore();
      excellentScore.overallScore = 95;
      expect(() => reporter.showFinalSummary(excellentScore, crawlSession)).not.toThrow();
      
      // Test good score
      const goodScore = createMockSiteScore();
      goodScore.overallScore = 75;
      expect(() => reporter.showFinalSummary(goodScore, crawlSession)).not.toThrow();
      
      // Test poor score
      const poorScore = createMockSiteScore();
      poorScore.overallScore = 45;
      expect(() => reporter.showFinalSummary(poorScore, crawlSession)).not.toThrow();
    });

    it('should highlight critical issues in recommendations', () => {
      const siteScore = createMockSiteScore();
      const crawlSession = createMockCrawlSession();
      crawlSession.stats.issuesBySeverity.critical = 5;
      
      expect(() => reporter.showFinalSummary(siteScore, crawlSession)).not.toThrow();
    });

    it('should warn about inconsistency', () => {
      const siteScore = createMockSiteScore();
      siteScore.consistency.consistencyScore = 50; // Low consistency
      const crawlSession = createMockCrawlSession();
      
      expect(() => reporter.showFinalSummary(siteScore, crawlSession)).not.toThrow();
    });
  });

  describe('Crawl Progress Logging', () => {
    it('should log crawl progress in verbose mode', () => {
      const verboseReporter = new ConsoleReporter({ verbose: true });
      const crawlSession = createMockCrawlSession();
      
      expect(() => verboseReporter.logCrawlProgress(crawlSession)).not.toThrow();
    });

    it('should not log crawl progress in non-verbose mode', () => {
      const crawlSession = createMockCrawlSession();
      reporter.logCrawlProgress(crawlSession);
      // Should not output in non-verbose mode
    });

    it('should handle empty crawl session', () => {
      const emptyCrawlSession = createMockCrawlSession();
      emptyCrawlSession.stats.pagesScanned = 0;
      
      expect(() => reporter.logCrawlProgress(emptyCrawlSession)).not.toThrow();
    });
  });

  describe('Error and Warning Logging', () => {
    it('should log errors', () => {
      reporter.logError('Test error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log errors with stack trace in debug mode', () => {
      const debugReporter = new ConsoleReporter({ debug: true });
      const error = new Error('Test error');
      debugReporter.logError('Test error message', error);
      expect(consoleSpy.error).toHaveBeenCalledTimes(2); // Message + stack trace
    });

    it('should log warnings', () => {
      reporter.logWarning('Test warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should not log warnings in quiet mode', () => {
      const quietReporter = new ConsoleReporter({ quiet: true });
      quietReporter.logWarning('Test warning');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should log info in verbose mode', () => {
      const verboseReporter = new ConsoleReporter({ verbose: true });
      verboseReporter.logInfo('Test info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Score Coloring', () => {
    it('should use different colors for different score ranges', () => {
      const scanResults = [
        createMockScanResult({ score: 95 }), // Excellent (green bold)
        createMockScanResult({ score: 85 }), // Good (green)
        createMockScanResult({ score: 75 }), // Fair (yellow)
        createMockScanResult({ score: 65 }), // Poor (orange)
        createMockScanResult({ score: 45 }), // Critical (red)
      ];

      scanResults.forEach(result => {
        expect(() => reporter.showPageResults(result)).not.toThrow();
      });
    });
  });

  describe('Issue Severity Display', () => {
    it('should display all severity types correctly', () => {
      const severities = ['critical', 'serious', 'moderate', 'minor', 'warning'];
      
      severities.forEach(severity => {
        const scanResult = createMockScanResult({
          issues: [createMockIssue({ severity: severity as any })],
        });
        expect(() => reporter.showPageResults(scanResult)).not.toThrow();
      });
    });

    it('should show top issues in verbose mode', () => {
      const verboseReporter = new ConsoleReporter({ verbose: true });
      const manyIssues = Array.from({ length: 10 }, (_, i) =>
        createMockIssue({ id: `issue-${i}`, message: `Issue ${i}` })
      );
      
      const scanResult = createMockScanResult({ issues: manyIssues });
      expect(() => verboseReporter.showPageResults(scanResult)).not.toThrow();
    });
  });

  describe('Performance Metrics Display', () => {
    it('should show performance metrics in verbose mode', () => {
      const verboseReporter = new ConsoleReporter({ verbose: true });
      const scanResult = createMockScanResult({
        metadata: {
          pageLoadTime: 1500,
          scanDuration: 800,
          totalElements: 150,
          testedElements: 140,
          userAgent: 'test-agent',
          viewport: { width: 1280, height: 720 },
          url: {
            original: 'https://example.com',
            final: 'https://example.com',
            redirects: 0,
          },
        },
      });

      expect(() => verboseReporter.showPageResults(scanResult)).not.toThrow();
    });

    it('should handle missing performance metadata', () => {
      const verboseReporter = new ConsoleReporter({ verbose: true });
      const scanResult = createMockScanResult({ metadata: undefined });

      expect(() => verboseReporter.showPageResults(scanResult)).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources without errors', () => {
      reporter.createSpinner('test', 'Loading...');
      reporter.createProgressBar('test', 'Progress', 100);
      
      expect(() => reporter.cleanup()).not.toThrow();
    });

    it('should handle cleanup with no active resources', () => {
      expect(() => reporter.cleanup()).not.toThrow();
    });
  });

  describe('Duration Formatting', () => {
    it('should format various durations correctly', () => {
      // Test through different summary displays that use formatDuration
      const siteScore = createMockSiteScore();
      const crawlSession = createMockCrawlSession();
      
      // Test short duration
      expect(() => reporter.showFinalSummary(siteScore, crawlSession)).not.toThrow();
    });
  });

  describe('Color Configuration', () => {
    it('should disable colors when configured', () => {
      const noColorReporter = new ConsoleReporter({ colors: false });
      const scanResult = createMockScanResult();
      
      expect(() => noColorReporter.showPageResults(scanResult)).not.toThrow();
    });
  });

  describe('Width Limiting', () => {
    it('should respect maximum width configuration', () => {
      const narrowReporter = new ConsoleReporter({ maxWidth: 40 });
      const scanResult = createMockScanResult({
        url: 'https://example.com/very/long/path/that/exceeds/normal/width',
      });
      
      expect(() => narrowReporter.showPageResults(scanResult)).not.toThrow();
    });
  });
}); 