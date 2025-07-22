/**
 * HelpManager unit tests
 * Tests comprehensive help system with topic navigation and search
 */

// Mock console methods
let logOutput: string[] = [];
let errorOutput: string[] = [];
const originalLog = console.log;
const originalError = console.error;
console.log = (...args: any[]) => {
  logOutput.push(args.join(' '));
  originalLog(...args);
};
console.error = (...args: any[]) => {
  errorOutput.push(args.join(' '));
  originalError(...args);
};

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

import { HelpManager, HelpCategory } from './help-manager';

beforeAll(() => {
  // Removed jest.spyOn(console, 'log').mockImplementation((...args) => {
  //   logOutput.push(args.join(' '));
  //   originalLog(...args);
  // });
  // Removed jest.spyOn(console, 'error').mockImplementation((...args) => {
  //   errorOutput.push(args.join(' '));
  //   originalError(...args);
  // });
});
afterAll(() => {
  (console.log as any) = originalLog;
  (console.error as any) = originalError;
});
beforeEach(() => {
  logOutput = [];
  errorOutput = [];
  // Removed jest.clearAllMocks() to preserve mock implementations
});

// Helper to check if any console.log call contains a substring
function logContains(substring: string) {
  return logOutput.some(line => line.includes(substring));
}

describe('HelpManager', () => {
  describe('Topic Help Display', () => {
    it('should display getting-started help', () => {
      HelpManager.showHelp('getting-started');
      expect(logOutput.join('\n')).toMatch(/Getting Started/i);
    });

    it('should display scanning help', () => {
      HelpManager.showHelp('scanning');
      expect(logOutput.join('\n')).toMatch(/Single Page Scanning/i);
    });

    it('should display crawling help', () => {
      HelpManager.showHelp('crawling');
      expect(logOutput.join('\n')).toMatch(/Website Crawling/i);
    });

    it('should display configuration help', () => {
      HelpManager.showHelp('configuration');
      expect(logOutput.join('\n')).toMatch(/Configuration Guide/i);
    });

    it('should display scoring help', () => {
      HelpManager.showHelp('scoring');
      expect(logOutput.join('\n')).toMatch(/Scoring System/i);
    });

    it('should display reporting help', () => {
      HelpManager.showHelp('reporting');
      expect(logOutput.join('\n')).toMatch(/Reports and Output/i);
    });

    it('should display troubleshooting help', () => {
      HelpManager.showHelp('troubleshooting');
      expect(logOutput.join('\n')).toMatch(/Troubleshooting/i);
    });

    it('should display best-practices help', () => {
      HelpManager.showHelp('best-practices');
      expect(logOutput.join('\n')).toMatch(/Best Practices/i);
    });

    it('should display examples help', () => {
      HelpManager.showHelp('examples');
      expect(logOutput.join('\n')).toMatch(/Practical Examples/i);
    });

    it('should display api help', () => {
      HelpManager.showHelp('api');
      expect(logOutput.join('\n')).toMatch(/Integration & API/i);
    });

    it('should handle invalid help topic gracefully', () => {
      HelpManager.showHelp('invalid-topic' as HelpCategory);
      expect(errorOutput.join('\n')).toMatch(/Help topic 'invalid-topic' not found/);
    });
  });

  describe('Topic Menu Display', () => {
    it('should display help topic menu', () => {
      HelpManager.showTopicMenu();
      const output = logOutput.join('\n');
      expect(output).toMatch(/A11Y Analyze Help Topics/i);
      expect(output).toMatch(/getting-started/);
      expect(output).toMatch(/scanning/);
      expect(output).toMatch(/crawling/);
    });

    it('should show usage examples in topic menu', () => {
      HelpManager.showTopicMenu();
      const output = logOutput.join('\n');
      expect(output).toMatch(/Usage:/);
      expect(output).toMatch(/a11yanalyze help <topic>/);
      expect(output).toMatch(/Examples:/);
    });
  });

  describe('Quick Tips', () => {
    it('should show general tips by default', () => {
      HelpManager.showQuickTips();
      const output = logOutput.join('\n');
      expect(output).toMatch(/Quick Tips:/);
      expect(output).toMatch(/Get started:/);
    });

    it('should show scan-specific tips', () => {
      HelpManager.showQuickTips('scan');
      const output = logOutput.join('\n');
      expect(output).toMatch(/Quick Tips:/);
      expect(output).toMatch(/Start with:/);
    });

    it('should show crawl-specific tips', () => {
      HelpManager.showQuickTips('crawl');
      const output = logOutput.join('\n');
      expect(output).toMatch(/Basic crawl:/);
    });

    it('should handle unknown command gracefully', () => {
      HelpManager.showQuickTips('unknown-command');
      expect(logOutput.join('\n')).toMatch(/No tips available/);
    });
  });

  describe('Help Search', () => {
    it('should search help content for keywords', () => {
      HelpManager.searchHelp('scanning');
      expect(logOutput.join('\n')).toMatch(/Search Results for "scanning"/);
    });

    it('should find multiple matching topics', () => {
      HelpManager.searchHelp('configuration');
      expect(logOutput.join('\n')).toMatch(/configuration/i);
    });

    it('should handle no search results', () => {
      HelpManager.searchHelp('nonexistentterm12345');
      expect(logOutput.join('\n')).toMatch(/No help topics found/);
    });

    it('should search case-insensitively', () => {
      HelpManager.searchHelp('CRAWLING');
      expect(logOutput.join('\n')).toMatch(/Search Results/i);
    });

    it('should search in examples and descriptions', () => {
      HelpManager.searchHelp('example.com');
      expect(logOutput.join('\n')).toMatch(/example.com/);
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
      expect(logOutput.join('\n')).toMatch(/a11yanalyze scan/);
    });

    it('should include tips and warnings', () => {
      HelpManager.showHelp('troubleshooting');
      
      // Should display tips for troubleshooting
      expect(logOutput.join('\n')).toMatch(/Tips:/);
    });

    it('should include see-also references', () => {
      HelpManager.showHelp('scanning');
      
      // Should include see-also section
      expect(logOutput.join('\n')).toMatch(/See Also:/);
    });

    it('should include practical examples', () => {
      HelpManager.showHelp('examples');
      
      expect(logOutput.join('\n')).toMatch(/E-commerce/);
    });

    it('should format different code languages differently', () => {
      // Test that different language code blocks are handled
      HelpManager.showHelp('configuration');
      
      const output = logOutput.join('\n');
      expect(output).toMatch(/bash/);
      expect(output).toMatch(/json/);
      expect(output).toMatch(/js/);
      expect(output).toMatch(/yaml/);
    });
  });

  describe('Interactive Features', () => {
    it('should handle process stdout columns for formatting', () => {
      const originalColumns = process.stdout.columns;
      process.stdout.columns = 120;
      
      HelpManager.showTopicMenu();
      
      expect(logOutput.length).toBeGreaterThan(0);
      
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
      expect(logOutput.join('\n')).toMatch(/No help topics found/);
    });

    it('should handle special characters in search', () => {
      expect(() => HelpManager.searchHelp('test@#$%')).not.toThrow();
    });
  });

  describe('Content Quality', () => {
    it('should provide comprehensive getting-started content', () => {
      HelpManager.showHelp('getting-started');
      let allOutput = logOutput.join(' ').replace(/\s+/g, ' ').trim();
      expect(allOutput.toLowerCase()).toContain('quick start');
      expect(allOutput.toLowerCase()).toContain('scan');
    });

    it('should provide practical examples', () => {
      HelpManager.showHelp('examples');
      let allOutput = logOutput.join(' ').replace(/\s+/g, ' ').trim();
      expect(allOutput.toLowerCase()).toContain('e-commerce');
      expect(allOutput.toLowerCase()).toContain('mobile');
      expect(allOutput.toLowerCase()).toContain('government');
    });

    it('should provide troubleshooting guidance', () => {
      HelpManager.showHelp('troubleshooting');
      let allOutput = logOutput.join(' ').replace(/\s+/g, ' ').trim();
      expect(allOutput.toLowerCase()).toContain('timeout');
      expect(allOutput.toLowerCase()).toContain('error');
      expect(allOutput.toLowerCase()).toContain('debug');
    });

    it('should include comprehensive API documentation', () => {
      HelpManager.showHelp('api');
      let allOutput = logOutput.join(' ').replace(/\s+/g, ' ').trim();
      expect(allOutput.toLowerCase()).toContain('exit code');
      expect(allOutput.toLowerCase()).toContain('json');
      expect(allOutput.toLowerCase()).toContain('environment');
    });
  });

  describe('Cross-References', () => {
    it('should reference related topics appropriately', () => {
      HelpManager.showHelp('scanning');
      let allOutput = logOutput.join(' ').replace(/\s+/g, ' ').trim();
      expect(allOutput.toLowerCase()).toContain('crawling');
      expect(allOutput.toLowerCase()).toContain('configuration');
      expect(allOutput.toLowerCase()).toContain('scoring');
    });

    it('should maintain consistency across topics', () => {
      // Test that command examples are consistent
      const topics: HelpCategory[] = ['scanning', 'crawling', 'configuration'];
      topics.forEach(topic => {
        logOutput = [];
        HelpManager.showHelp(topic);
        let allOutput = logOutput.join(' ').replace(/\s+/g, ' ').trim();
        expect(allOutput.toLowerCase()).toContain('a11yanalyze');
      });
    });
  });
}); 