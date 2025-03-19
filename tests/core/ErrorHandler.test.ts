import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler } from '../../src/core/ErrorHandler';
import { ErrorVerb, ErrorConfig, ErrorConfigMap } from '../../src/core/types';
import { DEFAULT_ERROR_CONFIGS } from '../../src/core/constants';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: ReturnType<typeof vi.fn>;
  let mockAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogger = vi.fn();
    mockAction = vi.fn();
    errorHandler = new ErrorHandler({
      logger: mockLogger
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be instantiable with default options', () => {
    const handler = new ErrorHandler();
    expect(handler).toBeInstanceOf(ErrorHandler);
  });

  it('should be instantiable with custom options', () => {
    const customLogger = vi.fn();
    const handler = new ErrorHandler({
      defaultConfig: { message: 'Custom default message' },
      logger: customLogger,
      logLevel: 'warning',
      logAllErrors: true
    });

    expect(handler).toBeInstanceOf(ErrorHandler);
  });

  it('should handle unknown errors', async () => {
    const error = new Error('Test error');
    const result = await errorHandler.handle(error);

    expect(result.errorVerb).toBe('unknown');
    expect(result.message).toBe(DEFAULT_ERROR_CONFIGS.unknown.message);
    expect(mockLogger).toHaveBeenCalled();
  });

  it('should apply default config for unknown errors', async () => {
    const customMessage = 'Custom default message';
    errorHandler = new ErrorHandler({
      defaultConfig: {
        message: customMessage,
        severity: 'critical'
      }
    });

    const error = new Error('Test error');
    const result = await errorHandler.handle(error);

    expect(result.message).toBe(customMessage);
    expect(result.config.severity).toBe('critical');
  });

  it('should configure custom error messages', async () => {
    const customMessage = 'Custom network error message';
    errorHandler.configure({
      'network-error': {
        message: customMessage,
        severity: 'warning'
      }
    });

    // Mock that the error is identified as a network error
    vi.spyOn(errorHandler as any, 'getErrorVerb').mockReturnValue('network-error');

    const error = new Error('Connection failed');
    const result = await errorHandler.handle(error);

    expect(result.errorVerb).toBe('network-error');
    expect(result.message).toBe(customMessage);
    expect(result.config.severity).toBe('warning');
  });

  it('should execute action when provided in config', async () => {
    errorHandler.configure({
      'unknown': {
        message: 'Error with action',
        action: mockAction
      }
    });

    const error = new Error('Test error');
    await errorHandler.handle(error);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should set default config', async () => {
    const customConfig: ErrorConfig = {
      message: 'New default message',
      severity: 'info',
      reportable: false
    };

    errorHandler.setDefaultConfig(customConfig);

    // Mock to ensure we use default config
    vi.spyOn(errorHandler as any, 'getErrorVerb').mockReturnValue('non-existent-type' as ErrorVerb);

    const error = new Error('Test error');
    const result = await errorHandler.handle(error);

    expect(result.message).toBe(customConfig.message);
    expect(result.config.severity).toBe(customConfig.severity);
  });

  it('should register and use adapters', async () => {
    const mockAdapter = {
      name: 'MockAdapter',
      canHandle: vi.fn().mockReturnValue(true),
      getErrorVerb: vi.fn().mockReturnValue('network-error'),
      extractMetadata: vi.fn().mockReturnValue({ source: 'mock' })
    };

    errorHandler.registerAdapter(mockAdapter);

    const error = new Error('Test error');
    const result = await errorHandler.handle(error);

    expect(mockAdapter.canHandle).toHaveBeenCalledWith(error);
    expect(mockAdapter.getErrorVerb).toHaveBeenCalledWith(error);
    expect(mockAdapter.extractMetadata).toHaveBeenCalledWith(error);
    expect(result.errorVerb).toBe('network-error');
  });

  it('should handle async adapter metadata extraction', async () => {
    const mockAdapter = {
      name: 'AsyncAdapter',
      canHandle: vi.fn().mockReturnValue(true),
      getErrorVerb: vi.fn().mockReturnValue('server-error'),
      extractMetadata: vi.fn().mockResolvedValue({ async: true })
    };

    errorHandler.registerAdapter(mockAdapter);

    const error = new Error('Test error');
    await errorHandler.handle(error);

    expect(mockAdapter.extractMetadata).toHaveBeenCalledWith(error);
    // Verify logger received the async metadata
    expect(mockLogger).toHaveBeenCalledWith(
      expect.any(String),
      error,
      expect.objectContaining({ async: true })
    );
  });

  it('should calculate message duration correctly', () => {
    const shortText = 'Short error message';
    const longText = 'This is a much longer error message that contains many words and should therefore have a longer calculated display duration based on the reading speed configured in the application settings';

    const shortDuration = errorHandler.calculateMessageDuration(shortText);
    const longDuration = errorHandler.calculateMessageDuration(longText);

    // Short text should get at least the base duration
    expect(shortDuration).toBeGreaterThanOrEqual(2000);

    // Long text should have longer duration than short text
    expect(longDuration).toBeGreaterThan(shortDuration);

    // But shouldn't exceed max duration
    expect(longDuration).toBeLessThanOrEqual(10000);
  });

  it('should respect log level settings', async () => {
    // Test handlers with different log levels
    const infoHandler = new ErrorHandler({
      logger: mockLogger,
      logLevel: 'info'
    });

    const warningHandler = new ErrorHandler({
      logger: mockLogger,
      logLevel: 'warning'
    });

    const errorHandler = new ErrorHandler({
      logger: mockLogger,
      logLevel: 'error'
    });

    const noneHandler = new ErrorHandler({
      logger: mockLogger,
      logLevel: 'none'
    });

    const testError = new Error('Test error');

    // Register a custom adapter to control the error verb
    const mockAdapter = {
      name: 'TestAdapter',
      canHandle: () => true,
      getErrorVerb: (error: unknown): ErrorVerb => 'unknown', // Always return 'unknown'
      extractMetadata: () => ({ test: true })
    };

    // Configure each handler to use our custom adapter
    infoHandler.registerAdapter(mockAdapter);
    warningHandler.registerAdapter(mockAdapter);
    errorHandler.registerAdapter(mockAdapter);
    noneHandler.registerAdapter(mockAdapter);

    // Configure all handlers with configs for all severity levels
    const configs = {
      'unknown': { message: 'Info message', severity: 'info' as const },
      'unauthorized': { message: 'Warning message', severity: 'warning' as const },
      'server-error': { message: 'Error message', severity: 'error' as const },
      'network-error': { message: 'Critical message', severity: 'critical' as const }
    };

    infoHandler.configure(configs);
    warningHandler.configure(configs);
    errorHandler.configure(configs);
    noneHandler.configure(configs);

    // Test each handler with different severity levels
    // Reset the mock before each test
    mockLogger.mockReset();
    await infoHandler.handle(testError); // Should log (info level includes info)
    expect(mockLogger).toHaveBeenCalled();

    mockLogger.mockReset();
    await warningHandler.handle(testError); // Should NOT log (warning level excludes info)
    expect(mockLogger).not.toHaveBeenCalled();

    mockLogger.mockReset();
    await errorHandler.handle(testError); // Should NOT log (error level excludes info)
    expect(mockLogger).not.toHaveBeenCalled();

    mockLogger.mockReset();
    await noneHandler.handle(testError); // Should never log
    expect(mockLogger).not.toHaveBeenCalled();
  });

  it('should create query error handler', async () => {
    const queryErrorHandler = errorHandler.createQueryErrorHandler('testQuery');
    const customOnError = vi.fn();
    const queryErrorHandlerWithCallback = errorHandler.createQueryErrorHandler('testQuery', customOnError);

    const error = new Error('Query error');

    await queryErrorHandler(error);
    expect(mockLogger).toHaveBeenCalledWith(
      expect.stringContaining('testQuery'),
      error,
      expect.objectContaining({ queryName: 'testQuery' })
    );

    mockLogger.mockReset();
    await queryErrorHandlerWithCallback(error);
    expect(mockLogger).toHaveBeenCalled();
    expect(customOnError).toHaveBeenCalled();
    expect(customOnError).toHaveBeenCalledWith(error, expect.objectContaining({
      message: expect.any(String),
      errorVerb: expect.any(String),
      duration: expect.any(Number)
    }));
  });
});