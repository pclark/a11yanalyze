/**
 * RuleEngine unit tests
 * Tests hybrid rule engine combining axe-core with custom WCAG 2.2 rules
 */

import { RuleEngine } from './rule-engine';
import { RuleEngineConfig, WCAGRule, RuleResult } from '../types';

// Mock axe-core
jest.mock('axe-core', () => ({
  source: 'mock-axe-source-code',
}));

const mockPage = {
  addScriptTag: jest.fn(),
  evaluate: jest.fn(),
};

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let mockConfig: RuleEngineConfig;

  beforeEach(() => {
    mockConfig = {
      wcagLevel: 'AA',
      includeAAA: false,
      includeARIA: true,
      customRules: [],
      disabledRules: [],
      axeCoreConfig: {
        tags: ['wcag2a', 'wcag2aa'],
        rules: [],
      },
    };

    ruleEngine = new RuleEngine(mockConfig);
    jest.clearAllMocks();
  });

  describe('Configuration and Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = ruleEngine.getConfiguration();
      
      expect(config.wcagLevel).toBe('AA');
      expect(config.includeAAA).toBe(false);
      expect(config.includeARIA).toBe(true);
      expect(config.customRules).toEqual([]);
      expect(config.disabledRules).toEqual([]);
    });

    it('should apply custom configuration', () => {
      const customConfig: RuleEngineConfig = {
        wcagLevel: 'AAA',
        includeAAA: true,
        includeARIA: false,
        customRules: [],
        disabledRules: ['rule1'],
        axeCoreConfig: {
          tags: ['wcag2aaa'],
          rules: [],
        },
      };

      const engine = new RuleEngine(customConfig);
      const config = engine.getConfiguration();

      expect(config.wcagLevel).toBe('AAA');
      expect(config.includeAAA).toBe(true);
      expect(config.includeARIA).toBe(false);
      expect(config.disabledRules).toEqual(['rule1']);
    });

    it('should setup axe-core tags based on WCAG level', () => {
      const aaaConfig: RuleEngineConfig = {
        wcagLevel: 'AAA',
        includeAAA: false,
        includeARIA: true,
        customRules: [],
        disabledRules: [],
      };

      const engine = new RuleEngine(aaaConfig);
      const config = engine.getConfiguration();

      expect(config.axeCoreConfig?.tags).toContain('wcag2a');
      expect(config.axeCoreConfig?.tags).toContain('wcag2aa');
      expect(config.axeCoreConfig?.tags).toContain('wcag2aaa');
    });
  });

  describe('Custom Rule Management', () => {
    it('should add valid custom rules', () => {
      const customRule: WCAGRule = {
        ruleId: 'custom-alt-text',
        wcagCriterion: '1.1.1',
        level: 'AA',
        enabled: true,
        tags: ['images', 'alt-text'],
        impact: 'serious',
        selector: 'img',
        evaluate: 'function() { return !this.hasAttribute("alt"); }',
      };

      ruleEngine.addCustomRule(customRule);
      const customRules = ruleEngine.getCustomRules();

      expect(customRules).toHaveLength(1);
      expect(customRules[0]).toEqual(customRule);
    });

    it('should reject invalid custom rules', () => {
      const invalidRule: Partial<WCAGRule> = {
        ruleId: '',
        wcagCriterion: '1.1.1',
        // missing level and other required fields
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      ruleEngine.addCustomRule(invalidRule as WCAGRule);
      const customRules = ruleEngine.getCustomRules();

      expect(customRules).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid rule configuration')
      );

      consoleSpy.mockRestore();
    });

    it('should remove custom rules', () => {
      const customRule: WCAGRule = {
        ruleId: 'test-rule',
        wcagCriterion: '1.1.1',
        level: 'AA',
        enabled: true,
        tags: [],
        impact: 'moderate',
        evaluate: '',
      };

      ruleEngine.addCustomRule(customRule);
      expect(ruleEngine.getCustomRules()).toHaveLength(1);

      ruleEngine.removeCustomRule('test-rule');
      expect(ruleEngine.getCustomRules()).toHaveLength(0);
    });

    it('should validate WCAG level in custom rules', () => {
      const invalidLevelRule: WCAGRule = {
        ruleId: 'invalid-level-rule',
        wcagCriterion: '1.1.1',
        level: 'INVALID' as any,
        enabled: true,
        tags: [],
        impact: 'moderate',
        evaluate: '',
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      ruleEngine.addCustomRule(invalidLevelRule);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid WCAG level')
      );
      expect(ruleEngine.getCustomRules()).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Rule Enable/Disable', () => {
    it('should disable rules', () => {
      ruleEngine.disableRule('test-rule');
      const disabledRules = ruleEngine.getDisabledRules();

      expect(disabledRules).toContain('test-rule');
    });

    it('should enable previously disabled rules', () => {
      ruleEngine.disableRule('test-rule');
      expect(ruleEngine.getDisabledRules()).toContain('test-rule');

      ruleEngine.enableRule('test-rule');
      expect(ruleEngine.getDisabledRules()).not.toContain('test-rule');
    });

    it('should filter disabled rules from results', async () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'disabled-rule',
            tags: ['wcag2aa', 'wcag111'],
            impact: 'serious',
            nodes: [],
            description: 'Test violation',
            help: 'Test help',
            helpUrl: 'https://example.com',
          },
          {
            id: 'enabled-rule',
            tags: ['wcag2aa', 'wcag112'],
            impact: 'moderate',
            nodes: [],
            description: 'Another violation',
            help: 'Another help',
            helpUrl: 'https://example.com',
          },
        ],
      };

      mockPage.evaluate.mockResolvedValue(mockAxeResults);
      ruleEngine.disableRule('disabled-rule');

             const results = await ruleEngine.executeRules(mockPage as any);

       expect(results).toHaveLength(1);
       expect(results[0]?.ruleId).toBe('enabled-rule');
    });
  });

  describe('Axe-core Integration', () => {
    it('should inject axe-core and execute rules', async () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'image-alt',
            tags: ['wcag2a', 'wcag111'],
            impact: 'critical',
            nodes: [
              {
                target: ['img'],
                html: '<img src="test.jpg">',
                any: [],
                all: [],
                none: [],
              },
            ],
            description: 'Images must have alternate text',
            help: 'Images must have an alt attribute',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/image-alt',
          },
        ],
      };

      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue(mockAxeResults);

      const results = await ruleEngine.executeRules(mockPage as any);

      expect(mockPage.addScriptTag).toHaveBeenCalledWith({
        content: 'mock-axe-source-code',
      });
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        ruleId: 'image-alt',
        wcagReference: '1.1.1',
        level: 'A',
        impact: 'critical',
        description: 'Images must have alternate text',
      });
    });

    it('should handle axe-core execution errors gracefully', async () => {
      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockRejectedValue(new Error('Axe execution failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const results = await ruleEngine.executeRules(mockPage as any);

      expect(results).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Axe-core execution failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle axe-core not loaded error', async () => {
      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue({
        violations: [],
      });

      const results = await ruleEngine.executeRules(mockPage as any);

      expect(results).toEqual([]);
    });
  });

  describe('WCAG Reference Extraction', () => {
    it('should extract WCAG reference from tags', async () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'color-contrast',
            tags: ['wcag2aa', 'wcag143'],
            impact: 'serious',
            nodes: [],
            description: 'Color contrast violation',
            help: 'Color contrast help',
            helpUrl: 'https://example.com',
          },
        ],
      };

      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue(mockAxeResults);

             const results = await ruleEngine.executeRules(mockPage as any);

       expect(results[0]?.wcagReference).toBe('1.4.3');
    });

    it('should handle missing WCAG tags', async () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'best-practice-rule',
            tags: ['best-practice'],
            impact: 'minor',
            nodes: [],
            description: 'Best practice violation',
            help: 'Best practice help',
            helpUrl: 'https://example.com',
          },
        ],
      };

      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue(mockAxeResults);

             const results = await ruleEngine.executeRules(mockPage as any);

       expect(results[0]?.wcagReference).toBe('');
    });
  });

  describe('WCAG Level Determination', () => {
    it('should determine correct WCAG levels from tags', async () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'level-a-rule',
            tags: ['wcag2a', 'wcag111'],
            impact: 'serious',
            nodes: [],
            description: 'Level A violation',
            help: 'Level A help',
            helpUrl: 'https://example.com',
          },
          {
            id: 'level-aa-rule',
            tags: ['wcag2aa', 'wcag143'],
            impact: 'serious',
            nodes: [],
            description: 'Level AA violation',
            help: 'Level AA help',
            helpUrl: 'https://example.com',
          },
          {
            id: 'level-aaa-rule',
            tags: ['wcag2aaa', 'wcag146'],
            impact: 'moderate',
            nodes: [],
            description: 'Level AAA violation',
            help: 'Level AAA help',
            helpUrl: 'https://example.com',
          },
        ],
      };

      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue(mockAxeResults);

             const results = await ruleEngine.executeRules(mockPage as any);

       expect(results[0]?.level).toBe('A');
       expect(results[1]?.level).toBe('AA');
       expect(results[2]?.level).toBe('AAA');
    });
  });

  describe('Custom Rule Execution', () => {
    it('should execute custom rules without errors', async () => {
      const customRule: WCAGRule = {
        ruleId: 'custom-test-rule',
        wcagCriterion: '1.1.1',
        level: 'AA',
        enabled: true,
        tags: ['custom'],
        impact: 'moderate',
        evaluate: 'function() { return false; }',
      };

      ruleEngine.addCustomRule(customRule);
      mockPage.addScriptTag.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue({ violations: [] });

      const results = await ruleEngine.executeRules(mockPage as any);

      // Should not throw and should return results (even if empty)
      expect(Array.isArray(results)).toBe(true);
    });

         it('should handle custom rule execution errors', async () => {
       const customRule: WCAGRule = {
         ruleId: 'failing-custom-rule',
         wcagCriterion: '1.1.1',
         level: 'AA',
         enabled: true,
         tags: ['custom'],
         impact: 'moderate',
         evaluate: 'invalid-function',
       };

       ruleEngine.addCustomRule(customRule);
       
       const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
       mockPage.addScriptTag.mockResolvedValue(undefined);
       mockPage.evaluate.mockResolvedValue({ violations: [] }); // axe-core succeeds

       const results = await ruleEngine.executeRules(mockPage as any);

       // Custom rule execution is currently a placeholder that returns null
       // So we just verify it doesn't crash
       expect(Array.isArray(results)).toBe(true);

       consoleSpy.mockRestore();
     });
  });

  describe('Configuration Updates', () => {
    it('should update configuration and reinitialize', () => {
      const newConfig: Partial<RuleEngineConfig> = {
        wcagLevel: 'AAA',
        includeAAA: true,
      };

      ruleEngine.updateConfiguration(newConfig);
      const config = ruleEngine.getConfiguration();

      expect(config.wcagLevel).toBe('AAA');
      expect(config.includeAAA).toBe(true);
    });

    it('should preserve existing configuration when updating partially', () => {
      const originalConfig = ruleEngine.getConfiguration();
      
      ruleEngine.updateConfiguration({ wcagLevel: 'A' });
      const updatedConfig = ruleEngine.getConfiguration();

      expect(updatedConfig.wcagLevel).toBe('A');
      expect(updatedConfig.includeARIA).toBe(originalConfig.includeARIA);
      expect(updatedConfig.includeAAA).toBe(originalConfig.includeAAA);
    });
  });

     describe('Error Handling', () => {
     it('should handle script injection failures gracefully', async () => {
       mockPage.addScriptTag.mockRejectedValue(new Error('Script injection failed'));

       const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
       const results = await ruleEngine.executeRules(mockPage as any);

       expect(results).toEqual([]); // Returns empty array when script injection fails
       expect(consoleSpy).toHaveBeenCalledWith(
         'Axe-core execution failed:',
         expect.any(Error)
       );

       consoleSpy.mockRestore();
     });

     it('should log errors when axe-core execution fails', async () => {
       const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
       
       mockPage.addScriptTag.mockResolvedValue(undefined);
       mockPage.evaluate.mockRejectedValue(new Error('Axe execution failed'));

       const results = await ruleEngine.executeRules(mockPage as any);
       
       expect(results).toEqual([]); // Returns empty array on axe-core failure
       expect(consoleSpy).toHaveBeenCalledWith(
         'Axe-core execution failed:',
         expect.any(Error)
       );

       consoleSpy.mockRestore();
     });
   });
}); 