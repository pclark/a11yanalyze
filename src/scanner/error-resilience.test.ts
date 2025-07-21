/**
 * Error resilience system unit tests
 * Tests circuit breakers, retry logic, adaptive timeouts, and resilience manager
 */

import {
  ErrorResilienceManager,
  CircuitBreaker,
  CircuitBreakerState,
  TimeoutManager,
  RetryManager,
  ResilienceConfig,
  RetryStrategy,
} from './error-resilience';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 5000, 'test-circuit');
  });

  describe('Circuit States', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should transition to OPEN after threshold failures', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));

      // Execute failing operations up to threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(circuitBreaker.getFailureCount()).toBe(3);
    });

    it('should reject operations when OPEN', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Now circuit should be OPEN and reject new operations
      await expect(circuitBreaker.execute(() => Promise.resolve('success')))
        .rejects.toThrow('Circuit breaker test-circuit is OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      jest.useFakeTimers();
      
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Fast-forward time beyond timeout
      jest.advanceTimersByTime(6000);

      // Next execution should transition to HALF_OPEN
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successOperation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);

      jest.useRealTimers();
    });

    it('should reset failure count on successful operation', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));
      const successOperation = jest.fn().mockResolvedValue('success');

      // Partial failures
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getFailureCount()).toBe(1);

      // Successful operation should reset count
      await circuitBreaker.execute(successOperation);
      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should allow manual reset', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Manual reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });
  });
});

describe('TimeoutManager', () => {
  let timeoutManager: TimeoutManager;
  let config: ResilienceConfig;

  beforeEach(() => {
    config = {
      maxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 10000,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      operationTimeouts: {
        navigation: 30000,
        pageReady: 10000,
        ruleExecution: 15000,
        metadataExtraction: 5000,
        screenshot: 10000,
      },
      adaptiveTimeouts: true,
      maxConcurrentOperations: 10,
    };
    timeoutManager = new TimeoutManager(config);
  });

  describe('Basic Timeout Handling', () => {
    it('should return base timeout when adaptive timeouts disabled', () => {
      config.adaptiveTimeouts = false;
      timeoutManager = new TimeoutManager(config);

      const timeout = timeoutManager.getTimeout('navigation');
      expect(timeout).toBe(30000);
    });

    it('should return base timeout when no metrics available', () => {
      const timeout = timeoutManager.getTimeout('navigation');
      expect(timeout).toBe(30000);
    });
  });

  describe('Metrics Recording', () => {
    it('should record successful execution metrics', () => {
      timeoutManager.recordExecution('navigation', 2000, true, false);

      const metrics = timeoutManager.getMetrics();
      const navigationMetrics = metrics.get('navigation');

      expect(navigationMetrics).toMatchObject({
        successCount: 1,
        failureCount: 0,
        averageExecutionTime: 2000,
        lastExecutionTime: 2000,
        timeouts: 0,
      });
    });

    it('should record failed execution metrics', () => {
      timeoutManager.recordExecution('navigation', 1500, false, true);

      const metrics = timeoutManager.getMetrics();
      const navigationMetrics = metrics.get('navigation');

      expect(navigationMetrics).toMatchObject({
        successCount: 0,
        failureCount: 1,
        averageExecutionTime: 1500,
        lastExecutionTime: 1500,
        timeouts: 1,
      });
    });

    it('should calculate average execution time correctly', () => {
      timeoutManager.recordExecution('navigation', 1000, true, false);
      timeoutManager.recordExecution('navigation', 3000, true, false);

      const metrics = timeoutManager.getMetrics();
      const navigationMetrics = metrics.get('navigation');

      expect(navigationMetrics?.averageExecutionTime).toBe(2000);
    });
  });

  describe('Adaptive Timeout Calculation', () => {
    it('should increase timeout for high failure rate', () => {
      // Record several operations with low success rate
      for (let i = 0; i < 10; i++) {
        timeoutManager.recordExecution('navigation', 2000, i < 7, false); // 70% success rate
      }

      const adaptiveTimeout = timeoutManager.getTimeout('navigation');
      expect(adaptiveTimeout).toBeGreaterThan(30000); // Should be increased
    });

    it('should decrease timeout for consistently fast operations', () => {
      // Record many fast, successful operations
      for (let i = 0; i < 20; i++) {
        timeoutManager.recordExecution('navigation', 1000, true, false);
      }

      const adaptiveTimeout = timeoutManager.getTimeout('navigation');
      expect(adaptiveTimeout).toBeLessThan(30000); // Should be decreased
    });

    it('should not adapt with insufficient data', () => {
      // Record only a few operations
      timeoutManager.recordExecution('navigation', 1000, false, true);

      const adaptiveTimeout = timeoutManager.getTimeout('navigation');
      expect(adaptiveTimeout).toBe(30000); // Should remain base timeout
    });

    it('should respect minimum and maximum timeout bounds', () => {
      // Test maximum bound with very high failure rate
      for (let i = 0; i < 10; i++) {
        timeoutManager.recordExecution('navigation', 2000, false, true);
      }

      const maxTimeout = timeoutManager.getTimeout('navigation');
      expect(maxTimeout).toBeLessThanOrEqual(90000); // Maximum 300% of base

      // Test minimum bound with very fast operations
      for (let i = 0; i < 30; i++) {
        timeoutManager.recordExecution('pageReady', 100, true, false);
      }

      const minTimeout = timeoutManager.getTimeout('pageReady');
      expect(minTimeout).toBeGreaterThanOrEqual(5000); // Minimum 50% of base
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all metrics on reset', () => {
      timeoutManager.recordExecution('navigation', 2000, true, false);
      timeoutManager.recordExecution('pageReady', 1000, false, true);

      expect(timeoutManager.getMetrics().size).toBe(2);

      timeoutManager.reset();
      expect(timeoutManager.getMetrics().size).toBe(0);
    });
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;
  let config: ResilienceConfig;

  beforeEach(() => {
    config = {
      maxRetries: 3,
      baseRetryDelay: 100,
      maxRetryDelay: 1000,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      operationTimeouts: {
        navigation: 30000,
        pageReady: 10000,
        ruleExecution: 15000,
        metadataExtraction: 5000,
        screenshot: 10000,
      },
      adaptiveTimeouts: true,
      maxConcurrentOperations: 10,
    };
    retryManager = new RetryManager(config);
  });

  describe('Successful Retry Logic', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation, {}, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(
        operation,
        { maxAttempts: 3 },
        'test-operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('parsing error'));

      await expect(
        retryManager.executeWithRetry(
          operation,
          { retryableErrors: ['timeout', 'network'] },
          'test-operation'
        )
      ).rejects.toThrow('parsing error');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        retryManager.executeWithRetry(
          operation,
          { maxAttempts: 2 },
          'test-operation'
        )
      ).rejects.toThrow('Operation test-operation failed after 2 attempts');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Backoff Strategies', () => {
    it('should use linear backoff', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));
      const startTime = Date.now();

      try {
        await retryManager.executeWithRetry(
          operation,
          {
            maxAttempts: 3,
            delay: 100,
            backoffType: 'linear',
            jitter: false,
          },
          'test-operation'
        );
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Linear backoff: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThan(250);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));
      const startTime = Date.now();

      try {
        await retryManager.executeWithRetry(
          operation,
          {
            maxAttempts: 3,
            delay: 100,
            backoffType: 'exponential',
            jitter: false,
          },
          'test-operation'
        );
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Exponential backoff: 100ms + 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThan(250);
    });

    it('should use fixed delay', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));
      const startTime = Date.now();

      try {
        await retryManager.executeWithRetry(
          operation,
          {
            maxAttempts: 3,
            delay: 100,
            backoffType: 'fixed',
            jitter: false,
          },
          'test-operation'
        );
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Fixed backoff: 100ms + 100ms = 200ms minimum
      expect(totalTime).toBeGreaterThan(150);
    });

    it('should respect maximum retry delay', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      // Use very high delay that should be capped
      try {
        await retryManager.executeWithRetry(
          operation,
          {
            maxAttempts: 2,
            delay: 5000, // Higher than maxRetryDelay (1000)
            backoffType: 'fixed',
            jitter: false,
          },
          'test-operation'
        );
      } catch (error) {
        // Expected to fail
      }

      // Should not take more than maxRetryDelay
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ErrorResilienceManager', () => {
  let resilienceManager: ErrorResilienceManager;

  beforeEach(() => {
    resilienceManager = new ErrorResilienceManager({
      maxRetries: 2,
      baseRetryDelay: 50,
      maxRetryDelay: 500,
      maxConcurrentOperations: 3,
    });
  });

  describe('Resilient Execution', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await resilienceManager.executeResilient(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should apply all resilience features', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await resilienceManager.executeResilient(
        operation,
        'test-operation',
        {
          useCircuitBreaker: true,
          useRetry: true,
          useTimeout: true,
        }
      );

      expect(result).toBe('success');
    });

    it('should enforce concurrent operation limits', async () => {
      const longRunningOperation = jest.fn().mockImplementation((): Promise<string> => 
        new Promise(resolve => setTimeout(() => resolve('done'), 100))
      );

      // Start max concurrent operations
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(resilienceManager.executeResilient(longRunningOperation, `operation-${i}`));
      }

      // Fourth operation should be rejected
      await expect(
        resilienceManager.executeResilient(longRunningOperation, 'operation-4')
      ).rejects.toThrow('Maximum concurrent operations (3) exceeded');

      // Wait for operations to complete
      await Promise.all(promises);
    });

    it('should handle timeout correctly', async () => {
      // Create a resilience manager with very short timeouts
      const shortTimeoutManager = new ErrorResilienceManager({
        operationTimeouts: {
          navigation: 50, // Very short timeout
          pageReady: 50,
          ruleExecution: 50,
          metadataExtraction: 50,
          screenshot: 50,
        },
      });

      const slowOperation = (): Promise<string> => new Promise(resolve => setTimeout(() => resolve('done'), 200));

      await expect(
        shortTimeoutManager.executeResilient(
          slowOperation,
          'navigation',
          { useTimeout: true }
        )
      ).rejects.toThrow('Operation navigation timed out');
    });

    it('should work without optional features', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await resilienceManager.executeResilient(
        operation,
        'test-operation',
        {
          useCircuitBreaker: false,
          useRetry: false,
          useTimeout: false,
        }
      );

      expect(result).toBe('success');
    });
  });

  describe('Error Categorization', () => {
    it('should categorize timeout errors', () => {
      const timeoutError = new Error('Operation timed out');
      const categorized = resilienceManager.categorizeError(timeoutError, 'test-context');

      expect(categorized.type).toBe('timeout');
      expect(categorized.message).toBe('Operation timed out');
    });

    it('should categorize network errors', () => {
      const networkError = new Error('Network connection failed');
      const categorized = resilienceManager.categorizeError(networkError, 'test-context');

      expect(categorized.type).toBe('network');
      expect(categorized.message).toBe('Network connection failed');
    });

    it('should categorize parsing errors', () => {
      const parseError = new Error('Invalid HTML syntax');
      const categorized = resilienceManager.categorizeError(parseError, 'test-context');

      expect(categorized.type).toBe('parsing');
      expect(categorized.message).toBe('Invalid HTML syntax');
    });

    it('should default to runtime for unknown errors', () => {
      const unknownError = new Error('Something unexpected happened');
      const categorized = resilienceManager.categorizeError(unknownError, 'test-context');

      expect(categorized.type).toBe('runtime');
      expect(categorized.message).toBe('Something unexpected happened');
    });

    it('should include context details', () => {
      const error = new Error('Test error');
      const categorized = resilienceManager.categorizeError(error, 'test-context');

      expect(categorized.details).toContain('test-context');
      expect(categorized.details).toContain('Error');
    });
  });

  describe('Status and Metrics', () => {
    it('should provide comprehensive status', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      await resilienceManager.executeResilient(operation, 'test-operation');

      const status = resilienceManager.getStatus();

      expect(status).toMatchObject({
        config: expect.any(Object),
        activeOperations: 0,
        circuitBreakers: expect.any(Array),
        operationMetrics: expect.any(Object),
      });
    });

    it('should track active operations', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 50));

      const promise = resilienceManager.executeResilient(slowOperation, 'slow-operation');
      
      // Check status while operation is running
      const statusDuring = resilienceManager.getStatus();
      expect(statusDuring.activeOperations).toBe(1);

      await promise;

      // Check status after operation completes
      const statusAfter = resilienceManager.getStatus();
      expect(statusAfter.activeOperations).toBe(0);
    });

    it('should allow configuration updates', () => {
      const newConfig = { maxRetries: 5, baseRetryDelay: 200 };
      
      resilienceManager.updateConfig(newConfig);
      
      const status = resilienceManager.getStatus();
      expect(status.config.maxRetries).toBe(5);
      expect(status.config.baseRetryDelay).toBe(200);
    });

    it('should allow reset of all metrics', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      await resilienceManager.executeResilient(operation, 'test-operation');

      // Should have some metrics
      let status = resilienceManager.getStatus();
      expect(Object.keys(status.operationMetrics)).toContain('test-operation');

      resilienceManager.reset();

      // Metrics should be cleared
      status = resilienceManager.getStatus();
      expect(Object.keys(status.operationMetrics)).toHaveLength(0);
    });
  });

  describe('Error Creation Utilities', () => {
    it('should create retryable error with attempt information', () => {
      const originalError = new Error('Original failure');
      const retryableError = resilienceManager.createRetryableError(originalError, 2, 3);

      expect(retryableError.message).toBe('Original failure (attempt 2/3)');
      expect(retryableError.name).toBe('RetryableError');
      expect(retryableError.stack).toBe(originalError.stack);
    });
  });
}); 