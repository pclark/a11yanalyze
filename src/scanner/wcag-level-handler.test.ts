/**
 * WCAG Level Handler unit tests
 * Tests WCAG level selection, categorization, severity mapping, and compliance checking
 */

import { WCAGLevelHandler, WCAGLevelConfig } from './wcag-level-handler';
import { AccessibilityIssue, WCAGLevel } from '../types';

describe('WCAGLevelHandler', () => {
  let handler: WCAGLevelHandler;

  beforeEach(() => {
    handler = new WCAGLevelHandler();
  });

  describe('Constructor and Configuration', () => {
    it('should create handler with default configuration', () => {
      const config = handler.getConfig();
      
      expect(config).toEqual({
        primaryLevel: 'AA',
        includeAAA: true,
        includeARIA: true,
        treatWarningsAsErrors: false,
        includeBestPractices: false,
        severityOverrides: {},
      });
    });

    it('should create handler with custom configuration', () => {
      const customConfig: Partial<WCAGLevelConfig> = {
        primaryLevel: 'AAA',
        includeAAA: false,
        includeARIA: false,
        treatWarningsAsErrors: true,
        includeBestPractices: true,
        severityOverrides: {
          '1.1.1': 'critical',
        },
      };

      const customHandler = new WCAGLevelHandler(customConfig);
      const config = customHandler.getConfig();

      expect(config).toMatchObject(customConfig);
    });

    it('should update configuration correctly', () => {
      const newConfig: Partial<WCAGLevelConfig> = {
        primaryLevel: 'A',
        includeAAA: false,
      };

      handler.updateConfig(newConfig);
      const config = handler.getConfig();

      expect(config.primaryLevel).toBe('A');
      expect(config.includeAAA).toBe(false);
      expect(config.includeARIA).toBe(true); // Should remain unchanged
    });
  });

  describe('Level Inclusion Logic', () => {
    it('should include correct levels for AA primary level', () => {
      handler.updateConfig({ primaryLevel: 'AA' });

      expect(handler.shouldIncludeLevel('A')).toBe(true);
      expect(handler.shouldIncludeLevel('AA')).toBe(true);
      expect(handler.shouldIncludeLevel('AAA')).toBe(true); // Default includeAAA is true
      expect(handler.shouldIncludeLevel('ARIA')).toBe(true); // Default includeARIA is true
    });

    it('should include correct levels for A primary level', () => {
      handler.updateConfig({ primaryLevel: 'A' });

      expect(handler.shouldIncludeLevel('A')).toBe(true);
      expect(handler.shouldIncludeLevel('AA')).toBe(false);
      expect(handler.shouldIncludeLevel('AAA')).toBe(true); // Still included as warning
      expect(handler.shouldIncludeLevel('ARIA')).toBe(true);
    });

    it('should include correct levels for AAA primary level', () => {
      handler.updateConfig({ primaryLevel: 'AAA' });

      expect(handler.shouldIncludeLevel('A')).toBe(true);
      expect(handler.shouldIncludeLevel('AA')).toBe(true);
      expect(handler.shouldIncludeLevel('AAA')).toBe(true);
      expect(handler.shouldIncludeLevel('ARIA')).toBe(true);
    });

    it('should respect includeAAA configuration', () => {
      handler.updateConfig({ primaryLevel: 'AA', includeAAA: false });

      expect(handler.shouldIncludeLevel('AAA')).toBe(false);
    });

    it('should respect includeARIA configuration', () => {
      handler.updateConfig({ includeARIA: false });

      expect(handler.shouldIncludeLevel('ARIA')).toBe(false);
    });
  });

  describe('Level Information and Categorization', () => {
    it('should categorize levels correctly for AA primary level', () => {
      handler.updateConfig({ primaryLevel: 'AA' });

      const aInfo = handler.getLevelInfo('A');
      expect(aInfo.isRequired).toBe(true);
      expect(aInfo.isWarning).toBe(false);
      expect(aInfo.category).toBe('error');
      expect(aInfo.priority).toBe(1);

      const aaInfo = handler.getLevelInfo('AA');
      expect(aaInfo.isRequired).toBe(true);
      expect(aaInfo.isWarning).toBe(false);
      expect(aaInfo.category).toBe('error');
      expect(aaInfo.priority).toBe(2);

      const aaaInfo = handler.getLevelInfo('AAA');
      expect(aaaInfo.isRequired).toBe(false);
      expect(aaaInfo.isWarning).toBe(true);
      expect(aaaInfo.category).toBe('warning');
      expect(aaaInfo.priority).toBe(3);

      const ariaInfo = handler.getLevelInfo('ARIA');
      expect(ariaInfo.isRequired).toBe(false);
      expect(ariaInfo.isWarning).toBe(true);
      expect(ariaInfo.category).toBe('warning');
      expect(ariaInfo.priority).toBe(4);
    });

    it('should categorize levels correctly for A primary level', () => {
      handler.updateConfig({ primaryLevel: 'A' });

      const aInfo = handler.getLevelInfo('A');
      expect(aInfo.category).toBe('error');

      const aaInfo = handler.getLevelInfo('AA');
      expect(aaInfo.category).toBe('warning');

      const aaaInfo = handler.getLevelInfo('AAA');
      expect(aaaInfo.category).toBe('warning');
    });

    it('should categorize levels correctly for AAA primary level', () => {
      handler.updateConfig({ primaryLevel: 'AAA' });

      const aInfo = handler.getLevelInfo('A');
      expect(aInfo.category).toBe('error');

      const aaInfo = handler.getLevelInfo('AA');
      expect(aaInfo.category).toBe('error');

      const aaaInfo = handler.getLevelInfo('AAA');
      expect(aaaInfo.category).toBe('error');

      const ariaInfo = handler.getLevelInfo('ARIA');
      expect(ariaInfo.category).toBe('warning');
    });
  });

  describe('Severity Mapping', () => {
    beforeEach(() => {
      handler.updateConfig({ primaryLevel: 'AA' });
    });

    it('should map error level issues to full severity range', () => {
      expect(handler.mapToSeverity('A', 'critical')).toBe('critical');
      expect(handler.mapToSeverity('A', 'serious')).toBe('serious');
      expect(handler.mapToSeverity('A', 'moderate')).toBe('moderate');
      expect(handler.mapToSeverity('A', 'minor')).toBe('minor');

      expect(handler.mapToSeverity('AA', 'critical')).toBe('critical');
      expect(handler.mapToSeverity('AA', 'serious')).toBe('serious');
    });

    it('should map warning level issues to warning severity', () => {
      expect(handler.mapToSeverity('AAA', 'critical')).toBe('warning');
      expect(handler.mapToSeverity('AAA', 'serious')).toBe('warning');
      expect(handler.mapToSeverity('AAA', 'moderate')).toBe('warning');
      expect(handler.mapToSeverity('AAA', 'minor')).toBe('warning');

      expect(handler.mapToSeverity('ARIA', 'critical')).toBe('warning');
      expect(handler.mapToSeverity('ARIA', 'serious')).toBe('warning');
    });

    it('should respect treatWarningsAsErrors configuration', () => {
      handler.updateConfig({ treatWarningsAsErrors: true });

      expect(handler.mapToSeverity('AAA', 'critical')).toBe('critical');
      expect(handler.mapToSeverity('AAA', 'serious')).toBe('serious');
      expect(handler.mapToSeverity('ARIA', 'moderate')).toBe('moderate');
    });

    it('should respect severity overrides', () => {
      handler.updateConfig({
        severityOverrides: {
          '1.1.1': 'critical',
          '2.1.1': 'minor',
        },
      });

      expect(handler.mapToSeverity('AAA', 'serious', '1.1.1')).toBe('critical');
      expect(handler.mapToSeverity('A', 'critical', '2.1.1')).toBe('minor');
      expect(handler.mapToSeverity('A', 'serious', '3.1.1')).toBe('serious'); // No override
    });

    it('should handle unknown impact values', () => {
      expect(handler.mapToSeverity('A', 'unknown')).toBe('moderate');
      expect(handler.mapToSeverity('AAA', 'unknown')).toBe('warning');
    });
  });

  describe('Issue Filtering', () => {
    let sampleIssues: AccessibilityIssue[];

    beforeEach(() => {
      sampleIssues = [
        createMockIssue('A', ['wcag2a']),
        createMockIssue('AA', ['wcag2aa']),
        createMockIssue('AAA', ['wcag2aaa']),
        createMockIssue('ARIA', ['wcag2a', 'aria']),
        createMockIssue('A', ['best-practice']),
      ];
    });

    it('should filter issues based on primary level', () => {
      handler.updateConfig({ 
        primaryLevel: 'AA',
        includeAAA: false,
        includeARIA: false,
        includeBestPractices: false,
      });

      const filtered = handler.filterIssues(sampleIssues);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.level)).toEqual(['A', 'AA']);
    });

    it('should include AAA issues when configured', () => {
      handler.updateConfig({ 
        primaryLevel: 'AA',
        includeAAA: true,
        includeARIA: false,
        includeBestPractices: false,
      });

      const filtered = handler.filterIssues(sampleIssues);
      
      expect(filtered).toHaveLength(3);
      expect(filtered.map(i => i.level)).toEqual(['A', 'AA', 'AAA']);
    });

    it('should include ARIA issues when configured', () => {
      handler.updateConfig({ 
        primaryLevel: 'AA',
        includeAAA: false,
        includeARIA: true,
        includeBestPractices: false,
      });

      const filtered = handler.filterIssues(sampleIssues);
      
      expect(filtered).toHaveLength(3);
      expect(filtered.map(i => i.level)).toEqual(['A', 'AA', 'ARIA']);
    });

    it('should include best practice issues when configured', () => {
      handler.updateConfig({ 
        primaryLevel: 'AA',
        includeAAA: false,
        includeARIA: false,
        includeBestPractices: true,
      });

      const filtered = handler.filterIssues(sampleIssues);
      
      expect(filtered).toHaveLength(3);
      expect(filtered.some(i => i.tags.includes('best-practice'))).toBe(true);
    });
  });

  describe('Issue Categorization', () => {
    let sampleIssues: AccessibilityIssue[];

    beforeEach(() => {
      handler.updateConfig({ primaryLevel: 'AA' });
      
      sampleIssues = [
        createMockIssue('A', []),
        createMockIssue('AA', []),
        createMockIssue('AAA', []),
        createMockIssue('ARIA', []),
      ];
    });

    it('should categorize issues correctly', () => {
      const categorized = handler.categorizeIssues(sampleIssues);

      expect(categorized.errors).toHaveLength(2);
      expect(categorized.errors.map(i => i.level)).toEqual(['A', 'AA']);

      expect(categorized.warnings).toHaveLength(2);
      expect(categorized.warnings.map(i => i.level)).toEqual(['AAA', 'ARIA']);

      expect(categorized.info).toHaveLength(0);
    });

    it('should handle different primary levels', () => {
      handler.updateConfig({ primaryLevel: 'A' });
      
      const categorized = handler.categorizeIssues(sampleIssues);

      expect(categorized.errors).toHaveLength(1);
      expect(categorized.errors[0]?.level).toBe('A');

      expect(categorized.warnings).toHaveLength(3);
      expect(categorized.warnings.map(i => i.level)).toEqual(['AA', 'AAA', 'ARIA']);
    });
  });

  describe('Axe Tags Generation', () => {
    it('should generate correct tags for AA primary level', () => {
      handler.updateConfig({ primaryLevel: 'AA' });
      
      const tags = handler.generateAxeTags();
      
      expect(tags).toContain('wcag2a');
      expect(tags).toContain('wcag2aa');
      expect(tags).toContain('wcag2aaa'); // includeAAA is true by default
    });

    it('should generate correct tags for A primary level', () => {
      handler.updateConfig({ primaryLevel: 'A', includeAAA: false });
      
      const tags = handler.generateAxeTags();
      
      expect(tags).toContain('wcag2a');
      expect(tags).not.toContain('wcag2aa');
      expect(tags).not.toContain('wcag2aaa');
    });

    it('should generate correct tags for AAA primary level', () => {
      handler.updateConfig({ primaryLevel: 'AAA' });
      
      const tags = handler.generateAxeTags();
      
      expect(tags).toContain('wcag2a');
      expect(tags).toContain('wcag2aa');
      expect(tags).toContain('wcag2aaa');
    });

    it('should include best practice tags when configured', () => {
      handler.updateConfig({ includeBestPractices: true });
      
      const tags = handler.generateAxeTags();
      
      expect(tags).toContain('best-practice');
    });

    it('should not duplicate tags', () => {
      handler.updateConfig({ 
        primaryLevel: 'AA',
        includeAAA: true,
        includeARIA: true,
      });
      
      const tags = handler.generateAxeTags();
      const uniqueTags = [...new Set(tags)];
      
      expect(tags).toEqual(uniqueTags);
    });
  });

  describe('Compliance Summary', () => {
    let sampleIssues: AccessibilityIssue[];

    beforeEach(() => {
      handler.updateConfig({ primaryLevel: 'AA' });
      
      sampleIssues = [
        createMockIssue('A', []),
        createMockIssue('A', []),
        createMockIssue('AA', []),
        createMockIssue('AAA', []),
        createMockIssue('AAA', []),
        createMockIssue('ARIA', []),
      ];
    });

    it('should calculate compliance summary correctly', () => {
      const summary = handler.getComplianceSummary(sampleIssues);

      expect(summary.compliant).toBe(false); // Has error-level issues
      expect(summary.primaryLevelIssues).toBe(3); // A and AA issues
      expect(summary.warningIssues).toBe(3); // AAA and ARIA issues
      expect(summary.totalIssues).toBe(6);
      
      expect(summary.levelBreakdown).toEqual({
        A: 2,
        AA: 1,
        AAA: 2,
        ARIA: 1,
      });
    });

    it('should mark as compliant when no error-level issues', () => {
      const warningOnlyIssues = [
        createMockIssue('AAA', []),
        createMockIssue('ARIA', []),
      ];

      const summary = handler.getComplianceSummary(warningOnlyIssues);

      expect(summary.compliant).toBe(true);
      expect(summary.primaryLevelIssues).toBe(0);
      expect(summary.warningIssues).toBe(2);
    });

    it('should handle different primary levels', () => {
      handler.updateConfig({ primaryLevel: 'A' });
      
      const summary = handler.getComplianceSummary(sampleIssues);

      expect(summary.primaryLevelIssues).toBe(2); // Only A issues are errors
      expect(summary.warningIssues).toBe(4); // AA, AAA, ARIA are warnings
    });
  });

  describe('Static Methods', () => {
    it('should provide supported levels information', () => {
      const levels = WCAGLevelHandler.getSupportedLevels();

      expect(levels).toHaveLength(4);
      expect(levels.map(l => l.level)).toEqual(['A', 'AA', 'AAA', 'ARIA']);
      
      levels.forEach(level => {
        expect(level).toHaveProperty('description');
        expect(level).toHaveProperty('requirements');
        expect(typeof level.description).toBe('string');
        expect(typeof level.requirements).toBe('string');
      });
    });
  });
});

// Helper function to create mock accessibility issues
function createMockIssue(level: WCAGLevel, tags: string[]): AccessibilityIssue {
  return {
    id: `test-${level}-${Math.random()}`,
    wcagReference: `${Math.floor(Math.random() * 4) + 1}.${Math.floor(Math.random() * 4) + 1}.${Math.floor(Math.random() * 10) + 1}`,
    level,
    severity: 'moderate',
    element: 'div',
    selector: 'div.test',
    message: `Test issue for ${level}`,
    remediation: 'Fix the issue',
    impact: 'moderate',
    tags,
  } as AccessibilityIssue;
} 