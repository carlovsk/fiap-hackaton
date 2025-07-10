import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies first
const mockApp = {
  get: vi.fn(),
  listen: vi.fn(),
};

const mockExpress = vi.fn(() => mockApp);

vi.mock('express', () => ({
  default: mockExpress,
}));

const mockCollectDefaultMetrics = vi.fn();
const mockRegister = {
  contentType: 'text/plain',
  metrics: vi.fn().mockResolvedValue('# HELP nodejs_version_info Node.js version info'),
};

vi.mock('prom-client', () => ({
  default: {
    collectDefaultMetrics: mockCollectDefaultMetrics,
    register: mockRegister,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('Metrics', () => {
  let startMetricsServer: any;

  beforeEach(async () => {
    // Clear mocks before each test
    vi.clearAllMocks();

    // Import the module after mocks are set up
    const module = await import('./metrics');
    startMetricsServer = module.startMetricsServer;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('startMetricsServer', () => {
    it('should start metrics server with default port', () => {
      startMetricsServer();

      expect(mockExpress).toHaveBeenCalled();
      expect(mockCollectDefaultMetrics).toHaveBeenCalled();
      expect(mockApp.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
      expect(mockApp.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    });

    it('should start metrics server with custom port', () => {
      const customPort = 9090;
      startMetricsServer(customPort);

      expect(mockApp.listen).toHaveBeenCalledWith(customPort, expect.any(Function));
    });

    it('should use METRICS_PORT environment variable', () => {
      process.env.METRICS_PORT = '9091';
      startMetricsServer();

      expect(mockApp.listen).toHaveBeenCalledWith(9091, expect.any(Function));

      delete process.env.METRICS_PORT;
    });

    it('should handle metrics endpoint correctly', async () => {
      const mockRes = {
        set: vi.fn(),
        send: vi.fn(),
      };

      startMetricsServer();

      // Get the metrics handler
      const metricsHandler = mockApp.get.mock.calls[0][1];

      // Call the handler
      await metricsHandler({}, mockRes);

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should handle metrics endpoint with registry error', async () => {
      const mockRes = {
        set: vi.fn(),
        send: vi.fn(),
      };

      // Override the register mock to simulate error
      mockRegister.metrics = vi.fn().mockRejectedValue(new Error('Registry error'));

      startMetricsServer();

      // Get the metrics handler
      const metricsHandler = mockApp.get.mock.calls[0][1];

      // Call the handler and expect it to handle the error
      await expect(metricsHandler({}, mockRes)).rejects.toThrow('Registry error');
    });
  });
});
