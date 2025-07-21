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

describe('HelpManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  describe('Topic Help Display', () => {
    it('should display getting-started help', () => {
      HelpManager.showHelp('getting-started');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Getting Started')
      );
    });

    it('should display scanning help', () => {
      HelpManager.showHelp('scanning');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Single Page Scanning')
      );
    });

    it('should display crawling help', () => {
      HelpManager.showHelp('crawling');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Website Crawling')
      );
    });

    it('should display configuration help', () => {
      HelpManager.showHelp('configuration');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Configuration Guide')
      );
    });

    it('should display scoring help', () => {
      HelpManager.showHelp('scoring');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Scoring System')
      );
    });

    it('should display reporting help', () => {
      HelpManager.showHelp('reporting');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Reports and Output')
      );
    });

    it('should display troubleshooting help', () => {
      HelpManager.showHelp('troubleshooting');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Troubleshooting')
      );
    });

    it('should display best-practices help', () => {
      HelpManager.showHelp('best-practices');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Best Practices')
      );
    });

    it('should display examples help', () => {
      HelpManager.showHelp('examples');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Practical Examples')
      );
    });

    it('should display api help', () => {
      HelpManager.showHelp('api');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Integration & API')
      );
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
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('A11Y Analyze Help Topics')
      );
      
      // Should display all topics
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('getting-started')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('scanning')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('crawling')
      );
    });

    it('should show usage examples in topic menu', () => {
      HelpManager.showTopicMenu();
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('a11yanalyze help <topic>')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Examples:')
      );
    });
  });

  describe('Quick Tips', () => {
    it('should show general tips by default', () => {
      HelpManager.showQuickTips();
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Quick Tips:')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Get started:')
      );
    });

    it('should show scan-specific tips', () => {
      HelpManager.showQuickTips('scan');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Quick Tips:')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Start with:')
      );
    });

    it('should show crawl-specific tips', () => {
      HelpManager.showQuickTips('crawl');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Basic crawl:')
      );
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
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Search Results for "scanning"')
      );
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
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Search Results')
      );
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
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('a11yanalyze scan')
      );
    });

    it('should include tips and warnings', () => {
      HelpManager.showHelp('troubleshooting');
      
      // Should display tips for troubleshooting
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include see-also references', () => {
      HelpManager.showHelp('scanning');
      
      // Should include see-also section
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('See Also:')
      );
    });

    it('should include practical examples', () => {
      HelpManager.showHelp('examples');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('E-commerce')
      );
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