import { AccessibilityIssue, ScanResult, ScanMetadata } from '../types';
import { WCAGLevel } from '../types/wcag';
import { CrawlSession } from '../types/crawler';

/**
 * Scoring algorithm configuration
 */
export interface ScoringConfig {
  /** Scoring profile to use */
  profile: ScoringProfile;
  /** WCAG level weights (higher = more important) */
  wcagLevelWeights: Record<WCAGLevel, number>;
  /** Severity penalty multipliers */
  severityPenalties: Record<string, number>;
  /** Maximum penalty per issue type */
  maxPenaltyPerIssue: number;
  /** Minimum possible score */
  minScore: number;
  /** Maximum possible score */
  maxScore: number;
  /** Enable bonus scoring */
  enableBonuses: boolean;
  /** Enable penalty systems */
  enablePenalties: boolean;
  /** Scoring transparency level */
  transparencyLevel: 'basic' | 'detailed' | 'debug';
}

/**
 * Predefined scoring profiles for different use cases
 */
export type ScoringProfile = 
  | 'strict'      // Strict compliance-focused scoring
  | 'balanced'    // Balanced approach for most use cases
  | 'lenient'     // More forgiving for development environments
  | 'enterprise'  // Enterprise-focused with business impact weighting
  | 'custom';     // Fully customizable configuration

/**
 * Detailed score breakdown for transparency
 */
export interface ScoreBreakdown {
  /** Final calculated score */
  finalScore: number;
  /** Base score before adjustments */
  baseScore: number;
  /** Issue-based deductions */
  issueDeductions: IssueDeduction[];
  /** Performance bonuses applied */
  bonuses: ScoreBonus[];
  /** System penalties applied */
  penalties: ScorePenalty[];
  /** Coverage assessment */
  coverage: CoverageAssessment;
  /** Calculation metadata */
  metadata: ScoreMetadata;
}

/**
 * Individual issue deduction details
 */
export interface IssueDeduction {
  /** Issue ID */
  issueId: string;
  /** WCAG reference */
  wcagReference: string;
  /** Issue severity */
  severity: string;
  /** WCAG level */
  level: WCAGLevel;
  /** Points deducted */
  pointsDeducted: number;
  /** Weight applied */
  weight: number;
  /** Reason for deduction */
  reason: string;
}

/**
 * Bonus points awarded
 */
export interface ScoreBonus {
  /** Bonus type */
  type: 'performance' | 'coverage' | 'bestPractices' | 'accessibility';
  /** Points awarded */
  points: number;
  /** Description */
  description: string;
  /** Criteria met */
  criteria: string;
}

/**
 * System penalties applied
 */
export interface ScorePenalty {
  /** Penalty type */
  type: 'timeout' | 'error' | 'coverage' | 'critical';
  /** Points deducted */
  points: number;
  /** Description */
  description: string;
  /** Affected element/area */
  affectedArea?: string;
}

/**
 * Coverage assessment details
 */
export interface CoverageAssessment {
  /** Percentage of page successfully tested */
  testCoverage: number;
  /** Total elements on page */
  totalElements: number;
  /** Elements successfully tested */
  testedElements: number;
  /** Elements that failed to test */
  failedElements: number;
  /** Coverage quality score */
  qualityScore: number;
  /** Areas not covered */
  uncoveredAreas: string[];
}

/**
 * Score calculation metadata
 */
export interface ScoreMetadata {
  /** Scoring algorithm version */
  algorithmVersion: string;
  /** Profile used */
  profile: ScoringProfile;
  /** Calculation timestamp */
  calculatedAt: string;
  /** Total calculation time (ms) */
  calculationTime: number;
  /** Configuration checksum */
  configChecksum: string;
}

/**
 * Site-wide scoring aggregation
 */
export interface SiteScore {
  /** Overall site score */
  overallScore: number;
  /** Individual page scores */
  pageScores: PageScore[];
  /** Aggregation method used */
  aggregationMethod: 'weighted' | 'average' | 'median' | 'worst';
  /** Site-wide bonuses/penalties */
  siteWideBonuses: ScoreBonus[];
  /** Score distribution statistics */
  distribution: ScoreDistribution;
  /** Consistency metrics */
  consistency: ConsistencyMetrics;
}

/**
 * Individual page score summary
 */
export interface PageScore {
  /** Page URL */
  url: string;
  /** Page score */
  score: number;
  /** Page weight in site calculation */
  weight: number;
  /** Issues contributing to score */
  issueCount: number;
  /** Page importance level */
  importance: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Score distribution across site
 */
export interface ScoreDistribution {
  /** Average score */
  average: number;
  /** Median score */
  median: number;
  /** Minimum score */
  minimum: number;
  /** Maximum score */
  maximum: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Score ranges */
  ranges: {
    excellent: number; // 90-100
    good: number;      // 80-89
    fair: number;      // 70-79
    poor: number;      // 60-69
    critical: number;  // <60
  };
}

/**
 * Site consistency metrics
 */
export interface ConsistencyMetrics {
  /** Consistency score (0-100) */
  consistencyScore: number;
  /** Pages with scores significantly below average */
  outlierPages: string[];
  /** Most common issues across site */
  commonIssues: string[];
  /** Score variance between pages */
  scoreVariance: number;
}

/**
 * Comprehensive accessibility scoring algorithm
 */
export class AccessibilityScorer {
  private config: ScoringConfig;

  // Predefined scoring profiles
  private static readonly SCORING_PROFILES: Record<ScoringProfile, Partial<ScoringConfig>> = {
    strict: {
      wcagLevelWeights: { A: 3.0, AA: 2.5, AAA: 1.5, ARIA: 2.0 },
      severityPenalties: { critical: 15, serious: 10, moderate: 6, minor: 3, warning: 1 },
      maxPenaltyPerIssue: 20,
      minScore: 0,
      enableBonuses: false,
      enablePenalties: true,
    },
    balanced: {
      wcagLevelWeights: { A: 2.5, AA: 2.0, AAA: 1.0, ARIA: 1.5 },
      severityPenalties: { critical: 12, serious: 8, moderate: 5, minor: 2, warning: 0.5 },
      maxPenaltyPerIssue: 15,
      minScore: 10,
      enableBonuses: true,
      enablePenalties: true,
    },
    lenient: {
      wcagLevelWeights: { A: 2.0, AA: 1.5, AAA: 0.5, ARIA: 1.0 },
      severityPenalties: { critical: 8, serious: 5, moderate: 3, minor: 1, warning: 0 },
      maxPenaltyPerIssue: 10,
      minScore: 20,
      enableBonuses: true,
      enablePenalties: true,
    },
    enterprise: {
      wcagLevelWeights: { A: 3.0, AA: 2.5, AAA: 0.8, ARIA: 2.2 },
      severityPenalties: { critical: 20, serious: 12, moderate: 6, minor: 2, warning: 0.5 },
      maxPenaltyPerIssue: 25,
      minScore: 0,
      enableBonuses: true,
      enablePenalties: true,
    },
    custom: {},
  };

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = this.mergeWithProfile(config);
  }

  /**
   * Calculate accessibility score for a single page
   */
  calculatePageScore(scanResult: ScanResult): ScoreBreakdown {
    const startTime = Date.now();
    
    // Start with perfect score
    let baseScore = this.config.maxScore;
    
    // Calculate coverage assessment
    const coverage = this.assessCoverage(scanResult);
    
    // Calculate issue deductions
    const issueDeductions = this.calculateIssueDeductions(scanResult.issues);
    const totalIssueDeduction = issueDeductions.reduce((sum, d) => sum + d.pointsDeducted, 0);
    
    // Apply issue deductions
    baseScore -= totalIssueDeduction;
    
    // Calculate bonuses
    const bonuses = this.config.enableBonuses 
      ? this.calculateBonuses(scanResult, coverage)
      : [];
    const totalBonuses = bonuses.reduce((sum, b) => sum + b.points, 0);
    
    // Calculate penalties
    const penalties = this.config.enablePenalties
      ? this.calculatePenalties(scanResult, coverage)
      : [];
    const totalPenalties = penalties.reduce((sum, p) => sum + p.points, 0);
    
    // Apply bonuses and penalties
    const adjustedScore = baseScore + totalBonuses - totalPenalties;
    
    // Ensure score is within bounds
    const finalScore = Math.max(
      this.config.minScore,
      Math.min(this.config.maxScore, adjustedScore)
    );

    return {
      finalScore: Math.round(finalScore * 100) / 100,
      baseScore: this.config.maxScore,
      issueDeductions,
      bonuses,
      penalties,
      coverage,
      metadata: {
        algorithmVersion: '1.0.0',
        profile: this.config.profile,
        calculatedAt: new Date().toISOString(),
        calculationTime: Date.now() - startTime,
        configChecksum: this.generateConfigChecksum(),
      },
    };
  }

  /**
   * Calculate site-wide accessibility score
   */
  calculateSiteScore(
    crawlSession: CrawlSession,
    scanResults: ScanResult[],
    aggregationMethod: SiteScore['aggregationMethod'] = 'weighted'
  ): SiteScore {
    // Calculate individual page scores
    const pageScores: PageScore[] = scanResults.map(result => {
      const breakdown = this.calculatePageScore(result);
      const urlEntry = crawlSession.urls.get(result.url);
      
      return {
        url: result.url,
        score: breakdown.finalScore,
        weight: this.calculatePageWeight(result, urlEntry?.depth || 0),
        issueCount: result.issues.length,
        importance: this.determinePageImportance(result.url, urlEntry?.depth || 0),
      };
    });

    // Calculate overall score based on aggregation method
    const overallScore = this.aggregateScores(pageScores, aggregationMethod);
    
    // Calculate site-wide bonuses
    const siteWideBonuses = this.calculateSiteWideBonuses(crawlSession, scanResults);
    
    // Calculate distribution and consistency metrics
    const distribution = this.calculateScoreDistribution(pageScores);
    const consistency = this.calculateConsistencyMetrics(pageScores, scanResults);

    return {
      overallScore,
      pageScores,
      aggregationMethod,
      siteWideBonuses,
      distribution,
      consistency,
    };
  }

  /**
   * Get scoring configuration
   */
  getConfig(): ScoringConfig {
    return { ...this.config };
  }

  /**
   * Update scoring configuration
   */
  updateConfig(newConfig: Partial<ScoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Calculate issue deductions
   * @private
   */
  private calculateIssueDeductions(issues: AccessibilityIssue[]): IssueDeduction[] {
    return issues.map(issue => {
      const severityPenalty = this.config.severityPenalties[issue.severity] || 0;
      const levelWeight = this.config.wcagLevelWeights[issue.level];
      const weight = levelWeight * this.getIssueTypeMultiplier(issue);
      
      const pointsDeducted = Math.min(
        severityPenalty * weight,
        this.config.maxPenaltyPerIssue
      );

      return {
        issueId: issue.id,
        wcagReference: issue.wcagReference,
        severity: issue.severity,
        level: issue.level,
        pointsDeducted,
        weight,
        reason: `${issue.severity} ${issue.level} issue: ${issue.wcagReference}`,
      };
    });
  }

  /**
   * Calculate performance and quality bonuses
   * @private
   */
  private calculateBonuses(scanResult: ScanResult, coverage: CoverageAssessment): ScoreBonus[] {
    const bonuses: ScoreBonus[] = [];

    // Performance bonus
    if (scanResult.metadata?.pageLoadTime && scanResult.metadata.pageLoadTime < 2000) {
      bonuses.push({
        type: 'performance',
        points: 2,
        description: 'Fast page load time',
        criteria: `Load time: ${scanResult.metadata.pageLoadTime}ms < 2000ms`,
      });
    }

    // Coverage bonus
    if (coverage.testCoverage > 95) {
      bonuses.push({
        type: 'coverage',
        points: 3,
        description: 'Excellent test coverage',
        criteria: `Coverage: ${coverage.testCoverage}% > 95%`,
      });
    } else if (coverage.testCoverage > 90) {
      bonuses.push({
        type: 'coverage',
        points: 1,
        description: 'Good test coverage',
        criteria: `Coverage: ${coverage.testCoverage}% > 90%`,
      });
    }

    // Zero critical issues bonus
    const criticalIssues = scanResult.issues.filter(i => i.severity === 'critical').length;
    if (criticalIssues === 0 && scanResult.issues.length > 0) {
      bonuses.push({
        type: 'accessibility',
        points: 5,
        description: 'No critical accessibility issues',
        criteria: 'Zero critical issues detected',
      });
    }

    // Perfect accessibility bonus
    if (scanResult.issues.length === 0) {
      bonuses.push({
        type: 'accessibility',
        points: 10,
        description: 'Perfect accessibility score',
        criteria: 'No accessibility issues detected',
      });
    }

    return bonuses;
  }

  /**
   * Calculate system penalties
   * @private
   */
  private calculatePenalties(scanResult: ScanResult, coverage: CoverageAssessment): ScorePenalty[] {
    const penalties: ScorePenalty[] = [];

    // Error penalties
    if (scanResult.errors && scanResult.errors.length > 0) {
      scanResult.errors.forEach(error => {
        penalties.push({
          type: error.type === 'timeout' ? 'timeout' : 'error',
          points: error.type === 'timeout' ? 10 : 5,
          description: `Scan error: ${error.message}`,
          affectedArea: 'page scanning',
        });
      });
    }

    // Coverage penalty
    if (coverage.testCoverage < 80) {
      penalties.push({
        type: 'coverage',
        points: Math.round((80 - coverage.testCoverage) * 0.5),
        description: 'Low test coverage',
        affectedArea: `${coverage.testCoverage}% coverage`,
      });
    }

    // Critical issue penalty
    const criticalIssues = scanResult.issues.filter(i => i.severity === 'critical').length;
    if (criticalIssues > 3) {
      penalties.push({
        type: 'critical',
        points: (criticalIssues - 3) * 5,
        description: 'Multiple critical accessibility issues',
        affectedArea: `${criticalIssues} critical issues`,
      });
    }

    return penalties;
  }

  /**
   * Assess test coverage quality
   * @private
   */
  private assessCoverage(scanResult: ScanResult): CoverageAssessment {
    const metadata = scanResult.metadata;
    const totalElements = metadata?.totalElements || 0;
    const testedElements = metadata?.testedElements || 0;
    const failedElements = Math.max(0, totalElements - testedElements);
    
    const testCoverage = totalElements > 0 ? (testedElements / totalElements) * 100 : 100;
    
    // Quality score based on coverage and error rate
    const errorRate = failedElements / Math.max(totalElements, 1);
    const qualityScore = Math.max(0, testCoverage - (errorRate * 50));

    return {
      testCoverage: Math.round(testCoverage * 100) / 100,
      totalElements,
      testedElements,
      failedElements,
      qualityScore: Math.round(qualityScore * 100) / 100,
      uncoveredAreas: this.identifyUncoveredAreas(scanResult),
    };
  }

  /**
   * Helper methods for scoring calculations
   * @private
   */
  
  private getIssueTypeMultiplier(issue: AccessibilityIssue): number {
    // Increase penalty for certain high-impact issue types
    if (issue.wcagReference.startsWith('1.1.1')) return 1.2; // Alt text
    if (issue.wcagReference.startsWith('2.1.1')) return 1.3; // Keyboard
    if (issue.wcagReference.startsWith('1.4.3')) return 1.1; // Contrast
    if (issue.wcagReference.startsWith('4.1.2')) return 1.2; // Name, Role, Value
    return 1.0;
  }

  private calculatePageWeight(scanResult: ScanResult, depth: number): number {
    // Higher weight for pages closer to root
    const depthWeight = Math.max(0.3, 1 - (depth * 0.1));
    
    // Bonus weight for important pages
    if (this.isImportantPage(scanResult.url)) {
      return depthWeight * 1.5;
    }
    
    return depthWeight;
  }

  private determinePageImportance(url: string, depth: number): PageScore['importance'] {
    if (depth === 0) return 'critical'; // Home page
    if (this.isImportantPage(url)) return 'high';
    if (depth <= 2) return 'medium';
    return 'low';
  }

  private isImportantPage(url: string): boolean {
    const importantPaths = [
      '/', '/home', '/index',
      '/contact', '/about',
      '/login', '/register', '/signup',
      '/checkout', '/cart', '/payment',
      '/search', '/help', '/support'
    ];
    
    return importantPaths.some(path => 
      url.endsWith(path) || url.includes(path + '/')
    );
  }

  private aggregateScores(
    pageScores: PageScore[],
    method: SiteScore['aggregationMethod']
  ): number {
    if (pageScores.length === 0) return 0;

    const scores = pageScores.map(p => p.score);
    
    switch (method) {
      case 'weighted':
        const totalWeight = pageScores.reduce((sum, p) => sum + p.weight, 0);
        return pageScores.reduce((sum, p) => sum + (p.score * p.weight), 0) / totalWeight;
        
      case 'average':
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
      case 'median':
        const sorted = [...scores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2
          : (sorted[mid] || 0);
          
      case 'worst':
        return Math.min(...scores);
        
      default:
        return this.aggregateScores(pageScores, 'weighted');
    }
  }

  private calculateSiteWideBonuses(
    crawlSession: CrawlSession,
    scanResults: ScanResult[]
  ): ScoreBonus[] {
    const bonuses: ScoreBonus[] = [];

    // Comprehensive scanning bonus
    const totalPages = crawlSession.urls.size;
    const scannedPages = scanResults.length;
    const scanRate = scannedPages / totalPages;

    if (scanRate > 0.95) {
      bonuses.push({
        type: 'coverage',
        points: 5,
        description: 'Comprehensive site scanning',
        criteria: `${scannedPages}/${totalPages} pages scanned (${Math.round(scanRate * 100)}%)`,
      });
    }

    // Consistency bonus
    const scores = scanResults.map(r => this.calculatePageScore(r).finalScore);
    const variance = this.calculateVariance(scores);
    
    if (variance < 100) { // Low variance indicates consistent quality
      bonuses.push({
        type: 'accessibility',
        points: 3,
        description: 'Consistent accessibility across site',
        criteria: `Score variance: ${Math.round(variance)}`,
      });
    }

    return bonuses;
  }

  private calculateScoreDistribution(pageScores: PageScore[]): ScoreDistribution {
    const scores = pageScores.map(p => p.score);
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2
      : (sorted[mid] || 0);
    
    const variance = this.calculateVariance(scores);
    const standardDeviation = Math.sqrt(variance);

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      minimum: Math.min(...scores),
      maximum: Math.max(...scores),
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      ranges: {
        excellent: scores.filter(s => s >= 90).length,
        good: scores.filter(s => s >= 80 && s < 90).length,
        fair: scores.filter(s => s >= 70 && s < 80).length,
        poor: scores.filter(s => s >= 60 && s < 70).length,
        critical: scores.filter(s => s < 60).length,
      },
    };
  }

  private calculateConsistencyMetrics(
    pageScores: PageScore[],
    scanResults: ScanResult[]
  ): ConsistencyMetrics {
    const scores = pageScores.map(p => p.score);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = this.calculateVariance(scores);
    
    // Consistency score: higher variance = lower consistency
    const consistencyScore = Math.max(0, 100 - (variance / 10));
    
    // Find outlier pages (scores significantly below average)
    const threshold = average - (Math.sqrt(variance) * 1.5);
    const outlierPages = pageScores
      .filter(p => p.score < threshold)
      .map(p => p.url);

    // Find most common issues across site
    const allIssues = scanResults.flatMap(r => r.issues);
    const issueFrequency = new Map<string, number>();
    
    allIssues.forEach(issue => {
      const key = issue.wcagReference;
      issueFrequency.set(key, (issueFrequency.get(key) || 0) + 1);
    });

    const commonIssues = Array.from(issueFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      outlierPages,
      commonIssues,
      scoreVariance: Math.round(variance * 100) / 100,
    };
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / numbers.length;
  }

  private identifyUncoveredAreas(scanResult: ScanResult): string[] {
    const uncovered: string[] = [];
    
    // This would be enhanced with actual coverage analysis
    if (scanResult.errors?.some(e => e.type === 'timeout')) {
      uncovered.push('Dynamic content (timeout during loading)');
    }
    
    if (scanResult.errors?.some(e => e.type === 'parsing')) {
      uncovered.push('Malformed HTML content');
    }
    
    return uncovered;
  }

  private mergeWithProfile(config: Partial<ScoringConfig>): ScoringConfig {
    const profile = config.profile || 'balanced';
    const profileConfig = AccessibilityScorer.SCORING_PROFILES[profile];
    
    const defaultConfig: ScoringConfig = {
      profile,
      wcagLevelWeights: { A: 2.5, AA: 2.0, AAA: 1.0, ARIA: 1.5 },
      severityPenalties: { critical: 12, serious: 8, moderate: 5, minor: 2, warning: 0.5 },
      maxPenaltyPerIssue: 15,
      minScore: 10,
      maxScore: 100,
      enableBonuses: true,
      enablePenalties: true,
      transparencyLevel: 'detailed',
    };

    return { ...defaultConfig, ...profileConfig, ...config };
  }

  private generateConfigChecksum(): string {
    // Simple checksum for configuration validation
    const configStr = JSON.stringify(this.config);
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Static utility methods
   */
  
  /**
   * Get all available scoring profiles
   */
  static getAvailableProfiles(): ScoringProfile[] {
    return Object.keys(AccessibilityScorer.SCORING_PROFILES) as ScoringProfile[];
  }

  /**
   * Get profile configuration
   */
  static getProfileConfig(profile: ScoringProfile): Partial<ScoringConfig> {
    return AccessibilityScorer.SCORING_PROFILES[profile] || {};
  }

  /**
   * Create scorer with predefined profile
   */
  static withProfile(profile: ScoringProfile, overrides?: Partial<ScoringConfig>): AccessibilityScorer {
    return new AccessibilityScorer({ profile, ...overrides });
  }
} 