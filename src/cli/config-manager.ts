/**
 * Configuration Management System
 * Provides progressive configuration with sensible defaults, file-based config, 
 * environment variables, and CLI argument overrides
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { WCAGLevel } from '../types/wcag';
import { ScoringProfile } from '../scoring/accessibility-scorer';
import yaml from 'js-yaml';
import Ajv from 'ajv';

// Define JSON Schema for A11yAnalyzeConfig (partial, for demonstration; expand as needed)
// NOTE: Use 'any' for now to allow extensibility; replace with full JSONSchemaType<A11yAnalyzeConfig> for strict typing
const configSchema: any = {
  type: 'object',
  properties: {
    scanning: {
      type: 'object',
      properties: {
        wcagLevel: { type: 'string', enum: ['A', 'AA', 'AAA', 'ARIA'] },
        includeAAA: { type: 'boolean' },
        includeARIA: { type: 'boolean' },
        includeWarnings: { type: 'boolean' },
        timeout: { type: 'integer', minimum: 1 },
        retries: { type: 'integer', minimum: 0 },
        retryDelay: { type: 'integer', minimum: 0 },
        waitForNetworkIdle: { type: 'boolean' },
        captureScreenshots: { type: 'boolean' },
        screenshotOnFailure: { type: 'boolean' },
        customRules: { type: 'array', items: { type: 'string' } },
        disabledRules: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'wcagLevel', 'includeAAA', 'includeARIA', 'includeWarnings', 'timeout', 'retries', 'retryDelay',
        'waitForNetworkIdle', 'captureScreenshots', 'screenshotOnFailure', 'customRules', 'disabledRules'
      ],
      additionalProperties: true
    },
    browser: { type: 'object', additionalProperties: true },
    crawling: { type: 'object', additionalProperties: true },
    output: { type: 'object', additionalProperties: true },
    scoring: { type: 'object', additionalProperties: true },
    issues: { type: 'object', additionalProperties: true },
    performance: { type: 'object', additionalProperties: true },
    advanced: { type: 'object', additionalProperties: true },
    vpat: { type: 'object', additionalProperties: true },
    storybook: { type: 'object', additionalProperties: true },
    reporting: { type: 'object', additionalProperties: true },
  },
  required: [
    'scanning', 'browser', 'crawling', 'output', 'scoring', 'issues', 'performance', 'advanced', 'vpat', 'storybook', 'reporting'
  ],
  additionalProperties: false
};

const ajv = new Ajv({ allErrors: true });
const validateConfigSchema = ajv.compile(configSchema);

export interface VpatConfig {
  enabled: boolean;
  mode: 'component' | 'page' | 'storybook';
  outputFormat: 'json' | 'markdown' | 'vpat2';
  section508: boolean;
  remarks: boolean;
  jiraIntegration: boolean;
}

export interface StorybookConfig {
  enabled: boolean;
  url: string;
  iframeSelector: string;
  componentIsolation: boolean;
  autoDiscover: boolean;
}

export interface ReportingConfig {
  format: 'json' | 'markdown' | 'vpat2' | 'section508';
  templatePath?: string;
  jiraIntegration: boolean;
  includeScreenshots: boolean;
  includeSummary: boolean;
}

/**
 * Core configuration interface
 */
export interface A11yAnalyzeConfig {
  /** Scanning configuration */
  scanning: {
    wcagLevel: WCAGLevel;
    includeAAA: boolean;
    includeARIA: boolean;
    includeWarnings: boolean;
    timeout: number;
    retries: number;
    retryDelay: number;
    waitForNetworkIdle: boolean;
    captureScreenshots: boolean;
    screenshotOnFailure: boolean;
    customRules: string[];
    disabledRules: string[];
  };

  /** Browser configuration */
  browser: {
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
    userAgent: string;
    enableJavaScript: boolean;
    allowInsecure: boolean;
    locale: string;
    timezone: string;
  };

  /** Crawling configuration */
  crawling: {
    maxDepth: number;
    maxPages: number;
    maxConcurrency: number;
    requestDelay: number;
    respectRobotsTxt: boolean;
    followRedirects: boolean;
    allowedDomains: string[];
    excludedDomains: string[];
    excludedPaths: string[];
    includedPaths: string[];
    useSitemaps: boolean;
    discoverExternalLinks: boolean;
    maxExternalDepth: number;
  };

  /** Output and reporting configuration */
  output: {
    format: 'json' | 'console' | 'both';
    verbose: boolean;
    quiet: boolean;
    debug: boolean;
    colors: boolean;
    timestamps: boolean;
    progressBars: boolean;
    outputPath?: string;
    templatePath?: string;
    exportErrors: boolean;
    errorLogPath?: string;
  };

  /** Scoring configuration */
  scoring: {
    profile: ScoringProfile;
    minScore: number;
    maxScore: number;
    enableBonuses: boolean;
    enablePenalties: boolean;
    minSeverity: 'critical' | 'serious' | 'moderate' | 'minor' | 'warning';
    customWeights?: {
      wcagLevels?: Record<WCAGLevel, number>;
      severities?: Record<string, number>;
    };
  };

  /** Issue processing configuration */
  issues: {
    groupSimilar: boolean;
    includeRemediation: boolean;
    includeCodeExamples: boolean;
    includeTestingGuidance: boolean;
    contextAware: boolean;
    maxCodeExamples: number;
    priorityMode: 'severity' | 'impact' | 'effort' | 'quickWins';
  };

  /** Performance and resilience configuration */
  performance: {
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    maxRetries: number;
    baseRetryDelay: number;
    timeoutStrategy: 'fixed' | 'adaptive';
    memoryLimit: number;
    resourceCleanup: boolean;
  };

  /** Advanced configuration */
  advanced: {
    experimentalFeatures: boolean;
    cacheResults: boolean;
    cacheTTL: number;
    telemetry: boolean;
    updateCheck: boolean;
    configVersion: string;
  };

  vpat: VpatConfig;
  storybook: StorybookConfig;
  reporting: ReportingConfig;
}

/**
 * Configuration file formats supported
 */
export type ConfigFormat = 'json' | 'js' | 'yaml';

/**
 * Configuration source information
 */
export interface ConfigSource {
  type: 'defaults' | 'file' | 'environment' | 'cli';
  path?: string;
  priority: number;
  loaded: boolean;
  errors?: string[];
}

/**
 * Configuration loading result
 */
export interface ConfigLoadResult {
  config: A11yAnalyzeConfig;
  sources: ConfigSource[];
  warnings: string[];
  errors: string[];
}

/**
 * Configuration Manager
 * Handles loading, merging, and validation of configuration from multiple sources
 */
export class ConfigManager {
  private static readonly CONFIG_FILENAMES = [
    '.a11yanalyzerc.json',
    '.a11yanalyzerc.js',
    'a11yanalyze.config.json',
    'a11yanalyze.config.js',
    'package.json', // Look for a11yanalyze key
  ];

  private static readonly DEFAULT_CONFIG: A11yAnalyzeConfig = {
    scanning: {
      wcagLevel: 'AA',
      includeAAA: false,
      includeARIA: true,
      includeWarnings: true,
      timeout: 30000,
      retries: 2,
      retryDelay: 1000,
      waitForNetworkIdle: true,
      captureScreenshots: false,
      screenshotOnFailure: true,
      customRules: [],
      disabledRules: [],
    },
    browser: {
      headless: true,
      viewport: {
        width: 1280,
        height: 720,
      },
      userAgent: 'A11yAnalyze/1.0.0 (Accessibility Testing Tool)',
      enableJavaScript: true,
      allowInsecure: false,
      locale: 'en-US',
      timezone: 'UTC',
    },
    crawling: {
      maxDepth: 2,
      maxPages: 50,
      maxConcurrency: 3,
      requestDelay: 1000,
      respectRobotsTxt: false,
      followRedirects: true,
      allowedDomains: [],
      excludedDomains: [],
      excludedPaths: [],
      includedPaths: [],
      useSitemaps: false,
      discoverExternalLinks: false,
      maxExternalDepth: 1,
    },
    output: {
      format: 'console',
      verbose: false,
      quiet: false,
      debug: false,
      colors: true,
      timestamps: false,
      progressBars: true,
      exportErrors: false,
    },
    scoring: {
      profile: 'balanced',
      minScore: 0,
      maxScore: 100,
      enableBonuses: true,
      enablePenalties: true,
      minSeverity: 'moderate',
    },
    issues: {
      groupSimilar: true,
      includeRemediation: true,
      includeCodeExamples: true,
      includeTestingGuidance: true,
      contextAware: true,
      maxCodeExamples: 3,
      priorityMode: 'impact',
    },
    performance: {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      maxRetries: 3,
      baseRetryDelay: 1000,
      timeoutStrategy: 'adaptive',
      memoryLimit: 512, // MB
      resourceCleanup: true,
    },
    advanced: {
      experimentalFeatures: false,
      cacheResults: false,
      cacheTTL: 3600, // 1 hour
      telemetry: false,
      updateCheck: true,
      configVersion: '1.0.0',
    },
    vpat: {
      enabled: false,
      mode: 'component',
      outputFormat: 'json',
      section508: true,
      remarks: true,
      jiraIntegration: false,
    },
    storybook: {
      enabled: false,
      url: '',
      iframeSelector: '#storybook-preview-iframe',
      componentIsolation: true,
      autoDiscover: true,
    },
    reporting: {
      format: 'json',
      templatePath: undefined,
      jiraIntegration: false,
      includeScreenshots: true,
      includeSummary: true,
    },
  };

  private loadedConfig?: A11yAnalyzeConfig;
  private configSources: ConfigSource[] = [];
  private static readonly PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

  /**
   * Load configuration from all sources with proper priority
   */
  async loadConfig(
    searchPaths: string[] = [],
    cliOptions: Record<string, any> = {}
  ): Promise<ConfigLoadResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    this.configSources = [];

    try {
      // 1. Start with default configuration
      let config = this.deepClone(ConfigManager.DEFAULT_CONFIG);
      this.addConfigSource('defaults', 0, true);

      // 2. Load from configuration files
      const fileConfig = await this.loadFromFiles(searchPaths);
      if (fileConfig.config) {
        config = this.mergeConfigs(config, fileConfig.config);
        this.addConfigSource('file', 1, true, fileConfig.path);
      }
      warnings.push(...fileConfig.warnings);
      errors.push(...fileConfig.errors);

      // 3. Load from environment variables
      const envConfig = this.loadFromEnvironment();
      if (envConfig.config) {
        config = this.mergeConfigs(config, envConfig.config);
        this.addConfigSource('environment', 2, true);
      }
      warnings.push(...envConfig.warnings);

      // 4. Apply CLI options (highest priority)
      const cliConfig = this.convertCliToConfig(cliOptions);
      if (cliConfig.config && Object.keys(cliConfig.config).length > 0) {
        config = this.mergeConfigs(config, cliConfig.config);
        this.addConfigSource('cli', 3, true);
      }

      // 5. Validate final configuration
      const validation = this.validateConfig(config);
      warnings.push(...validation.warnings);
      errors.push(...validation.errors);

      // Store loaded configuration
      this.loadedConfig = config;

      return {
        config,
        sources: this.configSources,
        warnings,
        errors,
      };

    } catch (error) {
      errors.push(`Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return default config on failure
      return {
        config: this.deepClone(ConfigManager.DEFAULT_CONFIG),
        sources: [{ type: 'defaults', priority: 0, loaded: true }],
        warnings,
        errors,
      };
    }
  }

  /**
   * Get the currently loaded configuration
   */
  getConfig(): A11yAnalyzeConfig | null {
    return this.loadedConfig || null;
  }

  /**
   * Get configuration sources information
   */
  getConfigSources(): ConfigSource[] {
    return [...this.configSources];
  }

  /**
   * Generate a sample configuration file
   */
  generateSampleConfig(format: ConfigFormat = 'json'): string {
    const config = ConfigManager.DEFAULT_CONFIG;
    
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      
      case 'js':
        return `module.exports = ${JSON.stringify(config, null, 2)};`;
      
      case 'yaml':
        // Simple YAML generation - in production, use a proper YAML library
        return this.convertToYaml(config);
      
      default:
        throw new Error(`Unsupported config format: ${format}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(
    config: any,
    path: string,
    format: ConfigFormat = 'json'
  ): Promise<void> {
    try {
      const fullConfig = this.mergeConfigs(ConfigManager.DEFAULT_CONFIG, config);
      const content = this.generateSampleConfig(format);
      writeFileSync(path, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): A11yAnalyzeConfig {
    return this.prototype.deepClone(ConfigManager.DEFAULT_CONFIG);
  }

  /**
   * Load configuration from files
   * @private
   */
  private async loadFromFiles(searchPaths: string[]): Promise<{
    config?: Partial<A11yAnalyzeConfig>;
    path?: string;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Build search paths
    const paths = [
      ...searchPaths,
    ];
    try {
      paths.push(process.cwd());
    } catch (err) {
      // console.error('[DEBUG] Error in process.cwd():', err);
    }
    // try {
    //   paths.push(homedir());
    //   console.log('[DEBUG] after homedir:', paths);
    // } catch (err) {
    //   console.error('[DEBUG] Error in homedir():', err);
    // }
    for (const basePath of paths) {
      for (const filename of ConfigManager.CONFIG_FILENAMES) {
        const configPath = resolve(basePath, filename);
        const exists = existsSync(configPath);
        if (exists) {
          try {
            const config = await this.loadConfigFile(configPath);
            return { config, path: configPath, warnings, errors };
          } catch (error) {
            errors.push(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }

    return { warnings, errors };
  }

  /**
   * Load a specific configuration file
   * @private
   */
  private async loadConfigFile(path: string): Promise<Partial<A11yAnalyzeConfig>> {
    const content = readFileSync(path, 'utf8');
    
    if (path.endsWith('.json')) {
      return JSON.parse(content);
    } else if (path.endsWith('.js')) {
      try {
        delete require.cache[require.resolve(path)];
        const jsConfig = require(path);
        return jsConfig;
      } catch (err) {
        // console.error('[DEBUG] Error loading JS config:', err);
        throw err;
      }
    } else if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      return yaml.load(content) as Partial<A11yAnalyzeConfig>;
    } else if (path.includes('package.json')) {
      const pkg = JSON.parse(content);
      return pkg.a11yanalyze || {};
    }

    throw new Error(`Unsupported config file format: ${path}`);
  }

  /**
   * Load configuration from environment variables
   * @private
   */
  private loadFromEnvironment(): {
    config?: Partial<A11yAnalyzeConfig>;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const config: any = {};

    // Map environment variables to config structure
    const envMappings: Record<string, string> = {
      'A11Y_WCAG_LEVEL': 'scanning.wcagLevel',
      'A11Y_INCLUDE_AAA': 'scanning.includeAAA',
      'A11Y_INCLUDE_ARIA': 'scanning.includeARIA',
      'A11Y_TIMEOUT': 'scanning.timeout',
      'A11Y_HEADLESS': 'browser.headless',
      'A11Y_VIEWPORT_WIDTH': 'browser.viewport.width',
      'A11Y_VIEWPORT_HEIGHT': 'browser.viewport.height',
      'A11Y_MAX_DEPTH': 'crawling.maxDepth',
      'A11Y_MAX_PAGES': 'crawling.maxPages',
      'A11Y_CONCURRENCY': 'crawling.maxConcurrency',
      'A11Y_OUTPUT_FORMAT': 'output.format',
      'A11Y_VERBOSE': 'output.verbose',
      'A11Y_QUIET': 'output.quiet',
      'A11Y_DEBUG': 'output.debug',
      'A11Y_SCORING_PROFILE': 'scoring.profile',
      'A11Y_MIN_SEVERITY': 'scoring.minSeverity',
    };

         for (const [envVar, configPath] of Object.entries(envMappings)) {
       const value = process.env[envVar];
       if (value !== undefined && value !== null) {
         try {
           this.setNestedValue(config, configPath, this.parseEnvValue(value));
         } catch (error) {
           warnings.push(`Invalid environment variable ${envVar}: ${error instanceof Error ? error.message : String(error)}`);
         }
       }
     }

    return { config: Object.keys(config).length > 0 ? config : undefined, warnings };
  }

  /**
   * Convert CLI options to config structure, parsing types as needed
   */
  private convertCliToConfig(cliOptions: any): { config?: Partial<A11yAnalyzeConfig> } {
    const config: any = {};
    if (!cliOptions) return { config };

    // Filter out prototype pollution keys from CLI options
    const safeCliOptions: any = {};
    for (const key in cliOptions) {
      if (cliOptions.hasOwnProperty(key) && !ConfigManager.PROTOTYPE_POLLUTION_KEYS.includes(key)) {
        safeCliOptions[key] = cliOptions[key];
      }
    }

    // Scanning options
    if (safeCliOptions.wcagLevel) config.scanning = { ...config.scanning, wcagLevel: safeCliOptions.wcagLevel };
    if (safeCliOptions.includeAaa !== undefined) config.scanning = { ...config.scanning, includeAAA: Boolean(safeCliOptions.includeAaa) };
    if (safeCliOptions.includeAria !== undefined) config.scanning = { ...config.scanning, includeARIA: Boolean(safeCliOptions.includeAria) };
    if (safeCliOptions.timeout !== undefined) config.scanning = { ...config.scanning, timeout: typeof safeCliOptions.timeout === 'string' ? parseInt(safeCliOptions.timeout, 10) : safeCliOptions.timeout };

    // Browser options
    if (safeCliOptions.headless !== undefined) config.browser = { ...config.browser, headless: Boolean(safeCliOptions.headless) };
    if (safeCliOptions.viewport) {
      const [width, height] = typeof safeCliOptions.viewport === 'string' && safeCliOptions.viewport.includes('x')
        ? safeCliOptions.viewport.split('x').map(Number)
        : [1280, 720];
      config.browser = { ...config.browser, viewport: { width, height } };
    }

    // Output options
    if (safeCliOptions.format) config.output = { ...config.output, format: safeCliOptions.format };
    if (safeCliOptions.verbose !== undefined) config.output = { ...config.output, verbose: Boolean(safeCliOptions.verbose) };
    if (safeCliOptions.quiet !== undefined) config.output = { ...config.output, quiet: Boolean(safeCliOptions.quiet) };
    if (safeCliOptions.debug !== undefined) config.output = { ...config.output, debug: Boolean(safeCliOptions.debug) };

    // Scoring options
    if (safeCliOptions.profile) config.scoring = { ...config.scoring, profile: safeCliOptions.profile };

    // Add more CLI options as needed...

    return { config };
  }

  /**
   * Validate configuration
   * @private
   */
  private validateConfig(config: A11yAnalyzeConfig): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // JSON Schema validation
    const valid = validateConfigSchema(config);
    if (!valid) {
      for (const err of validateConfigSchema.errors || []) {
        errors.push(`Config schema error: ${err.instancePath} ${err.message}`);
      }
    }

    // Validate WCAG level
    const validWcagLevels: WCAGLevel[] = ['A', 'AA', 'AAA', 'ARIA'];
    if (!validWcagLevels.includes(config.scanning.wcagLevel)) {
      errors.push(`Invalid WCAG level: ${config.scanning.wcagLevel}. Must be one of: ${validWcagLevels.join(', ')}`);
    }

    // Validate scoring profile
    const validProfiles: ScoringProfile[] = ['strict', 'balanced', 'lenient', 'enterprise', 'custom'];
    if (!validProfiles.includes(config.scoring.profile)) {
      errors.push(`Invalid scoring profile: ${config.scoring.profile}. Must be one of: ${validProfiles.join(', ')}`);
    }

    // Validate timeout values
    if (config.scanning.timeout <= 0) {
      errors.push('Scanning timeout must be greater than 0');
    }

    // Validate viewport
    if (config.browser.viewport.width <= 0 || config.browser.viewport.height <= 0) {
      errors.push('Browser viewport dimensions must be greater than 0');
    }

    // Validate crawling limits
    if (config.crawling.maxDepth < 0) {
      errors.push('Max crawl depth cannot be negative');
    }

    if (config.crawling.maxPages <= 0) {
      warnings.push('Max pages is 0 or negative, this may prevent scanning');
    }

    // Validate concurrency
    if (config.crawling.maxConcurrency <= 0) {
      errors.push('Max concurrency must be greater than 0');
    }

    return { warnings, errors };
  }

  /**
   * Deep clone an object
   * @private
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    
    const cloned = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && !ConfigManager.PROTOTYPE_POLLUTION_KEYS.includes(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep merge objects
   * @private
   */
  private deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (
        source.hasOwnProperty(key) &&
        !ConfigManager.PROTOTYPE_POLLUTION_KEYS.includes(key)
      ) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          this.deepMerge(target[key], source[key]);
        } else {
          // Additional protection: ensure the value itself is not a prototype pollution risk
          const value = source[key];
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            // For objects, create a safe copy using JSON to prevent prototype pollution
            target[key] = JSON.parse(JSON.stringify(value));
          } else {
            target[key] = value;
          }
        }
      }
    }
    return target;
  }

  /**
   * Merge two configs so that custom overrides default
   */
  private mergeConfigs(base: any, override: any): any {
    // base: default config, override: custom config
    return this.deepMerge(this.deepClone(base), override);
  }

  /**
   * Set nested object value using dot notation
   * @private
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    if (keys.length === 0) return;
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key || ConfigManager.PROTOTYPE_POLLUTION_KEYS.includes(key)) continue;
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    const finalKey = keys[keys.length - 1];
    if (finalKey && !ConfigManager.PROTOTYPE_POLLUTION_KEYS.includes(finalKey)) {
      // For objects, create a safe copy to prevent prototype pollution
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        try {
          current[finalKey] = JSON.parse(JSON.stringify(value));
        } catch {
          // If JSON serialization fails, create a simple object copy
          const safeCopy: any = {};
          for (const key in value) {
            if (value.hasOwnProperty(key) && !ConfigManager.PROTOTYPE_POLLUTION_KEYS.includes(key)) {
              safeCopy[key] = value[key];
            }
          }
          current[finalKey] = safeCopy;
        }
      } else {
        current[finalKey] = value;
      }
    }
  }

  /**
   * Parse environment variable value to appropriate type
   * @private
   */
  private parseEnvValue(value: string): any {
    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Number values
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // Array values (comma-separated)
    if (value.includes(',')) {
      return value.split(',').map(v => v.trim());
    }
    
    // String value
    return value;
  }

  /**
   * Convert configuration to YAML format (simplified)
   * @private
   */
  private convertToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.convertToYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
        }
      } else {
        yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
      }
    }
    
    return yaml;
  }

  /**
   * Add configuration source to tracking
   * @private
   */
  private addConfigSource(
    type: ConfigSource['type'],
    priority: number,
    loaded: boolean,
    path?: string,
    errors?: string[]
  ): void {
    this.configSources.push({
      type,
      priority,
      loaded,
      path,
      errors,
    });
  }
} 