import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  ServiceMonitor, 
  AlertType, 
  DEFAULT_ALERT_CONFIG,
  consoleAlertHandler 
} from '../serviceMonitoring';
import { MockAdapter } from '../adapters/mockAdapter';

describe('ServiceMonitor', () => {
  let serviceMonitor: ServiceMonitor;
  let mockService: MockAdapter;

  beforeEach(() => {
    serviceMonitor = new ServiceMonitor();
    mockService = new MockAdapter({ 
      serviceName: 'test-service',
      responseDelay: 10 // Very short delay for tests
    });
  });

  afterEach(() => {
    serviceMonitor.stop();
  });

  describe('service registration', () => {
    it('should register a service for monitoring', () => {
      serviceMonitor.registerService(mockService);
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics).toBeTruthy();
      expect(metrics?.serviceName).toBe('test-service');
      expect(metrics?.totalRequests).toBe(0);
    });

    it('should unregister a service from monitoring', () => {
      serviceMonitor.registerService(mockService);
      serviceMonitor.unregisterService('test-service');
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics).toBeNull();
    });
  });

  describe('health checks', () => {
    beforeEach(() => {
      serviceMonitor.registerService(mockService);
    });

    it('should perform health check on a service', async () => {
      const result = await serviceMonitor.performHealthCheck('test-service');
      
      expect(result.serviceName).toBe('test-service');
      expect(result.isHealthy).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle health check failures', async () => {
      mockService.setHealthy(false);
      
      const result = await serviceMonitor.performHealthCheck('test-service');
      
      expect(result.serviceName).toBe('test-service');
      expect(result.isHealthy).toBe(false);
    });

    it('should perform health checks on all services', async () => {
      const mockService2 = new MockAdapter({ 
        serviceName: 'test-service-2',
        responseDelay: 10
      });
      serviceMonitor.registerService(mockService2);
      
      const results = await serviceMonitor.performAllHealthChecks();
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.serviceName)).toContain('test-service');
      expect(results.map(r => r.serviceName)).toContain('test-service-2');
    });

    it('should update metrics after health checks', async () => {
      await serviceMonitor.performHealthCheck('test-service');
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics?.healthCheckHistory).toHaveLength(1);
      expect(metrics?.uptime).toBe(1.0);
    });
  });

  describe('request recording', () => {
    beforeEach(() => {
      serviceMonitor.registerService(mockService);
    });

    it('should record successful requests', () => {
      serviceMonitor.recordRequest('test-service', true, 1000);
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics?.totalRequests).toBe(1);
      expect(metrics?.successfulRequests).toBe(1);
      expect(metrics?.failedRequests).toBe(0);
      expect(metrics?.averageResponseTime).toBe(1000);
      expect(metrics?.errorRate).toBe(0);
    });

    it('should record failed requests', () => {
      serviceMonitor.recordRequest('test-service', false, 2000);
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics?.totalRequests).toBe(1);
      expect(metrics?.successfulRequests).toBe(0);
      expect(metrics?.failedRequests).toBe(1);
      expect(metrics?.averageResponseTime).toBe(2000);
      expect(metrics?.errorRate).toBe(1);
    });

    it('should calculate average response time correctly', () => {
      serviceMonitor.recordRequest('test-service', true, 1000);
      serviceMonitor.recordRequest('test-service', true, 2000);
      serviceMonitor.recordRequest('test-service', true, 3000);
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics?.averageResponseTime).toBe(2000);
    });

    it('should calculate error rate correctly', () => {
      serviceMonitor.recordRequest('test-service', true, 1000);
      serviceMonitor.recordRequest('test-service', false, 1000);
      serviceMonitor.recordRequest('test-service', true, 1000);
      serviceMonitor.recordRequest('test-service', false, 1000);
      
      const metrics = serviceMonitor.getServiceMetrics('test-service');
      expect(metrics?.errorRate).toBe(0.5);
    });
  });

  describe('alerting', () => {
    let alertHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      alertHandler = vi.fn();
      serviceMonitor.addAlertHandler(alertHandler);
      serviceMonitor.registerService(mockService);
    });

    it('should create alert for service down', async () => {
      mockService.setHealthy(false);
      
      await serviceMonitor.performHealthCheck('test-service');
      
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.SERVICE_DOWN,
          serviceName: 'test-service',
          severity: 'critical'
        })
      );
    });

    it('should create alert for high error rate', async () => {
      // Generate requests with high error rate
      for (let i = 0; i < 10; i++) {
        serviceMonitor.recordRequest('test-service', false, 1000);
      }
      serviceMonitor.recordRequest('test-service', true, 1000);
      
      // Trigger health check to evaluate alerts
      mockService.setHealthy(true);
      await serviceMonitor.performHealthCheck('test-service');
      
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.HIGH_ERROR_RATE,
          serviceName: 'test-service',
          severity: 'high'
        })
      );
    });

    it('should create alert for slow response time', async () => {
      // Create a service monitor with lower threshold for testing
      const testMonitor = new ServiceMonitor({
        responseTimeThreshold: 100 // 100ms threshold
      });
      testMonitor.addAlertHandler(alertHandler);
      
      const slowService = new MockAdapter({ 
        serviceName: 'slow-service',
        responseDelay: 200 // 200ms delay
      });
      testMonitor.registerService(slowService);
      
      await testMonitor.performHealthCheck('slow-service');
      
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.SLOW_RESPONSE_TIME,
          serviceName: 'slow-service',
          severity: 'medium'
        })
      );
      
      testMonitor.stop();
    });

    it('should create alert for consecutive failures', async () => {
      mockService.setHealthy(false);
      
      // Perform multiple health checks to trigger consecutive failures
      for (let i = 0; i < DEFAULT_ALERT_CONFIG.consecutiveFailuresThreshold; i++) {
        await serviceMonitor.performHealthCheck('test-service');
      }
      
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.CONSECUTIVE_FAILURES,
          serviceName: 'test-service',
          severity: 'critical'
        })
      );
    });

    it('should not create duplicate alerts', async () => {
      mockService.setHealthy(false);
      
      await serviceMonitor.performHealthCheck('test-service');
      await serviceMonitor.performHealthCheck('test-service');
      
      // Should only be called once for the same alert type
      const serviceDownCalls = alertHandler.mock.calls.filter(call => 
        call[0].type === AlertType.SERVICE_DOWN
      );
      expect(serviceDownCalls).toHaveLength(1);
    });

    it('should resolve alerts', async () => {
      mockService.setHealthy(false);
      await serviceMonitor.performHealthCheck('test-service');
      
      const alerts = serviceMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      // Resolve all alerts
      alerts.forEach(alert => {
        serviceMonitor.resolveAlert(alert.id);
      });
      
      expect(serviceMonitor.getActiveAlerts()).toHaveLength(0);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start and stop monitoring', () => {
      expect(() => serviceMonitor.start()).not.toThrow();
      expect(() => serviceMonitor.stop()).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      serviceMonitor.start();
      serviceMonitor.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Service monitor is already running');
      
      consoleSpy.mockRestore();
    });
  });

  describe('metrics aggregation', () => {
    beforeEach(() => {
      serviceMonitor.registerService(mockService);
      const mockService2 = new MockAdapter({ 
        serviceName: 'test-service-2',
        responseDelay: 10
      });
      serviceMonitor.registerService(mockService2);
    });

    it('should get all metrics', () => {
      const allMetrics = serviceMonitor.getAllMetrics();
      
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.map(m => m.serviceName)).toContain('test-service');
      expect(allMetrics.map(m => m.serviceName)).toContain('test-service-2');
    });

    it('should provide service status summary', async () => {
      // Record some requests
      serviceMonitor.recordRequest('test-service', true, 1000);
      serviceMonitor.recordRequest('test-service', false, 2000);
      serviceMonitor.recordRequest('test-service-2', true, 1500);
      
      // Perform health checks
      await serviceMonitor.performAllHealthChecks();
      
      const summary = serviceMonitor.getServiceStatusSummary();
      
      expect(summary.totalServices).toBe(2);
      expect(summary.healthyServices).toBe(2);
      expect(summary.unhealthyServices).toBe(0);
      expect(summary.totalRequests).toBe(3);
      expect(summary.overallErrorRate).toBeCloseTo(1/3);
    });
  });

  describe('configuration', () => {
    it('should use custom alert configuration', () => {
      const customConfig = {
        errorRateThreshold: 0.05,
        responseTimeThreshold: 5000,
        enabled: false
      };
      
      const customMonitor = new ServiceMonitor(customConfig);
      
      // This is tested indirectly by checking that alerts are not created when disabled
      customMonitor.registerService(mockService);
      customMonitor.recordRequest('test-service', false, 1000); // High error rate
      
      const alerts = customMonitor.getActiveAlerts();
      expect(alerts).toHaveLength(0); // No alerts because alerting is disabled
    });

    it('should update alert configuration', () => {
      const newConfig = {
        errorRateThreshold: 0.05,
        responseTimeThreshold: 5000
      };
      
      expect(() => serviceMonitor.updateAlertConfig(newConfig)).not.toThrow();
    });
  });

  describe('alert handlers', () => {
    it('should add and remove alert handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      // Create a fresh monitor for this test
      const testMonitor = new ServiceMonitor();
      testMonitor.addAlertHandler(handler1);
      testMonitor.addAlertHandler(handler2);
      
      testMonitor.removeAlertHandler(handler1);
      
      // Register service and trigger alert
      const testService = new MockAdapter({ 
        serviceName: 'test-service-handlers',
        responseDelay: 10
      });
      testMonitor.registerService(testService);
      testService.setHealthy(false);
      await testMonitor.performHealthCheck('test-service-handlers');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      
      testMonitor.stop();
    });
  });
});

describe('Alert Handlers', () => {
  it('should handle console alerts', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const alert = {
      id: 'test-alert',
      type: AlertType.SERVICE_DOWN,
      serviceName: 'test-service',
      message: 'Test alert',
      severity: 'critical' as const,
      timestamp: new Date(),
      resolved: false
    };
    
    consoleAlertHandler(alert);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL ALERT: Test alert (Service: test-service)')
    );
    
    consoleSpy.mockRestore();
  });
});