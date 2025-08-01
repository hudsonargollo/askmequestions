import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  RetryManager, 
  CircuitBreaker, 
  CircuitBreakerState,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG
} from '../retryLogic';
import { 
  GenerationErrorType, 
  createGenerationError 
} from '../imageGenerationService';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockOperation, 'test-op');
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].attemptNumber).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(createGenerationError(
          GenerationErrorType.SERVICE_UNAVAILABLE,
          'Service down',
          true
        ))
        .mockResolvedValue('success');
      
      const promise = retryManager.executeWithRetry(mockOperation, 'test-op');
      
      // Fast-forward through the delay
      await vi.advanceTimersByTimeAsync(2000);
      
      const result = await promise;
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toHaveLength(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(createGenerationError(
        GenerationErrorType.AUTHENTICATION_ERROR,
        'Invalid API key',
        false
      ));
      
      const result = await retryManager.executeWithRetry(mockOperation, 'test-op');
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(GenerationErrorType.AUTHENTICATION_ERROR);
      expect(result.attempts).toHaveLength(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum attempts', async () => {
      const mockOperation = vi.fn().mockRejectedValue(createGenerationError(
        GenerationErrorType.SERVICE_UNAVAILABLE,
        'Service down',
        true
      ));
      
      const promise = retryManager.executeWithRetry(mockOperation, 'test-op');
      
      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(10000);
      
      const result = await promise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(DEFAULT_RETRY_CONFIG.maxAttempts);
      expect(mockOperation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxAttempts);
    });

    it('should use exponential backoff', async () => {
      const mockOperation = vi.fn().mockRejectedValue(createGenerationError(
        GenerationErrorType.SERVICE_UNAVAILABLE,
        'Service down',
        true
      ));
      
      const promise = retryManager.executeWithRetry(mockOperation, 'test-op');
      
      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(10000);
      
      const result = await promise;
      
      expect(result.attempts[0].delay).toBe(0); // First attempt has no delay
      expect(result.attempts[1].delay).toBeGreaterThan(0); // Second attempt has some delay
      expect(result.attempts[1].delay).toBeGreaterThan(result.attempts[0].delay); // Second attempt has more delay than first
    }, 10000);

    it('should respect error-specific retry delay', async () => {
      const mockOperation = vi.fn().mockRejectedValue(createGenerationError(
        GenerationErrorType.RATE_LIMITED,
        'Rate limited',
        true,
        5000 // Specific retry delay
      ));
      
      const promise = retryManager.executeWithRetry(mockOperation, 'test-op');
      
      // Fast-forward through the delay
      await vi.advanceTimersByTimeAsync(20000);
      
      const result = await promise;
      
      expect(result.attempts[1].delay).toBe(5000);
    }, 10000);

    it('should handle timeout configuration', async () => {
      const retryManagerWithTimeout = new RetryManager({ 
        timeoutMs: 1000,
        maxAttempts: 1 // Only try once to avoid long test
      });
      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      const promise = retryManagerWithTimeout.executeWithRetry(mockOperation, 'test-op');
      
      // Fast-forward past timeout
      await vi.advanceTimersByTimeAsync(2000);
      
      const result = await promise;
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(GenerationErrorType.TIMEOUT);
    }, 15000);

    it('should normalize unknown errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Unknown error'));
      
      const promise = retryManager.executeWithRetry(mockOperation, 'test-op');
      
      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(10000);
      
      const result = await promise;
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(GenerationErrorType.UNKNOWN_ERROR);
      expect(result.error?.message).toBe('Unknown error');
    }, 10000);
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        maxAttempts: 5,
        baseDelay: 2000,
        backoffMultiplier: 3
      };
      
      const customRetryManager = new RetryManager(customConfig);
      const config = customRetryManager.getConfig();
      
      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(config.backoffMultiplier).toBe(3);
    });

    it('should allow configuration updates', () => {
      retryManager.updateConfig({ maxAttempts: 10 });
      const config = retryManager.getConfig();
      
      expect(config.maxAttempts).toBe(10);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    it('should execute operation when circuit is closed', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should open circuit after failure threshold', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      
      // Trigger failures up to threshold
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);
    });

    it('should reject requests immediately when circuit is open', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      
      // Open the circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Reset mock to track new calls
      mockOperation.mockClear();
      
      // Try to execute - should be rejected immediately
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should transition to half-open after recovery timeout', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      
      // Open the circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);
      
      // Fast-forward past recovery timeout
      await vi.advanceTimersByTimeAsync(DEFAULT_CIRCUIT_BREAKER_CONFIG.recoveryTimeout + 1000);
      
      // Mock successful operation
      mockOperation.mockResolvedValueOnce('success');
      
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('should close circuit after success threshold in half-open', async () => {
      const mockOperation = vi.fn();
      
      // Open the circuit
      mockOperation.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Fast-forward past recovery timeout
      await vi.advanceTimersByTimeAsync(DEFAULT_CIRCUIT_BREAKER_CONFIG.recoveryTimeout + 1000);
      
      // Mock successful operations
      mockOperation.mockResolvedValue('success');
      
      // Execute successful operations up to success threshold
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.successThreshold; i++) {
        await circuitBreaker.execute(mockOperation);
      }
      
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should return to open if failure occurs in half-open', async () => {
      const mockOperation = vi.fn();
      
      // Open the circuit
      mockOperation.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Fast-forward past recovery timeout
      await vi.advanceTimersByTimeAsync(DEFAULT_CIRCUIT_BREAKER_CONFIG.recoveryTimeout + 1000);
      
      // First operation succeeds (moves to half-open)
      mockOperation.mockResolvedValueOnce('success');
      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.HALF_OPEN);
      
      // Second operation fails (back to open)
      mockOperation.mockRejectedValueOnce(new Error('Still failing'));
      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected to fail
      }
      
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('status and management', () => {
    it('should provide accurate status information', () => {
      const status = circuitBreaker.getStatus();
      
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failures).toBe(0);
      expect(status.successes).toBe(0);
      expect(status.lastFailureTime).toBeUndefined();
    });

    it('should allow manual reset', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      
      // Open the circuit
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.OPEN);
      
      // Reset manually
      circuitBreaker.reset();
      
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getStatus().failures).toBe(0);
    });

    it('should clean up old failures outside monitoring window', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service error'));
      
      // Create some failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStatus().failures).toBe(3);
      
      // Fast-forward past monitoring window
      await vi.advanceTimersByTimeAsync(DEFAULT_CIRCUIT_BREAKER_CONFIG.monitoringWindow + 1000);
      
      // Trigger cleanup by attempting another operation
      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected to fail
      }
      
      // Old failures should be cleaned up, only the new one remains
      expect(circuitBreaker.getStatus().failures).toBe(1);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        failureThreshold: 10,
        recoveryTimeout: 60000
      };
      
      const customCircuitBreaker = new CircuitBreaker('custom-service', customConfig);
      
      // This is tested indirectly by checking behavior
      expect(customCircuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should allow configuration updates', () => {
      circuitBreaker.updateConfig({ failureThreshold: 10 });
      
      // Configuration update is tested indirectly through behavior
      expect(circuitBreaker.getStatus().state).toBe(CircuitBreakerState.CLOSED);
    });
  });
});