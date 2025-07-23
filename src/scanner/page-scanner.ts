import { Page } from 'playwright';
import { ScanResult, ScanOptions, ScanMetadata, AccessibilityIssue, ScanError, BrowserConfig, RuleEngineConfig } from '../types';
import { BrowserManager } from '../utils/browser-manager';
import { RuleEngine } from './rule-engine';
import { ErrorResilienceManager, ResilienceConfig } from './error-resilience';
import { WCAGLevelHandler, WCAGLevelConfig } from './wcag-level-handler';

export interface KeyboardNavigationResult {
  tabOrder: string[];
  unreachableElements: string[];
  focusTraps: string[];
  missingFocusIndicators: string[];
  issues: string[];
}

// Extend ScanResult type to include keyboardNavigation
export interface ScanResultWithKeyboard extends ScanResult {
  keyboardNavigation?: KeyboardNavigationResult;
}

export interface ScreenReaderSimulationResult {
  tree: any;
  missingNames: string[];
  ambiguousRoles: string[];
  skippedElements: string[];
  summary: string[];
}

export interface ScanResultWithA11y extends ScanResultWithKeyboard {
  screenReaderSimulation?: ScreenReaderSimulationResult;
}

export interface CognitiveAccessibilityResult {
  readingLevel: number;
  readingLevelCategory: 'easy' | 'average' | 'difficult';
  jargonTerms: string[];
  abbreviationCount: number;
  summary: string[];
}

export interface ScanResultWithCognitive extends ScanResultWithA11y {
  cognitiveAccessibility?: CognitiveAccessibilityResult;
  summary?: string[];
  groupedWarnings?: Record<string, string[]>;
}

export async function simulateKeyboardNavigation(page: Page): Promise<KeyboardNavigationResult> {
  // Find all focusable elements (inside page context)
  const focusable = await page.evaluate(() => {
    const selectors = [
      'a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ];
    return Array.from(document.querySelectorAll(selectors.join(','))).map(e => ({
      html: (e as HTMLElement).outerHTML,
      tag: e.tagName.toLowerCase(),
      id: (e as HTMLElement).id,
      className: (e as HTMLElement).className,
      tabIndex: (e as HTMLElement).tabIndex,
      isVisible: !!(e as HTMLElement).offsetParent,
      isDisabled: (e as HTMLInputElement).disabled || false,
      isContentEditable: (e as HTMLElement).isContentEditable,
      isFocusable: true,
      ariaHidden: (e as HTMLElement).getAttribute('aria-hidden') === 'true',
    }));
  });
  // Find all interactable elements (clickable, input, button, etc.)
  const interactable = await page.evaluate(() => {
    const selectors = [
      'a[href]', 'button', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]', '[onclick]', '[tabindex]'
    ];
    return Array.from(document.querySelectorAll(selectors.join(','))).map(e => ({
      html: (e as HTMLElement).outerHTML,
      tag: e.tagName.toLowerCase(),
      id: (e as HTMLElement).id,
      className: (e as HTMLElement).className,
      tabIndex: (e as HTMLElement).tabIndex,
      isVisible: !!(e as HTMLElement).offsetParent,
      isDisabled: (e as HTMLInputElement).disabled || false,
      isContentEditable: (e as HTMLElement).isContentEditable,
      isFocusable: false,
      ariaHidden: (e as HTMLElement).getAttribute('aria-hidden') === 'true',
    }));
  });
  // Filter out aria-hidden elements from focusable/interactable arrays
  const visibleFocusable = focusable.filter(e => !e.ariaHidden);
  const visibleInteractable = interactable.filter(e => !e.ariaHidden);
  const tabOrder: string[] = [];
  const unreachableElements: string[] = [];
  const focusTraps: string[] = [];
  const missingFocusIndicators: string[] = [];
  const focusOrderJumps: string[] = [];
  const notInteractable: string[] = [];
  const notFocusable: string[] = [];
  const issues: string[] = [];

  // Simulate tabbing through the page
  let lastFocused = '';
  let focusCycle = new Set<string>();
  let lastDomIndex = -1;
  for (let i = 0; i < visibleFocusable.length + 10; i++) { // +10 to detect cycles
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return { desc: '', domIndex: -1 };
      let desc = el.tagName.toLowerCase();
      if ((el as HTMLElement).id) desc += `#${(el as HTMLElement).id}`;
      if ((el as HTMLElement).className) desc += `.${(el as HTMLElement).className.split(' ').join('.')}`;
      // Find DOM index
      let domIndex = -1;
      const all = Array.from(document.querySelectorAll('*'));
      for (let j = 0; j < all.length; j++) {
        if (all[j] === el) { domIndex = j; break; }
      }
      return { desc, domIndex };
    });
    if (!active.desc || tabOrder.includes(active.desc)) {
      if (active.desc && focusCycle.has(active.desc)) {
        focusTraps.push(active.desc);
        issues.push(`Focus trap detected at ${active.desc}`);
        break;
      }
      focusCycle.add(active.desc);
      break;
    }
    // Detect focus order jumps
    if (lastDomIndex !== -1 && active.domIndex !== -1 && active.domIndex < lastDomIndex) {
      focusOrderJumps.push(active.desc);
      issues.push(`Focus order jump detected at ${active.desc}`);
    }
    lastDomIndex = active.domIndex;
    tabOrder.push(active.desc);
    lastFocused = active.desc;
    // Check for focus indicator (inside page context)
    const hasIndicator = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
    });
    if (!hasIndicator) {
      missingFocusIndicators.push(active.desc);
      issues.push(`Missing visible focus indicator on ${active.desc}`);
    }
  }
  // Detect unreachable elements
  for (const el of visibleFocusable) {
    if (!tabOrder.some(sel => el.html.includes(sel))) {
      unreachableElements.push(el.html);
      issues.push(`Element not reachable by Tab: ${el.html}`);
    }
  }
  // Detect focusable but not interactable
  for (const el of visibleFocusable) {
    if (!visibleInteractable.some(i => i.html === el.html)) {
      notInteractable.push(el.html);
      issues.push(`Focusable but not interactable: ${el.html}`);
    }
  }
  // Detect interactable but not focusable
  for (const el of visibleInteractable) {
    if (!visibleFocusable.some(f => f.html === el.html)) {
      notFocusable.push(el.html);
      issues.push(`Interactable but not focusable: ${el.html}`);
    }
  }
  return { tabOrder, unreachableElements, focusTraps, missingFocusIndicators, issues: [
    ...issues,
    ...focusOrderJumps.map(j => `Focus order jump at ${j}`),
    ...notInteractable.map(n => `Focusable but not interactable: ${n}`),
    ...notFocusable.map(n => `Interactable but not focusable: ${n}`)
  ] };
}

export async function simulateScreenReader(page: Page): Promise<ScreenReaderSimulationResult> {
  // Get the accessibility tree
  const tree = await page.accessibility.snapshot({ interestingOnly: false });
  const missingNames: string[] = [];
  const ambiguousRoles: string[] = [];
  const skippedElements: string[] = [];
  const summary: string[] = [];

  function walk(node: any, path: string[] = []) {
    if (!node) return;
    const label = node.name || '';
    const role = node.role || '';
    const nodePath = [...path, role || node.name || 'unknown'].join(' > ');
    if (!label && ['button', 'link', 'textbox', 'checkbox', 'radio', 'img'].includes(role)) {
      missingNames.push(nodePath);
      summary.push(`Element with role '${role}' missing accessible name at ${nodePath}`);
    }
    if (role === 'generic' || !role) {
      ambiguousRoles.push(nodePath);
      summary.push(`Element with ambiguous or missing role at ${nodePath}`);
    }
    if (node.focusable && node.name === undefined) {
      skippedElements.push(nodePath);
      summary.push(`Focusable element skipped by accessibility tree at ${nodePath}`);
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child, [...path, role || node.name || 'unknown']);
      }
    }
  }
  walk(tree);
  return { tree, missingNames, ambiguousRoles, skippedElements, summary };
}

export async function analyzeCognitiveAccessibility(page: Page): Promise<CognitiveAccessibilityResult> {
  // Extract all visible text
  const text = await page.evaluate(() => {
    function getText(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).offsetParent !== null) {
        let t = '';
        for (const child of Array.from(node.childNodes)) t += getText(child);
        return t;
      }
      return '';
    }
    return getText(document.body);
  });
  // Flesch-Kincaid reading level
  function countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:e$)/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
  function countWords(str: string): number {
    return (str.match(/\b\w+\b/g) || []).length;
  }
  function countSentences(str: string): number {
    return (str.match(/[.!?]+/g) || []).length;
  }
  function countSyllablesInText(str: string): number {
    return (str.match(/\b\w+\b/g) || []).reduce((sum, word) => sum + countSyllables(word), 0);
  }
  const words = countWords(text);
  const sentences = countSentences(text);
  const syllables = countSyllablesInText(text);
  const readingLevel = sentences > 0 ? 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59 : 0;
  let readingLevelCategory: 'easy' | 'average' | 'difficult' = 'easy';
  if (readingLevel > 10) readingLevelCategory = 'difficult';
  else if (readingLevel > 7) readingLevelCategory = 'average';
  // Jargon/abbreviation detection (simple)
  const jargonList = ['utilize', 'leverage', 'synergy', 'paradigm', 'bandwidth', 'stakeholder', 'streamline', 'incentivize', 'touchpoint', 'vertical', 'granular', 'pivot', 'ecosystem', 'disrupt', 'scalable', 'proactive', 'ideate', 'circle back', 'low-hanging fruit'];
  const jargonTerms = jargonList.filter(j => text.toLowerCase().includes(j));
  const abbreviationCount = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
  const summary = [
    `Flesch-Kincaid reading level: ${readingLevel.toFixed(1)} (${readingLevelCategory})`,
    `Jargon terms detected: ${jargonTerms.length > 0 ? jargonTerms.join(', ') : 'None'}`,
    `Abbreviations detected: ${abbreviationCount}`
  ];
  return { readingLevel, readingLevelCategory, jargonTerms, abbreviationCount, summary };
}

/**
 * Core single page accessibility scanner
 * Implements WCAG 2.2 AA testing with hybrid rule engine and JavaScript rendering support
 */
export class PageScanner {
  private browserManager: BrowserManager;
  private ruleEngine: RuleEngine;
  private resilienceManager: ErrorResilienceManager;
  private wcagLevelHandler: WCAGLevelHandler;
  private isInitialized = false;

  constructor(
    browserConfig: BrowserConfig = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000,
    },
    ruleEngineConfig: RuleEngineConfig = {
      wcagLevel: 'AA',
      includeAAA: false,
      includeARIA: true,
      customRules: [],
      disabledRules: [],
    },
    resilienceConfig: Partial<ResilienceConfig> = {},
    wcagLevelConfig: Partial<WCAGLevelConfig> = {}
  ) {
    this.browserManager = new BrowserManager(browserConfig);
    this.ruleEngine = new RuleEngine(ruleEngineConfig);
    this.resilienceManager = new ErrorResilienceManager(resilienceConfig);
    this.wcagLevelHandler = new WCAGLevelHandler({
      primaryLevel: ruleEngineConfig.wcagLevel,
      includeAAA: ruleEngineConfig.includeAAA,
      includeARIA: ruleEngineConfig.includeARIA,
      ...wcagLevelConfig,
    });
  }

  /**
   * Initialize the page scanner with browser and rule engine setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.resilienceManager.executeResilient(
        () => this.browserManager.initialize(),
        'initialization',
        {
          useCircuitBreaker: false, // Don't use circuit breaker for initialization
          useRetry: true,
          useTimeout: true,
          retryStrategy: {
            maxAttempts: 2,
            backoffType: 'fixed',
            retryableErrors: ['timeout', 'network'],
          },
        }
      );
      this.isInitialized = true;
    } catch (error) {
      const scanError = this.resilienceManager.categorizeError(error as Error, 'PageScanner initialization');
      throw new Error(`Failed to initialize PageScanner: ${scanError.message}`);
    }
  }

  /**
   * Scan a single page for accessibility issues with JavaScript rendering support
   * @param url - URL to scan
   * @param options - Scanning options
   * @returns Promise<ScanResult>
   */
  async scan(url: string, options: Partial<ScanOptions> = {}): Promise<ScanResultWithCognitive> {
    const startTime = Date.now();
    const scanOptions = {
      wcagLevel: options.wcagLevel ?? 'AA',
      includeWarnings: options.includeWarnings ?? true,
      timeout: options.timeout ?? 30000,
      pageReadyTimeout: options.pageReadyTimeout ?? 10000, // new option
      outputPath: options.outputPath,
      includeAAA: options.includeAAA ?? false,
      includeARIA: options.includeARIA ?? true,
      screenshot: options.screenshot ?? false,
      customRules: options.customRules ?? [],
      disabledRules: options.disabledRules ?? [],
    };

    // Ensure scanner is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error(`Invalid URL provided: ${url}`);
    }

    let page: Page | null = null;
    const errors: ScanError[] = [];
    const issues: AccessibilityIssue[] = [];

    try {
      // Create a new page with resilience
      page = await this.resilienceManager.executeResilient(
        () => this.browserManager.createPage(),
        'pageCreation',
        {
          useRetry: true,
          retryStrategy: {
            maxAttempts: 2,
            backoffType: 'linear',
            retryableErrors: ['timeout', 'runtime'],
          },
        }
      );

      // Navigate to the URL with enhanced error handling and retries
      const navigationResult = await this.resilienceManager.executeResilient(
        () => this.browserManager.navigateToUrl(page!, url, {
          timeout: scanOptions.timeout,
          waitUntil: 'domcontentloaded',
          retries: 1, // Reduced since we have resilience layer
          retryDelay: 500,
        }),
        'navigation',
        {
          useRetry: true,
          retryStrategy: {
            maxAttempts: 3,
            backoffType: 'exponential',
            retryableErrors: ['timeout', 'network'],
          },
        }
      );

             // Handle navigation errors
       if (!navigationResult.success) {
         const errorType = navigationResult.error?.type ?? 'network';
         const mappedType = errorType === 'navigation' || errorType === 'javascript' || errorType === 'security' 
           ? 'runtime' 
           : errorType as 'timeout' | 'network' | 'parsing' | 'runtime';
         
         errors.push({
           type: mappedType,
           message: navigationResult.error?.message ?? 'Navigation failed',
           details: navigationResult.error?.details ? JSON.stringify(navigationResult.error.details) : undefined,
         });
       }

       // Update rule engine configuration based on scan options
       await this.updateRuleEngineConfig(scanOptions);

      // Wait for page to be fully loaded (including JavaScript) with resilience
      await this.resilienceManager.executeResilient(
        () => this.waitForPageReady(page!, scanOptions.pageReadyTimeout),
        'pageReady',
        {
          useRetry: true,
          retryStrategy: {
            maxAttempts: 2,
            backoffType: 'linear',
            retryableErrors: ['timeout'],
          },
        }
      );

      // Extract page metadata with resilience
      const metadata = await this.resilienceManager.executeResilient(
        () => this.extractPageMetadata(page!, navigationResult, startTime),
        'metadataExtraction',
        {
          useRetry: true,
          retryStrategy: {
            maxAttempts: 2,
            backoffType: 'fixed',
            retryableErrors: ['runtime', 'timeout'],
          },
        }
      );

      // Execute accessibility rules with enhanced resilience
      try {
        const ruleResults = await this.resilienceManager.executeResilient(
          () => this.ruleEngine.executeRules(page!),
          'ruleExecution',
          {
            useRetry: true,
            retryStrategy: {
              maxAttempts: 2,
              backoffType: 'linear',
              retryableErrors: ['runtime', 'timeout'],
            },
          }
        );
        
        // Transform rule results to accessibility issues
        for (const ruleResult of ruleResults) {
          const accessibilityIssues = this.transformRuleResultToIssues(ruleResult);
          issues.push(...accessibilityIssues);
        }
      } catch (ruleError) {
        const scanError = this.resilienceManager.categorizeError(ruleError as Error, 'Rule execution');
        errors.push(scanError);
      }

      // Calculate accessibility score
      let score = this.calculateAccessibilityScore(issues, metadata.testedElements);
      // Reduce score if there are warnings
      const warningCount = issues.filter(i => i.severity === 'warning').length;
      if (warningCount > 0) {
        score = Math.max(0, score - warningCount * 2);
      }

      // Get WCAG compliance summary
      const complianceSummary = this.wcagLevelHandler.getComplianceSummary(issues);

      // Take screenshot if requested with resilience
      if (scanOptions.screenshot && page) {
        try {
          await this.resilienceManager.executeResilient(
            () => page!.screenshot({
              path: `screenshot-${Date.now()}.png`,
              fullPage: true,
            }),
            'screenshot',
            {
              useRetry: true,
              retryStrategy: {
                maxAttempts: 2,
                backoffType: 'fixed',
                retryableErrors: ['timeout', 'runtime'],
              },
            }
          );
        } catch (screenshotError) {
          const scanError = this.resilienceManager.categorizeError(screenshotError as Error, 'Screenshot capture');
          errors.push(scanError);
        }
      }

      const keyboardNavigationResult = await simulateKeyboardNavigation(page);
      const screenReaderSimulationResult = await simulateScreenReader(page);
      const cognitiveResult = await analyzeCognitiveAccessibility(page);

      // Group similar warnings and add remediation tips
      const groupedWarnings: Record<string, string[]> = {};
      for (const issue of issues.filter(i => i.severity === 'warning')) {
        const key = issue.message;
        if (!groupedWarnings[key]) groupedWarnings[key] = [];
        groupedWarnings[key].push(issue.element);
      }
      // Add summary to result
      const summary = [
        `Total issues: ${issues.length}`,
        `Warnings: ${warningCount}`,
        `Passed checks: ${metadata.testedElements - issues.length}`
      ];
      return {
        url,
        timestamp: new Date().toISOString(),
        score,
        issues,
        errors: errors.length > 0 ? errors : undefined,
        metadata,
        compliance: complianceSummary,
        keyboardNavigation: keyboardNavigationResult,
        screenReaderSimulation: screenReaderSimulationResult,
        cognitiveAccessibility: cognitiveResult,
        summary,
        groupedWarnings,
      } as ScanResultWithCognitive;

    } catch (error) {
      // Handle unexpected errors with proper categorization
      const scanError = this.resilienceManager.categorizeError(error as Error, 'Page scan operation');
      errors.push(scanError);

      // Return partial result even on failure
      const metadata: ScanMetadata = {
        scanDuration: Date.now() - startTime,
        pageLoadTime: 0,
        totalElements: 0,
        testedElements: 0,
        userAgent: 'unknown',
        viewport: { width: 1280, height: 720 },
        url: {
          original: url,
          final: url,
          redirects: 0,
        },
        title: undefined,
        language: undefined,
      };

      return {
        url,
        timestamp: new Date().toISOString(),
        score: 0,
        issues,
        errors,
        metadata,
      } as ScanResultWithCognitive;

    } finally {
      // Always cleanup the page
      if (page) {
        try {
          await this.browserManager.closePage(page);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

        /**
    * Update rule engine configuration based on scan options
    * @private
    */
   private async updateRuleEngineConfig(options: {
     wcagLevel: any;
     includeAAA: boolean;
     includeARIA: boolean;
     customRules: string[];
     disabledRules: string[];
   }): Promise<void> {
     // Update rule engine with current scan options
     this.ruleEngine.updateConfiguration({
       wcagLevel: options.wcagLevel,
       includeAAA: options.includeAAA,
       includeARIA: options.includeARIA,
       customRules: options.customRules.map((ruleId: string) => ({
         ruleId,
         wcagCriterion: '1.1.1', // Placeholder - would be properly configured
         level: 'AA' as const,
         enabled: true,
         tags: [],
         impact: 'moderate' as const,
         evaluate: '',
       })),
       disabledRules: options.disabledRules,
     });
   }

  /**
   * Wait for page to be fully ready including JavaScript execution
   * @private
   */
  private async waitForPageReady(page: Page, timeout: number): Promise<void> {
    try {
      // Wait for network to be idle
      await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 10000) });

      // Wait for any pending JavaScript to complete
             await page.waitForFunction(
         () => {
           // Check if page is ready
           const doc = (globalThis as any).document;
           const win = (globalThis as any).window;
           return doc?.readyState === 'complete' && 
                  win?.performance?.navigation?.type !== undefined;
         },
         { timeout: Math.min(timeout, 5000) }
       );

      // Give additional time for dynamic content
      await page.waitForTimeout(1000);

    } catch (error) {
      // Continue even if wait conditions fail - page might still be scannable
      console.warn('Page ready wait timeout, continuing with scan:', error);
    }
  }

  /**
   * Extract comprehensive page metadata
   * @private
   */
  private async extractPageMetadata(
    page: Page,
    navigationResult: any,
    startTime: number
  ): Promise<ScanMetadata> {
    try {
             const pageInfo = await page.evaluate(() => {
         const doc = (globalThis as any).document;
         const win = (globalThis as any).window;
         const nav = (globalThis as any).navigator;
         
         const elements = doc?.querySelectorAll('*') || [];
         const interactiveElements = doc?.querySelectorAll(
           'a, button, input, select, textarea, [tabindex], [role="button"], [role="link"]'
         ) || [];

         return {
           totalElements: elements.length,
           interactiveElements: interactiveElements.length,
           title: doc?.title || '',
           url: win?.location?.href || '',
           userAgent: nav?.userAgent || '',
           viewport: {
             width: win?.innerWidth || 1280,
             height: win?.innerHeight || 720,
           },
         };
       });

      return {
        scanDuration: Date.now() - startTime,
        pageLoadTime: navigationResult?.loadTime ?? 0,
        totalElements: pageInfo.totalElements,
        testedElements: pageInfo.interactiveElements,
        userAgent: pageInfo.userAgent,
        viewport: pageInfo.viewport,
        url: {
          original: navigationResult?.url ?? page.url(),
          final: pageInfo.url,
          redirects: navigationResult?.redirects ?? 0,
        },
        title: pageInfo.title || undefined,
        language: await page.evaluate(() => document.documentElement.lang || undefined),
      };

    } catch (error) {
      // Return default metadata if extraction fails
      return {
        scanDuration: Date.now() - startTime,
        pageLoadTime: 0,
        totalElements: 0,
        testedElements: 0,
        userAgent: 'unknown',
        viewport: { width: 1280, height: 720 },
        url: {
          original: page.url(),
          final: page.url(),
          redirects: 0,
        },
        title: undefined,
        language: undefined,
      };
    }
  }

  /**
   * Transform rule results to accessibility issues
   * @private
   */
  private transformRuleResultToIssues(ruleResult: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    for (const node of ruleResult.nodes || []) {
      const issue: AccessibilityIssue = {
        id: ruleResult.ruleId,
        wcagReference: ruleResult.wcagReference,
        level: ruleResult.level,
        severity: this.wcagLevelHandler.mapToSeverity(
          ruleResult.level,
          ruleResult.impact,
          ruleResult.wcagReference
        ),
        element: this.extractElementName(node.html),
        selector: Array.isArray(node.target) ? node.target.join(', ') : node.target,
        message: ruleResult.description,
        remediation: ruleResult.help,
        helpUrl: ruleResult.helpUrl,
        impact: ruleResult.impact,
        tags: ruleResult.tags || [],
      };

      issues.push(issue);
    }

    // Filter issues based on WCAG level configuration
    return this.wcagLevelHandler.filterIssues(issues);
  }

  /**
   * Map axe impact levels to severity levels
   * @private
   */
  private mapImpactToSeverity(impact: string): AccessibilityIssue['severity'] {
    switch (impact?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'serious':
        return 'serious';
      case 'moderate':
        return 'moderate';
      case 'minor':
        return 'minor';
      default:
        return 'warning';
    }
  }

  /**
   * Extract element name from HTML string
   * @private
   */
  private extractElementName(html: string): string {
    const match = html.match(/<(\w+)/);
    return match?.[1]?.toLowerCase() ?? 'unknown';
  }

  /**
   * Calculate accessibility score based on issues and page complexity
   * @private
   */
  private calculateAccessibilityScore(issues: AccessibilityIssue[], totalElements: number): number {
    if (issues.length === 0) {
      return 100;
    }

    // Weight different severity levels
    const weights = {
      critical: 10,
      serious: 5,
      moderate: 2,
      minor: 1,
      warning: 0.5,
    };

    const totalWeight = issues.reduce((sum, issue) => {
      return sum + (weights[issue.severity] || 1);
    }, 0);

    // Calculate base score considering page complexity
    const complexityFactor = Math.max(1, Math.log10(totalElements || 1));
    const normalizedWeight = totalWeight / complexityFactor;

    // Score from 0-100, where lower weight = higher score
    const score = Math.max(0, 100 - (normalizedWeight * 5));

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate URL format
   * @private
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Get current scanner status
   */
  getStatus(): {
    initialized: boolean;
    browserStatus: any;
    ruleEngineConfig: any;
    resilienceStatus: any;
    wcagLevelConfig: any;
  } {
    return {
      initialized: this.isInitialized,
      browserStatus: this.browserManager.getStatus(),
      ruleEngineConfig: this.ruleEngine.getConfiguration(),
      resilienceStatus: this.resilienceManager.getStatus(),
      wcagLevelConfig: this.wcagLevelHandler.getConfig(),
    };
  }

  /**
   * Get detailed resilience metrics and status
   */
  getResilienceStatus() {
    return this.resilienceManager.getStatus();
  }

  /**
   * Reset resilience state (circuit breakers, metrics, etc.)
   */
  resetResilience(): void {
    this.resilienceManager.reset();
  }

  /**
   * Update scanner configuration
   */
  async updateConfiguration(
    browserConfig?: Partial<BrowserConfig>,
    ruleEngineConfig?: Partial<RuleEngineConfig>,
    resilienceConfig?: Partial<ResilienceConfig>,
    wcagLevelConfig?: Partial<WCAGLevelConfig>
  ): Promise<void> {
    if (ruleEngineConfig) {
      this.ruleEngine.updateConfiguration(ruleEngineConfig);
      
      // Update WCAG level handler with new rule engine settings
      if (ruleEngineConfig.wcagLevel !== undefined ||
          ruleEngineConfig.includeAAA !== undefined ||
          ruleEngineConfig.includeARIA !== undefined) {
        this.wcagLevelHandler.updateConfig({
          primaryLevel: ruleEngineConfig.wcagLevel,
          includeAAA: ruleEngineConfig.includeAAA,
          includeARIA: ruleEngineConfig.includeARIA,
        });
      }
    }

    if (wcagLevelConfig) {
      this.wcagLevelHandler.updateConfig(wcagLevelConfig);
    }

    if (resilienceConfig) {
      this.resilienceManager.updateConfig(resilienceConfig);
    }

    // Browser config updates require re-initialization
    if (browserConfig && this.isInitialized) {
      await this.cleanup();
      this.browserManager = new BrowserManager({
        ...this.browserManager.getStatus(),
        ...browserConfig,
      } as BrowserConfig);
      await this.initialize();
    }
  }

  /**
   * Cleanup browser and other resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await this.browserManager.cleanup();
        this.isInitialized = false;
      }
      // Note: We don't reset resilience metrics on cleanup to preserve historical data
      // Use resetResilience() explicitly if needed
    } catch (error) {
      console.warn('Error during PageScanner cleanup:', error);
    }
  }

  /**
   * Set storage state (cookies, localStorage, etc.) for the browser context
   */
  public async setStorageState(storageState: any): Promise<void> {
    await this.browserManager.setStorageState(storageState);
  }
} 