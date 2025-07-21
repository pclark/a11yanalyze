/**
 * Output and reporting type definitions
 * Comprehensive JSON report schema for accessibility results
 */

import { WCAGLevel } from './wcag';
import { ScanResult } from './index';
import { CrawlSession, CrawlStats } from './crawler';

/**
 * Main accessibility report structure
 */
export interface AccessibilityReport {
  /** Report metadata */
  metadata: ReportMetadata;
  /** Executive summary */
  summary: ExecutiveSummary;
  /** Single page results (for page reports) */
  page?: PageReport;
  /** Multi-page results (for site reports) */
  site?: SiteReport;
  /** Technical details and configuration */
  technical: TechnicalDetails;
  /** Report generation errors */
  errors: ReportError[];
}

/**
 * Report metadata and identification
 */
export interface ReportMetadata {
  /** Report format version */
  version: string;
  /** Report type */
  type: 'page' | 'site';
  /** Generation timestamp */
  generatedAt: string;
  /** Report generation duration (ms) */
  generationTime: number;
  /** Target URL(s) */
  target: string | string[];
  /** Report title */
  title: string;
  /** Optional report description */
  description?: string;
  /** Tool information */
  tool: {
    name: string;
    version: string;
    userAgent: string;
  };
}

/**
 * Executive summary for quick overview
 */
export interface ExecutiveSummary {
  /** Overall accessibility score (0-100) */
  overallScore: number;
  /** Overall compliance status */
  compliant: boolean;
  /** WCAG compliance level achieved */
  achievedLevel: WCAGLevel | 'None';
  /** Total pages scanned */
  pagesScanned: number;
  /** Total issues found */
  totalIssues: number;
  /** Issues by severity */
  issuesBySeverity: SeverityBreakdown;
  /** WCAG level breakdown */
  wcagLevelBreakdown: WCAGLevelBreakdown;
  /** Key recommendations */
  keyRecommendations: string[];
  /** Completion status */
  status: 'completed' | 'partial' | 'failed';
}

/**
 * Issue severity breakdown
 */
export interface SeverityBreakdown {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  warning: number;
}

/**
 * WCAG level breakdown
 */
export interface WCAGLevelBreakdown {
  A: number;
  AA: number;
  AAA: number;
  ARIA: number;
}

/**
 * Single page report details
 */
export interface PageReport {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Page accessibility score */
  score: number;
  /** Page compliance status */
  compliant: boolean;
  /** Issues found on this page */
  issues: ReportIssue[];
  /** Page metadata */
  metadata: PageMetadata;
  /** Page performance metrics */
  performance: PerformanceMetrics;
  /** Page screenshots (if enabled) */
  screenshots?: ScreenshotData[];
}

/**
 * Multi-page site report details
 */
export interface SiteReport {
  /** Site base URL */
  baseUrl: string;
  /** Crawl session information */
  crawlInfo: CrawlInfo;
  /** Site-wide statistics */
  statistics: SiteStatistics;
  /** Page results */
  pages: PageSummary[];
  /** Site-wide issues analysis */
  issuesAnalysis: IssuesAnalysis;
  /** Compliance analysis */
  complianceAnalysis: ComplianceAnalysis;
  /** Domain breakdown (if multi-domain) */
  domainBreakdown?: DomainBreakdown[];
}

/**
 * Crawl session information
 */
export interface CrawlInfo {
  /** Session ID */
  sessionId: string;
  /** Start URLs */
  startUrls: string[];
  /** Crawl start time */
  startTime: string;
  /** Crawl end time */
  endTime: string;
  /** Total crawl duration (ms) */
  duration: number;
  /** Crawl configuration */
  config: {
    maxDepth: number;
    maxPages: number;
    allowedDomains: string[];
    excludedPaths: string[];
  };
  /** Crawl status */
  status: 'completed' | 'partial' | 'failed' | 'cancelled';
}

/**
 * Site-wide statistics
 */
export interface SiteStatistics {
  /** Total pages discovered */
  pagesDiscovered: number;
  /** Pages successfully scanned */
  pagesScanned: number;
  /** Pages failed to scan */
  pagesFailed: number;
  /** Pages skipped */
  pagesSkipped: number;
  /** Average page score */
  averageScore: number;
  /** Score distribution */
  scoreDistribution: ScoreDistribution;
  /** Response time statistics */
  responseTimeStats: ResponseTimeStats;
}

/**
 * Score distribution across pages
 */
export interface ScoreDistribution {
  /** Excellent (90-100) */
  excellent: number;
  /** Good (80-89) */
  good: number;
  /** Fair (70-79) */
  fair: number;
  /** Poor (60-69) */
  poor: number;
  /** Critical (<60) */
  critical: number;
}

/**
 * Response time statistics
 */
export interface ResponseTimeStats {
  /** Average page load time (ms) */
  averageLoadTime: number;
  /** Fastest page load time (ms) */
  fastestLoadTime: number;
  /** Slowest page load time (ms) */
  slowestLoadTime: number;
  /** Average scan time (ms) */
  averageScanTime: number;
}

/**
 * Page summary for site reports
 */
export interface PageSummary {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Accessibility score */
  score: number;
  /** Compliance status */
  compliant: boolean;
  /** Issue count by severity */
  issuesBySeverity: SeverityBreakdown;
  /** Page load time */
  loadTime: number;
  /** Scan time */
  scanTime: number;
  /** Crawl depth */
  depth: number;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Detailed issue information
 */
export interface ReportIssue {
  /** Unique issue identifier */
  id: string;
  /** WCAG success criterion reference */
  wcagReference: string;
  /** WCAG conformance level */
  level: WCAGLevel;
  /** Issue severity */
  severity: 'critical' | 'serious' | 'moderate' | 'minor' | 'warning';
  /** Issue category */
  category: IssueCategory;
  /** Brief issue title */
  title: string;
  /** Detailed description */
  description: string;
  /** Impact on users */
  impact: string;
  /** Remediation guidance */
  remediation: string;
  /** Additional help resources */
  helpUrl?: string;
  /** Number of occurrences */
  occurrences: number;
  /** Affected elements */
  elements: AffectedElement[];
  /** Pages where this issue occurs (site reports) */
  affectedPages?: string[];
}

/**
 * Issue categories for organization
 */
export type IssueCategory = 
  | 'images'
  | 'forms'
  | 'navigation' 
  | 'content'
  | 'color'
  | 'keyboard'
  | 'focus'
  | 'aria'
  | 'structure'
  | 'multimedia'
  | 'timing'
  | 'input'
  | 'error'
  | 'other';

/**
 * Affected element details
 */
export interface AffectedElement {
  /** CSS selector */
  selector: string;
  /** Element HTML snippet */
  html: string;
  /** Element text content (if any) */
  text?: string;
  /** Element position information */
  position?: ElementPosition;
  /** Additional context */
  context?: string;
}

/**
 * Element position on page
 */
export interface ElementPosition {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;
}

/**
 * Site-wide issues analysis
 */
export interface IssuesAnalysis {
  /** Most common issues across site */
  mostCommonIssues: CommonIssue[];
  /** Issues by category */
  issuesByCategory: Record<IssueCategory, number>;
  /** Critical issues requiring immediate attention */
  criticalIssues: ReportIssue[];
  /** Pattern analysis */
  patterns: IssuePattern[];
}

/**
 * Common issue summary
 */
export interface CommonIssue {
  /** Issue identifier */
  id: string;
  /** Issue title */
  title: string;
  /** WCAG reference */
  wcagReference: string;
  /** Number of occurrences */
  occurrences: number;
  /** Number of affected pages */
  affectedPages: number;
  /** Percentage of pages affected */
  affectedPercentage: number;
}

/**
 * Issue pattern analysis
 */
export interface IssuePattern {
  /** Pattern description */
  pattern: string;
  /** Pattern type */
  type: 'template' | 'component' | 'systematic' | 'content';
  /** Affected URLs */
  affectedUrls: string[];
  /** Recommended fix approach */
  recommendation: string;
}

/**
 * WCAG compliance analysis
 */
export interface ComplianceAnalysis {
  /** Compliance by WCAG level */
  levelCompliance: {
    A: ComplianceLevel;
    AA: ComplianceLevel;
    AAA: ComplianceLevel;
  };
  /** Success criteria analysis */
  successCriteria: SuccessCriteriaAnalysis[];
  /** Compliance trends (if historical data available) */
  trends?: ComplianceTrend[];
}

/**
 * Compliance level details
 */
export interface ComplianceLevel {
  /** Is this level achieved? */
  compliant: boolean;
  /** Compliance percentage */
  percentage: number;
  /** Number of passing pages */
  passingPages: number;
  /** Number of failing pages */
  failingPages: number;
  /** Blocking issues */
  blockingIssues: string[];
}

/**
 * Success criteria analysis
 */
export interface SuccessCriteriaAnalysis {
  /** Success criterion number */
  criterion: string;
  /** WCAG level */
  level: WCAGLevel;
  /** Title */
  title: string;
  /** Compliance status */
  status: 'pass' | 'fail' | 'partial';
  /** Number of passing pages */
  passingPages: number;
  /** Number of failing pages */
  failingPages: number;
  /** Related issues */
  relatedIssues: string[];
}

/**
 * Compliance trend data
 */
export interface ComplianceTrend {
  /** Date */
  date: string;
  /** Overall score */
  score: number;
  /** Issue count */
  issueCount: number;
  /** Compliance status */
  compliant: boolean;
}

/**
 * Domain breakdown for multi-domain sites
 */
export interface DomainBreakdown {
  /** Domain name */
  domain: string;
  /** Number of pages */
  pageCount: number;
  /** Average score */
  averageScore: number;
  /** Compliance status */
  compliant: boolean;
  /** Issues by severity */
  issuesBySeverity: SeverityBreakdown;
  /** Most common issues */
  commonIssues: string[];
}

/**
 * Page metadata
 */
export interface PageMetadata {
  /** Page title */
  title: string;
  /** Meta description */
  description?: string;
  /** Page language */
  language: string;
  /** Viewport configuration */
  viewport: string;
  /** Character encoding */
  charset: string;
  /** Page size information */
  size: {
    /** Total elements */
    totalElements: number;
    /** Interactive elements */
    interactiveElements: number;
    /** Images */
    images: number;
    /** Links */
    links: number;
    /** Form controls */
    formControls: number;
    /** Headings */
    headings: number;
  };
  /** Accessibility features detected */
  accessibilityFeatures: string[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Page load time (ms) */
  loadTime: number;
  /** Time to interactive (ms) */
  timeToInteractive?: number;
  /** Scan duration (ms) */
  scanTime: number;
  /** Total processing time (ms) */
  totalTime: number;
  /** Resource loading stats */
  resources: {
    /** Total requests */
    total: number;
    /** Failed requests */
    failed: number;
    /** Total size (bytes) */
    totalSize: number;
  };
}

/**
 * Screenshot data
 */
export interface ScreenshotData {
  /** Screenshot type */
  type: 'full' | 'viewport' | 'element';
  /** Base64 encoded image data */
  data: string;
  /** Image format */
  format: 'png' | 'jpeg';
  /** Viewport size when taken */
  viewport: {
    width: number;
    height: number;
  };
  /** Timestamp */
  timestamp: string;
}

/**
 * Technical details and configuration
 */
export interface TechnicalDetails {
  /** Scan configuration */
  scanConfig: {
    /** WCAG level tested */
    wcagLevel: WCAGLevel;
    /** Include AAA issues as warnings */
    includeAAA: boolean;
    /** Include ARIA issues */
    includeARIA: boolean;
    /** Browser configuration */
    browser: {
      name: string;
      version: string;
      headless: boolean;
      viewport: {
        width: number;
        height: number;
      };
    };
  };
  /** Rules executed */
  rulesExecuted: RuleExecutionInfo[];
  /** Environment information */
  environment: {
    /** Tool version */
    toolVersion: string;
    /** Node.js version */
    nodeVersion: string;
    /** Platform */
    platform: string;
    /** Architecture */
    arch: string;
  };
  /** Processing statistics */
  processing: {
    /** Total rules executed */
    totalRules: number;
    /** Rules passed */
    rulesPassed: number;
    /** Rules failed */
    rulesFailed: number;
    /** Custom rules used */
    customRules: number;
  };
}

/**
 * Rule execution information
 */
export interface RuleExecutionInfo {
  /** Rule identifier */
  ruleId: string;
  /** Rule name */
  name: string;
  /** WCAG reference */
  wcagReference: string;
  /** Execution status */
  status: 'passed' | 'failed' | 'inapplicable' | 'cantTell';
  /** Execution time (ms) */
  executionTime: number;
  /** Number of violations found */
  violations: number;
}

/**
 * Report generation errors
 */
export interface ReportError {
  /** Error type */
  type: 'scan' | 'crawl' | 'generation' | 'validation';
  /** Error severity */
  severity: 'critical' | 'error' | 'warning' | 'info';
  /** Error message */
  message: string;
  /** Error details */
  details?: string;
  /** Affected URL (if applicable) */
  url?: string;
  /** Timestamp */
  timestamp: string;
  /** Stack trace (for critical errors) */
  stack?: string;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Include screenshots */
  includeScreenshots: boolean;
  /** Include raw scan data */
  includeRawData: boolean;
  /** Include historical trends */
  includeTrends: boolean;
  /** Minimum severity to include */
  minSeverity: 'critical' | 'serious' | 'moderate' | 'minor' | 'warning';
  /** Group issues by type */
  groupIssues: boolean;
  /** Include remediation guidance */
  includeRemediation: boolean;
  /** Report format version */
  version: string;
  /** Custom report title */
  title?: string;
  /** Custom report description */
  description?: string;
} 