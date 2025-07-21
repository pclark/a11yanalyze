/**
 * Core type definitions for a11yanalyze
 * WCAG 2.2 AA accessibility testing tool
 */

// Re-export specialized types
export * from './wcag';
export * from './browser';
export * from './output';

// Import types for internal use
import type { WCAGLevel, WCAGRule } from './wcag';
import type { BrowserConfig } from './browser';

export interface ScanResult {
  url: string;
  timestamp: string;
  score: number;
  issues: AccessibilityIssue[];
  errors?: ScanError[];
  metadata: ScanMetadata;
  compliance?: {
    compliant: boolean;
    primaryLevelIssues: number;
    warningIssues: number;
    totalIssues: number;
    levelBreakdown: Record<WCAGLevel, number>;
  };
}

export interface AccessibilityIssue {
  id: string;
  wcagReference: string;
  level: WCAGLevel;
  severity: 'critical' | 'serious' | 'moderate' | 'minor' | 'warning';
  element: string;
  selector: string;
  message: string;
  remediation: string;
  helpUrl?: string;
  impact: string;
  tags: string[];
}

export interface ScanMetadata {
  scanDuration: number;
  pageLoadTime: number;
  totalElements: number;
  testedElements: number;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  url: {
    original: string;
    final: string;
    redirects: number;
  };
}

export interface ScanError {
  type: 'timeout' | 'network' | 'parsing' | 'runtime';
  message: string;
  details?: string;
}

export interface CrawlResult {
  url: string;
  timestamp: string;
  totalPages: number;
  scannedPages: number;
  overallScore: number;
  pageResults: ScanResult[];
  summary: {
    critical: number;
    major: number;
    minor: number;
    warnings: number;
  };
}

export interface ScanOptions {
  wcagLevel: WCAGLevel;
  includeWarnings: boolean;
  timeout: number;
  outputPath?: string;
  includeAAA: boolean;
  includeARIA: boolean;
  screenshot: boolean;
  customRules?: string[];
  disabledRules?: string[];
  pageReadyTimeout?: number;
}

export interface CrawlOptions extends ScanOptions {
  depth: number;
  maxPages: number;
  followSubdomains: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
  respectRobotsTxt: boolean;
  crawlDelay: number;
  concurrency: number;
  sameDomainOnly: boolean;
}

export interface CliOptions {
  verbose: boolean;
  silent: boolean;
  outputFormat: 'json' | 'console' | 'both';
  colorOutput: boolean;
  progressBar: boolean;
  saveScreenshots: boolean;
  configFile?: string;
}

export interface ConfigFile {
  scanOptions: Partial<ScanOptions>;
  crawlOptions: Partial<CrawlOptions>;
  cliOptions: Partial<CliOptions>;
  browserConfig: Partial<BrowserConfig>;
  customRules?: WCAGRule[];
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Required<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  stage: 'initializing' | 'crawling' | 'scanning' | 'generating' | 'complete';
  message?: string;
}

export type EventCallback<T = any> = (data: T) => void;

export interface EventEmitter {
  on<T>(event: string, callback: EventCallback<T>): void;
  off<T>(event: string, callback: EventCallback<T>): void;
  emit<T>(event: string, data: T): void;
} 