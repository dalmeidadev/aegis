import { describe, it, expect, vi } from 'vitest';
import { fetchAdapter } from '../../src/adapters/fetch';
import {
  createFetchResponse,
  createFetchError,
  createAbortError
} from '../mocks/fetch';

describe('Fetch Adapter', () => {
  it('should have correct name', () => {
    expect(fetchAdapter.name).toBe('FetchAdapter');
  });

  it('should detect Response objects', () => {
    const response = createFetchResponse(404);
    const regularError = new Error('Regular error');

    expect(fetchAdapter.canHandle(response)).toBe(true);
    expect(fetchAdapter.canHandle(regularError)).toBe(false);
    expect(fetchAdapter.canHandle(null)).toBe(false);
  });

  it('should detect fetch-related errors', () => {
    const fetchError = createFetchError('Failed to fetch');
    const abortError = createAbortError();
    const errorWithStatus = createFetchError('Error', { status: 404 });

    expect(fetchAdapter.canHandle(fetchError)).toBe(true);
    expect(fetchAdapter.canHandle(abortError)).toBe(true);
    expect(fetchAdapter.canHandle(errorWithStatus)).toBe(true);
  });

  it('should identify error verbs from Response status codes', () => {
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
      const response = createFetchResponse(status);
      expect(fetchAdapter.getErrorVerb(response)).toBe(expected);
    });
  });

  it('should identify network errors from error messages', () => {
    const networkError = createFetchError('Failed to fetch: network error');
    expect(fetchAdapter.getErrorVerb(networkError)).toBe('network-error');

    const connectionError = createFetchError('The Internet connection appears to be offline');
    expect(fetchAdapter.getErrorVerb(connectionError)).toBe('network-error');
  });

  it('should identify AbortError as cancelled', () => {
    const abortError = createAbortError();
    expect(fetchAdapter.getErrorVerb(abortError)).toBe('cancelled');
  });

  it('should extract metadata from Response objects', async () => {
    // Verify extractMetadata exists
    expect(fetchAdapter.extractMetadata).toBeDefined();
    if (!fetchAdapter.extractMetadata) return;

    const responseBody = { code: 'NOT_FOUND', message: 'Resource not found' };
    const response = createFetchResponse(404, 'Not Found', responseBody);

    const metadataResult = fetchAdapter.extractMetadata(response);
    // Since this might be a Promise, we need to handle it appropriately
    const metadata = metadataResult instanceof Promise
      ? await metadataResult
      : metadataResult;

    expect(metadata).toEqual(expect.objectContaining({
      status: 404,
      statusText: 'Not Found',
      responseData: expect.anything(),
      headers: expect.objectContaining({
        'content-type': 'application/json'
      })
    }));
  });

  it('should extract metadata from error objects', async () => {
    // Verify extractMetadata exists
    expect(fetchAdapter.extractMetadata).toBeDefined();
    if (!fetchAdapter.extractMetadata) return;

    const fetchError = createFetchError('Network error', {
      status: 0,
      url: 'https://api.example.com/data'
    });

    const metadataResult = fetchAdapter.extractMetadata(fetchError);
    // Since this might be a Promise, we need to handle it appropriately
    const metadata = metadataResult instanceof Promise
      ? await metadataResult
      : metadataResult;

    expect(metadata).toEqual(expect.objectContaining({
      message: 'Network error',
      status: 0,
      url: 'https://api.example.com/data'
    }));
  });

  it('should handle Response JSON parsing failure', async () => {
    // Verify extractMetadata exists
    expect(fetchAdapter.extractMetadata).toBeDefined();
    if (!fetchAdapter.extractMetadata) return;

    // Create a Response that will fail JSON parsing
    const invalidJsonResponse = new Response('invalid json', {
      status: 500,
      statusText: 'Server Error'
    });

    const metadataResult = fetchAdapter.extractMetadata(invalidJsonResponse);
    // Since this might be a Promise, we need to handle it appropriately
    const metadata = metadataResult instanceof Promise
      ? await metadataResult
      : metadataResult;

    expect(metadata).toEqual(expect.objectContaining({
      status: 500,
      statusText: 'Server Error',
      responseData: 'invalid json'
    }));
  });

  it('should handle Response body reading failure', async () => {
    // Verify extractMetadata exists
    expect(fetchAdapter.extractMetadata).toBeDefined();
    if (!fetchAdapter.extractMetadata) return;

    // Create a mock response with failed reading operations
    const mockResponse = {
      status: 500,
      statusText: 'Server Error',
      url: 'https://example.com/test',
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      clone: () => ({
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.reject(new Error('Cannot read body'))
      })
    };

    const metadataResult = await fetchAdapter.extractMetadata(mockResponse as any);

    // Expect the adapter to handle the error gracefully and return at least the error object
    expect(metadataResult).toEqual(expect.objectContaining({
      error: expect.objectContaining({
        status: 500
      })
    }));
  });

  it('should provide fallback for unknown error types', async () => {
    // Verify extractMetadata exists
    expect(fetchAdapter.extractMetadata).toBeDefined();
    if (!fetchAdapter.extractMetadata) return;

    const weirdError = { weird: true };

    const metadataResult = fetchAdapter.extractMetadata(weirdError);
    // Since this might be a Promise, we need to handle it appropriately
    const metadata = metadataResult instanceof Promise
      ? await metadataResult
      : metadataResult;

    expect(metadata).toEqual(expect.objectContaining({
      error: weirdError
    }));
  });

  it('should handle complex error structures', async () => {
    const complexError = {
      ...createFetchError('Complex error'),
      status: undefined,
      statusText: null
    };

    expect(fetchAdapter.extractMetadata).toBeDefined();
    if (!fetchAdapter.extractMetadata) return;

    const metadata = await fetchAdapter.extractMetadata(complexError);
    expect(metadata).toBeDefined();
  });

});