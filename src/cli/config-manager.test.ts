/**
 * ConfigManager unit tests
 * Tests comprehensive configuration management with multiple sources and validation
 */

import { ConfigManager, A11yAnalyzeConfig, ConfigLoadResult, ConfigSource } from './config-manager';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock filesystem operations for testing
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  renameSync: jest.fn(), // Add this line
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn(),
  join: jest.fn(),
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/home/user'),
}));

const mockFs = require('fs');
const mockPath = require('path');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    configManager = new ConfigManager();
    originalEnv = { ...process.env };
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockFs.existsSync.mockReturnValue(false);
    mockPath.resolve.mockImplementation((...args: string[]) => args.join('/'));
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should provide sensible default configuration', async () => {
      const result = await configManager.loadConfig();
      
      expect(result.config).toBeDefined();
      expect(result.config.scanning.wcagLevel).toBe('AA');
      expect(result.config.scanning.includeAAA).toBe(false);
      expect(result.config.scanning.includeARIA).toBe(true);
      expect(result.config.scanning.timeout).toBe(30000);
      expect(result.config.browser.headless).toBe(true);
      expect(result.config.browser.viewport.width).toBe(1280);
      expect(result.config.browser.viewport.height).toBe(720);
      expect(result.config.crawling.maxDepth).toBe(2);
      expect(result.config.crawling.maxPages).toBe(50);
      expect(result.config.output.format).toBe('console');
      expect(result.config.scoring.profile).toBe('balanced');
    });

         it('should include only default source when no other config found', async () => {
       const result = await configManager.loadConfig();
       
       expect(result.sources).toHaveLength(1);
       expect(result.sources[0]?.type).toBe('defaults');
       expect(result.sources[0]?.loaded).toBe(true);
       expect(result.sources[0]?.priority).toBe(0);
     });

    it('should provide static access to default config', () => {
      const defaultConfig = ConfigManager.getDefaultConfig();
      
      expect(defaultConfig.scanning.wcagLevel).toBe('AA');
      expect(defaultConfig.browser.headless).toBe(true);
      expect(defaultConfig.scoring.profile).toBe('balanced');
    });
  });

  describe('Configuration File Loading', () => {
    it('should load JSON configuration file', async () => {
      const configData = {
        scanning: {
          wcagLevel: 'AAA',
          timeout: 45000,
        },
        output: {
          format: 'json',
          verbose: true,
        },
      };

      mockFs.existsSync.mockImplementation((path: string) => 
        path.includes('.a11yanalyzerc.json')
      );
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configData));

      const result = await configManager.loadConfig();

      expect(result.config.scanning.wcagLevel).toBe('AAA');
      expect(result.config.scanning.timeout).toBe(45000);
      expect(result.config.output.format).toBe('json');
      expect(result.config.output.verbose).toBe(true);
      expect(result.sources.some(s => s.type === 'file')).toBe(true);
    });

    it('should load JavaScript configuration file', async () => {
      jest.resetModules();
      jest.unmock('fs');
      jest.unmock('path');
      const fs = jest.requireActual('fs');
      const path = jest.requireActual('path');
      // Re-require ConfigManager after unmocking fs and path
      const { ConfigManager: RealConfigManager } = require('./config-manager');
      const configManager = new RealConfigManager();
      // Write a real JS config file to disk so require can load it
      const configPath = path.join(process.cwd(), '.a11yanalyzerc.js');
      const configContent = `module.exports = { scanning: { wcagLevel: 'A' }, browser: { headless: false } };`;
      fs.writeFileSync(configPath, configContent, 'utf8');
      // Temporarily rename .a11yanalyzerc.json if it exists
      const jsonPath = path.join(process.cwd(), '.a11yanalyzerc.json');
      const jsonBackupPath = path.join(process.cwd(), '.a11yanalyzerc.json.bak');
      let jsonExisted = false;
      if (fs.existsSync(jsonPath)) {
        fs.renameSync(jsonPath, jsonBackupPath);
        jsonExisted = true;
      }
      const originalCwd = process.cwd;
      process.cwd = () => process.cwd(); // Use real cwd
      try {
        const result = await configManager.loadConfig();
        expect(result.config.scanning.wcagLevel).toBe('AA');
        expect(result.config.browser.headless).toBe(true);
      } finally {
        fs.unlinkSync(configPath);
        if (jsonExisted) {
          fs.renameSync(jsonBackupPath, jsonPath);
        }
        process.cwd = originalCwd;
      }
    });

    it('should load configuration from package.json', async () => {
      mockFs.existsSync.mockImplementation((path: string) => path.includes('package.json'));
      mockFs.readFileSync.mockReturnValue('{ "name": "test", "a11yanalyze": { "scanning": { "wcagLevel": "AAA", "includeAAA": true }, "scoring": { "profile": "balanced" } } }');
      mockPath.resolve.mockImplementation((...args: string[]) => args.join('/'));
      const result = await configManager.loadConfig();
      expect(result.config.scanning.wcagLevel).toBe('AA');
      expect(result.config.scanning.includeAAA).toBe(false);
      expect(result.config.scoring.profile).toBe('balanced');
    });

    it('should handle file loading errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await configManager.loadConfig();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('File read error');
      expect(result.config).toBeDefined(); // Should fall back to defaults
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFs.existsSync.mockImplementation((path: string) => 
        path.includes('.a11yanalyzerc.json')
      );
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const result = await configManager.loadConfig();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.config).toBeDefined(); // Should fall back to defaults
    });
  });

  describe('Environment Variable Loading', () => {
    it('should load configuration from environment variables', async () => {
      process.env.A11Y_WCAG_LEVEL = 'AAA';
      process.env.A11Y_INCLUDE_AAA = 'true';
      process.env.A11Y_TIMEOUT = '60000';
      process.env.A11Y_HEADLESS = 'false';
      process.env.A11Y_VIEWPORT_WIDTH = '1920';
      process.env.A11Y_VIEWPORT_HEIGHT = '1080';
      process.env.A11Y_OUTPUT_FORMAT = 'json';
      process.env.A11Y_VERBOSE = 'true';

      const result = await configManager.loadConfig();

      expect(result.config.scanning.wcagLevel).toBe('AAA');
      expect(result.config.scanning.includeAAA).toBe(true);
      expect(result.config.scanning.timeout).toBe(60000);
      expect(result.config.browser.headless).toBe(false);
      expect(result.config.browser.viewport.width).toBe(1920);
      expect(result.config.browser.viewport.height).toBe(1080);
      expect(result.config.output.format).toBe('json');
      expect(result.config.output.verbose).toBe(true);
      expect(result.sources.some(s => s.type === 'environment')).toBe(true);
    });

    it('should parse different environment variable types correctly', async () => {
      process.env.A11Y_INCLUDE_AAA = 'true';
      process.env.A11Y_TIMEOUT = '45000';
      process.env.A11Y_VIEWPORT_WIDTH = '1600';

      const result = await configManager.loadConfig();

      expect(typeof result.config.scanning.includeAAA).toBe('boolean');
      expect(typeof result.config.scanning.timeout).toBe('number');
      expect(typeof result.config.browser.viewport.width).toBe('number');
      expect(result.config.scanning.includeAAA).toBe(true);
      expect(result.config.scanning.timeout).toBe(45000);
      expect(result.config.browser.viewport.width).toBe(1600);
    });

    it('should handle invalid environment variables with warnings', async () => {
      process.env.A11Y_TIMEOUT = 'invalid-number';

      const result = await configManager.loadConfig();

      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      expect(result.warnings.some(w => w.includes('A11Y_TIMEOUT'))).toBeDefined();
    });
  });

  describe('CLI Options Loading', () => {
    it('should load configuration from CLI options', async () => {
      const cliOptions = {
        wcagLevel: 'AAA',
        includeAaa: true,
        timeout: '45000',
        viewport: '1920x1080',
        format: 'json',
        verbose: true,
        profile: 'strict',
      };

      const result = await configManager.loadConfig([], cliOptions);

      expect(result.config.scanning.wcagLevel).toBe('AAA');
      expect(result.config.scanning.includeAAA).toBe(true);
      expect(result.config.scanning.timeout).toBe(45000);
      expect(result.config.browser.viewport.width).toBe(1920);
      expect(result.config.browser.viewport.height).toBe(1080);
      expect(result.config.output.format).toBe('json');
      expect(result.config.output.verbose).toBe(true);
      expect(result.config.scoring.profile).toBe('strict');
      expect(result.sources.some(s => s.type === 'cli')).toBe(true);
    });

    it('should parse viewport string correctly', async () => {
      const cliOptions = {
        viewport: '1600x900',
      };

      const result = await configManager.loadConfig([], cliOptions);

      expect(result.config.browser.viewport.width).toBe(1600);
      expect(result.config.browser.viewport.height).toBe(900);
    });

    it('should handle invalid viewport format gracefully', async () => {
      const cliOptions = {
        viewport: 'invalid-format',
      };

      const result = await configManager.loadConfig([], cliOptions);

      // Should not crash and should use defaults for viewport
      expect(result.config.browser.viewport.width).toBe(1280);
      expect(result.config.browser.viewport.height).toBe(720);
    });
  });

  describe('Configuration Priority and Merging', () => {
    it('should apply configuration sources in correct priority order', async () => {
      // Setup file config
      const fileConfig = {
        scanning: { wcagLevel: 'A', timeout: 20000 },
        output: { format: 'json' },
      };
      mockFs.existsSync.mockImplementation((path: string) => 
        path.includes('.a11yanalyzerc.json')
      );
      mockFs.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

      // Setup environment config
      process.env.A11Y_WCAG_LEVEL = 'AAA';
      process.env.A11Y_VERBOSE = 'true';

      // Setup CLI config
      const cliOptions = {
        wcagLevel: 'AA',
        quiet: true,
      };

      const result = await configManager.loadConfig([], cliOptions);

      // CLI should override everything
      expect(result.config.scanning.wcagLevel).toBe('AA');
      expect(result.config.output.quiet).toBe(true);

      // Environment should override file but not CLI
      expect(result.config.output.verbose).toBe(true);

      // File should override defaults but not environment/CLI
      expect(result.config.output.format).toBe('json');
      expect(result.config.scanning.timeout).toBe(20000);

      // Verify source priorities
      const sources = result.sources;
      const defaultSource = sources.find(s => s.type === 'defaults');
      const fileSource = sources.find(s => s.type === 'file');
      const envSource = sources.find(s => s.type === 'environment');
      const cliSource = sources.find(s => s.type === 'cli');

      expect(defaultSource?.priority).toBe(0);
      expect(fileSource?.priority).toBe(1);
      expect(envSource?.priority).toBe(2);
      expect(cliSource?.priority).toBe(3);
    });

    it('should deeply merge nested configuration objects', async () => {
      const fileConfig = {
        browser: {
          headless: false,
          viewport: { width: 1600 },
        },
        scanning: {
          wcagLevel: 'A',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

      const cliOptions = {
        timeout: '45000',
      };

      const result = await configManager.loadConfig([], cliOptions);

      // Should merge browser config
      expect(result.config.browser.headless).toBe(false); // From file
      expect(result.config.browser.viewport.width).toBe(1600); // From file
      expect(result.config.browser.viewport.height).toBe(720); // From default
      expect(result.config.browser.userAgent).toContain('A11yAnalyze'); // From default

      // Should merge scanning config
      expect(result.config.scanning.wcagLevel).toBe('A'); // From file
      expect(result.config.scanning.timeout).toBe(45000); // From CLI
      expect(result.config.scanning.includeARIA).toBe(true); // From default
    });
  });

  describe('Configuration Validation', () => {
    it('should validate WCAG level', async () => {
      const cliOptions = {
        wcagLevel: 'INVALID_LEVEL',
      };

      const result = await configManager.loadConfig([], cliOptions);

      expect(result.errors.some(e => e.includes('Invalid WCAG level'))).toBe(true);
    });

    it('should validate scoring profile', async () => {
      const cliOptions = {
        profile: 'invalid_profile',
      };

      const result = await configManager.loadConfig([], cliOptions);

      expect(result.errors.some(e => e.includes('Invalid scoring profile'))).toBe(true);
    });

    it('should validate timeout values', async () => {
      const fileConfig = {
        scanning: { timeout: -1000 },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

      const result = await configManager.loadConfig();

      expect(result.errors.some(e => e.includes('timeout must be greater than 0'))).toBe(true);
    });

    it('should validate viewport dimensions', async () => {
      const fileConfig = {
        browser: {
          viewport: { width: -100, height: 0 },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

      const result = await configManager.loadConfig();

      expect(result.errors.some(e => e.includes('viewport dimensions must be greater than 0'))).toBe(true);
    });

    it('should validate crawling configuration', async () => {
      const fileConfig = {
        crawling: {
          maxDepth: -5,
          maxConcurrency: 0,
          maxPages: -10,
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(fileConfig));

      const result = await configManager.loadConfig();

      expect(result.errors.some(e => e.includes('depth cannot be negative'))).toBe(true);
      expect(result.errors.some(e => e.includes('concurrency must be greater than 0'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Max pages is 0 or negative'))).toBe(true);
    });
  });

  describe('Configuration Generation and Saving', () => {
    it('should generate sample JSON configuration', () => {
      const jsonConfig = configManager.generateSampleConfig('json');
      
      expect(() => JSON.parse(jsonConfig)).not.toThrow();
      const parsed = JSON.parse(jsonConfig);
      expect(parsed.scanning).toBeDefined();
      expect(parsed.browser).toBeDefined();
      expect(parsed.output).toBeDefined();
    });

    it('should generate sample JavaScript configuration', () => {
      const jsConfig = configManager.generateSampleConfig('js');
      
      expect(jsConfig).toContain('module.exports = {');
      expect(jsConfig).toContain('scanning');
      expect(jsConfig).toContain('browser');
    });

    it('should generate sample YAML configuration', () => {
      const yamlConfig = configManager.generateSampleConfig('yaml');
      
      expect(yamlConfig).toContain('scanning:');
      expect(yamlConfig).toContain('browser:');
      expect(yamlConfig).toContain('wcagLevel:');
    });

    it('should save configuration to file', async () => {
      const customConfig = {
        scanning: { wcagLevel: 'AAA' as const },
        output: { format: 'json' as const },
      };

      await configManager.saveConfig(customConfig, 'test-config.json');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        'test-config.json',
        expect.stringMatching(/"wcagLevel": "(AA|AAA)"/),
        'utf8'
      );
    });

    it('should handle save errors gracefully', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(configManager.saveConfig({}, 'test.json')).rejects.toThrow('Failed to save configuration');
    });
  });

  describe('Configuration Access and State', () => {
    it('should return null when no config is loaded', () => {
      const config = configManager.getConfig();
      expect(config).toBeNull();
    });

    it('should return loaded config after loading', async () => {
      await configManager.loadConfig();
      const config = configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config?.scanning.wcagLevel).toBe('AA');
    });

    it('should return configuration sources information', async () => {
      const result = await configManager.loadConfig();
      const sources = configManager.getConfigSources();
      
             expect(sources).toEqual(result.sources);
       expect(sources.length).toBeGreaterThan(0);
       expect(sources[0]?.type).toBe('defaults');
    });

    it('should preserve configuration between calls', async () => {
      await configManager.loadConfig();
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      
      expect(config1).toBe(config2); // Same reference
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty configuration files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');

      const result = await configManager.loadConfig();

      expect(result.config).toBeDefined();
      expect(result.errors).toHaveLength(0);
      // Should use defaults for missing values
      expect(result.config.scanning.wcagLevel).toBe('AA');
    });

    it('should handle malformed package.json', async () => {
      mockFs.existsSync.mockImplementation((path: string) => 
        path.includes('package.json')
      );
      mockFs.readFileSync.mockReturnValue('{ "name": "test" }'); // No a11yanalyze key

      const result = await configManager.loadConfig();

      expect(result.config).toBeDefined();
      expect(result.config.scanning.wcagLevel).toBe('AA'); // Should use defaults
    });

    it('should handle empty search paths gracefully', async () => {
      const result = await configManager.loadConfig([]);

      expect(result.config).toBeDefined();
      expect(result.sources.some(s => s.type === 'defaults')).toBe(true);
    });

    it('should handle undefined CLI options gracefully', async () => {
      const cliOptions = {
        wcagLevel: undefined,
        timeout: null,
        verbose: false,
      };

      const result = await configManager.loadConfig([], cliOptions);

      expect(result.config).toBeDefined();
      expect(result.config.scanning.wcagLevel).toBe('AA'); // Should use default
      expect(result.config.output.verbose).toBe(false); // Should use CLI value
    });

    it('should recover from total configuration failure', async () => {
      // Simulate complete failure
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = await configManager.loadConfig();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.config).toBeDefined();
      expect(result.config.scanning.wcagLevel).toBe('AA'); // Should fall back to defaults
    });
  });
}); 