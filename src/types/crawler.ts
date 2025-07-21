/**
 * Site crawler type definitions
 * Defines interfaces for multi-page accessibility scanning with crawling capabilities
 */

import { ScanResult, ScanOptions } from './index';

/**
 * Crawler configuration options
 */
export interface CrawlerConfig {
  /** Maximum crawl depth (0 = single page, unlimited = -1) */
  maxDepth: number;
  /** Maximum number of pages to crawl */
  maxPages: number;
  /** Allowed domains for crawling (empty = any domain) */
  allowedDomains: string[];
  /** Domain patterns to exclude */
  excludedDomains: string[];
  /** URL patterns to exclude (regex patterns) */
  excludedPaths: string[];
  /** URL patterns to include (regex patterns, empty = include all) */
  includedPaths: string[];
  /** Rate limiting: delay between requests in milliseconds */
  requestDelay: number;
  /** Maximum concurrent requests */
  maxConcurrency: number;
  /** Follow robots.txt directives */
  respectRobotsTxt: boolean;
  /** Include external links in discovery (but don't follow) */
  discoverExternalLinks: boolean;
  /** Enable sitemap discovery and parsing */
  useSitemaps: boolean;
  /** Custom User-Agent string */
  userAgent: string;
  /** Request timeout in milliseconds */
  requestTimeout: number;
}

/**
 * URL discovery sources
 */
export type URLDiscoverySource = 'initial' | 'page' | 'sitemap' | 'robots' | 'manual';

/**
 * URL entry with metadata
 */
export interface URLEntry {
  /** The URL to crawl */
  url: string;
  /** Crawl depth of this URL */
  depth: number;
  /** How this URL was discovered */
  source: URLDiscoverySource;
  /** Parent URL that led to this discovery */
  parent?: string;
  /** Priority for crawling (higher = more important) */
  priority: number;
  /** When this URL was discovered */
  discoveredAt: Date;
  /** When this URL was last attempted */
  lastAttempt?: Date;
  /** Number of attempts made */
  attempts: number;
  /** Current status of this URL */
  status: URLStatus;
  /** Error information if failed */
  error?: string;
}

/**
 * URL processing status
 */
export type URLStatus = 
  | 'pending'     // Waiting to be processed
  | 'processing' // Currently being processed
  | 'completed'  // Successfully processed
  | 'failed'     // Failed processing
  | 'skipped'    // Skipped due to filters/limits
  | 'excluded';  // Excluded by configuration

/**
 * Crawl session state
 */
export interface CrawlSession {
  /** Unique session identifier */
  id: string;
  /** Base URLs where crawling started */
  startUrls: string[];
  /** Crawl configuration */
  config: CrawlerConfig;
  /** Scan options for individual pages */
  scanOptions: Partial<ScanOptions>;
  /** Session start time */
  startTime: Date;
  /** Session end time (if completed) */
  endTime?: Date;
  /** Current session status */
  status: CrawlStatus;
  /** All discovered URLs with their metadata */
  urls: Map<string, URLEntry>;
  /** Completed scan results */
  results: Map<string, ScanResult>;
  /** Session statistics */
  stats: CrawlStats;
  /** Error information if session failed */
  error?: string;
}

/**
 * Crawl session status
 */
export type CrawlStatus = 
  | 'initializing' // Setting up crawl session
  | 'discovering'  // Finding URLs to crawl
  | 'crawling'     // Actively crawling pages
  | 'paused'       // Temporarily paused
  | 'completed'    // Successfully completed
  | 'failed'       // Failed with errors
  | 'cancelled';   // Manually cancelled

/**
 * Crawl statistics
 */
export interface CrawlStats {
  /** URLs by status */
  urlCounts: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
    excluded: number;
  };
  /** Pages successfully scanned */
  pagesScanned: number;
  /** Total accessibility issues found */
  totalIssues: number;
  /** Issues by severity */
  issuesBySeverity: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    warning: number;
  };
  /** Average accessibility score */
  averageScore: number;
  /** Crawl performance metrics */
  performance: {
    avgPageLoadTime: number;
    avgScanTime: number;
    totalCrawlTime: number;
    pagesPerMinute: number;
  };
  /** WCAG compliance statistics */
  wcagCompliance: {
    compliantPages: number;
    nonCompliantPages: number;
    complianceRate: number;
    levelBreakdown: {
      A: number;
      AA: number;
      AAA: number;
      ARIA: number;
    };
  };
}

/**
 * URL discovery result
 */
export interface URLDiscoveryResult {
  /** URLs discovered */
  urls: URLEntry[];
  /** Source of discovery */
  source: URLDiscoverySource;
  /** Parent URL (if applicable) */
  parent?: string;
  /** Any errors during discovery */
  errors: string[];
}

/**
 * Sitemap information
 */
export interface SitemapInfo {
  /** Sitemap URL */
  url: string;
  /** Last modification time */
  lastModified?: Date;
  /** URLs found in sitemap */
  urls: SitemapURL[];
  /** Nested sitemaps */
  sitemaps: string[];
}

/**
 * Sitemap URL entry
 */
export interface SitemapURL {
  /** The URL */
  url: string;
  /** Last modification time */
  lastModified?: Date;
  /** Change frequency */
  changeFreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Priority (0.0 to 1.0) */
  priority?: number;
}

/**
 * Robots.txt information
 */
export interface RobotsInfo {
  /** User-agent rules */
  userAgent: string;
  /** Disallowed paths */
  disallow: string[];
  /** Allowed paths */
  allow: string[];
  /** Sitemap URLs */
  sitemaps: string[];
  /** Crawl delay in seconds */
  crawlDelay?: number;
}

/**
 * Crawl event types for progress tracking
 */
export type CrawlEventType = 
  | 'session_started'
  | 'session_completed'
  | 'session_failed'
  | 'session_paused'
  | 'session_resumed'
  | 'url_discovered'
  | 'url_started'
  | 'url_completed'
  | 'url_failed'
  | 'url_skipped'
  | 'depth_limit_reached'
  | 'page_limit_reached'
  | 'rate_limit_applied';

/**
 * Crawl event data
 */
export interface CrawlEvent {
  /** Event type */
  type: CrawlEventType;
  /** Event timestamp */
  timestamp: Date;
  /** Session ID */
  sessionId: string;
  /** URL associated with event (if applicable) */
  url?: string;
  /** Additional event data */
  data?: any;
  /** Error information (if applicable) */
  error?: string;
}

/**
 * Crawl result aggregation options
 */
export interface AggregationOptions {
  /** Group results by domain */
  groupByDomain: boolean;
  /** Group results by page type/template */
  groupByPageType: boolean;
  /** Include individual page results */
  includeIndividualResults: boolean;
  /** Sort order for results */
  sortBy: 'url' | 'score' | 'issues' | 'depth' | 'discoveredAt';
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
  /** Filter results by score threshold */
  minScore?: number;
  /** Filter results by issue count */
  maxIssues?: number;
}

/**
 * Aggregated crawl results
 */
export interface AggregatedCrawlResults {
  /** Session information */
  session: Pick<CrawlSession, 'id' | 'startUrls' | 'config' | 'startTime' | 'endTime' | 'status'>;
  /** Overall statistics */
  stats: CrawlStats;
  /** Results grouped by domain */
  domainResults?: Map<string, DomainResults>;
  /** Results grouped by page type */
  pageTypeResults?: Map<string, PageTypeResults>;
  /** Individual page results */
  pageResults?: ScanResult[];
  /** Top issues across all pages */
  topIssues: IssuesSummary[];
  /** Compliance summary */
  complianceSummary: ComplianceSummary;
}

/**
 * Domain-specific results
 */
export interface DomainResults {
  /** Domain name */
  domain: string;
  /** Number of pages scanned */
  pageCount: number;
  /** Average accessibility score */
  averageScore: number;
  /** Total issues found */
  totalIssues: number;
  /** Issues by severity */
  issuesBySeverity: CrawlStats['issuesBySeverity'];
  /** Most common issues */
  commonIssues: IssuesSummary[];
  /** WCAG compliance rate */
  complianceRate: number;
}

/**
 * Page type results
 */
export interface PageTypeResults {
  /** Page type identifier */
  pageType: string;
  /** Number of pages of this type */
  pageCount: number;
  /** Average accessibility score */
  averageScore: number;
  /** Common issues for this page type */
  commonIssues: IssuesSummary[];
  /** Example URLs of this type */
  exampleUrls: string[];
}

/**
 * Issue summary for aggregation
 */
export interface IssuesSummary {
  /** Issue identifier */
  id: string;
  /** WCAG reference */
  wcagReference: string;
  /** WCAG level */
  level: string;
  /** Issue description */
  description: string;
  /** Number of occurrences */
  count: number;
  /** Number of pages affected */
  pagesAffected: number;
  /** Severity level */
  severity: string;
  /** Remediation guidance */
  remediation: string;
}

/**
 * Compliance summary
 */
export interface ComplianceSummary {
  /** Overall compliance rate */
  overallCompliance: number;
  /** Compliance by WCAG level */
  levelCompliance: {
    A: number;
    AA: number;
    AAA: number;
  };
  /** Pages meeting each level */
  compliantPages: {
    A: number;
    AA: number;
    AAA: number;
  };
  /** Total pages scanned */
  totalPages: number;
  /** Domains with compliance issues */
  problematicDomains: string[];
}

/**
 * Crawler progress information
 */
export interface CrawlProgress {
  /** Current session status */
  status: CrawlStatus;
  /** Progress percentage (0-100) */
  percentage: number;
  /** URLs processed */
  urlsProcessed: number;
  /** Total URLs discovered */
  totalUrls: number;
  /** Current crawl depth */
  currentDepth: number;
  /** Pages scanned per minute */
  scanRate: number;
  /** Estimated time remaining (milliseconds) */
  estimatedTimeRemaining?: number;
  /** Current URL being processed */
  currentUrl?: string;
  /** Recent errors */
  recentErrors: string[];
} 