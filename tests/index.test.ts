import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createErrorHandler,
  handleError
} from '../src/index';
import { ErrorHandler } from '../src/core/ErrorHandler';
import { axiosAdapter } from '../src/adapters/axios';
import { fetchAdapter } from '../src/adapters/fetch';

// Mock registerAdapter for spying
vi.mock('../src/core/ErrorHandler', async () => {
  const actual = await vi.importActual('../src/core/ErrorHandler');
  return {
    ...actual,
    ErrorHandler: vi.fn().mockImplementation(() => ({
      registerAdapter: vi.fn(),
      configure: vi.fn(),
      handle: vi.fn().mockResolvedValue({
        message: 'Error message',
        errorVerb: 'unknown',
        config: {},
        duration: 2000,
        originalError: new Error()
      })
    }))
  };
});

// Mock adapters
vi.mock('../src/adapters/axios', () => ({
  axiosAdapter: { name: 'AxiosAdapter' }
}));
vi.mock('../src/adapters/fetch', () => ({
  fetchAdapter: { name: 'FetchAdapter' }
}));

describe('Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createErrorHandler', () => {
    it('should create an error handler with default options', () => {
      const handler = createErrorHandler();

      expect(ErrorHandler).toHaveBeenCalled();
      expect(handler.registerAdapter).toHaveBeenCalledTimes(2);
      expect(handler.registerAdapter).toHaveBeenCalledWith(axiosAdapter);
      expect(handler.registerAdapter).toHaveBeenCalledWith(fetchAdapter);
    });

    it('should create an error handler with custom default config', () => {
      const defaultConfig = { message: 'Custom default message' };
      const handler = createErrorHandler(defaultConfig);

      expect(ErrorHandler).toHaveBeenCalledWith(expect.objectContaining({
        defaultConfig
      }));
    });

    it('should create an error handler with custom configs', () => {
      const customConfigs = {
        'network-error': { message: 'Custom network error' }
      };
      const handler = createErrorHandler(undefined, customConfigs);

      expect(ErrorHandler).toHaveBeenCalledWith(expect.objectContaining({
        configs: customConfigs
      }));
    });
  });

  describe('handleError', () => {
    it('should handle errors with default options', async () => {
      const error = new Error('Test error');
      const result = await handleError(error);

      expect(result).toEqual(expect.objectContaining({
        message: 'Error message',
        errorVerb: 'unknown'
      }));
    });

    it('should handle errors with custom configs', async () => {
      const error = new Error('Test error');
      const customConfigs = {
        'unknown': { message: 'Custom message' }
      };

      await handleError(error, customConfigs);

      expect(ErrorHandler).toHaveBeenCalledWith(expect.objectContaining({
        configs: customConfigs
      }));
    });

    it('should call callback with result', async () => {
      const error = new Error('Test error');
      const callback = vi.fn();

      await handleError(error, undefined, callback);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error message',
        errorVerb: 'unknown'
      }));
    });
  });
});