/**
 * Comprehensive URL Validation and Error Handling System
 * Provides robust input validation with helpful error messages and auto-correction suggestions
 */

import { URL } from 'url';
import { ErrorLogger } from '../output/error-logger';

/**
 * URL validation result
 */
export interface UrlValidationResult {
  /** Whether the URL is valid */
  isValid: boolean;
  /** The validated and normalized URL (if valid) */
  normalizedUrl?: string;
  /** Validation error details */
  error?: UrlValidationError;
  /** Auto-correction suggestions */
  suggestions?: string[];
  /** Warnings about the URL (even if valid) */
  warnings?: string[];
}

/**
 * URL validation error details
 */
export interface UrlValidationError {
  /** Error type category */
  type: 'format' | 'protocol' | 'domain' | 'network' | 'security' | 'accessibility';
  /** Human-readable error message */
  message: string;
  /** Technical error details */
  details?: string;
  /** Original input that caused the error */
  input: string;
  /** Suggested fixes */
  fixes?: string[];
}

/**
 * URL validation options
 */
export interface UrlValidationOptions {
  /** Allowed protocols */
  allowedProtocols?: string[];
  /** Whether to allow localhost/local URLs */
  allowLocalhost?: boolean;
  /** Whether to allow IP addresses */
  allowIpAddresses?: boolean;
  /** Whether to check for accessibility-hostile patterns */
  checkAccessibilityHostile?: boolean;
  /** Whether to perform basic network connectivity check */
  checkConnectivity?: boolean;
  /** Whether to allow non-standard ports */
  allowNonStandardPorts?: boolean;
  /** Whether to normalize URLs (add protocol, www, etc.) */
  autoNormalize?: boolean;
  /** Maximum URL length */
  maxLength?: number;
}

/**
 * Comprehensive URL Validator
 */
export class UrlValidator {
  private static readonly DEFAULT_OPTIONS: Required<UrlValidationOptions> = {
    allowedProtocols: ['http', 'https'],
    allowLocalhost: true,
    allowIpAddresses: true,
    checkAccessibilityHostile: true,
    checkConnectivity: false,
    allowNonStandardPorts: true,
    autoNormalize: true,
    maxLength: 2083, // IE limit, widely accepted
  };

  private static readonly COMMON_TYPOS = new Map([
    ['htp://', 'http://'],
    ['htps://', 'https://'],
    ['http//', 'http://'],
    ['https//', 'https://'],
    ['www.', 'https://www.'],
    ['.com/', '.com'],
    ['.org/', '.org'],
    ['.net/', '.net'],
    ['localhost:', 'http://localhost:'],
  ]);

  private static readonly ACCESSIBILITY_HOSTILE_PATTERNS = [
    /\?.*utm_/i, // UTM tracking parameters
    /\?.*fbclid/i, // Facebook click tracking
    /\?.*gclid/i, // Google click tracking
    /#.*:~:text=/i, // Text fragments that might not be accessible
  ];

  private static readonly SUSPICIOUS_DOMAINS = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', // URL shorteners
    'localhost.localdomain', // Common test domain issues
  ];

  private options: Required<UrlValidationOptions>;
  private errorLogger: ErrorLogger;

  constructor(options: Partial<UrlValidationOptions> = {}) {
    this.options = { ...UrlValidator.DEFAULT_OPTIONS, ...options };
    this.errorLogger = new ErrorLogger();
  }

  /**
   * Validate a URL with comprehensive checking
   */
  async validate(input: string): Promise<UrlValidationResult> {
    try {
      // Normalize input
      const normalizedInput = this.normalizeInput(input);
      
      // Basic format validation
      const formatResult = this.validateFormat(normalizedInput);
      if (!formatResult.isValid) {
        return formatResult;
      }

      const url = new URL(formatResult.normalizedUrl!);
      
      // Protocol validation
      const protocolResult = this.validateProtocol(url);
      if (!protocolResult.isValid) {
        return protocolResult;
      }

      // Domain validation
      const domainResult = this.validateDomain(url);
      if (!domainResult.isValid) {
        return domainResult;
      }

      // Security validation
      const securityResult = this.validateSecurity(url);
      if (!securityResult.isValid) {
        return securityResult;
      }

      // Accessibility validation
      const accessibilityResult = this.validateAccessibility(url);
      
      // Collect warnings
      const warnings: string[] = [];
      warnings.push(...(securityResult.warnings || []));
      warnings.push(...(accessibilityResult.warnings || []));

      // Network connectivity check (if enabled)
      if (this.options.checkConnectivity) {
        try {
          await this.checkConnectivity(url);
        } catch (error) {
          warnings.push(`Network connectivity check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        isValid: true,
        normalizedUrl: url.toString(),
        warnings: warnings.length > 0 ? warnings : undefined,
      };

    } catch (error) {
      this.errorLogger.error('URL validation failed', 'validation', error as Error, 'url-validator');
      
      return {
        isValid: false,
        error: {
          type: 'format',
          message: 'Failed to parse URL',
          details: error instanceof Error ? error.message : String(error),
          input,
          fixes: this.generateSuggestions(input),
        },
        suggestions: this.generateSuggestions(input),
      };
    }
  }

  /**
   * Validate multiple URLs
   */
  async validateMultiple(inputs: string[]): Promise<UrlValidationResult[]> {
    const results = await Promise.allSettled(
      inputs.map(input => this.validate(input))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const input = inputs[index] || '';
        return {
          isValid: false,
          error: {
            type: 'format',
            message: 'Validation failed',
            details: result.reason instanceof Error ? result.reason.message : String(result.reason),
            input,
            fixes: this.generateSuggestions(input),
          },
          suggestions: this.generateSuggestions(input),
        };
      }
    });
  }

  /**
   * Quick validation for common use cases
   */
  isValidUrl(input: string): boolean {
    try {
      const normalized = this.normalizeInput(input);
      const url = new URL(normalized);
      return this.options.allowedProtocols.includes(url.protocol.replace(':', ''));
    } catch {
      return false;
    }
  }

  /**
   * Normalize input to handle common formatting issues
   * @private
   */
  private normalizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    let normalized = input.trim();

    // Check for common typos
    for (const [typo, correction] of UrlValidator.COMMON_TYPOS) {
      if (normalized.startsWith(typo)) {
        normalized = normalized.replace(typo, correction);
        break;
      }
    }

    // Auto-add protocol if missing
    if (this.options.autoNormalize && !normalized.match(/^[a-z][a-z0-9+.-]*:/i)) {
      // Special handling for localhost
      if (normalized.startsWith('localhost')) {
        normalized = `http://${normalized}`;
      } else {
        normalized = `https://${normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Validate URL format
   * @private
   */
  private validateFormat(input: string): UrlValidationResult {
    // Length check
    if (input.length > this.options.maxLength) {
      return {
        isValid: false,
        error: {
          type: 'format',
          message: `URL is too long (${input.length} characters, maximum ${this.options.maxLength})`,
          input,
          fixes: ['Consider using a URL shortener', 'Remove unnecessary query parameters'],
        },
      };
    }

    // Basic URL pattern check
    if (!input.match(/^[a-z][a-z0-9+.-]*:\/\//i)) {
      return {
        isValid: false,
        error: {
          type: 'format',
          message: 'URL must include a valid protocol (http:// or https://)',
          input,
          fixes: this.generateSuggestions(input),
        },
        suggestions: this.generateSuggestions(input),
      };
    }

    try {
      new URL(input);
      return { isValid: true, normalizedUrl: input };
    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'format',
          message: 'Invalid URL format',
          details: error instanceof Error ? error.message : String(error),
          input,
          fixes: this.generateSuggestions(input),
        },
        suggestions: this.generateSuggestions(input),
      };
    }
  }

  /**
   * Validate URL protocol
   * @private
   */
  private validateProtocol(url: URL): UrlValidationResult {
    const protocol = url.protocol.replace(':', '');
    
    if (!this.options.allowedProtocols.includes(protocol)) {
      return {
        isValid: false,
        error: {
          type: 'protocol',
          message: `Protocol "${protocol}" is not allowed`,
          details: `Allowed protocols: ${this.options.allowedProtocols.join(', ')}`,
          input: url.toString(),
          fixes: [
            `Change to https://${url.host}${url.pathname}${url.search}${url.hash}`,
            `Change to http://${url.host}${url.pathname}${url.search}${url.hash}`,
          ],
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate domain and hostname
   * @private
   */
  private validateDomain(url: URL): UrlValidationResult {
    const hostname = url.hostname.toLowerCase();
    const warnings: string[] = [];

    // Localhost check
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      if (!this.options.allowLocalhost) {
        return {
          isValid: false,
          error: {
            type: 'domain',
            message: 'Localhost URLs are not allowed',
            input: url.toString(),
            fixes: ['Use a public domain name instead of localhost'],
          },
        };
      }
      warnings.push('Using localhost - this URL will only work on your local machine');
    }

    // IP address check
    if (this.isIpAddress(hostname)) {
      if (!this.options.allowIpAddresses) {
        return {
          isValid: false,
          error: {
            type: 'domain',
            message: 'IP addresses are not allowed',
            input: url.toString(),
            fixes: ['Use a domain name instead of an IP address'],
          },
        };
      }
      warnings.push('Using IP address - consider using a domain name for better accessibility');
    }

    // Port validation
    if (url.port && !this.options.allowNonStandardPorts) {
      const port = parseInt(url.port, 10);
      const isStandardPort = (url.protocol === 'http:' && port === 80) || 
                            (url.protocol === 'https:' && port === 443);
      
      if (!isStandardPort) {
        return {
          isValid: false,
          error: {
            type: 'domain',
            message: `Non-standard port ${port} is not allowed`,
            input: url.toString(),
            fixes: ['Remove the port number', 'Use standard ports (80 for HTTP, 443 for HTTPS)'],
          },
        };
      }
    }

    // Suspicious domain check
    if (UrlValidator.SUSPICIOUS_DOMAINS.includes(hostname)) {
      warnings.push(`Domain "${hostname}" may be a URL shortener or testing domain`);
    }

    // Basic domain format validation
    if (!hostname.includes('.') && hostname !== 'localhost') {
      return {
        isValid: false,
        error: {
          type: 'domain',
          message: 'Domain name appears to be invalid (missing TLD)',
          input: url.toString(),
          fixes: [`Add a top-level domain like "${hostname}.com"`],
        },
      };
    }

    return { isValid: true, warnings };
  }

  /**
   * Validate security aspects
   * @private
   */
  private validateSecurity(url: URL): UrlValidationResult {
    const warnings: string[] = [];

    // HTTPS recommendation
    if (url.protocol === 'http:' && url.hostname !== 'localhost') {
      warnings.push('Consider using HTTPS for better security (recommended for accessibility testing)');
    }

    // Check for potentially dangerous URLs
    if (url.pathname.includes('..')) {
      return {
        isValid: false,
        error: {
          type: 'security',
          message: 'URL contains potentially dangerous path traversal patterns',
          input: url.toString(),
          fixes: ['Remove ".." from the URL path'],
        },
      };
    }

    return { isValid: true, warnings };
  }

  /**
   * Validate accessibility-related concerns
   * @private
   */
  private validateAccessibility(url: URL): UrlValidationResult {
    const warnings: string[] = [];

    if (this.options.checkAccessibilityHostile) {
      // Check for tracking parameters that might interfere with accessibility
      for (const pattern of UrlValidator.ACCESSIBILITY_HOSTILE_PATTERNS) {
        if (pattern.test(url.toString())) {
          warnings.push('URL contains tracking parameters that might affect accessibility testing accuracy');
          break;
        }
      }

      // Check for text fragments
      if (url.hash.includes(':~:text=')) {
        warnings.push('URL contains text fragments - ensure these work with screen readers');
      }

      // Check for very long URLs that might be problematic
      if (url.toString().length > 1000) {
        warnings.push('Very long URLs may cause issues with some accessibility tools');
      }
    }

    return { isValid: true, warnings };
  }

  /**
   * Check network connectivity (basic)
   * @private
   */
  private async checkConnectivity(url: URL): Promise<void> {
    // This is a simplified connectivity check
    // In a full implementation, you might use a library like node-fetch
    // For now, we'll just validate that we can construct a proper request
    
    if (url.hostname === 'localhost' || this.isIpAddress(url.hostname)) {
      // Skip connectivity check for local URLs
      return;
    }

    // Placeholder for actual network check
    // In practice, you'd make a HEAD request or similar
    return Promise.resolve();
  }

  /**
   * Check if hostname is an IP address
   * @private
   */
  private isIpAddress(hostname: string): boolean {
    // IPv4 check
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname.split('.').every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6 check (simplified)
    if (hostname.includes(':') && hostname.length > 2) {
      return /^[0-9a-f:]+$/i.test(hostname);
    }

    return false;
  }

  /**
   * Generate auto-correction suggestions
   * @private
   */
  private generateSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    // Check for common typos
    for (const [typo, correction] of UrlValidator.COMMON_TYPOS) {
      if (input.includes(typo)) {
        suggestions.push(input.replace(typo, correction));
      }
    }

    // Add protocol if missing
    if (!input.match(/^[a-z][a-z0-9+.-]*:/i)) {
      suggestions.push(`https://${input}`);
      suggestions.push(`http://${input}`);
    }

    // Add www if it looks like a domain
    if (!input.includes('://') && input.includes('.') && !input.startsWith('www.')) {
      suggestions.push(`https://www.${input}`);
    }

    // Remove duplicates
    return [...new Set(suggestions)];
  }

  /**
   * Create validator with preset configurations
   */
  static strict(): UrlValidator {
    return new UrlValidator({
      allowedProtocols: ['https'],
      allowLocalhost: false,
      allowIpAddresses: false,
      checkAccessibilityHostile: true,
      allowNonStandardPorts: false,
    });
  }

  static lenient(): UrlValidator {
    return new UrlValidator({
      allowedProtocols: ['http', 'https', 'ftp'],
      allowLocalhost: true,
      allowIpAddresses: true,
      checkAccessibilityHostile: false,
      allowNonStandardPorts: true,
    });
  }

  static development(): UrlValidator {
    return new UrlValidator({
      allowedProtocols: ['http', 'https'],
      allowLocalhost: true,
      allowIpAddresses: true,
      checkAccessibilityHostile: false,
      allowNonStandardPorts: true,
      checkConnectivity: false,
    });
  }
}

/**
 * URL validation error formatter for CLI display
 */
export class UrlErrorFormatter {
  /**
   * Format validation error for console display
   */
  static formatError(result: UrlValidationResult): string {
    if (result.isValid) {
      return '';
    }

    const error = result.error!;
    let output = `❌ ${error.message}\n`;
    
    if (error.details) {
      output += `   Details: ${error.details}\n`;
    }

    if (error.fixes && error.fixes.length > 0) {
      output += `   💡 Suggestions:\n`;
      error.fixes.forEach((fix, index) => {
        output += `   ${index + 1}. ${fix}\n`;
      });
    }

    if (result.suggestions && result.suggestions.length > 0) {
      output += `   🔧 Try these URLs:\n`;
      result.suggestions.slice(0, 3).forEach((suggestion, index) => {
        output += `   ${index + 1}. ${suggestion}\n`;
      });
    }

    return output;
  }

  /**
   * Format validation warnings for console display
   */
  static formatWarnings(result: UrlValidationResult): string {
    if (!result.warnings || result.warnings.length === 0) {
      return '';
    }

    let output = `⚠️  Warnings:\n`;
    result.warnings.forEach((warning, index) => {
      output += `   ${index + 1}. ${warning}\n`;
    });

    return output;
  }

  /**
   * Format validation success for console display
   */
  static formatSuccess(result: UrlValidationResult): string {
    if (!result.isValid) {
      return '';
    }

    let output = `✅ URL is valid: ${result.normalizedUrl}\n`;
    
    if (result.warnings && result.warnings.length > 0) {
      output += this.formatWarnings(result);
    }

    return output;
  }
} 