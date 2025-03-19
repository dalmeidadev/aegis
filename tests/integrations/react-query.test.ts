import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReactQueryErrorHandler } from '../../src/integrations/react-query';
import { ErrorHandler } from '../../src/core/ErrorHandler';

// Mock ErrorHandler for testing
vi.mock('../../src/core/ErrorHandler', () => {
  return {
    ErrorHandler: vi.fn().mockImplementation(() => ({
      handle: vi.fn().mockResolvedValue({
        message: 'Test error message',
        errorVerb: 'network-error',
        config: { severity: 'error' },
        duration: 3000,
        originalError: new Error('Original error')
      })
    }))
  };
});

describe('React Query Integration', () => {
  let errorHandler: ErrorHandler;
  let mockShowToast: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler = new ErrorHandler();
    mockShowToast = vi.fn();
    mockOnError = vi.fn();
  });

  it('should create an error handler for React Query', () => {
    const queryErrorHandler = createReactQueryErrorHandler({
      errorHandler
    });

    expect(queryErrorHandler).toHaveProperty('createErrorHandler');
    expect(queryErrorHandler).toHaveProperty('shouldRetry');
    expect(typeof queryErrorHandler.createErrorHandler).toBe('function');
    expect(typeof queryErrorHandler.shouldRetry).toBe('function');
  });

  it('should handle errors with the error handler', async () => {
    const queryErrorHandler = createReactQueryErrorHandler({
      errorHandler,
      queryNamePrefix: 'api',
      showToast: mockShowToast,
      onError: mockOnError
    });

    const handler = queryErrorHandler.createErrorHandler('fetchUsers');
    const error = new Error('Query failed');

    await handler(error);

    expect(errorHandler.handle).toHaveBeenCalledWith(error);
    expect(mockShowToast).toHaveBeenCalledWith('Test error message', { duration: 3000 });
    expect(mockOnError).toHaveBeenCalled();
  });

  it('should decide whether to retry based on error type', async () => {
    const queryErrorHandler = createReactQueryErrorHandler({
      errorHandler
    });

    // First attempt should retry for network errors
    const shouldRetryFirst = await queryErrorHandler.shouldRetry(1, new Error('Network error'));
    expect(shouldRetryFirst).toBe(true);

    // Should stop retrying after too many attempts
    const shouldRetryFourth = await queryErrorHandler.shouldRetry(4, new Error('Network error'));
    expect(shouldRetryFourth).toBe(false);

    // Modify mock to return non-retryable error type
    (errorHandler.handle as any).mockResolvedValueOnce({
      errorVerb: 'not-found',
      message: 'Resource not found',
      duration: 3000
    });

    const shouldRetryNotFound = await queryErrorHandler.shouldRetry(1, new Error('Not found'));
    expect(shouldRetryNotFound).toBe(false);
  });

  it('should respect custom query name prefix', async () => {
    const queryErrorHandler = createReactQueryErrorHandler({
      errorHandler,
      queryNamePrefix: 'custom.prefix'
    });

    const handler = queryErrorHandler.createErrorHandler('fetchUsers');
    await handler(new Error('Test error'));

    // We can verify the handler works
    expect(errorHandler.handle).toHaveBeenCalled();
  });

  it('should work without optional options', async () => {
    const queryErrorHandler = createReactQueryErrorHandler({
      errorHandler
    });

    const handler = queryErrorHandler.createErrorHandler('fetchUsers');
    await handler(new Error('Test error'));

    expect(errorHandler.handle).toHaveBeenCalled();
  });
});