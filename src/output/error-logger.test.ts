/**
 * ErrorLogger unit tests
 * Tests comprehensive error logging and technical issue reporting
 */

import { ErrorLogger, ErrorLevel, ErrorCategory, ErrorEntry, TechnicalIssue, ErrorStatistics } from './error-logger';
import { writeFileSync, existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock filesystem operations for testing
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  rmSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 1000 })),
  renameSync: jest.fn(),
}));

// Mock console methods
const consoleSpy = {
  debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
  info: jest.spyOn(console, 'info').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('ErrorLogger', () => {
  let logger: ErrorLogger;
  const testLogPath = './logs/test.log';

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
    
    // Create logger with file logging disabled for most tests
    logger = new ErrorLogger({
      enableFileLogging: false,
      enableConsoleLogging: false,
    });
  });

  afterEach(() => {
    logger.clear();
  });

  describe('Configuration', () => {
    it('should create with default configuration', () => {
      const defaultLogger = ErrorLogger.createDefault();
      expect(defaultLogger).toBeInstanceOf(ErrorLogger);
    });

    it('should create console-only logger', () => {
      const consoleLogger = ErrorLogger.createConsoleOnly();
      expect(consoleLogger).toBeInstanceOf(ErrorLogger);
    });

    it('should create file-only logger', () => {
      const fileLogger = ErrorLogger.createFileOnly('./logs/test.log');
      expect(fileLogger).toBeInstanceOf(ErrorLogger);
    });

    it('should create debug logger', () => {
      const debugLogger = ErrorLogger.createDebug();
      expect(debugLogger).toBeInstanceOf(ErrorLogger);
    });

    it('should accept custom configuration', () => {
      const customLogger = new ErrorLogger({
        minLevel: 'error',
        maxFileSize: 5000000,
        includeStackTraces: false,
      });
      expect(customLogger).toBeInstanceOf(ErrorLogger);
    });
  });

  describe('Basic Logging', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: true,
        minLevel: 'debug',
      });
    });

    it('should log debug messages', () => {
      const errorId = logger.debug('Debug message', 'test-component');
      
      expect(errorId).toBeTruthy();
      expect(consoleSpy.debug).toHaveBeenCalledWith('[DEBUG] system: Debug message');
      
      const errors = logger.getErrors('debug');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe('Debug message');
      expect(errors[0]?.level).toBe('debug');
      expect(errors[0]?.source).toBe('test-component');
    });

    it('should log info messages', () => {
      const errorId = logger.info('Info message', 'test-component');
      
      expect(errorId).toBeTruthy();
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] system: Info message');
      
      const errors = logger.getErrors('info');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe('Info message');
    });

    it('should log warnings', () => {
      const errorId = logger.warn('Warning message', 'validation', 'test-component');
      
      expect(errorId).toBeTruthy();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] validation: Warning message');
      
      const errors = logger.getErrors('warn');
      expect(errors).toHaveLength(1);
      expect(errors[0]!.category).toBe('validation');
    });

    it('should log errors', () => {
      const testError = new Error('Test error');
      const errorId = logger.error('Error message', 'network', testError, 'test-component');
      
      expect(errorId).toBeTruthy();
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] network: Error message');
      
      const errors = logger.getErrors('error');
      expect(errors).toHaveLength(1);
      expect(errors[0].details).toBe('Test error');
      expect(errors[0].stack).toBeTruthy();
    });

    it('should log fatal errors', () => {
      const testError = new Error('Fatal error');
      const errorId = logger.fatal('Fatal message', 'system', testError, 'test-component');
      
      expect(errorId).toBeTruthy();
      expect(consoleSpy.error).toHaveBeenCalledWith('[FATAL] system: Fatal message');
      
      const errors = logger.getErrors('fatal');
      expect(errors).toHaveLength(1);
      expect(errors[0].level).toBe('fatal');
    });
  });

  describe('Level Filtering', () => {
    it('should respect minimum log level', () => {
      const infoLogger = new ErrorLogger({
        enableFileLogging: false,
        enableConsoleLogging: false,
        minLevel: 'info',
      });

      infoLogger.debug('Debug message');
      infoLogger.info('Info message');
      infoLogger.warn('Warning message');

      const allErrors = infoLogger.getErrors();
      expect(allErrors).toHaveLength(2); // Only info and warn should be logged
      expect(allErrors.find(e => e.level === 'debug')).toBeUndefined();
      expect(allErrors.find(e => e.level === 'info')).toBeTruthy();
      expect(allErrors.find(e => e.level === 'warn')).toBeTruthy();
    });

    it('should log all levels when set to debug', () => {
      const debugLogger = new ErrorLogger({
        enableFileLogging: false,
        enableConsoleLogging: false,
        minLevel: 'debug',
      });

      debugLogger.debug('Debug message');
      debugLogger.info('Info message');
      debugLogger.warn('Warning message');
      debugLogger.error('Error message');
      debugLogger.fatal('Fatal message');

      const allErrors = debugLogger.getErrors();
      expect(allErrors).toHaveLength(5);
    });
  });

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });
    });

    it('should log browser errors with recovery info', () => {
      const testError = new Error('Browser crashed');
      const errorId = logger.logBrowserError('Browser error occurred', testError, 'https://example.com', 'Restarted browser');
      
      const errors = logger.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].category).toBe('browser');
      expect(errors[0].source).toBe('browser-manager');
      expect(errors[0].url).toBe('https://example.com');
      expect(errors[0].recoveryAction).toBe('Restarted browser');
      expect(errors[0].recovered).toBe(true);
    });

    it('should log network errors with response codes', () => {
      const testError = new Error('Network timeout');
      const errorId = logger.logNetworkError('Failed to load page', 'https://example.com', testError, 504);
      
      const errors = logger.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].category).toBe('network');
      expect(errors[0].source).toBe('network');
      expect(errors[0].context?.responseCode).toBe(504);
    });

    it('should log scanning errors with scan phase', () => {
      const testError = new Error('Axe scan failed');
      const errorId = logger.logScanningError('Accessibility scan failed', 'https://example.com', testError, 'axe-analysis');
      
      const errors = logger.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].category).toBe('scanning');
      expect(errors[0].source).toBe('page-scanner');
      expect(errors[0].context?.scanPhase).toBe('axe-analysis');
    });

    it('should log crawling errors with depth info', () => {
      const testError = new Error('Crawl failed');
      const errorId = logger.logCrawlingError('Failed to crawl page', 'https://example.com/deep', testError, 3);
      
      const errors = logger.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].category).toBe('crawling');
      expect(errors[0].source).toBe('site-crawler');
      expect(errors[0].context?.depth).toBe(3);
    });

    it('should log timeout errors with recovery action', () => {
      const errorId = logger.logTimeoutError('Page load timeout', 'https://example.com', 30000, 'Increased timeout to 60s');
      
      const errors = logger.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].category).toBe('timeout');
      expect(errors[0].level).toBe('warn');
      expect(errors[0].source).toBe('timeout-handler');
      expect(errors[0].context?.timeout).toBe(30000);
      expect(errors[0].recoveryAction).toBe('Increased timeout to 60s');
      expect(errors[0].recovered).toBe(true);
    });
  });

  describe('Technical Issue Reporting', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });
    });

    it('should report new technical issues', () => {
      const issueId = logger.reportTechnicalIssue(
        'performance',
        'high',
        'Page Load Performance Issue',
        'Pages are loading slowly due to large images',
        ['https://example.com/slow-page'],
        { averageLoadTime: 8500, imageCount: 25 },
        ['Optimize images', 'Enable lazy loading']
      );

      expect(issueId).toBeTruthy();

      const issues = logger.getTechnicalIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('performance');
      expect(issues[0].severity).toBe('high');
      expect(issues[0].title).toBe('Page Load Performance Issue');
      expect(issues[0].occurrenceCount).toBe(1);
      expect(issues[0].suggestedFixes).toContain('Optimize images');
    });

    it('should update existing technical issues', () => {
      // Report the same issue twice
      const firstReport = logger.reportTechnicalIssue(
        'performance',
        'medium',
        'Memory Usage Issue',
        'High memory usage detected',
        ['https://example.com/page1'],
        { memoryUsage: 500 }
      );

      const secondReport = logger.reportTechnicalIssue(
        'performance',
        'medium',
        'Memory Usage Issue',
        'High memory usage detected',
        ['https://example.com/page2'],
        { memoryUsage: 600 }
      );

      expect(firstReport).toBe(secondReport); // Should return same ID

      const issues = logger.getTechnicalIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0].occurrenceCount).toBe(2);
      expect(issues[0].affectedUrls).toContain('https://example.com/page1');
      expect(issues[0].affectedUrls).toContain('https://example.com/page2');
    });

    it('should handle different types of technical issues', () => {
      const types: Array<{ type: any; severity: any }> = [
        { type: 'performance', severity: 'high' },
        { type: 'compatibility', severity: 'medium' },
        { type: 'resource', severity: 'low' },
        { type: 'security', severity: 'critical' },
        { type: 'accessibility', severity: 'high' },
        { type: 'other', severity: 'medium' },
      ];

      types.forEach(({ type, severity }, index) => {
        logger.reportTechnicalIssue(
          type,
          severity,
          `${type} Issue ${index}`,
          `Description for ${type} issue`,
          [`https://example.com/${type}`],
          { issueType: type }
        );
      });

      const issues = logger.getTechnicalIssues();
      expect(issues).toHaveLength(6);
      
      const performanceIssue = issues.find(i => i.type === 'performance');
      expect(performanceIssue?.severity).toBe('high');
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });
    });

    it('should generate comprehensive error statistics', () => {
      // Log various types of errors
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message', 'validation');
      logger.error('Error message', 'network');
      logger.error('Another error', 'network');
      logger.fatal('Fatal error', 'system');

      const stats = logger.getErrorStatistics();

      expect(stats.byLevel.debug).toBe(1);
      expect(stats.byLevel.info).toBe(1);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byLevel.error).toBe(2);
      expect(stats.byLevel.fatal).toBe(1);

      expect(stats.byCategory.system).toBe(2); // debug + fatal
      expect(stats.byCategory.validation).toBe(1);
      expect(stats.byCategory.network).toBe(2);

      expect(stats.timeline).toHaveLength(6);
      expect(stats.frequentErrors).toHaveLength(6);
    });

    it('should track frequent errors correctly', () => {
      // Log the same error multiple times
      logger.error('Common error', 'network');
      logger.error('Common error', 'network');
      logger.error('Common error', 'network');
      logger.error('Rare error', 'system');

      const stats = logger.getErrorStatistics();
      
      expect(stats.frequentErrors).toHaveLength(2);
      expect(stats.frequentErrors[0].message).toBe('Common error');
      expect(stats.frequentErrors[0].count).toBe(3);
      expect(stats.frequentErrors[1].message).toBe('Rare error');
      expect(stats.frequentErrors[1].count).toBe(1);
    });

    it('should track recovery statistics', () => {
      // Log errors with and without recovery
      logger.logBrowserError('Browser error', new Error('crash'), undefined, 'Restarted');
      logger.logNetworkError('Network error', 'https://example.com'); // No recovery
      logger.logTimeoutError('Timeout', 'https://example.com', 30000, 'Extended timeout');

      const stats = logger.getErrorStatistics();
      
      expect(stats.recovery.totalAttempts).toBe(2); // Two errors had recovery actions
      expect(stats.recovery.successfulRecoveries).toBe(2); // Both were marked as recovered
      expect(stats.recovery.recoveryRate).toBe(1.0); // 100% recovery rate
    });
  });

  describe('Error Filtering and Retrieval', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });

      // Populate with various errors
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message', 'validation');
      logger.error('Error message', 'network');
      logger.fatal('Fatal error', 'system');
    });

    it('should filter errors by level', () => {
      const debugErrors = logger.getErrors('debug');
      const errorLevelErrors = logger.getErrors('error');
      
      expect(debugErrors).toHaveLength(1);
      expect(debugErrors[0].level).toBe('debug');
      
      expect(errorLevelErrors).toHaveLength(1);
      expect(errorLevelErrors[0].level).toBe('error');
    });

    it('should filter errors by category', () => {
      const systemErrors = logger.getErrors(undefined, 'system');
      const networkErrors = logger.getErrors(undefined, 'network');
      
      expect(systemErrors).toHaveLength(2); // debug and fatal
      expect(networkErrors).toHaveLength(1);
    });

    it('should filter errors by both level and category', () => {
      const systemFatalErrors = logger.getErrors('fatal', 'system');
      
      expect(systemFatalErrors).toHaveLength(1);
      expect(systemFatalErrors[0].level).toBe('fatal');
      expect(systemFatalErrors[0].category).toBe('system');
    });

    it('should return all errors when no filters applied', () => {
      const allErrors = logger.getErrors();
      
      expect(allErrors).toHaveLength(5);
    });
  });

  describe('System Diagnostics', () => {
    it('should collect system diagnostics', async () => {
      const diagnostics = await logger.collectSystemDiagnostics();
      
      expect(diagnostics).toBeDefined();
      expect(diagnostics.system).toBeDefined();
      expect(diagnostics.system.platform).toBeTruthy();
      expect(diagnostics.system.nodeVersion).toBeTruthy();
      expect(diagnostics.system.memory).toBeDefined();
      expect(diagnostics.system.cpu).toBeDefined();
      
      expect(diagnostics.browser).toBeDefined();
      expect(diagnostics.network).toBeDefined();
      expect(diagnostics.configuration).toBeDefined();
    });

    it('should include memory and CPU information', async () => {
      const diagnostics = await logger.collectSystemDiagnostics();
      
      expect(diagnostics.system.memory.total).toBeGreaterThan(0);
      expect(diagnostics.system.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(diagnostics.system.memory.percentage).toBeLessThanOrEqual(100);
      
      expect(diagnostics.system.cpu.cores).toBeGreaterThan(0);
      expect(diagnostics.system.cpu.model).toBeTruthy();
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      logger = new ErrorLogger({
        enableFileLogging: true,
        enableConsoleLogging: false,
        logFilePath: testLogPath,
      });
    });

    it('should initialize file logging directory', () => {
      expect(mkdirSync).toHaveBeenCalled();
    });

    it('should export error log to JSON format', () => {
      logger.error('Test error for export');
      logger.reportTechnicalIssue('performance', 'medium', 'Test Issue', 'Description', [], {});
      
      const exportPath = './test-export.json';
      logger.exportErrorLog(exportPath, 'json');
      
      expect(writeFileSync).toHaveBeenCalledWith(
        exportPath,
        expect.stringContaining('"errors"')
      );
    });

    it('should export error log to CSV format', () => {
      logger.error('Test error for CSV export');
      
      const exportPath = './test-export.csv';
      logger.exportErrorLog(exportPath, 'csv');
      
      expect(writeFileSync).toHaveBeenCalledWith(
        exportPath,
        expect.stringContaining('timestamp,level,category')
      );
    });

    it('should export error log to text format', () => {
      logger.error('Test error for text export');
      
      const exportPath = './test-export.txt';
      logger.exportErrorLog(exportPath, 'txt');
      
      expect(writeFileSync).toHaveBeenCalledWith(
        exportPath,
        expect.stringContaining('[ERROR]')
      );
    });
  });

  describe('Session Management', () => {
    it('should provide session information', () => {
      logger.error('Test error');
      logger.reportTechnicalIssue('performance', 'low', 'Test Issue', 'Description', [], {});
      
      const sessionInfo = logger.getSessionInfo();
      
      expect(sessionInfo.id).toBeTruthy();
      expect(sessionInfo.startTime).toBeInstanceOf(Date);
      expect(sessionInfo.errorCount).toBe(1);
      expect(sessionInfo.issueCount).toBe(1);
    });

    it('should clear all data when requested', () => {
      logger.error('Test error');
      logger.reportTechnicalIssue('performance', 'low', 'Test Issue', 'Description', [], {});
      
      expect(logger.getErrors()).toHaveLength(1);
      expect(logger.getTechnicalIssues()).toHaveLength(1);
      
      logger.clear();
      
      expect(logger.getErrors()).toHaveLength(0);
      expect(logger.getTechnicalIssues()).toHaveLength(0);
      
      const sessionInfo = logger.getSessionInfo();
      expect(sessionInfo.errorCount).toBe(0);
      expect(sessionInfo.issueCount).toBe(0);
    });

    it('should generate unique session IDs', () => {
      const logger1 = new ErrorLogger({ enableFileLogging: false, enableConsoleLogging: false });
      const logger2 = new ErrorLogger({ enableFileLogging: false, enableConsoleLogging: false });
      
      const session1 = logger1.getSessionInfo();
      const session2 = logger2.getSessionInfo();
      
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('Console Output Configuration', () => {
    it('should not log to console when disabled', () => {
      const noConsoleLogger = new ErrorLogger({
        enableFileLogging: false,
        enableConsoleLogging: false,
      });

      noConsoleLogger.error('Test error');
      
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should log to console when enabled', () => {
      const consoleLogger = new ErrorLogger({
        enableFileLogging: false,
        enableConsoleLogging: true,
      });

      consoleLogger.error('Test error');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] unknown: Test error');
    });

    it('should include stack traces when configured', () => {
      const stackTraceLogger = new ErrorLogger({
        enableFileLogging: false,
        enableConsoleLogging: true,
        includeStackTraces: true,
      });

      const testError = new Error('Test error with stack');
      stackTraceLogger.error('Error with stack', 'system', testError);
      
      expect(consoleSpy.error).toHaveBeenCalledTimes(2); // Message + stack trace
    });

    it('should exclude stack traces when configured', () => {
      const noStackLogger = new ErrorLogger({
        enableFileLogging: false,
        enableConsoleLogging: true,
        includeStackTraces: false,
      });

      const testError = new Error('Test error without stack');
      noStackLogger.error('Error without stack', 'system', testError);
      
      expect(consoleSpy.error).toHaveBeenCalledTimes(1); // Only message
    });
  });

  describe('Automatic Technical Issue Detection', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });
    });

    it('should automatically create technical issues for timeout errors', () => {
      logger.logTimeoutError('Page timeout', 'https://example.com', 30000);
      
      // The timeout error should automatically create a technical issue
      const issues = logger.getTechnicalIssues();
      expect(issues.length).toBeGreaterThan(0);
      
      const timeoutIssue = issues.find(i => i.type === 'performance' && i.title.includes('Timeout'));
      expect(timeoutIssue).toBeDefined();
      expect(timeoutIssue?.suggestedFixes).toContain('Increase timeout values');
    });

    it('should include error context in technical issues', () => {
      logger.logTimeoutError('Page timeout', 'https://example.com', 30000);
      
      const issues = logger.getTechnicalIssues();
      const timeoutIssue = issues[0];
      
      expect(timeoutIssue.technicalDetails.category).toBe('timeout');
      expect(timeoutIssue.affectedUrls).toContain('https://example.com');
    });
  });

  describe('Error Recovery Tracking', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });
    });

    it('should track successful recovery attempts', () => {
      logger.logBrowserError('Browser crashed', new Error('crash'), undefined, 'Restarted browser');
      
      const errors = logger.getErrors();
      expect(errors[0].recovered).toBe(true);
      expect(errors[0].recoveryAction).toBe('Restarted browser');
      
      const stats = logger.getErrorStatistics();
      expect(stats.recovery.successfulRecoveries).toBe(1);
    });

    it('should track failed recovery attempts', () => {
      logger.logBrowserError('Browser crashed', new Error('crash'), undefined, 'Attempted restart');
      // Manually mark as not recovered for testing
      const errors = logger.getErrors();
      errors[0].recovered = false;
      
      const stats = logger.getErrorStatistics();
      expect(stats.recovery.totalAttempts).toBe(1);
      expect(stats.recovery.successfulRecoveries).toBe(0);
      expect(stats.recovery.recoveryRate).toBe(0);
    });
  });

  describe('Error Context and Details', () => {
    beforeEach(() => {
      logger = new ErrorLogger({ 
        enableFileLogging: false,
        enableConsoleLogging: false,
      });
    });

    it('should capture error context information', () => {
      const context = {
        userId: '12345',
        action: 'page-scan',
        metadata: { version: '1.0.0' }
      };

      logger.error('Contextual error', 'scanning', undefined, 'test-component', context);
      
      const errors = logger.getErrors();
      expect(errors[0].context).toEqual(context);
    });

    it('should handle undefined context gracefully', () => {
      logger.error('Error without context', 'system');
      
      const errors = logger.getErrors();
      expect(errors[0].context).toBeUndefined();
      expect(errors[0].source).toBe('unknown'); // Default source
    });

    it('should generate unique error IDs', () => {
      const id1 = logger.error('Error 1');
      const id2 = logger.error('Error 2');
      
      expect(id1).not.toBe(id2);
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
    });
  });
}); 