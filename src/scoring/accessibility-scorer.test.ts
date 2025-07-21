/**
 * AccessibilityScorer unit tests
 * Tests comprehensive scoring algorithm with weighted calculations
 */

import { AccessibilityScorer, ScoringConfig, ScoringProfile, ScoreBreakdown, SiteScore } from './accessibility-scorer';
import { AccessibilityIssue, ScanResult } from '../types';
import { CrawlSession } from '../types/crawler';

describe('AccessibilityScorer', () => {
  let scorer: AccessibilityScorer;

  beforeEach(() => {
    scorer = new AccessibilityScorer();
  });

  // Helper functions to create mock data
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

  describe('Scoring Profiles', () => {
    it('should provide predefined scoring profiles', () => {
      const profiles = AccessibilityScorer.getAvailableProfiles();
      expect(profiles).toContain('strict');
      expect(profiles).toContain('balanced');
      expect(profiles).toContain('lenient');
      expect(profiles).toContain('enterprise');
      expect(profiles).toContain('custom');
    });

    it('should create scorer with specific profile', () => {
      const strictScorer = AccessibilityScorer.withProfile('strict');
      const config = strictScorer.getConfig();
      
      expect(config.profile).toBe('strict');
      expect(config.wcagLevelWeights.A).toBe(3.0);
      expect(config.severityPenalties.critical).toBe(15);
      expect(config.enableBonuses).toBe(false);
    });

    it('should allow profile configuration overrides', () => {
      const customScorer = AccessibilityScorer.withProfile('strict', {
        enableBonuses: true,
        maxScore: 120,
      });
      const config = customScorer.getConfig();
      
      expect(config.enableBonuses).toBe(true);
      expect(config.maxScore).toBe(120);
      expect(config.profile).toBe('strict'); // Profile should remain
    });

    it('should get profile configuration', () => {
      const strictConfig = AccessibilityScorer.getProfileConfig('strict');
      expect(strictConfig.wcagLevelWeights?.A).toBe(3.0);
      expect(strictConfig.enableBonuses).toBe(false);
    });
  });

  describe('Page Score Calculation', () => {
    it('should calculate basic page score', () => {
      const scanResult = createMockScanResult();
      const breakdown = scorer.calculatePageScore(scanResult);
      
      expect(breakdown.finalScore).toBeGreaterThan(0);
      expect(breakdown.finalScore).toBeLessThanOrEqual(100);
      expect(breakdown.baseScore).toBe(100);
      expect(breakdown.issueDeductions).toHaveLength(1);
      expect(breakdown.metadata.algorithmVersion).toBe('1.0.0');
    });

    it('should apply WCAG level weights correctly', () => {
      const levelAIssue = createMockIssue({ level: 'A', severity: 'serious' });
      const levelAAAIssue = createMockIssue({ level: 'AAA', severity: 'serious' });
      
      const resultA = createMockScanResult({ issues: [levelAIssue] });
      const resultAAA = createMockScanResult({ issues: [levelAAAIssue] });
      
      const scoreA = scorer.calculatePageScore(resultA);
      const scoreAAA = scorer.calculatePageScore(resultAAA);
      
      // Level A should have higher penalty (lower score) than AAA
      expect(scoreA.finalScore).toBeLessThan(scoreAAA.finalScore);
    });

    it('should apply severity penalties correctly', () => {
      const criticalIssue = createMockIssue({ severity: 'critical' });
      const minorIssue = createMockIssue({ severity: 'minor' });
      
      const criticalResult = createMockScanResult({ issues: [criticalIssue] });
      const minorResult = createMockScanResult({ issues: [minorIssue] });
      
      const criticalScore = scorer.calculatePageScore(criticalResult);
      const minorScore = scorer.calculatePageScore(minorResult);
      
      expect(criticalScore.finalScore).toBeLessThan(minorScore.finalScore);
    });

    it('should respect maximum penalty per issue', () => {
      const highPenaltyIssue = createMockIssue({ 
        severity: 'critical',
        level: 'A',
        wcagReference: '2.1.1' // Has multiplier
      });
      
      const result = createMockScanResult({ issues: [highPenaltyIssue] });
      const breakdown = scorer.calculatePageScore(result);
      
      const deduction = breakdown.issueDeductions[0];
      expect(deduction?.pointsDeducted).toBeLessThanOrEqual(scorer.getConfig().maxPenaltyPerIssue);
    });

    it('should apply issue type multipliers', () => {
      const keyboardIssue = createMockIssue({ wcagReference: '2.1.1' }); // 1.3x multiplier
      const genericIssue = createMockIssue({ wcagReference: '3.1.1' }); // 1.0x multiplier
      
      const keyboardResult = createMockScanResult({ issues: [keyboardIssue] });
      const genericResult = createMockScanResult({ issues: [genericIssue] });
      
      const keyboardScore = scorer.calculatePageScore(keyboardResult);
      const genericScore = scorer.calculatePageScore(genericResult);
      
      expect(keyboardScore.finalScore).toBeLessThan(genericScore.finalScore);
    });

    it('should enforce minimum and maximum scores', () => {
      const manyIssues = Array.from({ length: 50 }, (_, i) => 
        createMockIssue({ id: `issue-${i}`, severity: 'critical' })
      );
      const perfectScanResult = createMockScanResult({ issues: [] });
      const terribleScanResult = createMockScanResult({ issues: manyIssues });
      
      const perfectScore = scorer.calculatePageScore(perfectScanResult);
      const terribleScore = scorer.calculatePageScore(terribleScanResult);
      
      expect(perfectScore.finalScore).toBeLessThanOrEqual(scorer.getConfig().maxScore);
      expect(terribleScore.finalScore).toBeGreaterThanOrEqual(scorer.getConfig().minScore);
    });
  });

  describe('Coverage Assessment', () => {
    it('should calculate test coverage correctly', () => {
      const scanResult = createMockScanResult({
        metadata: {
          ...createMockScanResult().metadata!,
          totalElements: 100,
          testedElements: 90,
        },
      });
      
      const breakdown = scorer.calculatePageScore(scanResult);
      
      expect(breakdown.coverage.testCoverage).toBe(90);
      expect(breakdown.coverage.totalElements).toBe(100);
      expect(breakdown.coverage.testedElements).toBe(90);
      expect(breakdown.coverage.failedElements).toBe(10);
    });

    it('should handle perfect coverage', () => {
      const scanResult = createMockScanResult({
        metadata: {
          ...createMockScanResult().metadata!,
          totalElements: 100,
          testedElements: 100,
        },
      });
      
      const breakdown = scorer.calculatePageScore(scanResult);
      
      expect(breakdown.coverage.testCoverage).toBe(100);
      expect(breakdown.coverage.failedElements).toBe(0);
    });

    it('should handle empty pages gracefully', () => {
      const scanResult = createMockScanResult({
        metadata: {
          ...createMockScanResult().metadata!,
          totalElements: 0,
          testedElements: 0,
        },
      });
      
      const breakdown = scorer.calculatePageScore(scanResult);
      
      expect(breakdown.coverage.testCoverage).toBe(100); // Empty page = perfect coverage
    });
  });

  describe('Bonus System', () => {
    it('should award performance bonus for fast loading', () => {
      const fastResult = createMockScanResult({
        metadata: {
          ...createMockScanResult().metadata!,
          pageLoadTime: 1500, // Under 2000ms
        },
      });
      
      const breakdown = scorer.calculatePageScore(fastResult);
      
      expect(breakdown.bonuses.some(b => 
        b.type === 'performance' && b.description.includes('Fast page load')
      )).toBe(true);
    });

    it('should award coverage bonus for excellent coverage', () => {
      const excellentCoverageResult = createMockScanResult({
        metadata: {
          ...createMockScanResult().metadata!,
          totalElements: 100,
          testedElements: 96, // >95%
        },
      });
      
      const breakdown = scorer.calculatePageScore(excellentCoverageResult);
      
      expect(breakdown.bonuses.some(b => 
        b.type === 'coverage' && b.description.includes('Excellent')
      )).toBe(true);
    });

    it('should award no critical issues bonus', () => {
      const noCriticalResult = createMockScanResult({
        issues: [createMockIssue({ severity: 'moderate' })],
      });
      
      const breakdown = scorer.calculatePageScore(noCriticalResult);
      
      expect(breakdown.bonuses.some(b => 
        b.type === 'accessibility' && b.description.includes('No critical')
      )).toBe(true);
    });

    it('should award perfect accessibility bonus', () => {
      const perfectResult = createMockScanResult({ issues: [] });
      
      const breakdown = scorer.calculatePageScore(perfectResult);
      
      expect(breakdown.bonuses.some(b => 
        b.type === 'accessibility' && b.description.includes('Perfect')
      )).toBe(true);
    });

    it('should not award bonuses when disabled', () => {
      const noBonusScorer = new AccessibilityScorer({ enableBonuses: false });
      const perfectResult = createMockScanResult({ issues: [] });
      
      const breakdown = noBonusScorer.calculatePageScore(perfectResult);
      
      expect(breakdown.bonuses).toHaveLength(0);
    });
  });

  describe('Penalty System', () => {
    it('should apply timeout penalties', () => {
      const timeoutResult = createMockScanResult({
        errors: [{ type: 'timeout', message: 'Page load timeout' }],
      });
      
      const breakdown = scorer.calculatePageScore(timeoutResult);
      
      expect(breakdown.penalties.some(p => 
        p.type === 'timeout' && p.points === 10
      )).toBe(true);
    });

    it('should apply scan error penalties', () => {
      const errorResult = createMockScanResult({
        errors: [{ type: 'parsing', message: 'HTML parsing error' }],
      });
      
      const breakdown = scorer.calculatePageScore(errorResult);
      
      expect(breakdown.penalties.some(p => 
        p.type === 'error' && p.points === 5
      )).toBe(true);
    });

    it('should apply coverage penalties for low coverage', () => {
      const lowCoverageResult = createMockScanResult({
        metadata: {
          ...createMockScanResult().metadata!,
          totalElements: 100,
          testedElements: 70, // 70% < 80%
        },
      });
      
      const breakdown = scorer.calculatePageScore(lowCoverageResult);
      
      expect(breakdown.penalties.some(p => 
        p.type === 'coverage'
      )).toBe(true);
    });

    it('should apply critical issue penalties for many critical issues', () => {
      const manyCriticalIssues = Array.from({ length: 5 }, (_, i) =>
        createMockIssue({ id: `critical-${i}`, severity: 'critical' })
      );
      
      const criticalResult = createMockScanResult({ issues: manyCriticalIssues });
      
      const breakdown = scorer.calculatePageScore(criticalResult);
      
      expect(breakdown.penalties.some(p => 
        p.type === 'critical' && p.points === 10 // (5-3)*5
      )).toBe(true);
    });

    it('should not apply penalties when disabled', () => {
      const noPenaltyScorer = new AccessibilityScorer({ enablePenalties: false });
      const errorResult = createMockScanResult({
        errors: [{ type: 'timeout', message: 'Timeout' }],
      });
      
      const breakdown = noPenaltyScorer.calculatePageScore(errorResult);
      
      expect(breakdown.penalties).toHaveLength(0);
    });
  });

  describe('Site Score Calculation', () => {
    it('should calculate weighted site score', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ url: 'https://example.com', score: 90 }), // Home page, high weight
        createMockScanResult({ url: 'https://example.com/page2', score: 70 }), // Depth 1, lower weight
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults, 'weighted');
      
      expect(siteScore.overallScore).toBeGreaterThan(70);
      expect(siteScore.overallScore).toBeLessThan(90);
      expect(siteScore.aggregationMethod).toBe('weighted');
      expect(siteScore.pageScores).toHaveLength(2);
    });

    it('should calculate average site score', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ score: 80 }),
        createMockScanResult({ score: 90 }),
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults, 'average');
      
      expect(siteScore.overallScore).toBe(85); // (80+90)/2
    });

    it('should calculate median site score', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ score: 60 }),
        createMockScanResult({ score: 80 }),
        createMockScanResult({ score: 90 }),
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults, 'median');
      
      expect(siteScore.overallScore).toBe(80); // Middle value
    });

    it('should calculate worst-case site score', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ score: 60 }),
        createMockScanResult({ score: 80 }),
        createMockScanResult({ score: 90 }),
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults, 'worst');
      
      expect(siteScore.overallScore).toBe(60); // Minimum value
    });

    it('should assign page importance correctly', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ url: 'https://example.com' }), // Home page
        createMockScanResult({ url: 'https://example.com/contact' }), // Important page
        createMockScanResult({ url: 'https://example.com/deep/nested/page' }), // Deep page
      ];
      
      // Mock crawl session with depth information
      crawlSession.urls.set('https://example.com/contact', {
        url: 'https://example.com/contact',
        depth: 1,
        source: 'page',
        priority: 90,
        discoveredAt: new Date(),
        attempts: 1,
        status: 'completed',
      });
      crawlSession.urls.set('https://example.com/deep/nested/page', {
        url: 'https://example.com/deep/nested/page',
        depth: 3,
        source: 'page',
        priority: 70,
        discoveredAt: new Date(),
        attempts: 1,
        status: 'completed',
      });
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.pageScores[0]?.importance).toBe('critical'); // Home page
      expect(siteScore.pageScores[1]?.importance).toBe('high'); // Contact page
      expect(siteScore.pageScores[2]?.importance).toBe('low'); // Deep page
    });
  });

  describe('Site-wide Bonuses', () => {
    it('should award comprehensive scanning bonus', () => {
      const crawlSession = createMockCrawlSession();
      // Mock 100% scan rate
      const scanResults = Array.from(crawlSession.urls.keys()).map(url =>
        createMockScanResult({ url })
      );
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.siteWideBonuses.some(b => 
        b.type === 'coverage' && b.description.includes('Comprehensive')
      )).toBe(true);
    });

    it('should award consistency bonus for consistent scores', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ score: 85 }),
        createMockScanResult({ score: 87 }),
      ]; // Low variance
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.siteWideBonuses.some(b => 
        b.type === 'accessibility' && b.description.includes('Consistent')
      )).toBe(true);
    });
  });

  describe('Score Distribution', () => {
    it('should calculate score distribution correctly', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ score: 95 }), // excellent
        createMockScanResult({ score: 85 }), // good
        createMockScanResult({ score: 75 }), // fair
        createMockScanResult({ score: 65 }), // poor
        createMockScanResult({ score: 55 }), // critical
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.distribution.ranges.excellent).toBe(1);
      expect(siteScore.distribution.ranges.good).toBe(1);
      expect(siteScore.distribution.ranges.fair).toBe(1);
      expect(siteScore.distribution.ranges.poor).toBe(1);
      expect(siteScore.distribution.ranges.critical).toBe(1);
      expect(siteScore.distribution.average).toBe(75);
      expect(siteScore.distribution.median).toBe(75);
      expect(siteScore.distribution.minimum).toBe(55);
      expect(siteScore.distribution.maximum).toBe(95);
    });
  });

  describe('Consistency Metrics', () => {
    it('should identify outlier pages', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [
        createMockScanResult({ url: 'https://example.com/good1', score: 85 }),
        createMockScanResult({ url: 'https://example.com/good2', score: 87 }),
        createMockScanResult({ url: 'https://example.com/outlier', score: 45 }), // Outlier
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.consistency.outlierPages).toContain('https://example.com/outlier');
      expect(siteScore.consistency.consistencyScore).toBeLessThan(100);
    });

    it('should identify common issues across site', () => {
      const crawlSession = createMockCrawlSession();
      const commonIssue = createMockIssue({ wcagReference: '1.1.1' });
      const scanResults = [
        createMockScanResult({ issues: [commonIssue] }),
        createMockScanResult({ issues: [commonIssue] }),
      ];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.consistency.commonIssues).toContain('1.1.1');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration dynamically', () => {
      const newConfig = { maxScore: 120, enableBonuses: false };
      scorer.updateConfig(newConfig);
      
      const config = scorer.getConfig();
      
      expect(config.maxScore).toBe(120);
      expect(config.enableBonuses).toBe(false);
    });

    it('should generate configuration checksum', () => {
      const breakdown1 = scorer.calculatePageScore(createMockScanResult());
      const checksum1 = breakdown1.metadata.configChecksum;
      
      scorer.updateConfig({ maxScore: 120 });
      
      const breakdown2 = scorer.calculatePageScore(createMockScanResult());
      const checksum2 = breakdown2.metadata.configChecksum;
      
      expect(checksum1).not.toBe(checksum2);
    });

    it('should include calculation timing', () => {
      const breakdown = scorer.calculatePageScore(createMockScanResult());
      
      expect(breakdown.metadata.calculationTime).toBeGreaterThan(0);
      expect(breakdown.metadata.calculatedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scan results', () => {
      const emptyScanResult = createMockScanResult({ issues: [] });
      const breakdown = scorer.calculatePageScore(emptyScanResult);
      
      expect(breakdown.finalScore).toBe(100); // Perfect score
      expect(breakdown.issueDeductions).toHaveLength(0);
    });

    it('should handle missing metadata gracefully', () => {
      const noMetadataResult = createMockScanResult({ metadata: undefined });
      const breakdown = scorer.calculatePageScore(noMetadataResult);
      
      expect(breakdown.coverage.totalElements).toBe(0);
      expect(breakdown.coverage.testCoverage).toBe(100);
    });

    it('should handle empty site scan results', () => {
      const crawlSession = createMockCrawlSession();
      const siteScore = scorer.calculateSiteScore(crawlSession, []);
      
      expect(siteScore.overallScore).toBe(0);
      expect(siteScore.pageScores).toHaveLength(0);
    });

    it('should handle single page sites', () => {
      const crawlSession = createMockCrawlSession();
      const scanResults = [createMockScanResult({ score: 85 })];
      
      const siteScore = scorer.calculateSiteScore(crawlSession, scanResults);
      
      expect(siteScore.overallScore).toBe(85);
      expect(siteScore.distribution.median).toBe(85);
      expect(siteScore.consistency.scoreVariance).toBe(0);
    });
  });

  describe('Score Transparency', () => {
    it('should provide detailed score breakdown', () => {
      const scanResult = createMockScanResult({
        issues: [
          createMockIssue({ severity: 'critical', wcagReference: '1.1.1' }),
          createMockIssue({ severity: 'minor', wcagReference: '2.4.6' }),
        ],
      });
      
      const breakdown = scorer.calculatePageScore(scanResult);
      
      expect(breakdown.issueDeductions).toHaveLength(2);
      expect(breakdown.issueDeductions[0]?.reason).toContain('critical');
      expect(breakdown.issueDeductions[1]?.reason).toContain('minor');
      expect(breakdown.metadata).toBeDefined();
      expect(breakdown.coverage).toBeDefined();
    });

    it('should explain score calculations', () => {
      const scanResult = createMockScanResult();
      const breakdown = scorer.calculatePageScore(scanResult);
      
      // Should provide enough information to understand the score
      expect(breakdown.baseScore).toBeDefined();
      expect(breakdown.issueDeductions.length).toBeGreaterThan(0);
      expect(breakdown.issueDeductions[0]?.pointsDeducted).toBeGreaterThan(0);
      expect(breakdown.issueDeductions[0]?.weight).toBeGreaterThan(0);
      expect(breakdown.issueDeductions[0]?.reason).toBeTruthy();
    });
  });
}); 