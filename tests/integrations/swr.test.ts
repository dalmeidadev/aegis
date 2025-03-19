import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSWRErrorHandler } from '../../src/integrations/swr';
import { ErrorHandler } from '../../src/core/ErrorHandler';

describe('SWR Integration', () => {
  let mockErrorHandler: any;
  let mockShowToast: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;
  let originalConsoleError: any;

  beforeEach(() => {
    // Guardar console.error original y mockear
    originalConsoleError = console.error;
    console.error = vi.fn();

    // Mock del error handler
    mockErrorHandler = {
      handle: vi.fn().mockResolvedValue({
        message: 'Test error message',
        errorVerb: 'network-error',
        config: { severity: 'error' },
        duration: 3000,
        originalError: new Error('Original error')
      })
    };

    mockShowToast = vi.fn();
    mockOnError = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restaurar console.error
    console.error = originalConsoleError;
  });

  it('should create an error handler for SWR', () => {
    const swrErrorHandler = createSWRErrorHandler({
      errorHandler: mockErrorHandler as any
    });

    expect(typeof swrErrorHandler).toBe('function');
  });

  it('should handle errors with the error handler', async () => {
    const swrErrorHandler = createSWRErrorHandler({
      errorHandler: mockErrorHandler as any,
      keyPrefix: 'api',
      showToast: mockShowToast,
      onError: mockOnError
    });

    const error = new Error('SWR error');
    const key = 'users';

    await swrErrorHandler(error, key);

    expect(mockErrorHandler.handle).toHaveBeenCalledWith(error);
    expect(mockShowToast).toHaveBeenCalledWith('Test error message', { duration: 3000 });
    expect(mockOnError).toHaveBeenCalled();

    // Comprobación exacta en lugar de stringContaining
    expect(console.error).toHaveBeenCalledWith(
      '[SWR] Error in query [api.users]:',
      error
    );
  });

  it('should respect custom key prefix', async () => {
    const swrErrorHandler = createSWRErrorHandler({
      errorHandler: mockErrorHandler as any,
      keyPrefix: 'custom.prefix'
    });

    const testError = new Error('Test error');
    await swrErrorHandler(testError, 'getData');

    // Comprobación exacta en lugar de stringContaining
    expect(console.error).toHaveBeenCalledWith(
      '[SWR] Error in query [custom.prefix.getData]:',
      testError
    );
  });

  it('should work without optional options', async () => {
    const swrErrorHandler = createSWRErrorHandler({
      errorHandler: mockErrorHandler as any
    });

    await swrErrorHandler(new Error('Test error'), 'getData');

    expect(mockErrorHandler.handle).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('should return the error message for compatibility', async () => {
    const swrErrorHandler = createSWRErrorHandler({
      errorHandler: mockErrorHandler as any
    });

    const result = await swrErrorHandler(new Error('Test error'), 'getData');

    expect(result).toBe('Test error message');
  });
});