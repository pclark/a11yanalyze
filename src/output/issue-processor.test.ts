/**
 * IssueProcessor unit tests
 * Tests enhanced issue processing with WCAG database integration
 */

import { IssueProcessor, IssueProcessingOptions, EnhancedIssue } from './issue-processor';
import { AccessibilityIssue } from '../types';
import { getWCAGCriterion } from '../data/wcag-database';

describe('IssueProcessor', () => {
  let issueProcessor: IssueProcessor;

  beforeEach(() => {
    issueProcessor = new IssueProcessor();
  });

  // Helper function to create mock accessibility issues
  const createMockIssue = (overrides: Partial<AccessibilityIssue> = {}): AccessibilityIssue => ({
    id: 'issue-1',
    wcagReference: '1.1.1',
    level: 'A',
    severity: 'serious',
    element: '<img src="test.jpg">',
    selector: 'img',
    message: 'Image missing alt text',
    remediation: 'Add descriptive alt text to the image',
    helpUrl: 'https://help.example.com/alt-text',
    impact: 'Users with screen readers cannot understand the image content',
    tags: ['wcag2aa', 'section508'],
    ...overrides,
  });

  describe('Issue Processing', () => {
    it('should enhance a basic issue with WCAG information', async () => {
      const issue = createMockIssue();
      const enhancedIssues = await issueProcessor.processIssues([issue]);

      expect(enhancedIssues).toHaveLength(1);
      const enhanced = enhancedIssues[0];

      expect(enhanced.wcagCriterion).toBeDefined();
      expect(enhanced.wcagCriterion?.number).toBe('1.1.1');
      expect(enhanced.wcagCriterion?.title).toBe('Non-text Content');
      expect(enhanced.priorityScore).toBeGreaterThan(0);
      expect(enhanced.impactAssessment).toBeDefined();
      expect(enhanced.complexity).toBeDefined();
    });

    it('should sort issues by priority score', async () => {
      const issues = [
        createMockIssue({ id: 'low', severity: 'minor' }),
        createMockIssue({ id: 'high', severity: 'critical' }),
        createMockIssue({ id: 'medium', severity: 'serious' }),
      ];

      const enhancedIssues = await issueProcessor.processIssues(issues);

      expect(enhancedIssues[0].id).toBe('high'); // Critical first
      expect(enhancedIssues[1].id).toBe('medium'); // Serious second
      expect(enhancedIssues[2].id).toBe('low'); // Minor last
    });

    it('should handle issues without WCAG database entries gracefully', async () => {
      const issue = createMockIssue({
        wcagReference: '999.999.999', // Non-existent
      });

      const enhancedIssues = await issueProcessor.processIssues([issue]);

      expect(enhancedIssues).toHaveLength(1);
      expect(enhancedIssues[0].wcagCriterion).toBeUndefined();
      expect(enhancedIssues[0].priorityScore).toBeGreaterThan(0);
    });

    it('should apply processing options correctly', async () => {
      const issue = createMockIssue();
      const options: Partial<IssueProcessingOptions> = {
        includeCodeExamples: false,
        includeTestingGuidance: false,
        contextAware: false,
      };

      const enhancedIssues = await issueProcessor.processIssues([issue], options);
      const enhanced = enhancedIssues[0];

      expect(enhanced.contextualRemediation).toBeUndefined();
      expect(enhanced.testingGuidance).toBeUndefined();
    });
  });

  describe('Priority Scoring', () => {
    it('should score critical issues highest', async () => {
      const critical = createMockIssue({ severity: 'critical', level: 'A' });
      const minor = createMockIssue({ severity: 'minor', level: 'AAA' });

      const enhancedIssues = await issueProcessor.processIssues([critical, minor]);

      expect(enhancedIssues[0].priorityScore).toBeGreaterThan(enhancedIssues[1].priorityScore!);
    });

    it('should prioritize Level A issues over AAA', async () => {
      const levelA = createMockIssue({ severity: 'serious', level: 'A' });
      const levelAAA = createMockIssue({ severity: 'serious', level: 'AAA' });

      const enhancedIssues = await issueProcessor.processIssues([levelA, levelAAA]);

      expect(enhancedIssues[0].priorityScore).toBeGreaterThan(enhancedIssues[1].priorityScore!);
    });

    it('should adjust scoring based on priority mode', async () => {
      const issue = createMockIssue({ severity: 'serious', wcagReference: '1.1.1' });

      const impactMode = await issueProcessor.processIssues([issue], { priorityMode: 'impact' });
      const severityMode = await issueProcessor.processIssues([issue], { priorityMode: 'severity' });

      expect(impactMode[0].priorityScore).not.toEqual(severityMode[0].priorityScore);
    });
  });

  describe('Contextual Remediation', () => {
    it('should provide context-aware guidance for form elements', async () => {
      const formIssue = createMockIssue({
        wcagReference: '3.3.2',
        element: '<input type="email">',
        selector: 'input[type="email"]',
      });

      const enhancedIssues = await issueProcessor.processIssues([formIssue]);
      const remediation = enhancedIssues[0].contextualRemediation;

      expect(remediation).toBeDefined();
      expect(remediation?.steps.some(step => 
        step.includes('form') || step.includes('screen reader')
      )).toBe(true);
      expect(remediation?.summary).toContain('form elements');
    });

    it('should provide context-aware guidance for interactive elements', async () => {
      const buttonIssue = createMockIssue({
        wcagReference: '2.1.1',
        element: '<div role="button">Click me</div>',
        selector: 'div[role="button"]',
      });

      const enhancedIssues = await issueProcessor.processIssues([buttonIssue]);
      const remediation = enhancedIssues[0].contextualRemediation;

      expect(remediation).toBeDefined();
      expect(remediation?.steps.some(step => 
        step.includes('keyboard') || step.includes('focus')
      )).toBe(true);
    });

    it('should include code examples when requested', async () => {
      const issue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([issue], {
        includeCodeExamples: true,
        maxCodeExamples: 2,
      });

      const remediation = enhancedIssues[0].contextualRemediation;
      expect(remediation?.codeExamples).toBeDefined();
      expect(remediation?.codeExamples.length).toBeLessThanOrEqual(2);
    });

    it('should determine urgency correctly', async () => {
      const criticalIssue = createMockIssue({ severity: 'critical' });
      const minorIssue = createMockIssue({ severity: 'minor' });

      const enhancedIssues = await issueProcessor.processIssues([criticalIssue, minorIssue]);

      expect(enhancedIssues[0].contextualRemediation?.urgency).toBe('immediate');
      expect(enhancedIssues[1].contextualRemediation?.urgency).toBe('low');
    });
  });

  describe('Impact Assessment', () => {
    it('should estimate users affected correctly', async () => {
      const altTextIssue = createMockIssue({ wcagReference: '1.1.1' });
      const contrastIssue = createMockIssue({ wcagReference: '1.4.3' });

      const enhancedIssues = await issueProcessor.processIssues([altTextIssue, contrastIssue]);

      expect(enhancedIssues[0].impactAssessment?.usersAffected).toBe(15); // Alt text impact
      expect(enhancedIssues[1].impactAssessment?.usersAffected).toBe(25); // Contrast impact
    });

    it('should identify assistive technology impact', async () => {
      const keyboardIssue = createMockIssue({ wcagReference: '2.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([keyboardIssue]);
      const impact = enhancedIssues[0].impactAssessment;

      expect(impact?.assistiveTechImpact).toContain('Keyboard users');
      expect(impact?.assistiveTechImpact).toContain('Switch devices');
    });

    it('should assess compliance risk appropriately', async () => {
      const criticalA = createMockIssue({ severity: 'critical', level: 'A' });
      const minorAAA = createMockIssue({ severity: 'minor', level: 'AAA' });

      const enhancedIssues = await issueProcessor.processIssues([criticalA, minorAAA]);

      expect(enhancedIssues[0].impactAssessment?.complianceRisk).toBe('high');
      expect(enhancedIssues[1].impactAssessment?.complianceRisk).toBe('low');
    });

    it('should generate business impact descriptions', async () => {
      const highImpactIssue = createMockIssue({ wcagReference: '1.4.3' }); // 25% users affected

      const enhancedIssues = await issueProcessor.processIssues([highImpactIssue]);
      const businessImpact = enhancedIssues[0].impactAssessment?.businessImpact;

      expect(businessImpact).toContain('High impact');
      expect(businessImpact).toContain('significant portion');
    });
  });

  describe('Complexity Assessment', () => {
    it('should assess fix complexity based on WCAG criterion', async () => {
      const simpleIssue = createMockIssue({ wcagReference: '1.1.1' }); // Easy fix
      const complexIssue = createMockIssue({ wcagReference: '4.1.2' }); // Complex fix

      const enhancedIssues = await issueProcessor.processIssues([simpleIssue, complexIssue]);

      expect(enhancedIssues[0].complexity?.level).toBe('simple');
      expect(enhancedIssues[1].complexity?.level).toBe('complex');
    });

    it('should adjust complexity for custom components', async () => {
      const customComponentIssue = createMockIssue({
        element: '<div role="tabpanel" aria-labelledby="tab1">',
        selector: 'div[role="tabpanel"]',
      });

      const enhancedIssues = await issueProcessor.processIssues([customComponentIssue]);
      const complexity = enhancedIssues[0].complexity;

      expect(complexity?.skillsRequired).toContain('Component architecture');
      expect(complexity?.riskLevel).toBe('medium');
    });

    it('should identify JavaScript requirements', async () => {
      const jsIssue = createMockIssue({
        element: '<div onclick="handler()" role="button">',
        selector: 'div[onclick]',
      });

      const enhancedIssues = await issueProcessor.processIssues([jsIssue]);
      const complexity = enhancedIssues[0].complexity;

      expect(complexity?.skillsRequired).toContain('JavaScript');
    });

    it('should provide time estimates', async () => {
      const issue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([issue]);
      const complexity = enhancedIssues[0].complexity;

      expect(complexity?.estimatedTime).toBeDefined();
      expect(complexity?.estimatedTime).toMatch(/\d+/); // Contains numbers
    });
  });

  describe('Testing Guidance', () => {
    it('should include testing guidance when requested', async () => {
      const issue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([issue], {
        includeTestingGuidance: true,
      });

      const testing = enhancedIssues[0].testingGuidance;
      expect(testing).toBeDefined();
      expect(testing?.quickTests).toBeDefined();
      expect(testing?.automatedTools).toBeDefined();
      expect(testing?.verificationCriteria).toBeDefined();
    });

    it('should provide issue-specific quick tests', async () => {
      const altTextIssue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([altTextIssue], {
        includeTestingGuidance: true,
      });

      const quickTests = enhancedIssues[0].testingGuidance?.quickTests;
      expect(quickTests?.some(test => 
        test.includes('Right-click') || test.includes('alt text')
      )).toBe(true);
    });

    it('should include screen reader tests for relevant issues', async () => {
      const issue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([issue], {
        includeTestingGuidance: true,
      });

      const testing = enhancedIssues[0].testingGuidance;
      expect(testing?.screenReaderTests).toBeDefined();
      expect(testing?.screenReaderTests?.length).toBeGreaterThan(0);
    });
  });

  describe('Issue Categorization', () => {
    it('should categorize issues correctly by WCAG reference', async () => {
      const issues = [
        createMockIssue({ wcagReference: '1.1.1', id: 'images' }),
        createMockIssue({ wcagReference: '1.4.3', id: 'color' }),
        createMockIssue({ wcagReference: '2.1.1', id: 'keyboard' }),
        createMockIssue({ wcagReference: '3.3.2', id: 'forms' }),
        createMockIssue({ wcagReference: '4.1.2', id: 'aria' }),
      ];

      const enhancedIssues = await issueProcessor.processIssues(issues);

      expect(enhancedIssues.find(i => i.id === 'images')?.category).toBe('images');
      expect(enhancedIssues.find(i => i.id === 'color')?.category).toBe('color');
      expect(enhancedIssues.find(i => i.id === 'keyboard')?.category).toBe('keyboard');
      expect(enhancedIssues.find(i => i.id === 'forms')?.category).toBe('forms');
      expect(enhancedIssues.find(i => i.id === 'aria')?.category).toBe('aria');
    });

    it('should categorize by element type when WCAG reference is unclear', async () => {
      const formIssue = createMockIssue({
        wcagReference: '999.999.999',
        element: '<input type="text">',
      });

      const enhancedIssues = await issueProcessor.processIssues([formIssue]);
      expect(enhancedIssues[0].category).toBe('forms');
    });
  });

  describe('Related Issues', () => {
    it('should identify related WCAG criteria', async () => {
      const issue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([issue]);
      const relatedIssues = enhancedIssues[0].relatedIssues;

      expect(relatedIssues).toBeDefined();
      expect(relatedIssues?.length).toBeGreaterThan(0);
      expect(relatedIssues).toContain('1.4.5'); // Related to 1.1.1
    });
  });

  describe('Issue Summary Generation', () => {
    it('should generate comprehensive issue summary', async () => {
      const issues = [
        createMockIssue({ severity: 'critical', wcagReference: '1.1.1' }),
        createMockIssue({ severity: 'serious', wcagReference: '1.4.3' }),
        createMockIssue({ severity: 'moderate', wcagReference: '2.1.1' }),
      ];

      const enhancedIssues = await issueProcessor.processIssues(issues);
      const summary = issueProcessor.generateIssueSummary(enhancedIssues);

      expect(summary.total).toBe(3);
      expect(summary.bySeverity.critical).toBe(1);
      expect(summary.bySeverity.serious).toBe(1);
      expect(summary.bySeverity.moderate).toBe(1);
      expect(summary.byCategory).toBeDefined();
      expect(summary.byComplexity).toBeDefined();
      expect(summary.byUrgency).toBeDefined();
    });

    it('should identify quick wins', async () => {
      const quickWin = createMockIssue({ 
        severity: 'serious', 
        wcagReference: '1.1.1' // Easy fix 
      });
      const complexIssue = createMockIssue({ 
        severity: 'serious', 
        wcagReference: '4.1.2' // Complex fix 
      });

      const enhancedIssues = await issueProcessor.processIssues([quickWin, complexIssue]);
      const summary = issueProcessor.generateIssueSummary(enhancedIssues);

      expect(summary.quickWins).toBe(1); // Only the easy fix counts as quick win
    });

    it('should count high impact issues', async () => {
      const highImpact = createMockIssue({ wcagReference: '1.4.3' }); // 25% users affected
      const lowImpact = createMockIssue({ wcagReference: '1.1.1' }); // 15% users affected

      const enhancedIssues = await issueProcessor.processIssues([highImpact, lowImpact]);
      const summary = issueProcessor.generateIssueSummary(enhancedIssues);

      expect(summary.highImpact).toBe(1); // Only contrast issue is high impact (>20%)
    });
  });

  describe('Error Handling', () => {
    it('should handle empty issue arrays', async () => {
      const enhancedIssues = await issueProcessor.processIssues([]);
      expect(enhancedIssues).toHaveLength(0);
    });

    it('should handle issues with missing properties gracefully', async () => {
      const incompleteIssue = {
        id: 'incomplete',
        wcagReference: '1.1.1',
        level: 'A',
        severity: 'serious',
        element: '<img>',
        selector: 'img',
        // Missing message, remediation, etc.
      } as AccessibilityIssue;

      const enhancedIssues = await issueProcessor.processIssues([incompleteIssue]);
      expect(enhancedIssues).toHaveLength(1);
      expect(enhancedIssues[0].title).toBe('Accessibility Issue'); // Default title
    });

    it('should handle malformed HTML gracefully', async () => {
      const malformedIssue = createMockIssue({
        element: '<div><span>Unclosed tags',
        selector: 'div span',
      });

      const enhancedIssues = await issueProcessor.processIssues([malformedIssue]);
      expect(enhancedIssues).toHaveLength(1);
      expect(enhancedIssues[0].elements[0].html).toBeDefined();
    });
  });

  describe('Tool Recommendations', () => {
    it('should recommend context-specific tools', async () => {
      const contrastIssue = createMockIssue({ wcagReference: '1.4.3' });

      const enhancedIssues = await issueProcessor.processIssues([contrastIssue]);
      const tools = enhancedIssues[0].contextualRemediation?.recommendedTools;

      expect(tools).toContain('WebAIM Contrast Checker');
      expect(tools).toContain('Colour Contrast Analyser');
    });

    it('should include keyboard testing tools for keyboard issues', async () => {
      const keyboardIssue = createMockIssue({ wcagReference: '2.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([keyboardIssue]);
      const tools = enhancedIssues[0].contextualRemediation?.recommendedTools;

      expect(tools).toContain('Keyboard navigation testing');
    });

    it('should remove duplicate tool recommendations', async () => {
      const issue = createMockIssue({ wcagReference: '1.1.1' });

      const enhancedIssues = await issueProcessor.processIssues([issue]);
      const tools = enhancedIssues[0].contextualRemediation?.recommendedTools;

      const uniqueTools = [...new Set(tools)];
      expect(tools?.length).toBe(uniqueTools.length);
    });
  });
}); 