import { 
  GenerationErrorType, 
  GenerationError, 
  createGenerationError
} from './imageGenerationService';

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  retryableErrors: GenerationErrorType[];
  timeoutMs?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableErrors: [
    GenerationErrorType.SERVICE_UNAVAILABLE,
    GenerationErrorType.TIMEOUT,
    GenerationErrorType.RATE_LIMITED,
    GenerationErrorType.UNKNOWN_ERROR
  ]
};

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error?: GenerationError;
  timestamp: Date;
}

/**
 * Retry result with attempt history
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: GenerationError;
  attempts: RetryAttempt[];
  totalTime: number;
}

/**
 * Exponential backoff retry mechanism with jitter
 */
export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let lastError: GenerationError | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      const attemptStart = Date.now();
      
      try {
        console.log(`${operationName}: Attempt ${attempt}/${this.config.maxAttempts}`);
        
        const result = await this.executeWithTimeout(operation);
        
        // Success!
        const attemptInfo: RetryAttempt = {
          attemptNumber: attempt,
          delay: 0,
          timestamp: new Date(attemptStart)
        };
        attempts.push(attemptInfo);
        
        console.log(`${operationName}: Succeeded on attempt ${attempt}`);
        
        return {
          success: true,
          result,
          attempts,
          totalTime: Date.now() - startTime
        };
        
      } catch (error: any) {
        const generationError = this.normalizeError(error);
        lastError = generationError;
        
        const delay = attempt < this.config.maxAttempts 
          ? this.calculateDelay(attempt, generationError)
          : 0;
        
        const attemptInfo: RetryAttempt = {
          attemptNumber: attempt,
          delay: attempt === 1 ? 0 : delay, // First attempt has no delay
          error: generationError,
          timestamp: new Date(attemptStart)
        };
        attempts.push(attemptInfo);
        
        console.error(`${operationName}: Attempt ${attempt} failed:`, generationError.message);
        
        // Check if we should retry
        if (attempt >= this.config.maxAttempts || !this.shouldRetry(generationError)) {
          console.error(`${operationName}: Not retrying. Max attempts: ${attempt >= this.config.maxAttempts}, Retryable: ${this.shouldRetry(generationError)}`);
          break;
        }
        
        // Wait before next attempt
        if (delay > 0) {
          console.log(`${operationName}: Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError,
      attempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.timeoutMs) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(createGenerationError(
          GenerationErrorType.TIMEOUT,
          `Operation timed out after ${this.config.timeoutMs}ms`,
          true
        ));
      }, this.config.timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Calculate delay for next attempt with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, error: GenerationError): number {
    // Use error-specific retry delay if provided
    if (error.retryAfter && error.retryAfter > 0) {
      return Math.min(error.retryAfter, this.config.maxDelay);
    }

    // Calculate exponential backoff
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    return Math.min(delayWithJitter, this.config.maxDelay);
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: GenerationError): boolean {
    // Check if error is explicitly retryable
    if (error.retryable === false) {
      return false;
    }

    // Check if error type is in retryable list
    return this.config.retryableErrors.includes(error.type);
  }

  /**
   * Normalize any error to GenerationError
   */
  private normalizeError(error: any): GenerationError {
    if (error && error.type && Object.values(GenerationErrorType).includes(error.type)) {
      return error as GenerationError;
    }

    // Convert unknown errors
    return createGenerationError(
      GenerationErrorType.UNKNOWN_ERROR,
      error?.message || 'Unknown error occurred',
      true
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures to open circuit
  recoveryTimeout: number;     // Time to wait before trying half-open (ms)
  successThreshold: number;    // Successes needed in half-open to close circuit
  monitoringWindow: number;    // Time window for failure counting (ms)
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 2,
  monitoringWindow: 60000 // 1 minute
};

/**
 * Circuit breaker implementation for service protection
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: Date[] = [];
  private successes: number = 0;
  private lastFailureTime?: Date;
  private serviceName: string;

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successes = 0;
        console.log(`Circuit breaker for ${this.serviceName}: Moving to HALF_OPEN state`);
      } else {
        throw createGenerationError(
          GenerationErrorType.SERVICE_UNAVAILABLE,
          `Circuit breaker is OPEN for service ${this.serviceName}`,
          true,
          this.getRemainingRecoveryTime()
        );
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

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.failures = [];
        this.successes = 0;
        console.log(`Circuit breaker for ${this.serviceName}: Moving to CLOSED state`);
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Clean up old failures
      this.cleanupOldFailures();
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    const now = new Date();
    this.failures.push(now);
    this.lastFailureTime = now;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failed during half-open, go back to open
      this.state = CircuitBreakerState.OPEN;
      this.successes = 0;
      console.log(`Circuit breaker for ${this.serviceName}: Moving back to OPEN state`);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      this.cleanupOldFailures();
      if (this.failures.length >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
        console.log(`Circuit breaker for ${this.serviceName}: Moving to OPEN state (${this.failures.length} failures)`);
      }
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  /**
   * Get remaining time until recovery attempt
   */
  private getRemainingRecoveryTime(): number {
    if (!this.lastFailureTime) return 0;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return Math.max(0, this.config.recoveryTimeout - timeSinceLastFailure);
  }

  /**
   * Clean up failures outside the monitoring window
   */
  private cleanupOldFailures(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringWindow);
    this.failures = this.failures.filter(failure => failure > cutoff);
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    lastFailureTime?: Date;
    nextRetryTime?: Date;
  } {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.lastFailureTime 
        ? new Date(this.lastFailureTime.getTime() + this.config.recoveryTimeout)
        : undefined
    };
  }

  /**
   * Force reset the circuit breaker (for admin/testing)
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = undefined;
    console.log(`Circuit breaker for ${this.serviceName}: Manually reset to CLOSED state`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}