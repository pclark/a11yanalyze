/**
 * JsonReporter unit tests
 * Tests JSON report generation for both single page and site accessibility reports
 */

import { JsonReporter } from './json-reporter';
import { ScanResult, AccessibilityIssue } from '../types';
import { CrawlSession } from '../types/crawler';
import { AccessibilityReport, ReportOptions } from '../types/output';

describe('JsonReporter', () => {
  let jsonReporter: JsonReporter;

  beforeEach(() => {
    jsonReporter = new JsonReporter();
  });

  // Helper functions to create mock data
  const createMockAccessibilityIssue = (
    overrides: Partial<AccessibilityIssue> = {}
  ): AccessibilityIssue => ({
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

  const createMockScanResult = (
    overrides: Partial<ScanResult> = {}
  ): ScanResult => ({
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    score: 85,
    issues: [
      createMockAccessibilityIssue(),
      createMockAccessibilityIssue({
        id: 'issue-2',
        wcagReference: '2.4.6',
        level: 'AA',
        severity: 'moderate',
        message: 'Heading structure not logical',
      }),
    ],
    metadata: {
      scanDuration: 1500,
      pageLoadTime: 800,
      totalElements: 150,
      testedElements: 75,
      userAgent: 'test-agent',
      viewport: {
        width: 1280,
        height: 720,
      },
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
      warningIssues: 1,
      totalIssues: 2,
      levelBreakdown: { A: 0, AA: 2, AAA: 0, ARIA: 0 },
    },
    ...overrides,
  });

  const createMockCrawlSession = (
    overrides: Partial<CrawlSession> = {}
  ): CrawlSession => ({
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
    urls: new Map([
      ['https://example.com', {
        url: 'https://example.com',
        depth: 0,
        source: 'initial',
        priority: 100,
        discoveredAt: new Date('2024-01-01T10:00:00Z'),
        attempts: 1,
        status: 'completed',
      }],
      ['https://example.com/page2', {
        url: 'https://example.com/page2',
        depth: 1,
        source: 'page',
        priority: 90,
        discoveredAt: new Date('2024-01-01T10:01:00Z'),
        attempts: 1,
        status: 'completed',
      }],
    ]),
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
      totalIssues: 4,
      issuesBySeverity: {
        critical: 0,
        serious: 2,
        moderate: 2,
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
        levelBreakdown: { A: 0, AA: 4, AAA: 0, ARIA: 0 },
      },
    },
    ...overrides,
  });

  describe('Page Report Generation', () => {
    it('should generate a valid page report', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report).toMatchObject({
        metadata: {
          version: '1.0.0',
          type: 'page',
          target: 'https://example.com',
          tool: {
            name: 'a11yanalyze',
            version: '1.0.0',
          },
        },
        summary: {
          overallScore: 85,
          compliant: false,
          pagesScanned: 1,
          totalIssues: 2,
          status: 'completed',
        },
        page: {
          url: 'https://example.com',
          title: 'Test Page',
          score: 85,
          compliant: false,
        },
      });

      expect(report.metadata.generatedAt).toBeDefined();
      expect(report.metadata.generationTime).toBeGreaterThan(0);
      expect(report.page?.issues).toHaveLength(2);
      expect(report.technical).toBeDefined();
      expect(report.errors).toHaveLength(0);
    });

    it('should include page metadata in report', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.page?.metadata).toMatchObject({
        title: 'Test Page',
        language: 'en',
        size: {
          totalElements: 150,
          interactiveElements: 75,
        },
      });
    });

    it('should include performance metrics', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.page?.performance).toMatchObject({
        loadTime: 800,
        scanTime: 1500,
        totalTime: 2300,
      });
    });

    it('should convert issues to report format', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      const issue = report.page?.issues[0];
      expect(issue).toMatchObject({
        id: 'issue-1',
        wcagReference: '1.1.1',
        level: 'AA',
        severity: 'serious',
        title: 'Image missing alt text',
        description: 'Image missing alt text',
        remediation: 'Add descriptive alt text to the image',
        occurrences: 1,
      });

      expect(issue?.elements).toHaveLength(1);
      expect(issue?.elements[0]).toMatchObject({
        selector: 'img',
        html: '<img src="test.jpg">',
      });
    });

    it('should handle page report with custom options', async () => {
      const scanResult = createMockScanResult();
      const options: Partial<ReportOptions> = {
        title: 'Custom Report Title',
        description: 'Custom report description',
        minSeverity: 'serious',
        includeRemediation: false,
        groupIssues: false,
      };

      const report = await jsonReporter.generatePageReport(scanResult, options);

      expect(report.metadata.title).toBe('Custom Report Title');
      expect(report.metadata.description).toBe('Custom report description');
      expect(report.page?.issues).toHaveLength(1); // Only serious issue
      expect(report.page?.issues[0].remediation).toBe(''); // No remediation
    });

    it('should handle scan result with errors', async () => {
      const scanResult = createMockScanResult({
        errors: [{
          type: 'timeout',
          message: 'Page load timeout',
          details: 'Page took too long to load',
        }],
      });

      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toMatchObject({
        type: 'scan',
        severity: 'error',
        message: 'Page load timeout',
        details: 'Page took too long to load',
        url: 'https://example.com',
      });
    });

    it('should handle report generation errors gracefully', async () => {
      // Test error handling by passing invalid data
      const invalidScanResult = null as any;

      const report = await jsonReporter.generatePageReport(invalidScanResult);

      expect(report.summary.status).toBe('failed');
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].type).toBe('generation');
      expect(report.errors[0].severity).toBe('critical');
    });
  });

  describe('Site Report Generation', () => {
    it('should generate a valid site report', async () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ url: 'https://example.com', score: 85 }),
        createMockScanResult({ url: 'https://example.com/page2', score: 75 }),
      ];

      const report = await jsonReporter.generateSiteReport(crawlSession, scanResults);

      expect(report).toMatchObject({
        metadata: {
          version: '1.0.0',
          type: 'site',
          target: ['https://example.com'],
          tool: {
            name: 'a11yanalyze',
            version: '1.0.0',
          },
        },
        summary: {
          overallScore: 80, // Average of 85 and 75
          compliant: false,
          pagesScanned: 2,
          totalIssues: 4,
          status: 'completed',
        },
      });

      expect(report.site).toBeDefined();
      expect(report.site?.pages).toHaveLength(2);
    });

    it('should include crawl session information', async () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [createMockScanResult()];

      const report = await jsonReporter.generateSiteReport(crawlSession, scanResults);

      expect(report.site?.crawlInfo).toMatchObject({
        sessionId: 'crawl-session-123',
        startUrls: ['https://example.com'],
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: '2024-01-01T10:05:00.000Z',
        duration: 300000,
        status: 'completed',
        config: {
          maxDepth: 2,
          maxPages: 10,
          allowedDomains: ['example.com'],
          excludedPaths: [],
        },
      });
    });

    it('should calculate site statistics correctly', async () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ url: 'https://example.com', score: 90 }),
        createMockScanResult({ url: 'https://example.com/page2', score: 70 }),
      ];

      const report = await jsonReporter.generateSiteReport(crawlSession, scanResults);

      expect(report.site?.statistics).toMatchObject({
        pagesDiscovered: 2,
        pagesScanned: 2,
        pagesFailed: 0,
        pagesSkipped: 0,
        averageScore: 80,
        scoreDistribution: {
          excellent: 1, // Score 90
          good: 0,
          fair: 1, // Score 70
          poor: 0,
          critical: 0,
        },
      });
    });

    it('should generate page summaries', async () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({
          url: 'https://example.com',
          score: 85,
                     metadata: { 
             ...createMockScanResult().metadata,
             pageLoadTime: 500,
             scanDuration: 1000,
           },
        }),
      ];

      const report = await jsonReporter.generateSiteReport(crawlSession, scanResults);

      const pageSummary = report.site?.pages[0];
      expect(pageSummary).toMatchObject({
        url: 'https://example.com',
        title: 'Home Page',
        score: 85,
        compliant: false,
        loadTime: 500,
        scanTime: 1000,
        depth: 0,
        errors: [],
      });

      expect(pageSummary?.issuesBySeverity).toMatchObject({
        critical: 0,
        serious: 1,
        moderate: 1,
        minor: 0,
        warning: 0,
      });
    });

    it('should analyze site-wide issues', async () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({
          issues: [
            createMockAccessibilityIssue({
              id: 'alt-text-1',
              wcagReference: '1.1.1',
              severity: 'critical',
            }),
            createMockAccessibilityIssue({
              id: 'color-contrast-1',
              wcagReference: '1.4.3',
              severity: 'serious',
            }),
          ],
        }),
        createMockScanResult({
          issues: [
            createMockAccessibilityIssue({
              id: 'alt-text-2',
              wcagReference: '1.1.1',
              severity: 'critical',
            }),
          ],
        }),
      ];

      const report = await jsonReporter.generateSiteReport(crawlSession, scanResults);

      expect(report.site?.issuesAnalysis).toBeDefined();
      expect(report.site?.issuesAnalysis.mostCommonIssues).toBeDefined();
      expect(report.site?.issuesAnalysis.criticalIssues).toHaveLength(2); // Two critical issues
      expect(report.site?.issuesAnalysis.issuesByCategory).toBeDefined();
    });

    it('should analyze WCAG compliance', async () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({
          issues: [
            createMockAccessibilityIssue({ level: 'A', severity: 'serious' }),
          ],
          compliance: {
            compliant: false,
            primaryLevelIssues: 1,
            warningIssues: 0,
            totalIssues: 1,
            levelBreakdown: { A: 1, AA: 0, AAA: 0, ARIA: 0 },
          },
        }),
        createMockScanResult({
          issues: [],
          compliance: {
            compliant: true,
            primaryLevelIssues: 0,
            warningIssues: 0,
            totalIssues: 0,
            levelBreakdown: { A: 0, AA: 0, AAA: 0, ARIA: 0 },
          },
        }),
      ];

      const report = await jsonReporter.generateSiteReport(crawlSession, scanResults);

      expect(report.site?.complianceAnalysis).toBeDefined();
      expect(report.site?.complianceAnalysis.levelCompliance.A).toMatchObject({
        compliant: false,
        percentage: 50, // 1 out of 2 pages passing
        passingPages: 1,
        failingPages: 1,
      });
    });
  });

  describe('Executive Summary', () => {
    it('should calculate correct severity breakdown', async () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ severity: 'critical' }),
          createMockAccessibilityIssue({ severity: 'critical' }),
          createMockAccessibilityIssue({ severity: 'serious' }),
          createMockAccessibilityIssue({ severity: 'moderate' }),
          createMockAccessibilityIssue({ severity: 'warning' }),
        ],
      });

      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.summary.issuesBySeverity).toEqual({
        critical: 2,
        serious: 1,
        moderate: 1,
        minor: 0,
        warning: 1,
      });
    });

    it('should calculate WCAG level breakdown', async () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ level: 'A' }),
          createMockAccessibilityIssue({ level: 'A' }),
          createMockAccessibilityIssue({ level: 'AA' }),
          createMockAccessibilityIssue({ level: 'AAA' }),
          createMockAccessibilityIssue({ level: 'ARIA' }),
        ],
      });

      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.summary.wcagLevelBreakdown).toEqual({
        A: 2,
        AA: 1,
        AAA: 1,
        ARIA: 1,
      });
    });

    it('should determine achieved WCAG level correctly', async () => {
      // Test Level A achievement
      const levelAResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ level: 'AA', severity: 'serious' }),
          createMockAccessibilityIssue({ level: 'AAA', severity: 'warning' }),
        ],
      });

      const levelAReport = await jsonReporter.generatePageReport(levelAResult);
      expect(levelAReport.summary.achievedLevel).toBe('None'); // Has AA issues

      // Test Level AA achievement
      const levelAAResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ level: 'AAA', severity: 'warning' }),
        ],
      });

      const levelAAReport = await jsonReporter.generatePageReport(levelAAResult);
      expect(levelAAReport.summary.achievedLevel).toBe('AA'); // Only AAA warnings
    });

    it('should generate appropriate key recommendations', async () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ severity: 'critical' }),
          createMockAccessibilityIssue({ severity: 'serious' }),
          createMockAccessibilityIssue({ severity: 'serious' }),
        ],
        score: 65,
      });

      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.summary.keyRecommendations).toContain(
        'Address 1 critical accessibility issues immediately'
      );
      expect(report.summary.keyRecommendations).toContain(
        'Fix 2 serious issues to improve compliance'
      );
      expect(report.summary.keyRecommendations).toContain(
        'Implement systematic accessibility testing in development workflow'
      );
    });
  });

  describe('Issue Processing', () => {
    it('should filter issues by severity correctly', async () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ severity: 'critical' }),
          createMockAccessibilityIssue({ severity: 'moderate' }),
          createMockAccessibilityIssue({ severity: 'warning' }),
        ],
      });

      const options: Partial<ReportOptions> = { minSeverity: 'moderate' };
      const report = await jsonReporter.generatePageReport(scanResult, options);

      expect(report.page?.issues).toHaveLength(2); // critical and moderate
    });

    it('should categorize issues correctly', async () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ wcagReference: '1.1.1' }), // images
          createMockAccessibilityIssue({ wcagReference: '1.4.3' }), // color
          createMockAccessibilityIssue({ wcagReference: '2.1.1' }), // keyboard
          createMockAccessibilityIssue({ wcagReference: '4.1.2' }), // aria
        ],
      });

      const report = await jsonReporter.generatePageReport(scanResult);

      const issues = report.page?.issues || [];
      expect(issues.find(i => i.wcagReference === '1.1.1')?.category).toBe('images');
      expect(issues.find(i => i.wcagReference === '1.4.3')?.category).toBe('color');
      expect(issues.find(i => i.wcagReference === '2.1.1')?.category).toBe('keyboard');
      expect(issues.find(i => i.wcagReference === '4.1.2')?.category).toBe('aria');
    });

    it('should group similar issues when enabled', async () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockAccessibilityIssue({ 
            id: 'alt-1',
            wcagReference: '1.1.1',
            severity: 'serious',
            selector: 'img:nth-child(1)',
          }),
          createMockAccessibilityIssue({ 
            id: 'alt-2',
            wcagReference: '1.1.1',
            severity: 'serious',
            selector: 'img:nth-child(2)',
          }),
        ],
      });

      const options: Partial<ReportOptions> = { groupIssues: true };
      const report = await jsonReporter.generatePageReport(scanResult, options);

      // When grouped, should have 1 issue with 2 occurrences
      expect(report.page?.issues).toHaveLength(1);
      expect(report.page?.issues[0].occurrences).toBe(2);
      expect(report.page?.issues[0].elements).toHaveLength(2);
    });
  });

  describe('Technical Details', () => {
    it('should include environment information', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.technical.environment).toMatchObject({
        toolVersion: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      });
    });

    it('should include scan configuration', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      expect(report.technical.scanConfig).toMatchObject({
        wcagLevel: 'AA',
        includeAAA: true,
        includeARIA: true,
        browser: {
          name: 'chromium',
          version: '1.0.0',
          headless: true,
          viewport: { width: 1280, height: 720 },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty scan results gracefully', async () => {
      const emptyScanResult = createMockScanResult({
        issues: [],
        metadata: undefined,
        errors: [],
      });

      const report = await jsonReporter.generatePageReport(emptyScanResult);

      expect(report.summary.totalIssues).toBe(0);
      expect(report.summary.overallScore).toBeGreaterThan(0);
      expect(report.page?.issues).toHaveLength(0);
    });

         it('should handle missing metadata gracefully', async () => {
       const scanResultWithoutMetadata = createMockScanResult({
         metadata: undefined,
       });

       const report = await jsonReporter.generatePageReport(scanResultWithoutMetadata);

       expect(report.page?.title).toBe('Unknown');
       expect(report.page?.performance.loadTime).toBe(0);
     });
  });

  describe('Report Validation', () => {
    it('should have consistent metadata across report types', async () => {
      const scanResult = createMockScanResult();
      const pageReport = await jsonReporter.generatePageReport(scanResult);

      const crawlSession = createMockCrawlSession();
      const siteReport = await jsonReporter.generateSiteReport(crawlSession, [scanResult]);

      // Both should have the same tool information
      expect(pageReport.metadata.tool).toEqual(siteReport.metadata.tool);
      expect(pageReport.metadata.version).toBe(siteReport.metadata.version);
    });

    it('should generate reports with proper timestamps', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      const generatedAt = new Date(report.metadata.generatedAt);
      expect(generatedAt.getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
      expect(report.metadata.generationTime).toBeGreaterThan(0);
    });

    it('should maintain data consistency between summary and details', async () => {
      const scanResult = createMockScanResult();
      const report = await jsonReporter.generatePageReport(scanResult);

      // Summary should match page details
      expect(report.summary.overallScore).toBe(report.page?.score);
      expect(report.summary.pagesScanned).toBe(1);
      expect(report.summary.totalIssues).toBe(report.page?.issues.length);
    });
  });
}); 