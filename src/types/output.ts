/**
 * Output and reporting-specific type definitions
 * Covers JSON reports, console formatting, and scoring algorithms
 */

export interface ReportMetadata {
  version: string;
  timestamp: string;
  generator: {
    name: string;
    version: string;
    url: string;
  };
  environment: {
    userAgent: string;
    viewport: string;
    platform: string;
  };
}

export interface JsonReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  results: ScanResultData | CrawlResultData;
  schema: string; // JSON schema version
}

export interface ReportSummary {
  totalIssues: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  warningIssues: number;
  overallScore: number;
  passedRules: number;
  failedRules: number;
  testedElements: number;
}

export interface ScanResultData {
  type: 'single-page';
  url: string;
  score: number;
  issues: FormattedIssue[];
  passedRules: string[];
  pageInfo: PageInfo;
}

export interface CrawlResultData {
  type: 'site-crawl';
  baseUrl: string;
  totalPages: number;
  scannedPages: number;
  overallScore: number;
  pages: PageResult[];
  sitemap: string[];
}

export interface PageResult {
  url: string;
  score: number;
  issues: FormattedIssue[];
  passedRules: string[];
  pageInfo: PageInfo;
}

export interface FormattedIssue {
  id: string;
  wcag: {
    criterion: string;
    level: string;
    guideline: string;
    principle: string;
  };
  severity: string;
  impact: string;
  element: {
    tag: string;
    selector: string;
    html: string;
    xpath?: string;
  };
  message: string;
  remediation: {
    summary: string;
    details: string;
    examples?: string[];
  };
  resources: {
    helpUrl: string;
    techniques: string[];
  };
}

export interface PageInfo {
  title: string;
  description?: string;
  language?: string;
  charset?: string;
  loadTime: number;
  resources: {
    images: number;
    scripts: number;
    stylesheets: number;
    total: number;
  };
}

export interface ScoreConfig {
  weights: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  penalties: {
    timeoutPenalty: number;
    errorPenalty: number;
  };
  bonuses: {
    zeroIssuesBonus: number;
    fastLoadBonus: number;
  };
}

export interface ConsoleFormatOptions {
  colorOutput: boolean;
  verboseMode: boolean;
  showPassed: boolean;
  maxIssuesShown: number;
  groupByType: boolean;
  showProgressBar: boolean;
}

export interface ProgressBarOptions {
  width: number;
  completeChar: string;
  incompleteChar: string;
  showPercentage: boolean;
  showETA: boolean;
}

export type OutputFormat = 'json' | 'console' | 'html' | 'csv' | 'sarif';

export interface ExportOptions {
  format: OutputFormat;
  filepath: string;
  minify?: boolean;
  includeMetadata?: boolean;
  includePassedRules?: boolean;
}

// Console output styling
export interface ConsoleTheme {
  colors: {
    critical: string;
    serious: string;
    moderate: string;
    minor: string;
    success: string;
    info: string;
    warning: string;
    error: string;
  };
  symbols: {
    success: string;
    error: string;
    warning: string;
    info: string;
    bullet: string;
  };
} 