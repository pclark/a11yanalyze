import { AccessibilityIssue } from '../types';
import { 
  getWCAGCriterion, 
  COMMON_ISSUE_PATTERNS, 
  WCAGCriterion,
  RemediationGuidance,
  CodeExample 
} from '../data/wcag-database';
import { 
  ReportIssue, 
  IssueCategory, 
  AffectedElement,
  ElementPosition 
} from '../types/output';

/**
 * Enhanced issue processing options
 */
export interface IssueProcessingOptions {
  /** Include code examples in remediation */
  includeCodeExamples: boolean;
  /** Include testing guidance */
  includeTestingGuidance: boolean;
  /** Include estimated fix time */
  includeTimeEstimates: boolean;
  /** Priority mode for recommendations */
  priorityMode: 'severity' | 'impact' | 'effort' | 'quickWins';
  /** Context-aware recommendations */
  contextAware: boolean;
  /** Maximum number of code examples per issue */
  maxCodeExamples: number;
}

/**
 * Enhanced issue with detailed WCAG information
 */
export interface EnhancedIssue extends ReportIssue {
  /** Full WCAG criterion information */
  wcagCriterion?: WCAGCriterion;
  /** Contextual remediation guidance */
  contextualRemediation?: ContextualRemediation;
  /** Priority score for fixing */
  priorityScore?: number;
  /** Estimated impact assessment of fixing this issue */
  impactAssessment?: IssueImpact;
  /** Testing guidance */
  testingGuidance?: TestingGuidance;
  /** Related issues that might exist */
  relatedIssues?: string[];
  /** Fix complexity assessment */
  complexity?: FixComplexity;
}

/**
 * Contextual remediation based on element and context
 */
export interface ContextualRemediation {
  /** Context-specific summary */
  summary: string;
  /** Tailored steps for this specific context */
  steps: string[];
  /** Code examples relevant to this context */
  codeExamples: CodeExample[];
  /** Tools specific to this issue type */
  recommendedTools: string[];
  /** Additional considerations for this context */
  considerations: string[];
  /** Urgency level */
  urgency: 'immediate' | 'high' | 'medium' | 'low';
}

/**
 * Issue impact assessment
 */
export interface IssueImpact {
  /** Estimated percentage of users affected */
  usersAffected: number;
  /** Assistive technologies impacted */
  assistiveTechImpact: string[];
  /** Business impact description */
  businessImpact: string;
  /** Legal compliance risk */
  complianceRisk: 'high' | 'medium' | 'low';
}

/**
 * Testing guidance for verification
 */
export interface TestingGuidance {
  /** Quick manual tests */
  quickTests: string[];
  /** Automated testing tools */
  automatedTools: string[];
  /** Screen reader specific tests */
  screenReaderTests?: string[];
  /** Keyboard navigation tests */
  keyboardTests?: string[];
  /** Verification criteria */
  verificationCriteria: string[];
}

/**
 * Fix complexity assessment
 */
export interface FixComplexity {
  /** Overall complexity level */
  level: 'simple' | 'moderate' | 'complex' | 'architectural';
  /** Estimated time to fix */
  estimatedTime: string;
  /** Skills required */
  skillsRequired: string[];
  /** Dependencies and blockers */
  dependencies: string[];
  /** Risk of introducing new issues */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Enhanced issue processor for detailed accessibility reporting
 */
export class IssueProcessor {
  private defaultOptions: IssueProcessingOptions = {
    includeCodeExamples: true,
    includeTestingGuidance: true,
    includeTimeEstimates: true,
    priorityMode: 'impact',
    contextAware: true,
    maxCodeExamples: 3,
  };

  /**
   * Process and enhance accessibility issues with detailed WCAG information
   */
  async processIssues(
    issues: AccessibilityIssue[],
    options: Partial<IssueProcessingOptions> = {}
  ): Promise<EnhancedIssue[]> {
    const processingOptions = { ...this.defaultOptions, ...options };
    
    const enhancedIssues = await Promise.all(
      issues.map(issue => this.enhanceIssue(issue, processingOptions))
    );

    // Sort by priority score if available
    return enhancedIssues.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  /**
   * Enhance a single issue with detailed information
   * @private
   */
  private async enhanceIssue(
    issue: AccessibilityIssue,
    options: IssueProcessingOptions
  ): Promise<EnhancedIssue> {
    const wcagCriterion = getWCAGCriterion(issue.wcagReference);
    const baseReportIssue = this.convertToReportIssue(issue);

    const enhanced: EnhancedIssue = {
      ...baseReportIssue,
      wcagCriterion,
      priorityScore: this.calculatePriorityScore(issue, wcagCriterion, options.priorityMode),
      impactAssessment: this.assessIssueImpact(issue, wcagCriterion),
      complexity: this.assessFixComplexity(issue, wcagCriterion),
    };

    if (options.contextAware) {
      enhanced.contextualRemediation = this.generateContextualRemediation(
        issue,
        wcagCriterion,
        options
      );
    }

    if (options.includeTestingGuidance && wcagCriterion) {
      enhanced.testingGuidance = this.generateTestingGuidance(wcagCriterion, issue);
    }

    if (wcagCriterion) {
      enhanced.relatedIssues = this.findRelatedIssues(issue, wcagCriterion);
    }

    return enhanced;
  }

  /**
   * Convert AccessibilityIssue to ReportIssue format
   * @private
   */
  private convertToReportIssue(issue: AccessibilityIssue): ReportIssue {
    return {
      id: issue.id,
      wcagReference: issue.wcagReference,
      level: issue.level,
      severity: issue.severity,
      category: this.categorizeIssue(issue),
      title: this.generateIssueTitle(issue),
      description: issue.message,
      impact: issue.impact,
      remediation: issue.remediation,
      helpUrl: issue.helpUrl,
      occurrences: 1,
      elements: [this.convertToAffectedElement(issue)],
    };
  }

  /**
   * Generate contextual remediation guidance
   * @private
   */
  private generateContextualRemediation(
    issue: AccessibilityIssue,
    wcagCriterion?: WCAGCriterion,
    options?: IssueProcessingOptions
  ): ContextualRemediation {
    const context = this.analyzeElementContext(issue);
    const patternMatch = this.findPatternMatch(issue);
    
    let summary = issue.remediation;
    let steps: string[] = [];
    let codeExamples: CodeExample[] = [];
    let urgency: 'immediate' | 'high' | 'medium' | 'low' = 'medium';

    if (wcagCriterion) {
      summary = wcagCriterion.remediation.summary;
      steps = wcagCriterion.remediation.steps;
      
      if (options?.includeCodeExamples) {
        codeExamples = wcagCriterion.examples.slice(0, options.maxCodeExamples);
      }

      // Adjust urgency based on severity and level
      urgency = this.determineUrgency(issue, wcagCriterion);
    }

    // Add context-specific guidance
    if (context.isFormElement) {
      steps = this.addFormSpecificSteps(steps, issue);
    }

    if (context.isInteractiveElement) {
      steps = this.addInteractiveElementSteps(steps, issue);
    }

    if (context.isImageElement) {
      steps = this.addImageSpecificSteps(steps, issue);
    }

    return {
      summary: this.contextualizeGuidance(summary, context),
      steps: this.contextualizeSteps(steps, context),
      codeExamples,
      recommendedTools: this.getRecommendedTools(issue, wcagCriterion),
      considerations: this.getContextualConsiderations(issue, context, wcagCriterion),
      urgency,
    };
  }

  /**
   * Calculate priority score for issue
   * @private
   */
  private calculatePriorityScore(
    issue: AccessibilityIssue,
    wcagCriterion?: WCAGCriterion,
    priorityMode: IssueProcessingOptions['priorityMode'] = 'impact'
  ): number {
    let score = 0;

    // Base severity score
    const severityScores = {
      critical: 100,
      serious: 80,
      moderate: 60,
      minor: 40,
      warning: 20
    };
    score += severityScores[issue.severity];

    // WCAG level impact
    const levelScores = { A: 30, AA: 20, AAA: 10, ARIA: 15 };
    score += levelScores[issue.level];

    switch (priorityMode) {
      case 'severity':
        // Severity-first prioritization
        score *= 1.5;
        break;
        
      case 'impact':
        // User impact prioritization
        if (this.isHighImpactIssue(issue)) score += 25;
        break;
        
      case 'effort':
        // Effort-based prioritization (easier fixes first)
        const complexity = wcagCriterion?.remediation.difficulty;
        if (complexity === 'easy') score += 20;
        else if (complexity === 'moderate') score += 10;
        break;
        
      case 'quickWins':
        // Quick wins (high impact, low effort)
        if (this.isQuickWin(issue, wcagCriterion)) score += 30;
        break;
    }

    return Math.round(score);
  }

  /**
   * Assess the impact of an issue
   * @private
   */
  private assessIssueImpact(
    issue: AccessibilityIssue,
    wcagCriterion?: WCAGCriterion
  ): IssueImpact {
    const assistiveTechImpact = this.determineAssistiveTechImpact(issue);
    const usersAffected = this.estimateUsersAffected(issue, wcagCriterion);
    const complianceRisk = this.assessComplianceRisk(issue);

    return {
      usersAffected,
      assistiveTechImpact,
      businessImpact: this.generateBusinessImpact(issue, usersAffected),
      complianceRisk,
    };
  }

  /**
   * Assess fix complexity
   * @private
   */
  private assessFixComplexity(
    issue: AccessibilityIssue,
    wcagCriterion?: WCAGCriterion
  ): FixComplexity {
    const context = this.analyzeElementContext(issue);
    
    let level: FixComplexity['level'] = 'moderate';
    let estimatedTime = '15-30 minutes';
    let skillsRequired = ['HTML/CSS'];
    let dependencies: string[] = [];
    let riskLevel: FixComplexity['riskLevel'] = 'low';

    if (wcagCriterion) {
      switch (wcagCriterion.remediation.difficulty) {
        case 'easy':
          level = 'simple';
          estimatedTime = wcagCriterion.remediation.estimatedTime;
          break;
        case 'complex':
          level = 'complex';
          estimatedTime = wcagCriterion.remediation.estimatedTime;
          skillsRequired = ['HTML/CSS', 'JavaScript', 'ARIA'];
          riskLevel = 'medium';
          break;
        default:
          estimatedTime = wcagCriterion.remediation.estimatedTime;
      }
    }

    // Adjust based on context
    if (context.isCustomComponent) {
      level = level === 'simple' ? 'moderate' : 'complex';
      skillsRequired.push('Component architecture');
      riskLevel = 'medium';
    }

    if (context.requiresJavaScript) {
      skillsRequired.push('JavaScript');
      if (level === 'simple') level = 'moderate';
    }

    return {
      level,
      estimatedTime,
      skillsRequired,
      dependencies,
      riskLevel,
    };
  }

  /**
   * Generate testing guidance
   * @private
   */
  private generateTestingGuidance(
    wcagCriterion: WCAGCriterion,
    issue: AccessibilityIssue
  ): TestingGuidance {
    const quickTests = this.generateQuickTests(issue, wcagCriterion);
    
    return {
      quickTests,
      automatedTools: wcagCriterion.testing.automated,
      screenReaderTests: wcagCriterion.testing.screenReader,
      keyboardTests: wcagCriterion.testing.keyboard,
      verificationCriteria: this.generateVerificationCriteria(issue, wcagCriterion),
    };
  }

  /**
   * Analyze element context
   * @private
   */
  private analyzeElementContext(issue: AccessibilityIssue) {
    const element = issue.element.toLowerCase();
    const selector = issue.selector.toLowerCase();

    return {
      isFormElement: /input|select|textarea|button|fieldset|legend|label/.test(element),
      isInteractiveElement: /button|input|select|textarea|a\[href\]|role="button"|role="link"/.test(element + selector),
      isImageElement: /img|svg|role="img"/.test(element + selector),
      isCustomComponent: /role=|aria-/.test(element + selector),
      requiresJavaScript: /onclick|role="button"|role="tab"|role="dialog"/.test(element + selector),
      isTableElement: /table|th|td|caption/.test(element),
      isHeadingElement: /h[1-6]|role="heading"/.test(element + selector),
      isLandmarkElement: /nav|main|aside|section|role="banner"|role="navigation"/.test(element + selector),
    };
  }

  /**
   * Helper methods for issue analysis
   * @private
   */
  
  private categorizeIssue(issue: AccessibilityIssue): IssueCategory {
    const ref = issue.wcagReference;
    const element = issue.element.toLowerCase();
    
    if (ref.startsWith('1.1')) return 'images';
    if (ref.startsWith('1.3')) return 'structure';
    if (ref.startsWith('1.4') && ref.includes('3')) return 'color';
    if (ref.startsWith('2.1')) return 'keyboard';
    if (ref.startsWith('2.4')) return 'navigation';
    if (ref.startsWith('3.3')) return 'forms';
    if (ref.startsWith('4.1')) return 'aria';
    if (element.includes('input') || element.includes('form')) return 'forms';
    if (element.includes('img')) return 'images';
    return 'other';
  }

  private generateIssueTitle(issue: AccessibilityIssue): string {
    const message = issue.message;
    return message?.split('.')[0]?.trim() || 'Accessibility Issue';
  }

  private convertToAffectedElement(issue: AccessibilityIssue): AffectedElement {
    return {
      selector: issue.selector,
      html: this.truncateHtml(issue.element),
      text: this.extractElementText(issue.element),
      context: `Issue: ${issue.message}`,
    };
  }

  private truncateHtml(html: string, maxLength = 200): string {
    return html.length > maxLength ? html.substring(0, maxLength) + '...' : html;
  }

  private extractElementText(html: string): string | undefined {
    const textMatch = html.match(/>([^<]+)</);
    return textMatch?.[1]?.trim();
  }

  private findPatternMatch(issue: AccessibilityIssue) {
    return Object.entries(COMMON_ISSUE_PATTERNS).find(([_, pattern]) =>
      (pattern.criteria as readonly string[]).includes(issue.wcagReference)
    );
  }

  private determineUrgency(
    issue: AccessibilityIssue,
    wcagCriterion: WCAGCriterion
  ): 'immediate' | 'high' | 'medium' | 'low' {
    if (issue.severity === 'critical') return 'immediate';
    if (issue.severity === 'serious' && issue.level === 'A') return 'high';
    if (issue.severity === 'serious') return 'medium';
    return 'low';
  }

  private addFormSpecificSteps(steps: string[], issue: AccessibilityIssue): string[] {
    const formSteps = [
      'Test form completion using only a screen reader',
      'Verify error messages are properly associated with form controls',
      'Check that required field indicators are accessible',
    ];
    return [...steps, ...formSteps];
  }

  private addInteractiveElementSteps(steps: string[], issue: AccessibilityIssue): string[] {
    const interactiveSteps = [
      'Test keyboard navigation to and from this element',
      'Verify focus indicators are visible and sufficient',
      'Test activation with both Enter and Space keys',
    ];
    return [...steps, ...interactiveSteps];
  }

  private addImageSpecificSteps(steps: string[], issue: AccessibilityIssue): string[] {
    const imageSteps = [
      'Review image in context to determine appropriate alt text',
      'Consider if image is decorative, informative, or functional',
      'Test with images disabled to verify text alternative is sufficient',
    ];
    return [...steps, ...imageSteps];
  }

  private contextualizeGuidance(summary: string, context: any): string {
    if (context.isFormElement) {
      return `${summary} This is particularly important for form elements as screen reader users rely on proper labeling to complete forms successfully.`;
    }
    if (context.isInteractiveElement) {
      return `${summary} Interactive elements must be keyboard accessible and properly announced to assistive technologies.`;
    }
    return summary;
  }

  private contextualizeSteps(steps: string[], context: any): string[] {
    // Add context-specific steps at the beginning
    const contextSteps = [];
    
    if (context.isCustomComponent) {
      contextSteps.push('Review ARIA authoring practices for this component type');
    }
    
    if (context.requiresJavaScript) {
      contextSteps.push('Ensure progressive enhancement - basic functionality without JavaScript');
    }

    return [...contextSteps, ...steps];
  }

  private getRecommendedTools(
    issue: AccessibilityIssue,
    wcagCriterion?: WCAGCriterion
  ): string[] {
    const tools = ['axe browser extension', 'Screen reader'];
    
    if (wcagCriterion) {
      tools.push(...wcagCriterion.remediation.tools);
    }

    // Add context-specific tools
    if (issue.wcagReference === '1.4.3') {
      tools.push('WebAIM Contrast Checker', 'Colour Contrast Analyser');
    }

    if (issue.wcagReference.startsWith('2.1')) {
      tools.push('Keyboard navigation testing');
    }

    return [...new Set(tools)]; // Remove duplicates
  }

  private getContextualConsiderations(
    issue: AccessibilityIssue,
    context: any,
    wcagCriterion?: WCAGCriterion
  ): string[] {
    const considerations = wcagCriterion?.remediation.considerations || [];
    
    if (context.isFormElement) {
      considerations.push('Consider the user journey and form validation feedback');
    }

    if (context.isCustomComponent) {
      considerations.push('Follow established design patterns for consistency');
    }

    return considerations;
  }

  private isHighImpactIssue(issue: AccessibilityIssue): boolean {
    const highImpactRefs = ['1.1.1', '2.1.1', '3.3.2', '4.1.2'];
    return highImpactRefs.includes(issue.wcagReference) || issue.severity === 'critical';
  }

  private isQuickWin(issue: AccessibilityIssue, wcagCriterion?: WCAGCriterion): boolean {
    return (
      issue.severity === 'serious' &&
      wcagCriterion?.remediation.difficulty === 'easy'
    );
  }

  private determineAssistiveTechImpact(issue: AccessibilityIssue): string[] {
    const impact = [];
    
    if (issue.wcagReference.startsWith('1.1')) {
      impact.push('Screen readers', 'Braille displays');
    }
    
    if (issue.wcagReference.startsWith('2.1')) {
      impact.push('Keyboard users', 'Switch devices', 'Voice control');
    }
    
    if (issue.wcagReference.startsWith('1.4.3')) {
      impact.push('Users with low vision', 'Users with color vision deficiency');
    }

    return impact;
  }

  private estimateUsersAffected(
    issue: AccessibilityIssue,
    wcagCriterion?: WCAGCriterion
  ): number {
    // Rough estimates based on disability statistics and issue type
    const baseRates = {
      '1.1.1': 15, // Screen reader users + others who benefit
      '1.4.3': 25, // Low vision + color vision deficiency
      '2.1.1': 20, // Motor disabilities + preference users
      '3.3.2': 30, // Cognitive disabilities + all users
      '4.1.2': 15, // Assistive technology users
    };

    return baseRates[issue.wcagReference as keyof typeof baseRates] || 10;
  }

  private assessComplianceRisk(issue: AccessibilityIssue): 'high' | 'medium' | 'low' {
    if (issue.level === 'A' && issue.severity === 'critical') return 'high';
    if (issue.level === 'AA' && ['critical', 'serious'].includes(issue.severity)) return 'high';
    if (issue.severity === 'serious') return 'medium';
    return 'low';
  }

  private generateBusinessImpact(issue: AccessibilityIssue, usersAffected: number): string {
    if (usersAffected > 20) {
      return 'High impact: Affects a significant portion of users and may impact brand reputation';
    }
    if (usersAffected > 10) {
      return 'Medium impact: Affects notable user segment and may impact user satisfaction';
    }
    return 'Low impact: Affects smaller user segment but important for compliance and inclusion';
  }

  private generateQuickTests(issue: AccessibilityIssue, wcagCriterion: WCAGCriterion): string[] {
    const tests = wcagCriterion.testing.manual.slice(0, 3);
    
    // Add issue-specific quick tests
    if (issue.wcagReference === '1.1.1') {
      tests.unshift('Right-click image and check if alt text appears in context menu');
    }
    
    if (issue.wcagReference.startsWith('2.1')) {
      tests.unshift('Tab to element and try activating with Enter and Space keys');
    }

    return tests;
  }

  private generateVerificationCriteria(
    issue: AccessibilityIssue,
    wcagCriterion: WCAGCriterion
  ): string[] {
    return [
      'Issue is no longer detected by automated testing tools',
      'Manual testing confirms expected behavior',
      'Screen reader announces content appropriately',
      'Solution works across different browsers and assistive technologies',
    ];
  }

  private findRelatedIssues(issue: AccessibilityIssue, wcagCriterion: WCAGCriterion): string[] {
    return wcagCriterion.relatedCriteria.slice(0, 3);
  }

  /**
   * Generate issue summary statistics
   */
  generateIssueSummary(issues: EnhancedIssue[]) {
    const summary = {
      total: issues.length,
      bySeverity: this.groupBySeverity(issues),
      byCategory: this.groupByCategory(issues),
      byComplexity: this.groupByComplexity(issues),
      byUrgency: this.groupByUrgency(issues),
      quickWins: issues.filter(issue => 
        issue.complexity?.level === 'simple' && 
        ['critical', 'serious'].includes(issue.severity)
      ).length,
      highImpact: issues.filter(issue => 
        (issue.impactAssessment?.usersAffected || 0) > 20
      ).length,
    };

    return summary;
  }

  private groupBySeverity(issues: EnhancedIssue[]) {
    return issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByCategory(issues: EnhancedIssue[]) {
    return issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByComplexity(issues: EnhancedIssue[]) {
    return issues.reduce((acc, issue) => {
      const level = issue.complexity?.level || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByUrgency(issues: EnhancedIssue[]) {
    return issues.reduce((acc, issue) => {
      const urgency = issue.contextualRemediation?.urgency || 'medium';
      acc[urgency] = (acc[urgency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
} 