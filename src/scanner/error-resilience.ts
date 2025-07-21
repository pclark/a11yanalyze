import { ScanError } from '../types';

/**
 * Configuration for error resilience and timeout handling
 */
export interface ResilienceConfig {
  maxRetries: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  operationTimeouts: {
    navigation: number;
    pageReady: number;
    ruleExecution: number;
    metadataExtraction: number;
    screenshot: number;
  };
  adaptiveTimeouts: boolean;
  maxConcurrentOperations: number;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Operation result tracking for adaptive behavior
 */
export interface OperationMetrics {
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  lastExecutionTime: number;
  timeouts: number;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  maxAttempts: number;
  delay: number;
  backoffType: 'linear' | 'exponential' | 'fixed';
  jitter: boolean;
  retryableErrors: string[];
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(
    private threshold: number,
    private timeout: number,
    private name: string
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN. Next attempt at ${new Date(this.nextAttemptTime)}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
    this.nextAttemptTime = 0;
  }
}

/**
 * Adaptive timeout manager
 */
export class TimeoutManager {
  private metrics: Map<string, OperationMetrics> = new Map();
  private config: ResilienceConfig;

  constructor(config: ResilienceConfig) {
    this.config = config;
  }

  /**
   * Get timeout for operation with adaptive adjustment
   */
  getTimeout(operationType: keyof ResilienceConfig['operationTimeouts'] | string): number {
    const baseTimeout = this.config.operationTimeouts[operationType as keyof ResilienceConfig['operationTimeouts']] || 5000;
    
    if (!this.config.adaptiveTimeouts) {
      return baseTimeout;
    }

    const metrics = this.metrics.get(operationType);
    if (!metrics) {
      return baseTimeout;
    }

    // Adjust timeout based on historical performance
    const adaptiveFactor = this.calculateAdaptiveFactor(metrics);
    const adaptiveTimeout = Math.max(
      baseTimeout * adaptiveFactor,
      baseTimeout * 0.5 // Minimum 50% of base timeout
    );

    return Math.min(adaptiveTimeout, baseTimeout * 3); // Maximum 300% of base timeout
  }

  /**
   * Record operation execution metrics
   */
  recordExecution(
    operationType: string,
    executionTime: number,
    success: boolean,
    timedOut: boolean = false
  ): void {
    const existing = this.metrics.get(operationType) || {
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
      timeouts: 0,
    };

    const totalOperations = existing.successCount + existing.failureCount;
    
    if (success) {
      existing.successCount++;
    } else {
      existing.failureCount++;
    }

    if (timedOut) {
      existing.timeouts++;
    }

    // Update average execution time
    existing.averageExecutionTime = 
      (existing.averageExecutionTime * totalOperations + executionTime) / (totalOperations + 1);
    
    existing.lastExecutionTime = executionTime;

    this.metrics.set(operationType, existing);
  }

  /**
   * Calculate adaptive factor based on metrics
   */
  private calculateAdaptiveFactor(metrics: OperationMetrics): number {
    const totalOperations = metrics.successCount + metrics.failureCount;
    
    if (totalOperations < 5) {
      return 1.0; // Not enough data for adaptation
    }

    const successRate = metrics.successCount / totalOperations;
    const timeoutRate = metrics.timeouts / totalOperations;

    // Increase timeout if high failure/timeout rate
    if (successRate < 0.8 || timeoutRate > 0.2) {
      return 1.5;
    }

    // Decrease timeout if consistently fast and successful
    if (successRate > 0.95 && timeoutRate < 0.05) {
      return 0.8;
    }

    return 1.0;
  }

  getMetrics(): Map<string, OperationMetrics> {
    return new Map(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

/**
 * Retry manager with configurable strategies
 */
export class RetryManager {
  private config: ResilienceConfig;

  constructor(config: ResilienceConfig) {
    this.config = config;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: Partial<RetryStrategy> = {},
    operationType: string
  ): Promise<T> {
    const retryConfig: RetryStrategy = {
      maxAttempts: strategy.maxAttempts ?? this.config.maxRetries,
      delay: strategy.delay ?? this.config.baseRetryDelay,
      backoffType: strategy.backoffType ?? 'exponential',
      jitter: strategy.jitter ?? true,
      retryableErrors: strategy.retryableErrors ?? ['timeout', 'network', 'runtime'],
    };

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < retryConfig.maxAttempts) {
      try {
        const startTime = Date.now();
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt >= retryConfig.maxAttempts) {
          break;
        }

        if (!this.isRetryableError(error as Error, retryConfig.retryableErrors)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, retryConfig);
        await this.sleep(delay);
      }
    }

    throw new Error(`Operation ${operationType} failed after ${attempt} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableTypes: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    
    return retryableTypes.some(type => 
      errorMessage.includes(type.toLowerCase()) ||
      error.name.toLowerCase().includes(type.toLowerCase())
    );
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number, strategy: RetryStrategy): number {
    let delay: number;

    switch (strategy.backoffType) {
      case 'linear':
        delay = strategy.delay * attempt;
        break;
      case 'exponential':
        delay = strategy.delay * Math.pow(this.config.backoffMultiplier, attempt - 1);
        break;
      case 'fixed':
      default:
        delay = strategy.delay;
        break;
    }

    // Apply jitter to prevent thundering herd
    if (strategy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Comprehensive error resilience manager
 */
export class ErrorResilienceManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private timeoutManager: TimeoutManager;
  private retryManager: RetryManager;
  private config: ResilienceConfig;
  private activeOperations = new Set<string>();

  constructor(config: Partial<ResilienceConfig> = {}) {
    this.config = {
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
      ...config,
    };

    this.timeoutManager = new TimeoutManager(this.config);
    this.retryManager = new RetryManager(this.config);
  }

  /**
   * Execute operation with full resilience features
   */
  async executeResilient<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      useCircuitBreaker?: boolean;
      useRetry?: boolean;
      useTimeout?: boolean;
      retryStrategy?: Partial<RetryStrategy>;
    } = {}
  ): Promise<T> {
    const {
      useCircuitBreaker = true,
      useRetry = true,
      useTimeout = true,
      retryStrategy = {},
    } = options;

    // Check concurrent operation limit
    if (this.activeOperations.size >= this.config.maxConcurrentOperations) {
      throw new Error(`Maximum concurrent operations (${this.config.maxConcurrentOperations}) exceeded`);
    }

    const operationId = `${operationType}-${Date.now()}-${Math.random()}`;
    this.activeOperations.add(operationId);

    try {
      const wrappedOperation = async () => {
        const startTime = Date.now();
        let result: T;
        let timedOut = false;

        try {
          if (useTimeout) {
            const timeout = this.timeoutManager.getTimeout(operationType as any);
            result = await Promise.race([
              operation(),
              this.createTimeoutPromise(timeout, operationType) as Promise<T>,
            ]);
          } else {
            result = await operation();
          }

          const executionTime = Date.now() - startTime;
          this.timeoutManager.recordExecution(operationType, executionTime, true, false);
          
          return result;
        } catch (error) {
          const executionTime = Date.now() - startTime;
          timedOut = error instanceof Error && error.message.includes('timeout');
          this.timeoutManager.recordExecution(operationType, executionTime, false, timedOut);
          throw error;
        }
      };

      let finalOperation = wrappedOperation;

      // Wrap with retry logic
      if (useRetry) {
        const retryOperation = () => this.retryManager.executeWithRetry(
          wrappedOperation,
          retryStrategy,
          operationType
        );
        finalOperation = retryOperation;
      }

      // Wrap with circuit breaker
      if (useCircuitBreaker) {
        const circuitBreaker = this.getOrCreateCircuitBreaker(operationType);
        return await circuitBreaker.execute(finalOperation);
      }

      return await finalOperation();
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number, operationType: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${operationType} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get or create circuit breaker for operation type
   */
  private getOrCreateCircuitBreaker(operationType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationType)) {
      this.circuitBreakers.set(
        operationType,
        new CircuitBreaker(
          this.config.circuitBreakerThreshold,
          this.config.circuitBreakerTimeout,
          operationType
        )
      );
    }
    return this.circuitBreakers.get(operationType)!;
  }

  /**
   * Get resilience status and metrics
   */
  getStatus() {
    const circuitBreakerStatus = Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
      name,
      state: cb.getState(),
      failureCount: cb.getFailureCount(),
    }));

    return {
      config: this.config,
      activeOperations: this.activeOperations.size,
      circuitBreakers: circuitBreakerStatus,
      operationMetrics: Object.fromEntries(this.timeoutManager.getMetrics()),
    };
  }

  /**
   * Reset all resilience components
   */
  reset(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
    this.timeoutManager.reset();
    this.activeOperations.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ResilienceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.timeoutManager = new TimeoutManager(this.config);
    this.retryManager = new RetryManager(this.config);
  }

  /**
   * Categorize and enrich error information
   */
  categorizeError(error: Error, context: string): ScanError {
    const message = error.message.toLowerCase();
    
    let type: ScanError['type'] = 'runtime';
    
    if (message.includes('timeout') || message.includes('time out') || message.includes('timed out')) {
      type = 'timeout';
    } else if (message.includes('network') || message.includes('connection') || 
               message.includes('dns') || message.includes('unreachable')) {
      type = 'network';
    } else if (message.includes('parse') || message.includes('syntax') || 
               message.includes('invalid html') || message.includes('malformed')) {
      type = 'parsing';
    }

    return {
      type,
      message: error.message,
      details: JSON.stringify({
        context,
        originalError: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Truncated stack
        timestamp: new Date().toISOString(),
      }),
    };
  }

  /**
   * Create error with retry information
   */
  createRetryableError(originalError: Error, attempt: number, maxAttempts: number): Error {
    const error = new Error(
      `${originalError.message} (attempt ${attempt}/${maxAttempts})`
    );
    error.name = `Retryable${originalError.name}`;
    error.stack = originalError.stack;
    return error;
  }
} 