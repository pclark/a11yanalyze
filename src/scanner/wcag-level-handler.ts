import { AccessibilityIssue, WCAGLevel } from '../types';

/**
 * Configuration for WCAG level handling
 */
export interface WCAGLevelConfig {
  /** Primary WCAG compliance level (determines what are errors vs warnings) */
  primaryLevel: WCAGLevel;
  /** Whether to include AAA level checks as warnings */
  includeAAA: boolean;
  /** Whether to include ARIA checks as warnings */
  includeARIA: boolean;
  /** Whether to treat warnings as errors */
  treatWarningsAsErrors: boolean;
  /** Whether to include best practice violations */
  includeBestPractices: boolean;
  /** Custom severity overrides for specific WCAG criteria */
  severityOverrides: Record<string, AccessibilityIssue['severity']>;
}

/**
 * WCAG level information and metadata
 */
export interface WCAGLevelInfo {
  level: WCAGLevel;
  isRequired: boolean;
  isWarning: boolean;
  category: 'error' | 'warning' | 'info';
  priority: number;
}

/**
 * WCAG compliance level handler
 * Manages WCAG level selection, categorization, and severity mapping
 */
export class WCAGLevelHandler {
  private config: WCAGLevelConfig;

  constructor(config: Partial<WCAGLevelConfig> = {}) {
    this.config = {
      primaryLevel: 'AA',
      includeAAA: true,
      includeARIA: true,
      treatWarningsAsErrors: false,
      includeBestPractices: false,
      severityOverrides: {},
      ...config,
    };
  }

  /**
   * Determine if a WCAG level should be included in scanning
   */
  shouldIncludeLevel(level: WCAGLevel): boolean {
    switch (level) {
      case 'A':
        return this.config.primaryLevel === 'A' || 
               this.config.primaryLevel === 'AA' || 
               this.config.primaryLevel === 'AAA';
      case 'AA':
        return this.config.primaryLevel === 'AA' || 
               this.config.primaryLevel === 'AAA';
      case 'AAA':
        return this.config.primaryLevel === 'AAA' || this.config.includeAAA;
      case 'ARIA':
        return this.config.includeARIA;
      default:
        return false;
    }
  }

  /**
   * Get WCAG level information including categorization
   */
  getLevelInfo(level: WCAGLevel): WCAGLevelInfo {
    const isRequired = this.isRequiredLevel(level);
    const isWarning = this.isWarningLevel(level);

    return {
      level,
      isRequired,
      isWarning,
      category: isRequired ? 'error' : (isWarning ? 'warning' : 'info'),
      priority: this.getLevelPriority(level),
    };
  }

  /**
   * Determine if a WCAG level is required (error) based on primary level
   */
  private isRequiredLevel(level: WCAGLevel): boolean {
    switch (this.config.primaryLevel) {
      case 'A':
        return level === 'A';
      case 'AA':
        return level === 'A' || level === 'AA';
      case 'AAA':
        return level === 'A' || level === 'AA' || level === 'AAA';
      case 'ARIA':
        return level === 'ARIA';
      default:
        return false;
    }
  }

  /**
   * Determine if a WCAG level should be treated as warning
   */
  private isWarningLevel(level: WCAGLevel): boolean {
    if (this.isRequiredLevel(level)) {
      return false; // Required levels are errors, not warnings
    }

    // Any level higher than the primary level is treated as warning
    // if it could potentially be included
    switch (level) {
      case 'AA':
        return this.config.primaryLevel === 'A' && 
               (this.config.includeAAA || this.config.includeARIA);
      case 'AAA':
        return (this.config.primaryLevel === 'A' || this.config.primaryLevel === 'AA') &&
               this.config.includeAAA;
      case 'ARIA':
        return this.config.includeARIA;
      default:
        return false;
    }
  }

  /**
   * Get priority for WCAG level (lower number = higher priority)
   */
  private getLevelPriority(level: WCAGLevel): number {
    switch (level) {
      case 'A':
        return 1;
      case 'AA':
        return 2;
      case 'AAA':
        return 3;
      case 'ARIA':
        return 4;
      default:
        return 99;
    }
  }

  /**
   * Map WCAG level and impact to appropriate severity
   */
  mapToSeverity(
    level: WCAGLevel,
    impact: string,
    wcagReference?: string
  ): AccessibilityIssue['severity'] {
    // Check for custom severity overrides first
    if (wcagReference && this.config.severityOverrides[wcagReference]) {
      return this.config.severityOverrides[wcagReference];
    }

    const levelInfo = this.getLevelInfo(level);

    // If treating warnings as errors, upgrade warning severity
    if (levelInfo.isWarning && this.config.treatWarningsAsErrors) {
      return this.mapImpactToErrorSeverity(impact);
    }

    // For warning levels, cap severity at 'warning'
    if (levelInfo.isWarning) {
      return this.mapImpactToWarningSeverity(impact);
    }

    // For required levels, map impact to full severity range
    return this.mapImpactToErrorSeverity(impact);
  }

  /**
   * Map impact to error severity (full range)
   */
  private mapImpactToErrorSeverity(impact: string): AccessibilityIssue['severity'] {
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
        return 'moderate';
    }
  }

  /**
   * Map impact to warning severity (capped at warning)
   */
  private mapImpactToWarningSeverity(impact: string): AccessibilityIssue['severity'] {
    switch (impact?.toLowerCase()) {
      case 'critical':
      case 'serious':
        return 'warning';
      case 'moderate':
        return 'warning';
      case 'minor':
        return 'warning';
      default:
        return 'warning';
    }
  }

  /**
   * Filter issues based on WCAG level configuration
   */
  filterIssues(issues: AccessibilityIssue[]): AccessibilityIssue[] {
    return issues.filter(issue => {
      // Handle best practices separately
      if (issue.tags.includes('best-practice')) {
        return this.config.includeBestPractices;
      }

      // Otherwise check if level should be included
      return this.shouldIncludeLevel(issue.level);
    });
  }

  /**
   * Categorize issues by WCAG level
   */
  categorizeIssues(issues: AccessibilityIssue[]): {
    errors: AccessibilityIssue[];
    warnings: AccessibilityIssue[];
    info: AccessibilityIssue[];
  } {
    const errors: AccessibilityIssue[] = [];
    const warnings: AccessibilityIssue[] = [];
    const info: AccessibilityIssue[] = [];

    for (const issue of issues) {
      const levelInfo = this.getLevelInfo(issue.level);
      
      switch (levelInfo.category) {
        case 'error':
          errors.push(issue);
          break;
        case 'warning':
          warnings.push(issue);
          break;
        case 'info':
          info.push(issue);
          break;
      }
    }

    return { errors, warnings, info };
  }

  /**
   * Generate axe-core tags based on WCAG level configuration
   */
  generateAxeTags(): string[] {
    const tags: string[] = [];

    // Always include base WCAG tags based on primary level
    if (this.config.primaryLevel === 'AAA') {
      tags.push('wcag2aaa', 'wcag2aa', 'wcag2a');
    } else if (this.config.primaryLevel === 'AA') {
      tags.push('wcag2aa', 'wcag2a');
    } else if (this.config.primaryLevel === 'A') {
      tags.push('wcag2a');
    } else if (this.config.primaryLevel === 'ARIA') {
      // ARIA is typically part of WCAG 2.x
      tags.push('wcag2a', 'wcag2aa');
    }

    // Add additional tags based on configuration
    if (this.config.includeAAA && !tags.includes('wcag2aaa')) {
      tags.push('wcag2aaa');
    }

    if (this.config.includeARIA) {
      // ARIA rules are embedded in WCAG 2.x tags, but only add what we need
      if (!tags.includes('wcag2a')) tags.push('wcag2a');
      // Only add wcag2aa if we already include AA level rules
      if ((this.config.primaryLevel === 'AA' || this.config.primaryLevel === 'AAA') && 
          !tags.includes('wcag2aa')) {
        tags.push('wcag2aa');
      }
    }

    if (this.config.includeBestPractices) {
      tags.push('best-practice');
    }

    return tags;
  }

  /**
   * Get compliance summary for scan results
   */
  getComplianceSummary(issues: AccessibilityIssue[]): {
    compliant: boolean;
    primaryLevelIssues: number;
    warningIssues: number;
    totalIssues: number;
    levelBreakdown: Record<WCAGLevel, number>;
  } {
    const categorized = this.categorizeIssues(issues);
    const levelBreakdown: Record<WCAGLevel, number> = {
      'A': 0,
      'AA': 0,
      'AAA': 0,
      'ARIA': 0,
    };

    // Count issues by level
    issues.forEach(issue => {
      levelBreakdown[issue.level]++;
    });

    return {
      compliant: categorized.errors.length === 0,
      primaryLevelIssues: categorized.errors.length,
      warningIssues: categorized.warnings.length,
      totalIssues: issues.length,
      levelBreakdown,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WCAGLevelConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): WCAGLevelConfig {
    return { ...this.config };
  }

  /**
   * Get supported WCAG levels with descriptions
   */
  static getSupportedLevels(): Array<{
    level: WCAGLevel;
    description: string;
    requirements: string;
  }> {
    return [
      {
        level: 'A',
        description: 'WCAG 2.2 Level A (Minimum)',
        requirements: 'Basic web accessibility features that must be in place',
      },
      {
        level: 'AA',
        description: 'WCAG 2.2 Level AA (Standard)',
        requirements: 'Standard compliance level for most organizations and legal requirements',
      },
      {
        level: 'AAA',
        description: 'WCAG 2.2 Level AAA (Enhanced)',
        requirements: 'Highest level of accessibility, not required for entire sites',
      },
      {
        level: 'ARIA',
        description: 'ARIA Best Practices',
        requirements: 'Accessible Rich Internet Applications best practices and patterns',
      },
    ];
  }
} 