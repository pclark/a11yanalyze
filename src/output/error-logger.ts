/**
 * Error Logging and Technical Issue Reporting System
 * Provides comprehensive error tracking, logging, and technical diagnostics
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { ScanResult, AccessibilityIssue } from '../types';
import { CrawlSession } from '../types/crawler';

/**
 * Error severity levels
 */
export type ErrorLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'browser'          // Browser/Playwright related errors
  | 'network'          // Network connectivity issues
  | 'parsing'          // HTML/CSS parsing errors
  | 'timeout'          // Timeout-related issues
  | 'validation'       // Input validation errors
  | 'configuration'    // Configuration issues
  | 'scanning'         // Accessibility scanning errors
  | 'crawling'         // Site crawling errors
  | 'output'           // Report generation errors
  | 'system'           // System/OS level errors
  | 'unknown';         // Unclassified errors

/**
 * Structured error entry
 */
export interface ErrorEntry {
  /** Unique error identifier */
  id: string;
  /** Error severity level */
  level: ErrorLevel;
  /** Error category */
  category: ErrorCategory;
  /** Human-readable error message */
  message: string;
  /** Technical details */
  details?: string;
  /** Error stack trace */
  stack?: string;
  /** Associated URL if applicable */
  url?: string;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Source component that generated the error */
  source: string;
  /** Additional context data */
  context?: Record<string, any>;
  /** Recovery action taken */
  recoveryAction?: string;
  /** Whether error was recovered from */
  recovered: boolean;
}

/**
 * Technical issue report
 */
export interface TechnicalIssue {
  /** Issue identifier */
  id: string;
  /** Issue type */
  type: 'performance' | 'compatibility' | 'resource' | 'security' | 'accessibility' | 'other';
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Issue title */
  title: string;
  /** Detailed description */
  description: string;
  /** Affected URLs */
  affectedUrls: string[];
  /** Reproduction steps */
  reproductionSteps?: string[];
  /** Suggested fixes */
  suggestedFixes: string[];
  /** Technical details */
  technicalDetails: Record<string, any>;
  /** First occurrence */
  firstOccurrence: string;
  /** Last occurrence */
  lastOccurrence: string;
  /** Occurrence count */
  occurrenceCount: number;
}

/**
 * System diagnostics information
 */
export interface SystemDiagnostics {
  /** System information */
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      total: number;
      used: number;
      percentage: number;
    };
    cpu: {
      model: string;
      cores: number;
      usage?: number;
    };
  };
  /** Browser information */
  browser: {
    name: string;
    version: string;
    executablePath?: string;
    userAgent: string;
  };
  /** Network information */
  network: {
    connectivity: 'online' | 'offline' | 'limited';
    dnsResolution: boolean;
    responseTime?: number;
  };
  /** Tool configuration */
  configuration: {
    scanOptions: Record<string, any>;
    crawlOptions: Record<string, any>;
    outputOptions: Record<string, any>;
  };
}

/**
 * Error logging configuration
 */
export interface ErrorLoggerConfig {
  /** Enable file logging */
  enableFileLogging: boolean;
  /** Log file path */
  logFilePath?: string;
  /** Minimum level to log */
  minLevel: ErrorLevel;
  /** Maximum log file size (bytes) */
  maxFileSize: number;
  /** Number of log files to retain */
  maxFiles: number;
  /** Enable console logging */
  enableConsoleLogging: boolean;
  /** Include stack traces */
  includeStackTraces: boolean;
  /** Enable structured JSON logging */
  structuredLogging: boolean;
  /** Log rotation enabled */
  enableRotation: boolean;
}

/**
 * Error statistics for reporting
 */
export interface ErrorStatistics {
  /** Total errors by level */
  byLevel: Record<ErrorLevel, number>;
  /** Total errors by category */
  byCategory: Record<ErrorCategory, number>;
  /** Error trends over time */
  timeline: Array<{
    timestamp: string;
    level: ErrorLevel;
    category: ErrorCategory;
    count: number;
  }>;
  /** Most frequent errors */
  frequentErrors: Array<{
    message: string;
    count: number;
    level: ErrorLevel;
    category: ErrorCategory;
  }>;
  /** Recovery statistics */
  recovery: {
    totalAttempts: number;
    successfulRecoveries: number;
    recoveryRate: number;
  };
}

/**
 * Comprehensive error logging and technical issue reporting system
 */
export class ErrorLogger {
  private config: ErrorLoggerConfig;
  private errors: ErrorEntry[] = [];
  private technicalIssues: Map<string, TechnicalIssue> = new Map();
  private sessionId: string;
  private startTime: Date;

  // Error level priorities for filtering
  private static readonly LEVEL_PRIORITIES: Record<ErrorLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(config: Partial<ErrorLoggerConfig> = {}) {
    this.config = {
      enableFileLogging: true,
      logFilePath: './logs/a11yanalyze.log',
      minLevel: 'info',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableConsoleLogging: true,
      includeStackTraces: true,
      structuredLogging: true,
      enableRotation: true,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.startTime = new Date();

    this.initializeLogging();
  }

  /**
   * Log an error entry
   */
  logError(
    level: ErrorLevel,
    category: ErrorCategory,
    message: string,
    details?: {
      error?: Error;
      url?: string;
      source?: string;
      context?: Record<string, any>;
      recoveryAction?: string;
      recovered?: boolean;
    }
  ): string {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    const errorEntry: ErrorEntry = {
      id: errorId,
      level,
      category,
      message,
      details: details?.error?.message || details?.context?.details,
      stack: this.config.includeStackTraces ? details?.error?.stack : undefined,
      url: details?.url,
      timestamp,
      source: details?.source || 'unknown',
      context: details?.context,
      recoveryAction: details?.recoveryAction,
      recovered: details?.recovered || false,
    };

    // Check if this error meets minimum logging level
    if (this.shouldLogLevel(level)) {
      this.errors.push(errorEntry);

      // Write to file if enabled
      if (this.config.enableFileLogging) {
        this.writeToFile(errorEntry);
      }

      // Log to console if enabled
      if (this.config.enableConsoleLogging) {
        this.logToConsole(errorEntry);
      }

      // Check for technical issues
      this.analyzeForTechnicalIssues(errorEntry);
    }

    return errorId;
  }

  /**
   * Log debug information
   */
  debug(message: string, source?: string, context?: Record<string, any>): string {
    return this.logError('debug', 'system', message, { source, context });
  }

  /**
   * Log informational message
   */
  info(message: string, source?: string, context?: Record<string, any>): string {
    return this.logError('info', 'system', message, { source, context });
  }

  /**
   * Log warning
   */
  warn(message: string, category: ErrorCategory = 'unknown', source?: string, context?: Record<string, any>): string {
    return this.logError('warn', category, message, { source, context });
  }

  /**
   * Log error
   */
  error(message: string, category: ErrorCategory = 'unknown', error?: Error, source?: string, context?: Record<string, any>): string {
    return this.logError('error', category, message, { error, source, context });
  }

  /**
   * Log fatal error
   */
  fatal(message: string, category: ErrorCategory = 'unknown', error?: Error, source?: string, context?: Record<string, any>): string {
    return this.logError('fatal', category, message, { error, source, context });
  }

  /**
   * Log browser-specific errors
   */
  logBrowserError(message: string, error?: Error, url?: string, recoveryAction?: string): string {
    return this.logError('error', 'browser', message, {
      error,
      url,
      source: 'browser-manager',
      recoveryAction,
      recovered: !!recoveryAction,
    });
  }

  /**
   * Log network errors
   */
  logNetworkError(message: string, url: string, error?: Error, responseCode?: number): string {
    return this.logError('error', 'network', message, {
      error,
      url,
      source: 'network',
      context: { responseCode },
    });
  }

  /**
   * Log scanning errors
   */
  logScanningError(message: string, url: string, error?: Error, scanPhase?: string): string {
    return this.logError('error', 'scanning', message, {
      error,
      url,
      source: 'page-scanner',
      context: { scanPhase },
    });
  }

  /**
   * Log crawling errors
   */
  logCrawlingError(message: string, url: string, error?: Error, depth?: number): string {
    return this.logError('error', 'crawling', message, {
      error,
      url,
      source: 'site-crawler',
      context: { depth },
    });
  }

  /**
   * Log timeout errors with recovery information
   */
  logTimeoutError(message: string, url: string, timeout: number, recoveryAction?: string): string {
    return this.logError('warn', 'timeout', message, {
      url,
      source: 'timeout-handler',
      context: { timeout },
      recoveryAction,
      recovered: !!recoveryAction,
    });
  }

  /**
   * Report a technical issue
   */
  reportTechnicalIssue(
    type: TechnicalIssue['type'],
    severity: TechnicalIssue['severity'],
    title: string,
    description: string,
    affectedUrls: string[],
    technicalDetails: Record<string, any>,
    suggestedFixes: string[] = []
  ): string {
    const issueId = this.generateIssueId();
    const timestamp = new Date().toISOString();

    const existingIssue = Array.from(this.technicalIssues.values())
      .find(issue => issue.title === title && issue.type === type);

    if (existingIssue) {
      // Update existing issue
      existingIssue.lastOccurrence = timestamp;
      existingIssue.occurrenceCount += 1;
      existingIssue.affectedUrls = [...new Set([...existingIssue.affectedUrls, ...affectedUrls])];
      return existingIssue.id;
    }

    const technicalIssue: TechnicalIssue = {
      id: issueId,
      type,
      severity,
      title,
      description,
      affectedUrls,
      suggestedFixes,
      technicalDetails,
      firstOccurrence: timestamp,
      lastOccurrence: timestamp,
      occurrenceCount: 1,
    };

    this.technicalIssues.set(issueId, technicalIssue);
    
    // Log the technical issue as an error
    this.logError('error', 'system', `Technical issue reported: ${title}`, {
      source: 'technical-issue-reporter',
      context: { issueId, type, severity },
    });

    return issueId;
  }

  /**
   * Collect system diagnostics
   */
  async collectSystemDiagnostics(): Promise<SystemDiagnostics> {
    const os = await import('os');
    const process = await import('process');

    return {
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
        },
        cpu: {
          model: os.cpus()[0]?.model || 'unknown',
          cores: os.cpus().length,
        },
      },
      browser: {
        name: 'chromium',
        version: 'unknown', // Would be populated by browser manager
        userAgent: 'a11yanalyze/1.0.0',
      },
      network: {
        connectivity: 'online', // Would be tested dynamically
        dnsResolution: true,    // Would be tested dynamically
      },
      configuration: {
        scanOptions: {},
        crawlOptions: {},
        outputOptions: {},
      },
    };
  }

  /**
   * Generate error statistics
   */
  getErrorStatistics(): ErrorStatistics {
    const byLevel: Record<ErrorLevel, number> = {
      debug: 0, info: 0, warn: 0, error: 0, fatal: 0
    };
    const byCategory: Record<ErrorCategory, number> = {
      browser: 0, network: 0, parsing: 0, timeout: 0, validation: 0,
      configuration: 0, scanning: 0, crawling: 0, output: 0, system: 0, unknown: 0
    };

    // Count errors by level and category
    this.errors.forEach(error => {
      byLevel[error.level]++;
      byCategory[error.category]++;
    });

    // Generate timeline (simplified)
    const timeline = this.errors.map(error => ({
      timestamp: error.timestamp,
      level: error.level,
      category: error.category,
      count: 1,
    }));

    // Find frequent errors
    const errorMessages = new Map<string, { count: number; level: ErrorLevel; category: ErrorCategory }>();
    this.errors.forEach(error => {
      const key = error.message;
      const existing = errorMessages.get(key);
      if (existing) {
        existing.count++;
      } else {
        errorMessages.set(key, { count: 1, level: error.level, category: error.category });
      }
    });

    const frequentErrors = Array.from(errorMessages.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate recovery statistics
    const recoveryAttempts = this.errors.filter(e => e.recoveryAction).length;
    const successfulRecoveries = this.errors.filter(e => e.recovered).length;

    return {
      byLevel,
      byCategory,
      timeline,
      frequentErrors,
      recovery: {
        totalAttempts: recoveryAttempts,
        successfulRecoveries,
        recoveryRate: recoveryAttempts > 0 ? successfulRecoveries / recoveryAttempts : 0,
      },
    };
  }

  /**
   * Get all errors for reporting
   */
  getErrors(level?: ErrorLevel, category?: ErrorCategory): ErrorEntry[] {
    return this.errors.filter(error => {
      if (level && error.level !== level) return false;
      if (category && error.category !== category) return false;
      return true;
    });
  }

  /**
   * Get all technical issues
   */
  getTechnicalIssues(): TechnicalIssue[] {
    return Array.from(this.technicalIssues.values());
  }

  /**
   * Export error log to file
   */
  exportErrorLog(filePath: string, format: 'json' | 'csv' | 'txt' = 'json'): void {
    const data = {
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      endTime: new Date().toISOString(),
      errors: this.errors,
      technicalIssues: Array.from(this.technicalIssues.values()),
      statistics: this.getErrorStatistics(),
    };

    switch (format) {
      case 'json':
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        break;
      case 'csv':
        this.exportToCsv(filePath);
        break;
      case 'txt':
        this.exportToText(filePath);
        break;
    }
  }

  /**
   * Clear all logged errors
   */
  clear(): void {
    this.errors = [];
    this.technicalIssues.clear();
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
  }

  /**
   * Get session information
   */
  getSessionInfo(): { id: string; startTime: Date; errorCount: number; issueCount: number } {
    return {
      id: this.sessionId,
      startTime: this.startTime,
      errorCount: this.errors.length,
      issueCount: this.technicalIssues.size,
    };
  }

  /**
   * Private helper methods
   */

  private initializeLogging(): void {
    if (this.config.enableFileLogging && this.config.logFilePath) {
      const logDir = dirname(this.config.logFilePath);
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }

    // Log session start
    this.info('Error logging session started', 'error-logger', {
      sessionId: this.sessionId,
      config: this.config,
    });
  }

  private shouldLogLevel(level: ErrorLevel): boolean {
    return ErrorLogger.LEVEL_PRIORITIES[level] >= ErrorLogger.LEVEL_PRIORITIES[this.config.minLevel];
  }

  private writeToFile(error: ErrorEntry): void {
    if (!this.config.logFilePath) return;

    try {
      const logLine = this.config.structuredLogging
        ? JSON.stringify(error) + '\n'
        : this.formatTextLogLine(error) + '\n';

      appendFileSync(this.config.logFilePath, logLine);

      // Check for rotation if enabled
      if (this.config.enableRotation) {
        this.checkLogRotation();
      }
    } catch (err) {
      // Avoid infinite recursion by not logging this error
      console.error('Failed to write to log file:', err);
    }
  }

  private logToConsole(error: ErrorEntry): void {
    const message = `[${error.level.toUpperCase()}] ${error.category}: ${error.message}`;
    
    switch (error.level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
      case 'fatal':
        console.error(message);
        if (error.stack && this.config.includeStackTraces) {
          console.error(error.stack);
        }
        break;
    }
  }

  private analyzeForTechnicalIssues(error: ErrorEntry): void {
    // Analyze error patterns to automatically generate technical issues
    if (error.level === 'error' || error.level === 'fatal') {
      if (error.category === 'timeout') {
        this.reportTechnicalIssue(
          'performance',
          'medium',
          'Timeout Issues Detected',
          `Multiple timeout errors detected during scanning: ${error.message}`,
          error.url ? [error.url] : [],
          { errorId: error.id, category: error.category },
          ['Increase timeout values', 'Check network connectivity', 'Optimize page load performance']
        );
      }
    }
  }

  private formatTextLogLine(error: ErrorEntry): string {
    return `${error.timestamp} [${error.level.toUpperCase()}] ${error.category}:${error.source} - ${error.message}`;
  }

  private checkLogRotation(): void {
    // Simplified rotation logic - in production, would use proper log rotation
    if (!this.config.logFilePath) return;
    
    try {
      const stats = require('fs').statSync(this.config.logFilePath);
      if (stats.size > this.config.maxFileSize) {
        // Rotate log file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = this.config.logFilePath + '.' + timestamp;
        require('fs').renameSync(this.config.logFilePath, rotatedPath);
      }
    } catch (err) {
      // Ignore rotation errors
    }
  }

  private exportToCsv(filePath: string): void {
    const headers = ['timestamp', 'level', 'category', 'source', 'message', 'url', 'recovered'];
    const rows = this.errors.map(error => [
      error.timestamp,
      error.level,
      error.category,
      error.source,
      error.message.replace(/,/g, ';'), // Escape commas
      error.url || '',
      error.recovered.toString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    writeFileSync(filePath, csvContent);
  }

  private exportToText(filePath: string): void {
    const content = this.errors
      .map(error => this.formatTextLogLine(error))
      .join('\n');
    writeFileSync(filePath, content);
  }

  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for Node.js < v14.17
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  }

  private generateErrorId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  }

  private generateIssueId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  }

  /**
   * Static utility methods
   */

  /**
   * Create a default error logger
   */
  static createDefault(): ErrorLogger {
    return new ErrorLogger();
  }

  /**
   * Create a console-only error logger
   */
  static createConsoleOnly(): ErrorLogger {
    return new ErrorLogger({
      enableFileLogging: false,
      enableConsoleLogging: true,
    });
  }

  /**
   * Create a file-only error logger
   */
  static createFileOnly(logFilePath: string): ErrorLogger {
    return new ErrorLogger({
      enableFileLogging: true,
      enableConsoleLogging: false,
      logFilePath,
    });
  }

  /**
   * Create a debug-level error logger
   */
  static createDebug(): ErrorLogger {
    return new ErrorLogger({
      minLevel: 'debug',
      includeStackTraces: true,
    });
  }
} 