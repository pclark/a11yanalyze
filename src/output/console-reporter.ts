/**
 * Console Reporter for Accessibility Analysis
 * Provides human-readable console output with progress indicators
 */

const chalk = require('chalk');
import * as cliProgress from 'cli-progress';
import figures from 'figures';
import ora, { Ora } from 'ora';
import { ScanResult, AccessibilityIssue } from '../types';
import { CrawlSession } from '../types/crawler';
import { ScoreBreakdown, SiteScore } from '../scoring/accessibility-scorer';
import { ErrorLogger, ErrorEntry, TechnicalIssue, ErrorStatistics } from './error-logger';

/**
 * Console output configuration
 */
export interface ConsoleConfig {
  /** Enable colored output */
  colors: boolean;
  /** Show detailed progress information */
  verbose: boolean;
  /** Show debug information */
  debug: boolean;
  /** Quiet mode (minimal output) */
  quiet: boolean;
  /** Show progress bars */
  showProgress: boolean;
  /** Maximum width for output formatting */
  maxWidth: number;
  /** Show spinner animations */
  showSpinner: boolean;
}

/**
 * Progress tracking for different phases
 */
export interface ProgressState {
  /** Current phase of operation */
  phase: 'initializing' | 'crawling' | 'scanning' | 'analyzing' | 'reporting' | 'complete';
  /** Current step within phase */
  currentStep: number;
  /** Total steps in current phase */
  totalSteps: number;
  /** Overall progress percentage */
  overallProgress: number;
  /** Current operation description */
  currentOperation: string;
  /** Start time of current phase */
  phaseStartTime: Date;
}

/**
 * Comprehensive console reporter for accessibility analysis
 */
export class ConsoleReporter {
  private config: ConsoleConfig;
  private progressBars: Map<string, cliProgress.SingleBar>;
  private spinners: Map<string, Ora>;
  private progressState: ProgressState;
  private multiBar?: cliProgress.MultiBar;
  private startTime: Date;

  constructor(config: Partial<ConsoleConfig> = {}) {
    this.config = {
      colors: true,
      verbose: false,
      debug: false,
      quiet: false,
      showProgress: true,
      maxWidth: 80,
      showSpinner: true,
      ...config,
    };

    this.progressBars = new Map();
    this.spinners = new Map();
    this.startTime = new Date();
    
    this.progressState = {
      phase: 'initializing',
      currentStep: 0,
      totalSteps: 0,
      overallProgress: 0,
      currentOperation: 'Initializing...',
      phaseStartTime: new Date(),
    };

    // Color disabling is not supported in Chalk v5+ via chalk.level. Use environment variables or config instead.
  }

  /**
   * Initialize the console reporter
   */
  init(): void {
    if (this.config.quiet) return;

    this.showHeader(); // Ensure header is always logged
    this.initializeMultiBar();
  }

  /**
   * Show application header
   */
  showHeader(): void {
    if (this.config.quiet) return;
    const title = 'A11Y Analyze - Accessibility Testing Tool';
    const subtitle = 'Comprehensive WCAG 2.2 Compliance Analysis';
    const separator = '='.repeat(Math.min(title.length, this.config.maxWidth));

    console.log(chalk.bold(chalk.blue('\n' + separator)));
    console.log(chalk.bold(chalk.blue(title)));
    console.log(chalk.gray(subtitle));
    console.log(chalk.blue(separator + '\n'));
  }

  /**
   * Initialize multi-progress bar system
   */
  private initializeMultiBar(): void {
    if (!this.config.showProgress || this.config.quiet) return;

    this.multiBar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: ' {bar} | {phase} | {percentage}% | {current}/{total} | {operation}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    });
  }

  /**
   * Update current phase and operation
   */
  updatePhase(phase: ProgressState['phase'], operation: string, totalSteps?: number): void {
    this.progressState.phase = phase;
    this.progressState.currentOperation = operation;
    this.progressState.currentStep = 0;
    this.progressState.phaseStartTime = new Date();
    
    if (totalSteps !== undefined) {
      this.progressState.totalSteps = totalSteps;
    }

    if (!this.config.quiet) {
      this.showPhaseHeader(phase, operation);
    }
  }

  /**
   * Show phase header with status
   */
  private showPhaseHeader(phase: ProgressState['phase'], operation: string): void {
    const phaseIcons = {
      initializing: figures.play,
      crawling: figures.arrowRight,
      scanning: figures.pointer,
      analyzing: figures.hamburger,
      reporting: figures.tick,
      complete: figures.checkboxOn,
    };

    const phaseColors = {
      initializing: chalk.blue,
      crawling: chalk.yellow,
      scanning: chalk.magenta,
      analyzing: chalk.cyan,
      reporting: chalk.green,
      complete: chalk.green.bold,
    };

    const icon = phaseIcons[phase] || figures.bullet;
    const colorFn = phaseColors[phase] || chalk.white;
    const phaseText = phase.charAt(0).toUpperCase() + phase.slice(1);

    console.log(colorFn(`\n${icon} ${phaseText}: ${operation}`));
  }

  /**
   * Create or update a progress bar
   */
  createProgressBar(id: string, label: string, total: number): void {
    if (!this.config.showProgress || this.config.quiet) return;

    if (this.multiBar) {
      const bar = this.multiBar.create(total, 0, {
        phase: label,
        operation: 'Starting...',
      });
      this.progressBars.set(id, bar);
    }
  }

  /**
   * Update progress bar
   */
  updateProgress(id: string, current: number, operation?: string): void {
    if (!this.config.showProgress || this.config.quiet) return;

    const bar = this.progressBars.get(id);
    if (bar) {
      bar.update(current, { operation: operation || 'Processing...' });
    }
  }

  /**
   * Complete a progress bar
   */
  completeProgress(id: string, finalMessage?: string): void {
    if (!this.config.showProgress || this.config.quiet) return;

    const bar = this.progressBars.get(id);
    if (bar) {
      bar.update(bar.getTotal(), { operation: finalMessage || 'Complete' });
    }
  }

  /**
   * Create a spinner for indefinite operations
   */
  createSpinner(id: string, text: string): void {
    if (!this.config.showSpinner || this.config.quiet) return;

    const spinner = ora({
      text,
      color: 'blue',
      spinner: 'dots',
    }).start();
    
    this.spinners.set(id, spinner);
  }

  /**
   * Update spinner text
   */
  updateSpinner(id: string, text: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = text;
    }
  }

  /**
   * Complete spinner with success
   */
  succeedSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.succeed(text);
      this.spinners.delete(id);
    }
  }

  /**
   * Complete spinner with failure
   */
  failSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.fail(text);
      this.spinners.delete(id);
    }
  }

  /**
   * Log crawling progress
   */
  logCrawlProgress(session: CrawlSession): void {
    if (this.config.quiet) return;

    const stats = session.stats;
    const elapsed = Date.now() - session.startTime.getTime();
    const elapsedSeconds = Math.floor(elapsed / 1000);

    if (this.config.verbose) {
      console.log(chalk.gray(
        `  URLs: ${stats.urlCounts.completed}/${stats.urlCounts.total} | ` +
        `Pages: ${stats.pagesScanned} | ` +
        `Time: ${this.formatDuration(elapsedSeconds)} | ` +
        `Rate: ${stats.performance.pagesPerMinute.toFixed(1)} pages/min`
      ));
    }
  }

  /**
   * Log scanning progress for a page
   */
  logPageScanStart(url: string, pageNumber: number, totalPages: number): void {
    if (this.config.quiet) return;

    if (this.config.verbose) {
      console.log(chalk.gray(`  [${pageNumber}/${totalPages}] Scanning: ${url}`));
    }
  }

  /**
   * Log scanning completion for a page
   */
  logPageScanComplete(url: string, scanResult: ScanResult): void {
    if (this.config.quiet) return;

    const scoreColor = this.getScoreColor(scanResult.score);
    const issueCount = scanResult.issues.length;
    const criticalIssues = scanResult.issues.filter(i => i.severity === 'critical').length;
    
    let status = `${scoreColor(scanResult.score.toFixed(1))}`;
    
    if (issueCount > 0) {
      status += ` (${issueCount} issues`;
      if (criticalIssues > 0) {
        status += `, ${chalk.red(criticalIssues + ' critical')}`;
      }
      status += ')';
    }

    if (this.config.verbose) {
      console.log(chalk.gray(`    ✓ Score: ${status}`));
    }
  }

  /**
   * Display page scan results summary
   */
  showPageResults(scanResult: ScanResult, scoreBreakdown?: ScoreBreakdown): void {
    if (this.config.quiet) return;
    const url = scanResult.url;
    const score = scanResult.score;
    const issues = scanResult.issues;

    console.log(chalk.bold(`\n📄 Page Results: ${url}`));
    console.log('═'.repeat(Math.min(url.length + 15, this.config.maxWidth)));

    // Score display
    const scoreColor = this.getScoreColor(score);
    console.log(`${chalk.bold('Score:')} ${scoreColor(score.toFixed(1))}/100`);

    // Score breakdown if available
    if (scoreBreakdown && this.config.verbose) {
      this.showScoreBreakdown(scoreBreakdown);
    }

    // Issues summary
    if (issues.length > 0) {
      this.showIssuesSummary(issues);
    } else {
      console.log(chalk.green(`${figures.tick} No accessibility issues found!`));
    }

    // Performance metrics
    if (scanResult.metadata) {
      this.showPerformanceMetrics(scanResult.metadata);
    }
  }

  /**
   * Display detailed score breakdown
   */
  private showScoreBreakdown(breakdown: ScoreBreakdown): void {
    console.log(chalk.bold('\n📊 Score Breakdown:'));
    
    console.log(`  Base Score: ${breakdown.baseScore}`);
    
    if (breakdown.issueDeductions.length > 0) {
      const totalDeductions = breakdown.issueDeductions.reduce((sum, d) => sum + d.pointsDeducted, 0);
      console.log(`  Issue Deductions: ${chalk.red('-' + totalDeductions.toFixed(1))}`);
    }
    
    if (breakdown.bonuses.length > 0) {
      const totalBonuses = breakdown.bonuses.reduce((sum, b) => sum + b.points, 0);
      console.log(`  Bonuses: ${chalk.green('+' + totalBonuses.toFixed(1))}`);
      
      if (this.config.verbose) {
        breakdown.bonuses.forEach(bonus => {
          console.log(chalk.gray(`    • ${bonus.description}: +${bonus.points}`));
        });
      }
    }
    
    if (breakdown.penalties.length > 0) {
      const totalPenalties = breakdown.penalties.reduce((sum, p) => sum + p.points, 0);
      console.log(`  Penalties: ${chalk.red('-' + totalPenalties.toFixed(1))}`);
      
      if (this.config.verbose) {
        breakdown.penalties.forEach(penalty => {
          console.log(chalk.gray(`    • ${penalty.description}: -${penalty.points}`));
        });
      }
    }
    
    console.log(`  ${chalk.bold('Final Score:')} ${this.getScoreColor(breakdown.finalScore)(breakdown.finalScore.toFixed(1))}`);
  }

  /**
   * Display issues summary
   */
  private showIssuesSummary(issues: AccessibilityIssue[]): void {
    const severityCounts = issues.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    console.log(chalk.bold(`\n⚠️  Issues Found (${issues.length} total):`));

    const severityOrder = ['critical', 'serious', 'moderate', 'minor', 'warning'];
    const severityColors: Record<string, (text: string) => string> = {
      critical: this.getColorFn(chalk.red),
      serious: this.getColorFn(chalk.yellow),
      moderate: this.getColorFn(chalk.magenta),
      minor: this.getColorFn(chalk.cyan),
    };

    severityOrder.forEach(severity => {
      const count = severityCounts[severity];
      if (count) {
        const colorFn = severityColors[severity] || ((t: string) => t);
        console.log(`  ${colorFn(severity.padEnd(8))}: ${count}`);
      }
    });

    // Show top issues if verbose
    if (this.config.verbose && issues.length > 0) {
      console.log(chalk.bold('\n🔍 Top Issues:'));
      issues.slice(0, 5).forEach((issue, index) => {
        const severityIcon = this.getSeverityIcon(issue.severity);
        console.log(`  ${index + 1}. ${severityIcon} ${issue.wcagReference} - ${issue.message}`);
      });
    }
  }

  /**
   * Display performance metrics
   */
  private showPerformanceMetrics(metadata: any): void {
    if (!this.config.verbose) return;

    console.log(chalk.bold('\n⚡ Performance:'));
    
    if (metadata.pageLoadTime) {
      const loadTime = metadata.pageLoadTime;
      const loadColor = loadTime < 2000 ? chalk.green : loadTime < 5000 ? chalk.yellow : chalk.red;
      console.log(`  Page Load: ${loadColor(loadTime + 'ms')}`);
    }
    
    if (metadata.scanDuration) {
      console.log(`  Scan Duration: ${metadata.scanDuration}ms`);
    }
    
    if (metadata.totalElements && metadata.testedElements) {
      const coverage = (metadata.testedElements / metadata.totalElements) * 100;
      const coverageColor = coverage > 95 ? chalk.green : coverage > 80 ? chalk.yellow : chalk.red;
      console.log(`  Test Coverage: ${coverageColor(coverage.toFixed(1) + '%')} (${metadata.testedElements}/${metadata.totalElements} elements)`);
    }
  }

  /**
   * Display site-wide results summary
   */
  showSiteResults(siteScore: SiteScore, crawlSession: CrawlSession): void {
    if (this.config.quiet) return;
    console.log(chalk.bold('\n🌐 Site-Wide Results'));
    console.log('═'.repeat(Math.min(20, this.config.maxWidth)));

    // Overall score
    const scoreColor = this.getScoreColor(siteScore.overallScore);
    console.log(`${chalk.bold('Overall Score:')} ${scoreColor(siteScore.overallScore.toFixed(1))}/100`);
    console.log(`Aggregation Method: ${siteScore.aggregationMethod}`);

    // Site statistics
    console.log(chalk.bold('\n📊 Site Statistics:'));
    console.log(`  Pages Scanned: ${siteScore.pageScores.length}`);
    console.log(`  Total Issues: ${crawlSession.stats.totalIssues}`);
    console.log(`  Average Score: ${siteScore.distribution.average.toFixed(1)}`);
    console.log(`  Score Range: ${siteScore.distribution.minimum.toFixed(1)} - ${siteScore.distribution.maximum.toFixed(1)}`);

    // Score distribution
    this.showScoreDistribution(siteScore.distribution);

    // Consistency metrics
    if (this.config.verbose) {
      this.showConsistencyMetrics(siteScore.consistency);
    }

    // Page scores summary
    if (this.config.verbose) {
      this.showPageScoresSummary(siteScore.pageScores);
    }

    // Site-wide bonuses
    if (siteScore.siteWideBonuses.length > 0) {
      console.log(chalk.bold('\n🎁 Site-Wide Bonuses:'));
      siteScore.siteWideBonuses.forEach(bonus => {
        console.log(`  ${chalk.green('+')} ${bonus.description}: +${bonus.points} points`);
      });
    }
  }

  /**
   * Display score distribution
   */
  private showScoreDistribution(distribution: any): void {
    console.log(chalk.bold('\n📈 Score Distribution:'));
    
    const ranges = [
      { name: 'Excellent', min: 90, count: distribution.ranges.excellent, color: chalk.green },
      { name: 'Good', min: 80, count: distribution.ranges.good, color: chalk.blue },
      { name: 'Fair', min: 70, count: distribution.ranges.fair, color: chalk.yellow },
      { name: 'Poor', min: 60, count: distribution.ranges.poor, color: chalk.hex('#FFA500') },
      { name: 'Critical', min: 0, count: distribution.ranges.critical, color: chalk.red },
    ];

    ranges.forEach(range => {
      if (range.count > 0) {
        const totalPages = distribution.ranges.excellent + distribution.ranges.good + 
                          distribution.ranges.fair + distribution.ranges.poor + distribution.ranges.critical;
        const percentage = range.count > 0 ? (range.count / totalPages) * 100 : 0;
        console.log(`  ${range.color(range.name.padEnd(9))}: ${range.count} pages (${percentage.toFixed(1)}%)`);
      }
    });
  }

  /**
   * Display consistency metrics
   */
  private showConsistencyMetrics(consistency: any): void {
    console.log(chalk.bold('\n🎯 Consistency Analysis:'));
    console.log(`  Consistency Score: ${consistency.consistencyScore.toFixed(1)}/100`);
    console.log(`  Score Variance: ${consistency.scoreVariance.toFixed(1)}`);

    if (consistency.outlierPages.length > 0) {
      console.log(`  Outlier Pages: ${consistency.outlierPages.length}`);
      if (this.config.verbose) {
        consistency.outlierPages.slice(0, 3).forEach((url: string) => {
          console.log(chalk.gray(`    • ${url}`));
        });
      }
    }

    if (consistency.commonIssues.length > 0) {
      console.log(`  Common Issues: ${consistency.commonIssues.slice(0, 3).join(', ')}`);
    }
  }

  /**
   * Display page scores summary
   */
  private showPageScoresSummary(pageScores: any[]): void {
    console.log(chalk.bold('\n📄 Page Scores Summary:'));
    
    // Sort by score (lowest first to highlight issues)
    const sortedPages = [...pageScores].sort((a, b) => a.score - b.score);
    
    sortedPages.slice(0, 10).forEach((page, index) => {
      const scoreColor = this.getScoreColor(page.score);
      const importanceIcon = this.getImportanceIcon(page.importance);
      console.log(`  ${importanceIcon} ${scoreColor(page.score.toFixed(1))} - ${page.url}`);
    });

    if (pageScores.length > 10) {
      console.log(chalk.gray(`  ... and ${pageScores.length - 10} more pages`));
    }
  }

  /**
   * Display final summary
   */
  showFinalSummary(siteScore: SiteScore, crawlSession: CrawlSession): void {
    if (this.config.quiet) return;
    const duration = Date.now() - this.startTime.getTime();
    const pagesScanned = siteScore.pageScores.length;
    const totalIssues = crawlSession.stats.totalIssues;
    const criticalIssues = crawlSession.stats.issuesBySeverity.critical;

    console.log(chalk.bold('\n🎉 Accessibility Analysis Complete!'));
    console.log('═'.repeat(Math.min(35, this.config.maxWidth)));

    console.log(`${chalk.bold('Overall Score:')} ${this.getScoreColor(siteScore.overallScore)(siteScore.overallScore.toFixed(1))}/100`);
    console.log(`Pages Analyzed: ${pagesScanned}`);
    console.log(`Total Issues: ${totalIssues} (${criticalIssues} critical)`);
    console.log(`Analysis Time: ${this.formatDuration(Math.floor(duration / 1000))}`);

    // Compliance status
    const complianceRate = crawlSession.stats.wcagCompliance.complianceRate * 100;
    const complianceColor = complianceRate > 80 ? chalk.green : complianceRate > 60 ? chalk.yellow : chalk.red;
    console.log(`WCAG Compliance: ${complianceColor(complianceRate.toFixed(1) + '%')}`);

    // Next steps recommendation
    this.showRecommendations(siteScore, crawlSession);
  }

  /**
   * Show recommendations based on results
   */
  private showRecommendations(siteScore: SiteScore, crawlSession: CrawlSession): void {
    console.log(chalk.bold('\n💡 Recommendations:'));

    if (siteScore.overallScore >= 90) {
      console.log(chalk.green('  ✓ Excellent accessibility! Consider periodic monitoring.'));
    } else if (siteScore.overallScore >= 70) {
      console.log(chalk.yellow('  → Focus on critical and serious issues first.'));
    } else {
      console.log(chalk.red('  ⚠ Significant accessibility issues require immediate attention.'));
    }

    if (crawlSession.stats.issuesBySeverity.critical > 0) {
      console.log(chalk.red(`  ⚠ ${crawlSession.stats.issuesBySeverity.critical} critical issues need immediate fixing.`));
    }

    if (siteScore.consistency.consistencyScore < 70) {
      console.log(chalk.yellow('  → Inconsistent accessibility across pages. Review templates and components.'));
    }

    console.log(chalk.gray('\n  Use --verbose for detailed issue analysis.'));
    console.log(chalk.gray('  Generate JSON report with --output for developer review.'));
  }

  /**
   * Log errors and warnings
   */
  logWarning(message: string): void {
    if (!this.config.quiet) {
      console.warn(message);
    }
  }
  logError(message: string, error?: Error): void {
    if (!this.config.quiet) {
      console.error(message);
      if (error) {
        console.error(error.stack);
      }
    }
  }
  logPass(message: string): void {
    if (!this.config.quiet) {
      console.log(chalk.green(`✔ Pass: ${message}`));
    }
  }
  logInfo(message: string): void {
    if (!this.config.quiet) {
      if (this.config && this.config.verbose) {
        console.log(message);
      }
    }
  }
  logSummary(summary: string[]): void {
    if (!this.config.quiet) {
      console.log(chalk.cyan('════════════════════════════════════════════════════'));
      for (const line of summary) {
        console.log(chalk.cyan(line));
      }
      console.log(chalk.cyan('════════════════════════════════════════════════════'));
    }
  }

  /**
   * Display error summary from error logger
   */
  showErrorSummary(errorLogger: ErrorLogger): void {
    if (this.config.quiet) return;

    const stats = errorLogger.getErrorStatistics();
    const totalErrors = Object.values(stats.byLevel).reduce((sum, count) => sum + count, 0);

    if (totalErrors === 0) {
      console.log(chalk.green(`\n${figures.tick} No errors encountered during analysis`));
      return;
    }

    console.log(chalk.bold('\n🚨 Error Summary'));
    console.log('═'.repeat(Math.min(15, this.config.maxWidth)));

    // Error counts by level
    console.log(`Total Errors: ${totalErrors}`);
    
    if (stats.byLevel.fatal > 0) {
      console.log(`  ${chalk.red.bold('Fatal')}: ${stats.byLevel.fatal}`);
    }
    if (stats.byLevel.error > 0) {
      console.log(`  ${chalk.red('Error')}: ${stats.byLevel.error}`);
    }
    if (stats.byLevel.warn > 0) {
      console.log(`  ${chalk.yellow('Warning')}: ${stats.byLevel.warn}`);
    }
    if (stats.byLevel.info > 0 && this.config.verbose) {
      console.log(`  ${chalk.blue('Info')}: ${stats.byLevel.info}`);
    }
    if (stats.byLevel.debug > 0 && this.config.debug) {
      console.log(`  ${chalk.gray('Debug')}: ${stats.byLevel.debug}`);
    }

    // Recovery statistics
    if (stats.recovery.totalAttempts > 0) {
      const recoveryRate = Math.round(stats.recovery.recoveryRate * 100);
      const recoveryColor = recoveryRate > 80 ? chalk.green : recoveryRate > 50 ? chalk.yellow : chalk.red;
      console.log(`Recovery Rate: ${recoveryColor(recoveryRate + '%')} (${stats.recovery.successfulRecoveries}/${stats.recovery.totalAttempts})`);
    }

    // Most frequent errors
    if (this.config.verbose && stats.frequentErrors.length > 0) {
      console.log(chalk.bold('\n🔍 Most Frequent Errors:'));
      stats.frequentErrors.slice(0, 5).forEach((error, index) => {
        const levelColor = this.getErrorLevelColor(error.level);
        console.log(`  ${index + 1}. ${levelColor(error.level.toUpperCase())}: ${error.message} (${error.count}x)`);
      });
    }
  }

  /**
   * Display detailed error entries
   */
  showDetailedErrors(errorLogger: ErrorLogger, maxErrors: number = 10): void {
    if (this.config.quiet) return;

    const errors = errorLogger.getErrors().slice(-maxErrors); // Show recent errors
    
    if (errors.length === 0) return;

    console.log(chalk.bold('\n📋 Recent Errors'));
    console.log('═'.repeat(Math.min(15, this.config.maxWidth)));

    errors.forEach((error, index) => {
      const levelColor = this.getErrorLevelColor(error.level);
      const categoryIcon = this.getErrorCategoryIcon(error.category);
      
      console.log(`${index + 1}. ${categoryIcon} ${levelColor(error.level.toUpperCase())} [${error.category}]`);
      console.log(`   ${error.message}`);
      
      if (error.url) {
        console.log(chalk.gray(`   URL: ${error.url}`));
      }
      
      if (error.source !== 'unknown') {
        console.log(chalk.gray(`   Source: ${error.source}`));
      }
      
      if (error.recoveryAction) {
        const recoveryColor = error.recovered ? chalk.green : chalk.yellow;
        console.log(recoveryColor(`   Recovery: ${error.recoveryAction}`));
      }
      
      if (this.config.debug && error.stack) {
        console.log(chalk.gray(`   Stack: ${error.stack.split('\n')[0]}`));
      }
      
      console.log(''); // Add spacing
    });
  }

  /**
   * Display technical issues
   */
  showTechnicalIssues(errorLogger: ErrorLogger): void {
    if (this.config.quiet) return;

    const issues = errorLogger.getTechnicalIssues();
    
    if (issues.length === 0) return;

    console.log(chalk.bold('\n🔧 Technical Issues Detected'));
    console.log('═'.repeat(Math.min(30, this.config.maxWidth)));

    issues.forEach((issue, index) => {
      const severityColor = this.getTechnicalIssueSeverityColor(issue.severity);
      const typeIcon = this.getTechnicalIssueTypeIcon(issue.type);
      
      console.log(`${index + 1}. ${typeIcon} ${severityColor(issue.severity.toUpperCase())} - ${issue.title}`);
      console.log(`   ${issue.description}`);
      
      if (issue.affectedUrls.length > 0) {
        const urlsToShow = issue.affectedUrls.slice(0, 3);
        console.log(chalk.gray(`   Affected URLs: ${urlsToShow.join(', ')}`));
        if (issue.affectedUrls.length > 3) {
          console.log(chalk.gray(`   ... and ${issue.affectedUrls.length - 3} more`));
        }
      }
      
      if (issue.occurrenceCount > 1) {
        console.log(chalk.gray(`   Occurrences: ${issue.occurrenceCount}`));
      }
      
      if (this.config.verbose && issue.suggestedFixes.length > 0) {
        console.log(chalk.bold('   💡 Suggested Fixes:'));
        issue.suggestedFixes.slice(0, 3).forEach(fix => {
          console.log(chalk.gray(`     • ${fix}`));
        });
      }
      
      console.log(''); // Add spacing
    });
  }

  /**
   * Display system diagnostics information
   */
  async showSystemDiagnostics(errorLogger: ErrorLogger): Promise<void> {
    if (this.config.quiet || !this.config.debug) return;

    try {
      const diagnostics = await errorLogger.collectSystemDiagnostics();
      
      console.log(chalk.bold('\n🖥️  System Diagnostics'));
      console.log('═'.repeat(Math.min(20, this.config.maxWidth)));
      
      // System information
      console.log(chalk.bold('System:'));
      console.log(`  Platform: ${diagnostics.system.platform} (${diagnostics.system.arch})`);
      console.log(`  Node.js: ${diagnostics.system.nodeVersion}`);
      console.log(`  Memory: ${Math.round(diagnostics.system.memory.percentage)}% used (${Math.round(diagnostics.system.memory.used / 1024 / 1024)}MB / ${Math.round(diagnostics.system.memory.total / 1024 / 1024)}MB)`);
      console.log(`  CPU: ${diagnostics.system.cpu.model} (${diagnostics.system.cpu.cores} cores)`);
      
      // Browser information
      console.log(chalk.bold('\nBrowser:'));
      console.log(`  Engine: ${diagnostics.browser.name} ${diagnostics.browser.version}`);
      console.log(`  User Agent: ${diagnostics.browser.userAgent}`);
      
      // Network information
      console.log(chalk.bold('\nNetwork:'));
      const connectivityColor = diagnostics.network.connectivity === 'online' ? chalk.green : chalk.red;
      console.log(`  Connectivity: ${connectivityColor(diagnostics.network.connectivity)}`);
      console.log(`  DNS Resolution: ${diagnostics.network.dnsResolution ? chalk.green('OK') : chalk.red('Failed')}`);
      
    } catch (error) {
      console.log(chalk.red('Failed to collect system diagnostics'));
    }
  }

  /**
   * Show comprehensive error report
   */
  showErrorReport(errorLogger: ErrorLogger): void {
    if (this.config.quiet) return;

    this.showErrorSummary(errorLogger);
    
    if (this.config.verbose) {
      this.showTechnicalIssues(errorLogger);
      this.showDetailedErrors(errorLogger, 5);
    }
  }

  /**
   * Helper methods for error display
   */
  
  private getErrorLevelColor(level: string): typeof chalk {
    switch (level) {
      case 'fatal': return chalk.red.bold;
      case 'error': return chalk.red;
      case 'warn': return chalk.yellow;
      case 'info': return chalk.blue;
      case 'debug': return chalk.gray;
      default: return chalk.white;
    }
  }

  private getErrorCategoryIcon(category: string): string {
    const icons = {
      browser: '🌐',
      network: '📡',
      parsing: '📝',
      timeout: '⏱️',
      validation: '✅',
      configuration: '⚙️',
      scanning: '🔍',
      crawling: '🕷️',
      output: '📄',
      system: '💻',
      unknown: '❓',
    };
    return icons[category as keyof typeof icons] || '❓';
  }

  private getTechnicalIssueSeverityColor(severity: string): typeof chalk {
    switch (severity) {
      case 'critical': return chalk.red.bold;
      case 'high': return chalk.red;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.blue;
      default: return chalk.white;
    }
  }

  private getTechnicalIssueTypeIcon(type: string): string {
    const icons = {
      performance: '⚡',
      compatibility: '🔄',
      resource: '📦',
      security: '🔒',
      accessibility: '♿',
      other: '🔧',
    };
    return icons[type as keyof typeof icons] || '🔧';
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Stop all spinners
    this.spinners.forEach(spinner => spinner.stop());
    this.spinners.clear();

    // Stop multi-bar
    if (this.multiBar) {
      this.multiBar.stop();
    }

    // Clear progress bars
    this.progressBars.clear();
  }

  /**
   * Helper methods
   */

  // Fix getScoreColor to always return a function
  private getScoreColor(score: number): (text: string) => string {
    if (score >= 90) return chalk.green;
    if (score >= 70) return chalk.yellow;
    if (score >= 50) return chalk.magenta;
    return chalk.red;
  }

  // Helper to get color function or identity if colors are disabled
  private getColorFn(colorFn: (text: string) => string): (text: string) => string {
    if (this.config && this.config.colors === false) {
      return (text: string) => text;
    }
    return colorFn;
  }

  // Fix getSeverityColor to always return a function
  private getSeverityColor(severity: string): (text: string) => string {
    switch (severity) {
      case 'critical': return chalk.red;
      case 'serious': return chalk.yellow;
      case 'moderate': return chalk.magenta;
      case 'minor': return chalk.cyan;
      default: return chalk.white;
    }
  }

  private getSeverityIcon(severity: string): string {
    const icons = {
      critical: chalk.red(figures.cross),
      serious: chalk.red(figures.warning),
      moderate: chalk.yellow(figures.warning),
      minor: chalk.blue(figures.info),
      warning: chalk.gray(figures.bullet),
    };
    return icons[severity as keyof typeof icons] || figures.bullet;
  }

  private getImportanceIcon(importance: string): string {
    const icons = {
      critical: chalk.red(figures.star),
      high: chalk.yellow(figures.star),
      medium: chalk.blue(figures.circle),
      low: chalk.gray(figures.circle),
    };
    return icons[importance as keyof typeof icons] || figures.circle;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Static factory methods
   */

  static createDefault(): ConsoleReporter {
    return new ConsoleReporter();
  }

  static createVerbose(): ConsoleReporter {
    return new ConsoleReporter({ verbose: true });
  }

  static createQuiet(): ConsoleReporter {
    return new ConsoleReporter({ quiet: true, showProgress: false, showSpinner: false });
  }

  static createDebug(): ConsoleReporter {
    return new ConsoleReporter({ verbose: true, debug: true });
  }
} 