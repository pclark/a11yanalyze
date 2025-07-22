import { Page } from 'playwright';
import { RuleEngineConfig, RuleResult, WCAGRule, WCAGLevel, ViolationNode } from '../types';
import axeCore from 'axe-core';

/**
 * Hybrid rule engine combining axe-core with custom WCAG 2.2 rules
 * Provides comprehensive accessibility testing with extensible rule system
 */
export class RuleEngine {
  private config: RuleEngineConfig;
  private customRules: Map<string, WCAGRule> = new Map();
  private disabledRules: Set<string> = new Set();

  constructor(config: RuleEngineConfig) {
    this.config = {
      wcagLevel: config.wcagLevel ?? 'AA',
      includeAAA: config.includeAAA ?? false,
      includeARIA: config.includeARIA ?? true,
      customRules: config.customRules ?? [],
      disabledRules: config.disabledRules ?? [],
      axeCoreConfig: config.axeCoreConfig ?? {
        tags: ['wcag2a', 'wcag2aa'],
        rules: [],
      },
    };
    
    this.initializeRules();
  }

  /**
   * Initialize rule engine with axe-core and custom rules
   * @private
   */
  private initializeRules(): void {
    // Setup axe-core configuration
    this.setupAxeCore();
    
    // Load custom rules
    this.loadCustomRules();
    
    // Apply disabled rules
    this.config.disabledRules.forEach(ruleId => {
      this.disabledRules.add(ruleId);
    });
  }

  /**
   * Configure axe-core based on WCAG level and preferences
   * @private
   */
  private setupAxeCore(): void {
    const tags: string[] = [];
    
    // Base WCAG 2.1/2.2 rules
    if (this.config.wcagLevel === 'A' || this.config.wcagLevel === 'AA' || this.config.wcagLevel === 'AAA') {
      tags.push('wcag2a');
    }
    
    if (this.config.wcagLevel === 'AA' || this.config.wcagLevel === 'AAA') {
      tags.push('wcag2aa');
    }
    
    if (this.config.wcagLevel === 'AAA' || this.config.includeAAA) {
      tags.push('wcag2aaa');
    }

    // ARIA rules
    if (this.config.includeARIA) {
      tags.push('wcag2a', 'wcag2aa'); // ARIA is part of WCAG
    }

    // Additional rule categories
    tags.push('best-practice');

    this.config.axeCoreConfig = {
      tags,
      rules: this.config.axeCoreConfig?.rules ?? [],
    };
  }

  /**
   * Load and validate custom WCAG rules
   * @private
   */
  private loadCustomRules(): void {
    this.config.customRules.forEach(rule => {
      if (this.validateRule(rule)) {
        this.customRules.set(rule.ruleId, rule);
      }
    });
  }

  /**
   * Validate custom rule configuration
   * @private
   */
  private validateRule(rule: WCAGRule): boolean {
    if (!rule.ruleId || !rule.wcagCriterion || !rule.level) {
      console.warn(`Invalid rule configuration: ${rule.ruleId}`);
      return false;
    }

    if (!['A', 'AA', 'AAA'].includes(rule.level)) {
      console.warn(`Invalid WCAG level for rule ${rule.ruleId}: ${rule.level}`);
      return false;
    }

    return true;
  }

  /**
   * Execute accessibility scan on a page using hybrid rule engine
   * @param page - Playwright page instance
   * @returns Promise<RuleResult[]>
   */
  async executeRules(page: Page): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    try {
      // Execute axe-core rules
      const axeResults = await this.executeAxeCore(page);
      results.push(...axeResults);

      // Execute custom WCAG rules
      const customResults = await this.executeCustomRules(page);
      results.push(...customResults);

      // Filter disabled rules
      return results.filter(result => !this.disabledRules.has(result.ruleId));

    } catch (error) {
      console.error('Error executing accessibility rules:', error);
      throw new Error(`Rule execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute axe-core accessibility rules
   * @private
   */
  private async executeAxeCore(page: Page): Promise<RuleResult[]> {
    try {
      // Inject axe-core into the page
      await page.addScriptTag({
        content: axeCore.source,
      });

      // Configure and run axe
      const config = this.config.axeCoreConfig;
      if (!config) {
        throw new Error('axeCoreConfig is not defined');
      }

      console.info('Axe-core configuration:', config);
      // Ensure rules is always an object
      if (typeof config.rules !== 'object' || config.rules == undefined) {
        config.rules = [];
      }
      const axeResults = await page.evaluate((configParam: any) => {
        return new Promise((resolve, reject) => {
          try {
            const win = (globalThis as any);
            if (typeof win.axe === 'undefined') {
              reject(new Error('axe-core not loaded'));
              return;
            }
            win.axe.configure({
              tags: configParam.tags,
              rules: configParam.rules,
            });
            win.axe.run((err: any, results: any) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      }, config);

      return this.transformAxeResults(axeResults as any);

    } catch (error) {
      console.error('Axe-core execution failed:', error);
      return [];
    }
  }

  /**
   * Transform axe-core results to standard RuleResult format
   * @private
   */
  private transformAxeResults(axeResults: any): RuleResult[] {
    const results: RuleResult[] = [];

    // Process violations
    axeResults.violations?.forEach((violation: any) => {
      const ruleResult: RuleResult = {
        ruleId: violation.id,
        wcagReference: this.extractWcagReference(violation.tags),
        level: this.determineWcagLevel(violation.tags),
        impact: violation.impact || 'moderate',
        nodes: this.transformAxeNodes(violation.nodes),
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
      };
      results.push(ruleResult);
    });

    return results;
  }

  /**
   * Execute custom WCAG 2.2 rules
   * @private
   */
  private async executeCustomRules(page: Page): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    for (const [ruleId, rule] of this.customRules) {
      if (this.disabledRules.has(ruleId)) {
        continue;
      }

      try {
        const ruleResult = await this.executeCustomRule(page, rule);
        if (ruleResult) {
          results.push(ruleResult);
        }
      } catch (error) {
        console.warn(`Custom rule ${ruleId} execution failed:`, error);
      }
    }

    return results;
  }

  /**
   * Execute a single custom rule
   * @private
   */
  private async executeCustomRule(page: Page, rule: WCAGRule): Promise<RuleResult | null> {
    try {
      // Placeholder for custom rule execution
      // In a real implementation, this would evaluate the custom rule logic
      // For now, return null (no violations) as this is a framework setup
      
      // Future implementation would:
      // 1. Parse the rule.evaluate function string
      // 2. Execute it in the page context with proper error handling
      // 3. Transform results to RuleResult format
      
      return null;

    } catch (error) {
      console.warn(`Error executing custom rule ${rule.ruleId}:`, error);
      return null;
    }
  }

  /**
   * Extract WCAG reference from axe tags
   * @private
   */
  private extractWcagReference(tags: string[]): string {
    const wcagTag = tags.find(tag => tag.match(/^wcag\d{3}$/));
    if (wcagTag) {
      const numbers = wcagTag.replace('wcag', '');
      return `${numbers[0]}.${numbers[1]}.${numbers[2]}`;
    }
    return '';
  }

  /**
   * Determine WCAG level from tags
   * @private
   */
  private determineWcagLevel(tags: string[]): WCAGLevel {
    if (tags.includes('wcag2aaa')) return 'AAA';
    if (tags.includes('wcag2aa')) return 'AA';
    if (tags.includes('wcag2a')) return 'A';
    return 'AA'; // Default
  }

  /**
   * Transform axe node information
   * @private
   */
  private transformAxeNodes(nodes: any[]): ViolationNode[] {
    return nodes.map(node => ({
      target: node.target,
      html: node.html,
      any: node.any || [],
      all: node.all || [],
      none: node.none || [],
      failureSummary: node.failureSummary,
    }));
  }

  /**
   * Add a custom rule to the engine
   */
  addCustomRule(rule: WCAGRule): void {
    if (this.validateRule(rule)) {
      this.customRules.set(rule.ruleId, rule);
    }
  }

  /**
   * Remove a custom rule from the engine
   */
  removeCustomRule(ruleId: string): void {
    this.customRules.delete(ruleId);
  }

  /**
   * Enable a previously disabled rule
   */
  enableRule(ruleId: string): void {
    this.disabledRules.delete(ruleId);
  }

  /**
   * Disable a rule from execution
   */
  disableRule(ruleId: string): void {
    this.disabledRules.add(ruleId);
  }

  /**
   * Get current rule configuration
   */
  getConfiguration(): RuleEngineConfig {
    return { ...this.config };
  }

  /**
   * Get list of available custom rules
   */
  getCustomRules(): WCAGRule[] {
    return Array.from(this.customRules.values());
  }

  /**
   * Get list of disabled rules
   */
  getDisabledRules(): string[] {
    return Array.from(this.disabledRules);
  }

  /**
   * Update engine configuration
   */
  updateConfiguration(newConfig: Partial<RuleEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeRules();
  }
} 