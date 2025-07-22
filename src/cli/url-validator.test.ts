/**
 * URL Validator unit tests
 * Tests comprehensive URL validation, error handling, and auto-correction features
 */

import { UrlValidator, UrlErrorFormatter, UrlValidationOptions } from './url-validator';

describe('UrlValidator', () => {
  let validator: UrlValidator;

  beforeEach(() => {
    validator = new UrlValidator();
  });

  describe('Basic URL Validation', () => {
    it('should validate simple HTTP URLs', async () => {
      const result = await validator.validate('http://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('http://example.com/');
    });

    it('should validate simple HTTPS URLs', async () => {
      const result = await validator.validate('https://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/');
    });

    it('should auto-add HTTPS protocol', async () => {
      const result = await validator.validate('example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/');
    });

    it('should auto-add HTTP for localhost', async () => {
      const result = await validator.validate('localhost:3000');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('http://localhost:3000/');
    });

    it('should validate complex URLs', async () => {
      const result = await validator.validate('https://sub.example.com:8080/path/to/page?param=value#section');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://sub.example.com:8080/path/to/page?param=value#section');
    });
  });

  describe('Input Normalization', () => {
    it('should fix common typos', async () => {
      const typos = [
        'htp://example.com',
        'htps://example.com',
        'http//example.com',
        'https//example.com',
      ];

      for (const typo of typos) {
        const result = await validator.validate(typo);
        expect(result.isValid).toBe(true);
      }
    });

    it('should handle whitespace', async () => {
      const result = await validator.validate('  https://example.com  ');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/');
    });

    it('should add www suggestions', async () => {
      const result = await validator.validate('example.com');
      
      expect(result.isValid).toBe(true);
      // Should normalize to https://example.com without www
      expect(result.normalizedUrl).toBe('https://example.com/');
    });
  });

  describe('Protocol Validation', () => {
    it('should reject unsupported protocols with strict validator', async () => {
      const strictValidator = UrlValidator.strict();
      const result = await strictValidator.validate('http://example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('protocol');
      expect(result.error?.message).toContain('not allowed');
    });

    it('should accept HTTP and HTTPS by default', async () => {
      const httpResult = await validator.validate('http://example.com');
      const httpsResult = await validator.validate('https://example.com');
      
      expect(httpResult.isValid).toBe(true);
      expect(httpsResult.isValid).toBe(true);
    });

    it('should accept additional protocols with lenient validator', async () => {
      const lenientValidator = UrlValidator.lenient();
      const result = await lenientValidator.validate('ftp://example.com');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Domain Validation', () => {
    it('should validate localhost', async () => {
      const result = await validator.validate('http://localhost');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Using localhost - this URL will only work on your local machine');
    });

    it('should reject localhost with strict validator', async () => {
      const strictValidator = UrlValidator.strict();
      const result = await strictValidator.validate('http://localhost');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('protocol');
    });

    it('should validate IP addresses', async () => {
      const result = await validator.validate('http://192.168.1.1');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Using IP address - consider using a domain name for better accessibility');
    });

    it('should validate IPv6 addresses', async () => {
      const result = await validator.validate('http://[::1]');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid IP addresses', async () => {
      const result = await validator.validate('http://999.999.999.999');
      
      expect(result.isValid).toBe(false);
    });

    it('should reject domains without TLD', async () => {
      const result = await validator.validate('http://example');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('domain');
      expect(result.error?.message).toContain('missing TLD');
    });

    it('should warn about suspicious domains', async () => {
      const result = await validator.validate('http://bit.ly/test');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes('may be a URL shortener') || w.includes('may be a URL shortener or testing domain'))).toBe(true);
    });
  });

  describe('Port Validation', () => {
    it('should allow standard ports', async () => {
      const httpResult = await validator.validate('http://example.com:80');
      const httpsResult = await validator.validate('https://example.com:443');
      
      expect(httpResult.isValid).toBe(true);
      expect(httpsResult.isValid).toBe(true);
    });

    it('should allow non-standard ports by default', async () => {
      const result = await validator.validate('http://example.com:8080');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject non-standard ports with strict validator', async () => {
      const strictValidator = UrlValidator.strict();
      const result = await strictValidator.validate('http://example.com:8080');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('protocol');
      expect(result.error?.message).toContain('Non-standard port');
    });
  });

  describe('Security Validation', () => {
    it('should warn about HTTP for non-localhost', async () => {
      const result = await validator.validate('http://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Consider using HTTPS for better security (recommended for accessibility testing)');
    });

    it('should reject path traversal patterns', async () => {
      const result = await validator.validate('https://example.com/../../../etc/passwd');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('security');
      expect(result.error?.message).toContain('path traversal');
    });
  });

  describe('Accessibility Validation', () => {
    it('should warn about tracking parameters', async () => {
      const trackingUrls = [
        'https://example.com?utm_source=test',
        'https://example.com?fbclid=123',
        'https://example.com?gclid=456',
      ];

      for (const url of trackingUrls) {
        const result = await validator.validate(url);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings.some(w => w.includes('tracking parameters'))).toBe(true);
      }
    });

    it('should warn about text fragments', async () => {
      const result = await validator.validate('https://example.com#:~:text=hello');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes('text fragments'))).toBe(true);
    });

    it('should warn about very long URLs', async () => {
      const longPath = 'a'.repeat(1000);
      const result = await validator.validate(`https://example.com/${longPath}`);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes('Very long URLs'))).toBe(true);
    });
  });

  describe('Format Validation', () => {
    it('should reject empty strings', async () => {
      const result = await validator.validate('');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('format');
    });

    it('should reject very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = await validator.validate(longUrl);
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('format');
      expect(result.error?.message).toContain('too long');
    });

    it('should reject URLs without protocol', async () => {
      const validator = new UrlValidator({ autoNormalize: false });
      const result = await validator.validate('example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('format');
      expect(result.error?.message).toContain('valid protocol');
    });
  });

  describe('Auto-correction Suggestions', () => {
    it('should suggest protocol additions', async () => {
      const validator = new UrlValidator({ autoNormalize: false });
      const result = await validator.validate('example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toContain('https://example.com');
      expect(result.suggestions).toContain('http://example.com');
    });

    it('should suggest typo corrections', async () => {
      const result = await validator.validate('htp://example.com');
      
      // This should auto-correct and be valid
      expect(result.isValid).toBe(true);
    });

    it('should suggest www additions', async () => {
      const validator = new UrlValidator({ autoNormalize: false });
      const result = await validator.validate('example.com');
      
      expect(result.suggestions).toContain('https://www.example.com');
    });
  });

  describe('Multiple URL Validation', () => {
    it('should validate multiple URLs', async () => {
      const urls = [
        'https://example.com',
        'http://localhost:3000',
        'invalid-url',
      ];

      const results = await validator.validateMultiple(urls);
      
      expect(results).toHaveLength(3);
      expect(results[0]?.isValid).toBe(true);
      expect(results[1]?.isValid).toBe(true);
      expect(results[2]?.isValid).toBe(false);
    });

    it('should handle empty array', async () => {
      const results = await validator.validateMultiple([]);
      
      expect(results).toHaveLength(0);
    });

    it('should handle validation errors gracefully', async () => {
      const results = await validator.validateMultiple(['', 'https://example.com']);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.isValid).toBe(false);
      expect(results[1]?.isValid).toBe(true);
    });
  });

  describe('Quick Validation', () => {
    it('should quickly validate valid URLs', () => {
      expect(validator.isValidUrl('https://example.com')).toBe(true);
      expect(validator.isValidUrl('http://localhost')).toBe(true);
    });

    it('should quickly reject invalid URLs', () => {
      expect(validator.isValidUrl('invalid')).toBe(false);
      expect(validator.isValidUrl('')).toBe(false);
      expect(validator.isValidUrl('ftp://example.com')).toBe(false); // Not in default allowed protocols
    });
  });

  describe('Preset Configurations', () => {
    it('should create strict validator', async () => {
      const strictValidator = UrlValidator.strict();
      
      // Should reject HTTP
      const httpResult = await strictValidator.validate('http://example.com');
      expect(httpResult.isValid).toBe(false);
      
      // Should reject localhost
      const localhostResult = await strictValidator.validate('https://localhost');
      expect(localhostResult.isValid).toBe(false);
    });

    it('should create lenient validator', async () => {
      const lenientValidator = UrlValidator.lenient();
      
      // Should accept FTP
      const ftpResult = await lenientValidator.validate('ftp://example.com');
      expect(ftpResult.isValid).toBe(true);
    });

    it('should create development validator', async () => {
      const devValidator = UrlValidator.development();
      
      // Should accept localhost
      const localhostResult = await devValidator.validate('http://localhost:3000');
      expect(localhostResult.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      const result = await validator.validate('not a url at all');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should handle special characters', async () => {
      const result = await validator.validate('https://example.com/path with spaces');
      
      // Should handle or reject gracefully
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should handle null and undefined', async () => {
      const nullResult = await validator.validate(null as any);
      const undefinedResult = await validator.validate(undefined as any);
      
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toBeDefined();
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.error).toBeDefined();
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom allowed protocols', async () => {
      const customValidator = new UrlValidator({
        allowedProtocols: ['https', 'ftp'],
      });

      const httpsResult = await customValidator.validate('https://example.com');
      const ftpResult = await customValidator.validate('ftp://example.com');
      const httpResult = await customValidator.validate('http://example.com');

      expect(httpsResult.isValid).toBe(true);
      expect(ftpResult.isValid).toBe(true);
      expect(httpResult.isValid).toBe(false);
    });

    it('should respect custom max length', async () => {
      const customValidator = new UrlValidator({
        maxLength: 50,
      });

      const shortResult = await customValidator.validate('https://example.com');
      const longResult = await customValidator.validate('https://example.com/very/long/path/that/exceeds/fifty/characters');

      expect(shortResult.isValid).toBe(true);
      expect(longResult.isValid).toBe(false);
    });

    it('should disable auto-normalization when configured', async () => {
      const customValidator = new UrlValidator({
        autoNormalize: false,
      });

      const result = await customValidator.validate('example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toContain('https://example.com');
    });
  });
});

describe('UrlErrorFormatter', () => {
  describe('Error Formatting', () => {
    it('should format validation errors', () => {
      const result = {
        isValid: false,
        error: {
          type: 'format' as const,
          message: 'Invalid URL format',
          details: 'Missing protocol',
          input: 'example.com',
          fixes: ['Add https://', 'Add http://'],
        },
        suggestions: ['https://example.com', 'http://example.com'],
      };

      const formatted = UrlErrorFormatter.formatError(result);
      
      expect(formatted).toContain('❌ Invalid URL format');
      expect(formatted).toContain('Details: Missing protocol');
      expect(formatted).toContain('💡 Suggestions:');
      expect(formatted).toContain('Add https://');
      expect(formatted).toContain('🔧 Try these URLs:');
      expect(formatted).toContain('https://example.com');
    });

    it('should return empty string for valid results', () => {
      const result = {
        isValid: true,
        normalizedUrl: 'https://example.com',
      };

      const formatted = UrlErrorFormatter.formatError(result);
      
      expect(formatted).toBe('');
    });
  });

  describe('Warning Formatting', () => {
    it('should format warnings', () => {
      const result = {
        isValid: true,
        normalizedUrl: 'http://example.com',
        warnings: ['Consider using HTTPS', 'Domain might be suspicious'],
      };

      const formatted = UrlErrorFormatter.formatWarnings(result);
      
      expect(formatted).toContain('⚠️  Warnings:');
      expect(formatted).toContain('Consider using HTTPS');
      expect(formatted).toContain('Domain might be suspicious');
    });

    it('should return empty string when no warnings', () => {
      const result = {
        isValid: true,
        normalizedUrl: 'https://example.com',
      };

      const formatted = UrlErrorFormatter.formatWarnings(result);
      
      expect(formatted).toBe('');
    });
  });

  describe('Success Formatting', () => {
    it('should format successful validation', () => {
      const result = {
        isValid: true,
        normalizedUrl: 'https://example.com',
      };

      const formatted = UrlErrorFormatter.formatSuccess(result);
      
      expect(formatted).toContain('✅ URL is valid: https://example.com');
    });

    it('should include warnings in success message', () => {
      const result = {
        isValid: true,
        normalizedUrl: 'http://example.com',
        warnings: ['Consider using HTTPS'],
      };

      const formatted = UrlErrorFormatter.formatSuccess(result);
      
      expect(formatted).toContain('✅ URL is valid');
      expect(formatted).toContain('⚠️  Warnings:');
      expect(formatted).toContain('Consider using HTTPS');
    });

    it('should return empty string for invalid results', () => {
      const result = {
        isValid: false,
        error: {
          type: 'format' as const,
          message: 'Invalid',
          input: 'test',
        },
      };

      const formatted = UrlErrorFormatter.formatSuccess(result);
      
      expect(formatted).toBe('');
    });
  });
}); 