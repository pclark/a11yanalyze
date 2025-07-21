/**
 * Jest setup verification tests
 * Ensures Jest and TypeScript are properly configured
 */

describe('Jest Setup', () => {
  it('should have access to global test helpers', () => {
    expect((global as any).testHelpers).toBeDefined();
    expect((global as any).testHelpers.createMockScanResult).toBeInstanceOf(Function);
    expect((global as any).testHelpers.createMockAccessibilityIssue).toBeInstanceOf(Function);
    expect((global as any).testHelpers.wait).toBeInstanceOf(Function);
  });

  it('should create mock scan results', () => {
    const mockResult = (global as any).testHelpers.createMockScanResult();
    
    expect(mockResult).toHaveProperty('url');
    expect(mockResult).toHaveProperty('timestamp');
    expect(mockResult).toHaveProperty('score');
    expect(mockResult).toHaveProperty('issues');
    expect(mockResult).toHaveProperty('metadata');
    expect(mockResult.score).toBe(85);
  });

  it('should create mock accessibility issues', () => {
    const mockIssue = (global as any).testHelpers.createMockAccessibilityIssue();
    
    expect(mockIssue).toHaveProperty('id');
    expect(mockIssue).toHaveProperty('wcagReference');
    expect(mockIssue).toHaveProperty('level');
    expect(mockIssue).toHaveProperty('severity');
    expect(mockIssue.wcagReference).toBe('1.1.1');
    expect(mockIssue.level).toBe('AA');
  });

  it('should support custom Jest matchers', () => {
    const accessibleResult = (global as any).testHelpers.createMockScanResult({ score: 90 });
    const inaccessibleResult = (global as any).testHelpers.createMockScanResult({ score: 60 });
    
    expect(accessibleResult).toBeAccessible();
    expect(inaccessibleResult).not.toBeAccessible();
  });

  it('should detect violations in scan results', () => {
    const issue = (global as any).testHelpers.createMockAccessibilityIssue();
    const resultWithViolations = (global as any).testHelpers.createMockScanResult({
      issues: [issue]
    });
    const resultWithoutViolations = (global as any).testHelpers.createMockScanResult({
      issues: []
    });
    
    expect(resultWithViolations).toHaveViolations();
    expect(resultWithViolations).toHaveViolations(1);
    expect(resultWithoutViolations).not.toHaveViolations();
  });

  it('should support async test helpers', async () => {
    const startTime = Date.now();
    await (global as any).testHelpers.wait(50);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeGreaterThanOrEqual(45);
  });
});

describe('TypeScript Integration', () => {
  it('should compile and run TypeScript correctly', () => {
    interface TestInterface {
      name: string;
      value: number;
    }
    
    const testObject: TestInterface = {
      name: 'test',
      value: 42
    };
    
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });

  it('should support ES6+ features', () => {
    const testArray = [1, 2, 3, 4, 5];
    const doubled = testArray.map(x => x * 2);
    const sum = testArray.reduce((acc, x) => acc + x, 0);
    
    expect(doubled).toEqual([2, 4, 6, 8, 10]);
    expect(sum).toBe(15);
  });

  it('should support async/await', async () => {
    const asyncFunction = async (): Promise<string> => {
      return new Promise(resolve => {
        setTimeout(() => resolve('async result'), 10);
      });
    };
    
    const result = await asyncFunction();
    expect(result).toBe('async result');
  });
}); 