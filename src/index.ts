#!/usr/bin/env node

/**
 * A11Y Analyze - Comprehensive WCAG 2.2 Accessibility Testing Tool
 * Command-line interface for accessibility analysis and reporting
 */

import { program } from 'commander';
import { version } from '../package.json';
import { PageScanner } from './scanner/page-scanner';
import { JsonReporter } from './output/json-reporter';
import { ConsoleReporter } from './output/console-reporter';
import { ErrorLogger } from './output/error-logger';
import { AccessibilityScorer } from './scoring/accessibility-scorer';
import { IssueProcessor } from './output/issue-processor';
import { HelpManager, HelpCategory } from './cli/help-manager';
import { UrlValidator, UrlErrorFormatter } from './cli/url-validator';
import { WCAGLevel } from './types/wcag';
import { ScanOptions } from './types';
import { existsSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { VpatReporter } from './output/vpat-reporter';
import { StorybookBatchRunner } from './integrations/storybook-batch';
import { HtmlBatchRunner } from './integrations/html-batch';
import { runManualGuide } from './manual/manual-guide';
import { simulateKeyboardNavigation } from './scanner/page-scanner';
import { simulateScreenReader } from './scanner/page-scanner';
import { generateChecklist } from './manual/checklist-generator';

// Global error logger for CLI operations
const errorLogger = ErrorLogger.createDefault();

/**
 * CLI Options for scanning
 */
interface CliScanOptions {
  output?: string;
  format?: 'json' | 'console' | 'both' | 'vpat2';
  wcagLevel?: WCAGLevel;
  includeAaa?: boolean;
  includeAria?: boolean;
  timeout?: string;
  viewport?: string;
  screenshot?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;
  profile?: string;
  minSeverity?: string;
  exportErrors?: string;
  keyboardNav?: boolean;
  screenReaderSim?: boolean;
  pageReadyTimeout?: string;
}

/**
 * CLI Options for crawling
 */
interface CliCrawlOptions extends CliScanOptions {
  depth?: string;
  maxPages?: string;
  concurrency?: string;
  delay?: string;
  allowedDomains?: string;
  excludePaths?: string;
  includePaths?: string;
  respectRobots?: boolean;
  sitemap?: boolean;
}

/**
 * Main CLI application class
 */
class A11yAnalyzeCLI {
  private consoleReporter: ConsoleReporter;
  private jsonReporter: JsonReporter;
  private scorer: AccessibilityScorer;
  private urlValidator: UrlValidator;

  constructor() {
    this.jsonReporter = new JsonReporter();
    this.scorer = new AccessibilityScorer(); // Uses balanced profile by default
    this.urlValidator = new UrlValidator(); // Use default validation settings
    
    // Console reporter will be initialized based on CLI options
    this.consoleReporter = ConsoleReporter.createDefault();
  }

  /**
   * Initialize CLI with proper configuration
   */
  private initializeReporters(options: CliScanOptions): void {
    // Configure console reporter based on options
    if (options.verbose) {
      this.consoleReporter = ConsoleReporter.createVerbose();
    } else if (options.quiet) {
      this.consoleReporter = ConsoleReporter.createQuiet();
    } else if (options.debug) {
      this.consoleReporter = ConsoleReporter.createDebug();
    } else {
      this.consoleReporter = ConsoleReporter.createDefault();
    }

    // Configure scorer profile
    if (options.profile) {
      try {
        this.scorer = AccessibilityScorer.withProfile(options.profile as any);
      } catch (error) {
        errorLogger.error('Invalid scoring profile', 'configuration', error as Error, 'cli');
        this.consoleReporter.logError('Invalid scoring profile. Using default.');
      }
    }
  }

  /**
   * Parse CLI viewport option
   */
  private parseViewport(viewport?: string): { width: number; height: number } {
    if (!viewport) return { width: 1280, height: 720 };
    
    const match = viewport.match(/^(\d+)x(\d+)$/);
    if (!match) {
      errorLogger.warn('Invalid viewport format, using default', 'validation', 'cli');
      return { width: 1280, height: 720 };
    }
    
    return {
      width: parseInt(match[1] || '1280', 10),
      height: parseInt(match[2] || '720', 10),
    };
  }

  /**
   * Create scan options from CLI arguments
   */
  private createScanOptions(options: CliScanOptions): Partial<ScanOptions> {
          return {
        wcagLevel: (options.wcagLevel as WCAGLevel) || 'AA',
        includeAAA: options.includeAaa || false,
        includeARIA: options.includeAria || true,
        includeWarnings: true,
        timeout: parseInt(options.timeout || '30000', 10),
        screenshot: options.screenshot || false,
      };
  }

  /**
   * Handle single page scanning
   */
  async scanPage(url: string, options: CliScanOptions & { loginUrl?: string; username?: string; password?: string }): Promise<void> {
    try {
      this.initializeReporters(options);
      this.consoleReporter.init();
      
      errorLogger.info('Starting page scan', 'cli', { url, options });
      
      // Comprehensive URL validation
      const validationResult = await this.urlValidator.validate(url);
      if (!validationResult.isValid) {
        console.error(UrlErrorFormatter.formatError(validationResult));
        throw new Error(`Invalid URL: ${url}`);
      }

      // Show warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.log(UrlErrorFormatter.formatWarnings(validationResult));
      }

      // Use the normalized URL for scanning
      const normalizedUrl = validationResult.normalizedUrl!;

      this.consoleReporter.updatePhase('initializing', 'Preparing browser and scanner');

      // Create scanner components
      const browserConfig = {
        headless: true,
        viewport: this.parseViewport(options.viewport),
        timeout: parseInt(options.timeout || '30000', 10),
      };
      
      const ruleEngineConfig = {
        wcagLevel: (options.wcagLevel as any) || 'AA',
        includeAAA: options.includeAaa || false,
        includeARIA: options.includeAria || true,
        customRules: [],
        disabledRules: [],
      };

      const pageScanner = new PageScanner(browserConfig, ruleEngineConfig);
      // Parse CLI options
      const scanOptions = this.createScanOptions(options);
      // Add support for pageReadyTimeout from CLI/config
      scanOptions.pageReadyTimeout = options.pageReadyTimeout ? parseInt(options.pageReadyTimeout, 10) : 10000;

      // --- Authenticated login flow ---
      let loginContext = null;
      if (options.loginUrl && options.username && options.password) {
        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(options.loginUrl, { timeout: browserConfig.timeout });
        // Try common selectors for username and password fields
        const usernameSelector = 'input[name="username"], input[type="email"], input[type="text"]';
        const passwordSelector = 'input[name="password"], input[type="password"]';
        await page.fill(usernameSelector, options.username);
        await page.fill(passwordSelector, options.password);
        // Try to submit the form
        await Promise.all([
          page.waitForNavigation({ timeout: browserConfig.timeout }),
          page.keyboard.press('Enter'),
        ]);
        // Save storage state (cookies, localStorage)
        const storageState = await context.storageState();
        await browser.close();
        loginContext = storageState;
      }
      // If login was performed, pass storageState to PageScanner
      if (loginContext) {
        await pageScanner.setStorageState(loginContext);
      }
      // --- End login flow ---

      this.consoleReporter.updatePhase('scanning', 'Analyzing page accessibility');
      this.consoleReporter.logPageScanStart(normalizedUrl, 1, 1);

      // Initialize and perform scan
      await pageScanner.initialize();
      // Run the scan and get results
      const scanResult = await pageScanner.scan(normalizedUrl, scanOptions);

      // Use keyboardNavigation and screenReaderSimulation from scanResult
      // (No need to call simulateKeyboardNavigation or simulateScreenReader here)
      this.consoleReporter.logPageScanComplete(normalizedUrl, scanResult);
      this.consoleReporter.updatePhase('analyzing', 'Processing results and generating scores');

      // Calculate score
      const scoreBreakdown = this.scorer.calculatePageScore(scanResult);

      this.consoleReporter.updatePhase('reporting', 'Generating reports');

      // Display results
      if (options.format !== 'json') {
        this.consoleReporter.showPageResults(scanResult, scoreBreakdown);
        this.consoleReporter.showErrorReport(errorLogger);
      }

      // Display keyboard navigation summary
      if (scanResult.keyboardNavigation) {
        const kbd = scanResult.keyboardNavigation;
        this.consoleReporter.logInfo(`Keyboard Navigation: ${kbd.issues.length} issues, ${kbd.unreachableElements.length} unreachable, ${kbd.focusTraps.length} traps, ${kbd.missingFocusIndicators.length} missing indicators.`);
        if (kbd.issues.length > 0) {
          kbd.issues.forEach(issue => this.consoleReporter.logWarning(issue));
        }
      }

      // Display screen reader simulation summary
      if (scanResult.screenReaderSimulation) {
        const sr = scanResult.screenReaderSimulation;
        this.consoleReporter.logInfo(`Screen Reader Simulation: ${sr.summary.length} findings, ${sr.missingNames.length} missing names, ${sr.ambiguousRoles.length} ambiguous roles, ${sr.skippedElements.length} skipped elements.`);
        if (sr.summary.length > 0) {
          sr.summary.forEach(issue => this.consoleReporter.logWarning(issue));
        }
      }

      // Print summary and grouped warnings
      if (scanResult.summary) {
        this.consoleReporter.logInfo(scanResult.summary.join(' | '));
      }
      if (scanResult.groupedWarnings) {
        for (const [message, elements] of Object.entries(scanResult.groupedWarnings)) {
          this.consoleReporter.logWarning(`${message} (${elements.length} occurrences)`);
          // Add remediation tip for common warnings
          if (message.includes('not reachable by Tab')) {
            this.consoleReporter.logInfo('Remediation: Ensure the element is focusable and included in the tab order.');
          } else if (message.includes('ambiguous or missing role')) {
            this.consoleReporter.logInfo('Remediation: Add appropriate ARIA roles or use semantic HTML.');
          } else if (message.includes('missing accessible name')) {
            this.consoleReporter.logInfo('Remediation: Provide a descriptive accessible name using aria-label, aria-labelledby, or alt attributes.');
          }
        }
      }

      // VPAT/Section 508 reporting integration
      if (options.format === 'vpat2') {
        // Use the final URL as the component/page name for now
        const componentName = (scanResult.metadata && scanResult.metadata.url && scanResult.metadata.url.final) || scanResult.url || 'Component';
        const vpatReport = VpatReporter.generateJsonReport(componentName, scanResult);
        if (options.output && options.output.endsWith('.md')) {
          const md = VpatReporter.generateMarkdownReport(vpatReport);
          require('fs').writeFileSync(options.output, md, 'utf8');
          this.consoleReporter.logInfo(`VPAT Markdown report saved to ${options.output}`);
        } else {
          require('fs').writeFileSync(options.output || 'vpat-report.json', JSON.stringify(vpatReport, null, 2), 'utf8');
          this.consoleReporter.logInfo(`VPAT JSON report saved to ${options.output || 'vpat-report.json'}`);
        }
        return;
      }

      // Generate JSON report if requested
      if (options.format === 'json' || options.format === 'both' || options.output) {
        const report = await this.jsonReporter.generatePageReport(scanResult, {
          includeRemediation: true,
          groupIssues: true,
          minSeverity: options.minSeverity as any,
        });

        if (options.output) {
          await this.saveReport(report, options.output);
          this.consoleReporter.logInfo(`Report saved to: ${options.output}`);
        } else if (options.format === 'json') {
          console.log(JSON.stringify(report, null, 2));
        }
      }

      // Export error log if requested
      if (options.exportErrors) {
        errorLogger.exportErrorLog(options.exportErrors, 'json');
        this.consoleReporter.logInfo(`Error log exported to: ${options.exportErrors}`);
      }

      this.consoleReporter.updatePhase('complete', 'Scan completed successfully');

      // Cleanup
      await pageScanner.cleanup();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLogger.fatal('Page scan failed', 'scanning', error as Error, 'cli');
      this.consoleReporter.logError('Scan failed', error as Error);
      process.exit(1);
    } finally {
      this.consoleReporter.cleanup();
    }
  }

  /**
   * Handle site crawling (simplified version)
   */
  async crawlSite(url: string, options: CliCrawlOptions): Promise<void> {
    try {
      this.initializeReporters(options);
      this.consoleReporter.init();
      
      errorLogger.info('Starting site crawl', 'cli', { url, options });

      // For now, just scan the main page - full crawling will be implemented later
      this.consoleReporter.logInfo('Site crawling functionality coming soon. Scanning main page only.');
      await this.scanPage(url, options);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLogger.fatal('Site crawl failed', 'crawling', error as Error, 'cli');
      this.consoleReporter.logError('Crawl failed', error as Error);
      process.exit(1);
    }
  }

  /**
   * Save report to file
   */
  private async saveReport(report: any, outputPath: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }

      writeFileSync(outputPath, JSON.stringify(report, null, 2));
      errorLogger.info('Report saved successfully', 'cli', { outputPath });
    } catch (error) {
      errorLogger.error('Failed to save report', 'output', error as Error, 'cli');
      throw error;
    }
  }


}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const cli = new A11yAnalyzeCLI();

  program
    .name('a11yanalyze')
    .description('🔍 Comprehensive WCAG 2.2 Accessibility Testing Tool')
    .version(version)
    .configureOutput({
      writeErr: (str) => process.stderr.write(str),
      writeOut: (str) => process.stdout.write(str),
    });

  // Single page scan command
  program
    .command('scan')
    .description('🔍 Scan a single page for accessibility issues')
    .argument('<url>', 'URL to scan')
    .option('-o, --output <file>', 'save JSON report to file')
    .option('-f, --format <type>', 'output format: json, console, both', 'console')
    .option('--wcag-level <level>', 'WCAG level to test: A, AA, AAA', 'AA')
    .option('--include-aaa', 'include WCAG AAA issues as warnings')
    .option('--include-aria', 'include ARIA issues', true)
    .option('--timeout <ms>', 'page load timeout in milliseconds', '30000')
    .option('--viewport <size>', 'browser viewport size (e.g., 1280x720)', '1280x720')
    .option('--screenshot', 'capture screenshots of issues')
    .option('--profile <name>', 'scoring profile: strict, balanced, lenient', 'balanced')
    .option('--min-severity <level>', 'minimum severity to report: critical, serious, moderate', 'moderate')
    .option('--export-errors <file>', 'export error log to file')
    .option('--keyboard-nav', 'Enable keyboard navigation automation (default: true)', true)
    .option('--screen-reader-sim', 'Enable screen reader simulation (default: true)', true)
    .option('--page-ready-timeout <ms>', 'timeout for page ready state in milliseconds (default: 10000)')
    .option('-v, --verbose', 'detailed output with progress information')
    .option('-q, --quiet', 'minimal output')
    .option('--debug', 'debug mode with detailed logging')
    // New authentication options
    .option('--login-url <url>', 'URL of the login page (for authenticated scans)')
    .option('--username <username>', 'Username for login (for authenticated scans)')
    .option('--password <password>', 'Password for login (for authenticated scans)')
    .action(async (url: string, options: CliScanOptions & { loginUrl?: string; username?: string; password?: string }) => {
      await cli.scanPage(url, options);
    });

  // Site crawl command
  program
    .command('crawl')
    .description('🕷️  Crawl and analyze an entire website')
    .argument('<url>', 'starting URL to crawl')
    .option('-d, --depth <number>', 'maximum crawl depth', '2')
    .option('-p, --max-pages <number>', 'maximum pages to scan', '50')
    .option('-c, --concurrency <number>', 'concurrent page scans', '3')
    .option('--delay <ms>', 'delay between requests in milliseconds', '1000')
    .option('--allowed-domains <domains>', 'comma-separated list of allowed domains')
    .option('--exclude-paths <patterns>', 'comma-separated URL patterns to exclude')
    .option('--include-paths <patterns>', 'comma-separated URL patterns to include')
    .option('--respect-robots', 'respect robots.txt directives')
    .option('--sitemap', 'use sitemap.xml for discovery')
    .option('-o, --output <file>', 'save JSON report to file')
    .option('-f, --format <type>', 'output format: json, console, both', 'console')
    .option('--wcag-level <level>', 'WCAG level to test: A, AA, AAA', 'AA')
    .option('--include-aaa', 'include WCAG AAA issues as warnings')
    .option('--include-aria', 'include ARIA issues', true)
    .option('--timeout <ms>', 'page load timeout in milliseconds', '30000')
    .option('--viewport <size>', 'browser viewport size (e.g., 1280x720)', '1280x720')
    .option('--profile <name>', 'scoring profile: strict, balanced, lenient', 'balanced')
    .option('--min-severity <level>', 'minimum severity to report: critical, serious, moderate', 'moderate')
    .option('--export-errors <file>', 'export error log to file')
    .option('--keyboard-nav', 'Enable keyboard navigation automation (default: true)', true)
    .option('--screen-reader-sim', 'Enable screen reader simulation (default: true)', true)
    .option('--page-ready-timeout <ms>', 'timeout for page ready state in milliseconds (default: 10000)')
    .option('-v, --verbose', 'detailed output with progress information')
    .option('-q, --quiet', 'minimal output')
    .option('--debug', 'debug mode with detailed logging')
    .action(async (url: string, options: CliCrawlOptions) => {
      await cli.crawlSite(url, options);
    });

  // Storybook batch command
  program
    .command('storybook-batch')
    .description('Batch scan all stories in a Storybook instance and generate VPAT/Section 508 reports')
    .requiredOption('--storybook-url <url>', 'URL of the running Storybook instance (e.g., http://localhost:6006)')
    .requiredOption('--output-dir <dir>', 'Directory to save per-story VPAT reports')
    .option('--format <format>', 'Report format: json, markdown, or both', 'json')
    .option('--wcag-level <level>', 'WCAG level (A, AA, AAA)', 'AA')
    .option('--timeout <ms>', 'Page scan timeout in milliseconds', '30000')
    .option('--keyboard-nav', 'Enable keyboard navigation automation (default: true)', true)
    .option('--screen-reader-sim', 'Enable screen reader simulation (default: true)', true)
    .action(async (options) => {
      try {
        const runner = new StorybookBatchRunner();
        await runner.run({
          storybookUrl: options.storybookUrl,
          outputDir: options.outputDir,
          format: options.format,
          wcagLevel: options.wcagLevel,
          timeout: parseInt(options.timeout, 10),
          keyboardNav: options.keyboardNav,
          screenReaderSim: options.screenReaderSim,
        });
        console.log(`\nBatch VPAT/Section 508 reports generated in: ${options.outputDir}`);
        console.log(`See vpat-index.json for a summary of all stories.`);
      } catch (error) {
        console.error('Batch scan failed:', error);
        process.exit(1);
      }
    });

  // HTML batch command
  program
    .command('html-batch')
    .description('Batch scan all HTML files in a directory, a list of URLs, or a custom config and generate VPAT/Section 508 reports')
    .option('--input-dir <dir>', 'Directory containing HTML files (recursively scanned)')
    .option('--input-list <file>', 'File containing a list of URLs (one per line)')
    .option('--input-config <file>', 'JSON or YAML file describing components/files/URLs to scan')
    .requiredOption('--output-dir <dir>', 'Directory to save per-file VPAT reports')
    .option('--format <format>', 'Report format: json, markdown, or both', 'json')
    .option('--wcag-level <level>', 'WCAG level (A, AA, AAA)', 'AA')
    .option('--timeout <ms>', 'Page scan timeout in milliseconds', '30000')
    .option('--template <file>', 'Custom Handlebars template for Markdown or JSON output')
    .option('--keyboard-nav', 'Enable keyboard navigation automation (default: true)', true)
    .option('--screen-reader-sim', 'Enable screen reader simulation (default: true)', true)
    .action(async (options) => {
      try {
        const runner = new HtmlBatchRunner();
        await runner.run({
          inputDir: options.inputDir,
          inputList: options.inputList,
          inputConfig: options.inputConfig,
          outputDir: options.outputDir,
          format: options.format,
          wcagLevel: options.wcagLevel,
          timeout: parseInt(options.timeout, 10),
          template: options.template,
          keyboardNav: options.keyboardNav,
          screenReaderSim: options.screenReaderSim,
        });
        console.log(`\nBatch VPAT/Section 508 reports generated in: ${options.outputDir}`);
        console.log(`See vpat-index.json for a summary of all files/components.`);
      } catch (error) {
        console.error('Batch scan failed:', error);
        process.exit(1);
      }
    });

  // Manual guided testing command
  program
    .command('manual-guide')
    .description('Launch a guided manual accessibility audit for a component or page (step-by-step WCAG/Section 508 checklist)')
    .argument('<target>', 'Component name or URL to audit')
    .option('--output <file>', 'Save manual audit results to file')
    .option('--criteria <list>', 'Comma-separated list of WCAG criteria numbers to include (optional)')
    .action(async (target: string, options: { output?: string; criteria?: string }) => {
      const criteria = options.criteria ? options.criteria.split(',').map((s: string) => s.trim()) : undefined;
      await runManualGuide(target, { output: options.output, criteria });
    });

  // Manual testing checklist generation command
  program
    .command('generate-checklist')
    .description('Generate a manual accessibility testing checklist for a component or page (WCAG/Section 508)')
    .argument('<target>', 'Component name or URL')
    .option('--output <file>', 'Save checklist to file')
    .option('--format <format>', 'Checklist format: markdown or json', 'markdown')
    .option('--wcag-level <level>', 'WCAG level to include (A, AA, AAA)')
    .option('--criteria <list>', 'Comma-separated list of WCAG criteria numbers to include (optional)')
    .action((target: string, options: { output?: string; format?: 'markdown' | 'json'; wcagLevel?: string; criteria?: string }) => {
      const criteria = options.criteria ? options.criteria.split(',').map((s: string) => s.trim()) : undefined;
      generateChecklist(target, { output: options.output, format: options.format, wcagLevel: options.wcagLevel, criteria });
    });

  // Help command with topic support
  program
    .command('help')
    .description('📚 Show comprehensive help and documentation')
    .argument('[topic]', 'specific help topic to display')
    .option('--search <query>', 'search help content for keywords')
    .option('--list', 'list all available help topics')
    .action(async (topic?: string, options?: { search?: string; list?: boolean }) => {
      try {
        if (options?.search) {
          HelpManager.searchHelp(options.search);
        } else if (options?.list) {
          HelpManager.showTopicMenu();
        } else if (topic) {
          const validTopics: HelpCategory[] = [
            'getting-started', 'scanning', 'crawling', 'configuration',
            'scoring', 'reporting', 'troubleshooting', 'best-practices',
            'examples', 'api'
          ];
          
          if (validTopics.includes(topic as HelpCategory)) {
            HelpManager.showHelp(topic as HelpCategory);
          } else {
            console.error(`Unknown help topic: ${topic}`);
            console.log('Available topics: ' + validTopics.join(', '));
            console.log('Use: a11yanalyze help --list to see all topics');
          }
        } else {
          HelpManager.showTopicMenu();
        }
      } catch (error) {
        errorLogger.error('Help system error', 'system', error as Error, 'help');
        console.error('❌ Error displaying help. Please try again.');
      }
    });

  // Quick tips command
  program
    .command('tips')
    .description('💡 Show quick tips for common tasks')
    .argument('[command]', 'show tips for specific command (scan, crawl)')
    .action((command?: string) => {
      HelpManager.showQuickTips(command);
    });

  // Configuration generation command
  program
    .command('init')
    .description('⚙️ Generate configuration file for your project')
    .option('--format <type>', 'configuration format: json, js', 'json')
    .option('--output <file>', 'output file path')
    .action(async (options: { format?: 'json' | 'js'; output?: string }) => {
      try {
        const format = options.format || 'json';
        const filename = options.output || (format === 'js' ? '.a11yanalyzerc.js' : '.a11yanalyzerc.json');
        
        const configContent = HelpManager.generateConfigTemplate(format);
        require('fs').writeFileSync(filename, configContent);
        
        console.log(`✅ Configuration file created: ${filename}`);
        console.log('📖 Learn more: a11yanalyze help configuration');
      } catch (error) {
        errorLogger.error('Config generation failed', 'system', error as Error, 'init');
        console.error('❌ Failed to create configuration file');
      }
    });

  // Show help if no arguments
  if (process.argv.length === 2) {
    program.help();
  }

  await program.parseAsync();
}

// Enhanced error handling
process.on('uncaughtException', (error: Error) => {
  errorLogger.fatal('Uncaught exception in CLI', 'system', error, 'cli');
  console.error('❌ Uncaught Exception:', error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorLogger.fatal('Unhandled promise rejection in CLI', 'system', error, 'cli');
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  errorLogger.info('Received SIGINT, shutting down gracefully', 'cli');
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  errorLogger.info('Received SIGTERM, shutting down gracefully', 'cli');
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    errorLogger.fatal('CLI startup failed', 'system', error as Error, 'cli');
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
} 