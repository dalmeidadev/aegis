import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '../../src/core/ErrorHandler';
import { ErrorVerb } from '../../src/core/types';
import { DEFAULT_ERROR_CONFIGS } from '../../src/core/constants';
import { createAxiosError } from '../mocks/axios';
import { createFetchResponse, createAbortError } from '../mocks/fetch';

/**
 * This is a real integration test with minimal mocking
 * We test the entire error handling flow using the actual ErrorHandler class
 */
describe('End-to-End Integration', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: ReturnType<typeof vi.fn>;
  let mockAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Set up mocks
    mockLogger = vi.fn();
    mockAction = vi.fn();

    // Create a standard instance with specific configuration
    errorHandler = new ErrorHandler({
      defaultConfig: {
        message: 'Default error message',
        action: mockAction
      },
      logger: mockLogger,
      // Force logging all errors for testing
      logAllErrors: true
    });

    // Register custom adapters for test objects
    errorHandler.registerAdapter({
      name: 'TestAxiosAdapter',
      canHandle: (error: unknown): boolean => {
        return Boolean(error && typeof error === 'object' &&
          'isAxiosError' in error && (error as any).isAxiosError === true);
      },
      getErrorVerb: (error: unknown): ErrorVerb => {
        const axiosError = error as any;
        const status = axiosError.response?.status;

        if (!status) return 'network-error';
        if (status === 401) return 'unauthorized';
        if (status === 404) return 'not-found';
        if (status >= 500) return 'server-error';
        return 'unknown';
      },
      extractMetadata: (error: unknown): Record<string, unknown> => {
        return {
          source: 'axios',
          code: (error as any).code
        };
      }
    });

    // Register adapter for Fetch/Response errors
    errorHandler.registerAdapter({
      name: 'TestFetchAdapter',
      canHandle: (error: unknown): boolean => {
        return Boolean(error instanceof Response ||
          (error instanceof Error && error.name === 'AbortError'));
      },
      getErrorVerb: (error: unknown): ErrorVerb => {
        if (error instanceof Error && error.name === 'AbortError') {
          return 'cancelled';
        }
        if (error instanceof Response) {
          const status = error.status;

          if (status === 401) return 'unauthorized';
          if (status === 404) return 'not-found';
          if (status >= 500) return 'server-error';
        }
        return 'unknown';
      },
      extractMetadata: (error: unknown): Record<string, unknown> => {
        return { source: 'fetch' };
      }
    });

    // Clear mocks before each test
    vi.clearAllMocks();
  });

  it('should handle Axios errors correctly', async () => {
    // Test with various Axios errors
    const testCases = [
      {
        error: createAxiosError(401, 'Unauthorized'),
        expectedVerb: 'unauthorized',
        expectedMessage: expect.stringContaining('session')
      },
      {
        error: createAxiosError(404, 'Not Found'),
        expectedVerb: 'not-found',
        expectedMessage: expect.stringContaining('resource')
      },
      {
        error: createAxiosError(0, 'Network Error', 'ERR_NETWORK'),
        expectedVerb: 'network-error',
        expectedMessage: expect.stringContaining('connect')
      }
    ];

    for (const { error, expectedVerb, expectedMessage } of testCases) {
      // Reset mock before each case
      mockLogger.mockClear();

      const result = await errorHandler.handle(error);

      expect(result.errorVerb).toBe(expectedVerb);
      expect(result.message).toEqual(expectedMessage);
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLogger).toHaveBeenCalled();
    }
  });

  it('should handle Fetch errors correctly', async () => {
    // Test with various Fetch errors
    const testCases = [
      {
        error: createFetchResponse(401, 'Unauthorized'),
        expectedVerb: 'unauthorized',
        expectedMessage: expect.stringContaining('session')
      },
      {
        error: createFetchResponse(404, 'Not Found'),
        expectedVerb: 'not-found',
        expectedMessage: expect.stringContaining('resource')
      },
      {
        error: createAbortError(),
        expectedVerb: 'cancelled',
        expectedMessage: expect.stringContaining('cancelled')
      }
    ];

    for (const { error, expectedVerb, expectedMessage } of testCases) {
      // Reset mock before each case
      mockLogger.mockClear();

      const result = await errorHandler.handle(error);

      expect(result.errorVerb).toBe(expectedVerb);
      expect(result.message).toEqual(expectedMessage);
      expect(result.duration).toBeGreaterThan(0);
      expect(mockLogger).toHaveBeenCalled();
    }
  });

  it('should use custom configurations when provided', async () => {
    const customMessage = 'Custom unauthorized message';
    const customAction = vi.fn();

    errorHandler.configure({
      'unauthorized': {
        message: customMessage,
        action: customAction
      }
    });

    const error = createAxiosError(401, 'Unauthorized');
    const result = await errorHandler.handle(error);

    expect(result.message).toBe(customMessage);
    expect(customAction).toHaveBeenCalledTimes(1);
    expect(mockAction).not.toHaveBeenCalled(); // Default action should not be called
  });

  it('should use default config for unknown errors', async () => {
    // Reset action mock for this specific test
    mockAction.mockClear();

    // Force a reset of error configs to ensure clean state
    errorHandler.configure({
      'unknown': {
        message: 'Default error message',
        action: mockAction
      }
    });

    const error = new Error('Generic error');
    const result = await errorHandler.handle(error);

    expect(result.errorVerb).toBe('unknown');
    expect(result.message).toBe('Default error message');

    // The action should have been called
    expect(mockAction).toHaveBeenCalled();
  });

  it('should extract metadata from errors', async () => {
    const axiosError = createAxiosError(500, 'Server Error', undefined, { code: 'INTERNAL_ERROR' });
    await errorHandler.handle(axiosError);

    // Check that logger received metadata
    expect(mockLogger).toHaveBeenCalled();
    expect(mockLogger).toHaveBeenCalledWith(
      expect.any(String),
      axiosError,
      expect.objectContaining({
        source: 'axios'
      })
    );
  });
});