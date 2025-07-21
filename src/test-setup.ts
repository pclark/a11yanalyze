/**
 * Jest test setup and configuration
 * Global test utilities and environment setup
 */

// Make this file a module to allow global augmentation
export {};

// Extend Jest matchers for better assertions
expect.extend({
  toBeAccessible(received: any) {
    const pass = received && received.score >= 80;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be accessible`
          : `expected ${received} to be accessible (score >= 80)`,
      pass,
    };
  },
  
  toHaveViolations(received: any, expectedCount?: number) {
    const violations = received?.issues || [];
    const actualCount = violations.length;
    const pass = expectedCount !== undefined 
      ? actualCount === expectedCount 
      : actualCount > 0;
    
    return {
      message: () =>
        expectedCount !== undefined
          ? `expected ${actualCount} violations, got ${actualCount}`
          : pass
          ? `expected no violations, got ${actualCount}`
          : `expected violations, got none`,
      pass,
    };
  },
});

// Global test configuration
beforeAll(() => {
  // Set test environment timezone
  process.env.TZ = 'UTC';
  
  // Suppress console logs during tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  }
});

afterAll(() => {
  // Cleanup any global resources
  jest.restoreAllMocks();
});

// Global test helpers
(global as any).testHelpers = {
  createMockScanResult: (overrides = {}) => ({
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    score: 85,
    issues: [],
    metadata: {
      scanDuration: 1000,
      pageLoadTime: 500,
      totalElements: 100,
      testedElements: 95,
      userAgent: 'test-agent',
      viewport: { width: 1280, height: 720 },
      url: {
        original: 'https://example.com',
        final: 'https://example.com',
        redirects: 0,
      },
    },
    ...overrides,
  }),
  
  createMockAccessibilityIssue: (overrides = {}) => ({
    id: 'test-rule-1',
    wcagReference: '1.1.1',
    level: 'AA' as const,
    severity: 'serious' as const,
    element: 'img',
    selector: 'img[src="test.jpg"]',
    message: 'Image missing alt text',
    remediation: 'Add descriptive alt text to image',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/image-alt',
    impact: 'serious',
    tags: ['wcag2a', 'wcag111'],
    ...overrides,
  }),
  
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockBrowser: {
    page: {
      goto: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
      screenshot: jest.fn(),
    },
    close: jest.fn(),
  },
};

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveViolations(expectedCount?: number): R;
    }
  }
  
  interface Global {
    testHelpers: {
      createMockScanResult: (overrides?: any) => any;
      createMockAccessibilityIssue: (overrides?: any) => any;
      wait: (ms: number) => Promise<void>;
      mockBrowser: any;
    };
  }
} 