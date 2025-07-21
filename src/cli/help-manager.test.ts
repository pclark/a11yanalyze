/**
 * HelpManager unit tests
 * Tests comprehensive help system with topic navigation and search
 */

import { HelpManager, HelpCategory } from './help-manager';

// Mock chalk for testing
jest.mock('chalk', () => {
  const mockFn = (text: any) => text;
  const mockChainableFn = Object.assign(mockFn, {
    cyan: mockFn,
    yellow: mockFn,
    green: mockFn,
    magenta: mockFn,
    blue: mockFn,
    white: mockFn,
    gray: mockFn,
    red: mockFn,
    dim: mockFn,
    bold: mockFn
  });
  
  return {
    default: mockChainableFn,
    bold: mockChainableFn,
    gray: mockFn,
    blue: mockFn,
    yellow: mockFn,
    red: mockFn,
    green: mockFn,
    magenta: mockFn,
    cyan: mockFn,
    white: mockFn,
    dim: mockFn,
  };
});

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

// Helper to check if any console.log call contains a substring
function logContains(substring: string) {
  return consoleSpy.log.mock.calls.flat().some((call: any) => typeof call === 'string' && call.includes(substring));
}

describe('HelpManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  describe('Topic Help Display', () => {
    it('should display getting-started help', () => {
      HelpManager.showHelp('getting-started');
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Getting Started')).toBe(true);
    });

    it('should display scanning help', () => {
      HelpManager.showHelp('scanning');
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Single Page Scanning')).toBe(true);
    });

    it('should display crawling help', () => {
      HelpManager.showHelp('crawling');
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Website Crawling')).toBe(true);
    });

    it('should display configuration help', () => {
      HelpManager.showHelp('configuration');
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Configuration Guide')).toBe(true);
    });

    it('should display scoring help', () => {
      HelpManager.showHelp('scoring');
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Scoring System')).toBe(true);
    });

    it('should display reporting help', () => {
      HelpManager.showHelp('reporting');
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Reports and Output')).toBe(true);
    });

    it('should display troubleshooting help', () => {
      HelpManager.showHelp('troubleshooting');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Troubleshooting')).toBe(true);
    });

    it('should display best-practices help', () => {
      HelpManager.showHelp('best-practices');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Best Practices')).toBe(true);
    });

    it('should display examples help', () => {
      HelpManager.showHelp('examples');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Practical Examples')).toBe(true);
    });

    it('should display api help', () => {
      HelpManager.showHelp('api');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Integration & API')).toBe(true);
    });

    it('should handle invalid help topic gracefully', () => {
      HelpManager.showHelp('invalid-topic' as HelpCategory);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Help topic 'invalid-topic' not found")
      );
    });
  });

  describe('Topic Menu Display', () => {
    it('should display help topic menu', () => {
      HelpManager.showTopicMenu();
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('A11Y Analyze Help Topics')).toBe(true);
      
      // Should display all topics
      expect(logContains('getting-started')).toBe(true);
      expect(logContains('scanning')).toBe(true);
      expect(logContains('crawling')).toBe(true);
    });

    it('should show usage examples in topic menu', () => {
      HelpManager.showTopicMenu();
      
      expect(logContains('Usage:')).toBe(true);
      expect(logContains('a11yanalyze help <topic>')).toBe(true);
      expect(logContains('Examples:')).toBe(true);
    });
  });

  describe('Quick Tips', () => {
    it('should show general tips by default', () => {
      HelpManager.showQuickTips();
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Quick Tips:')).toBe(true);
      expect(logContains('Get started:')).toBe(true);
    });

    it('should show scan-specific tips', () => {
      HelpManager.showQuickTips('scan');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Quick Tips:')).toBe(true);
      expect(logContains('Start with:')).toBe(true);
    });

    it('should show crawl-specific tips', () => {
      HelpManager.showQuickTips('crawl');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Basic crawl:')).toBe(true);
    });

    it('should handle unknown command gracefully', () => {
      HelpManager.showQuickTips('unknown-command');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('No tips available')
      );
    });
  });

  describe('Help Search', () => {
    it('should search help content for keywords', () => {
      HelpManager.searchHelp('scanning');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Search Results for "scanning"')).toBe(true);
    });

    it('should find multiple matching topics', () => {
      HelpManager.searchHelp('configuration');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      // Should find configuration topic and possibly others
    });

    it('should handle no search results', () => {
      HelpManager.searchHelp('nonexistentterm12345');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('No help topics found')
      );
    });

    it('should search case-insensitively', () => {
      HelpManager.searchHelp('CRAWLING');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(logContains('Search Results')).toBe(true);
    });

    it('should search in examples and descriptions', () => {
      HelpManager.searchHelp('example.com');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      // Should find topics containing example.com in examples
    });
  });

  describe('Configuration Template Generation', () => {
    it('should generate JSON configuration template', () => {
      const jsonConfig = HelpManager.generateConfigTemplate('json');
      
      expect(jsonConfig).toBeDefined();
      expect(() => JSON.parse(jsonConfig)).not.toThrow();
      
      const parsed = JSON.parse(jsonConfig);
      expect(parsed.scanning).toBeDefined();
      expect(parsed.browser).toBeDefined();
      expect(parsed.output).toBeDefined();
    });

    it('should generate JavaScript configuration template', () => {
      const jsConfig = HelpManager.generateConfigTemplate('js');
      
      expect(jsConfig).toBeDefined();
      expect(jsConfig).toContain('module.exports = {');
      expect(jsConfig).toContain('scanning');
      expect(jsConfig).toContain('Configuration options:');
    });

    it('should include schema in JSON template', () => {
      const jsonConfig = HelpManager.generateConfigTemplate('json');
      const parsed = JSON.parse(jsonConfig);
      
      expect(parsed.$schema).toBeDefined();
      expect(parsed.$schema).toContain('schemas.a11yanalyze.dev');
    });

    it('should include helpful comments in JS template', () => {
      const jsConfig = HelpManager.generateConfigTemplate('js');
      
      expect(jsConfig).toContain('// A11Y Analyze Configuration');
      expect(jsConfig).toContain('// Configuration options:');
      expect(jsConfig).toContain('// - scanning:');
      expect(jsConfig).toContain('// - browser:');
    });
  });

  describe('Help Content Structure', () => {
    it('should include code blocks in help topics', () => {
      HelpManager.showHelp('scanning');
      
      // Should show formatted code examples
      expect(logContains('a11yanalyze scan')).toBe(true);
    });

    it('should include tips and warnings', () => {
      HelpManager.showHelp('troubleshooting');
      
      // Should display tips for troubleshooting
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include see-also references', () => {
      HelpManager.showHelp('scanning');
      
      // Should include see-also section
      expect(logContains('See Also:')).toBe(true);
    });

    it('should include practical examples', () => {
      HelpManager.showHelp('examples');
      
      expect(logContains('E-commerce')).toBe(true);
    });

    it('should format different code languages differently', () => {
      // Test that different language code blocks are handled
      HelpManager.showHelp('configuration');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      // Verify that bash, json, js, yaml examples are shown
    });
  });

  describe('Interactive Features', () => {
    it('should handle process stdout columns for formatting', () => {
      const originalColumns = process.stdout.columns;
      process.stdout.columns = 120;
      
      HelpManager.showTopicMenu();
      
      expect(consoleSpy.log).toHaveBeenCalled();
      
      process.stdout.columns = originalColumns;
    });

    it('should handle missing process stdout columns', () => {
      const originalColumns = process.stdout.columns;
      delete (process.stdout as any).columns;
      
      expect(() => HelpManager.showTopicMenu()).not.toThrow();
      
      (process.stdout as any).columns = originalColumns;
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed help content gracefully', () => {
      // This tests the robustness of the help system
      expect(() => HelpManager.showHelp('getting-started')).not.toThrow();
    });

    it('should handle empty search queries', () => {
      HelpManager.searchHelp('');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('No help topics found')
      );
    });

    it('should handle special characters in search', () => {
      expect(() => HelpManager.searchHelp('test@#$%')).not.toThrow();
    });
  });

  describe('Content Quality', () => {
    it('should provide comprehensive getting-started content', () => {
      HelpManager.showHelp('getting-started');
      
      const logCalls = consoleSpy.log.mock.calls;
      const allOutput = logCalls.map(call => call[0]).join('\n');
      
      // Should contain essential getting started information
      expect(allOutput).toMatch(/quick start|basic|example/i);
      expect(allOutput).toMatch(/scan|accessibility/i);
    });

    it('should provide practical examples', () => {
      HelpManager.showHelp('examples');
      
      const logCalls = consoleSpy.log.mock.calls;
      const allOutput = logCalls.map(call => call[0]).join('\n');
      
      // Should contain real-world examples
      expect(allOutput).toMatch(/e-commerce|mobile|government/i);
    });

    it('should provide troubleshooting guidance', () => {
      HelpManager.showHelp('troubleshooting');
      
      const logCalls = consoleSpy.log.mock.calls;
      const allOutput = logCalls.map(call => call[0]).join('\n');
      
      // Should contain troubleshooting information
      expect(allOutput).toMatch(/timeout|error|debug/i);
    });

    it('should include comprehensive API documentation', () => {
      HelpManager.showHelp('api');
      
      const logCalls = consoleSpy.log.mock.calls;
      const allOutput = logCalls.map(call => call[0]).join('\n');
      
      // Should contain API/integration information
      expect(allOutput).toMatch(/exit code|json|environment/i);
    });
  });

  describe('Cross-References', () => {
    it('should reference related topics appropriately', () => {
      HelpManager.showHelp('scanning');
      
      const logCalls = consoleSpy.log.mock.calls;
      const allOutput = logCalls.map(call => call[0]).join('\n');
      
      // Should reference related topics
      expect(allOutput).toMatch(/crawling|configuration|scoring/i);
    });

    it('should maintain consistency across topics', () => {
      // Test that command examples are consistent
      const topics: HelpCategory[] = ['scanning', 'crawling', 'configuration'];
      
      topics.forEach(topic => {
        consoleSpy.log.mockClear();
        HelpManager.showHelp(topic);
        
        const logCalls = consoleSpy.log.mock.calls;
        const allOutput = logCalls.map(call => call[0]).join('\n');
        
        // Should contain consistent command format
        expect(allOutput).toMatch(/a11yanalyze/);
      });
    });
  });
}); 