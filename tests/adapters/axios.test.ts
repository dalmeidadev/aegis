import { describe, it, expect, vi } from 'vitest';
import { axiosAdapter } from '../../src/adapters/axios';
import { createAxiosError } from '../mocks/axios';
import { AxiosError } from 'axios';

describe('Axios Adapter', () => {
  it('should have correct name', () => {
    expect(axiosAdapter.name).toBe('AxiosAdapter');
  });

  it('should detect Axios errors', () => {
    const axiosError = createAxiosError(500);
    const regularError = new Error('Regular error');

    expect(axiosAdapter.canHandle(axiosError)).toBe(true);
    expect(axiosAdapter.canHandle(regularError)).toBe(false);
    expect(axiosAdapter.canHandle({})).toBe(false);
    expect(axiosAdapter.canHandle(null)).toBe(false);
  });

  it('should identify error verbs from status codes', () => {
    const testCases = [
      { status: 400, expected: 'bad-request' },
      { status: 401, expected: 'unauthorized' },
      { status: 403, expected: 'forbidden' },
      { status: 404, expected: 'not-found' },
      { status: 408, expected: 'timeout' },
      { status: 409, expected: 'conflict' },
      { status: 422, expected: 'unprocessable-entity' },
      { status: 429, expected: 'too-many-requests' },
      { status: 500, expected: 'server-error' },
      { status: 502, expected: 'server-error' },
      { status: 503, expected: 'server-error' },
      { status: 504, expected: 'timeout' },
      { status: 418, expected: 'unknown' }, // Teapot error -> unknown
    ];

    testCases.forEach(({ status, expected }) => {
      const error = createAxiosError(status);
      expect(axiosAdapter.getErrorVerb(error)).toBe(expected);
    });
  });

  it('should identify network errors', () => {
    const networkError = createAxiosError(0, 'Network Error', 'ERR_NETWORK');
    expect(axiosAdapter.getErrorVerb(networkError)).toBe('network-error');

    const connectionError = createAxiosError(0, 'Connection refused', 'ECONNREFUSED');
    expect(axiosAdapter.getErrorVerb(connectionError)).toBe('network-error');
  });

  it('should identify cancelled requests', () => {
    const cancelledError = createAxiosError(0, 'Request aborted', 'ERR_CANCELED');
    expect(axiosAdapter.getErrorVerb(cancelledError)).toBe('cancelled');

    const timeoutError = createAxiosError(0, 'Timeout', 'ECONNABORTED');
    expect(axiosAdapter.getErrorVerb(timeoutError)).toBe('cancelled');
  });

  it('should extract metadata from errors', () => {
    // Verify extractMetadata exists
    expect(axiosAdapter.extractMetadata).toBeDefined();
    if (!axiosAdapter.extractMetadata) return;

    const error = createAxiosError(404, 'Not Found', undefined, { id: 123 });
    const metadata = axiosAdapter.extractMetadata(error);

    // Check if it's a Promise and handle accordingly
    if (metadata instanceof Promise) {
      return metadata.then(data => {
        expect(data).toEqual(expect.objectContaining({
          url: expect.stringContaining('api.example.com'),
          method: 'get',
          status: 404,
          statusText: 'Not Found',
          data: { id: 123 },
        }));
      });
    } else {
      expect(metadata).toEqual(expect.objectContaining({
        url: expect.stringContaining('api.example.com'),
        method: 'get',
        status: 404,
        statusText: 'Not Found',
        data: { id: 123 },
      }));
    }
  });

  it('should handle errors without response', () => {
    // Verify extractMetadata exists
    expect(axiosAdapter.extractMetadata).toBeDefined();
    if (!axiosAdapter.extractMetadata) return;

    const networkError = createAxiosError(0, 'Network Error', 'ERR_NETWORK');
    const metadata = axiosAdapter.extractMetadata(networkError);

    // Check if it's a Promise and handle accordingly
    if (metadata instanceof Promise) {
      return metadata.then(data => {
        expect(data).toEqual(expect.objectContaining({
          url: expect.stringContaining('api.example.com'),
          method: 'get',
          code: 'ERR_NETWORK',
        }));
        expect(data.status).toBeUndefined();
        expect(data.statusText).toBeUndefined();
      });
    } else {
      expect(metadata).toEqual(expect.objectContaining({
        url: expect.stringContaining('api.example.com'),
        method: 'get',
        code: 'ERR_NETWORK',
      }));
      expect(metadata.status).toBeUndefined();
      expect(metadata.statusText).toBeUndefined();
    }
  });

  it('should handle edge case status codes', async () => {
    const edgeCaseError = createAxiosError(599, 'Unusual Status');
    expect(axiosAdapter.getErrorVerb(edgeCaseError)).toBe('server-error');
  });

});