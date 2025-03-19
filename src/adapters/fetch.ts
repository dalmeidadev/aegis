/**
 * @module adapters/fetch
 * @description Adapter for Fetch API errors.
 */

import { ErrorAdapter, ErrorVerb } from '../core/types';
import { VERB_TO_STATUS_CODE } from '../core/constants';

/**
 * Type for rejected fetch error
 */
export interface FetchError extends Error {
  status?: number;
  statusText?: string;
  url?: string;
  responseData?: any;
}

/**
 * Adapter to handle Fetch API errors.
 */
export const fetchAdapter: ErrorAdapter = {
  name: 'FetchAdapter',

  /**
   * Checks if this adapter can handle the given error.
   * @param error - The error to check.
   * @returns True if the error is related to fetch.
   */
  canHandle: (error: unknown): boolean => {
    // Check if it's a fetch response
    if (error instanceof Response) {
      return true;
    }

    // Check if it's an error with typical fetch properties
    if (error instanceof Error) {
      return 'status' in error ||
        'statusText' in error ||
        'url' in error ||
        error.name === 'AbortError' ||
        error.message.includes('fetch');
    }

    return false;
  },

  /**
   * Gets the appropriate error verb based on the Fetch error.
   * @param error - The Fetch error.
   * @returns The corresponding error verb.
   */
  getErrorVerb: (error: unknown): ErrorVerb => {
    const err = error as FetchError | Response;
    // Handle request abort
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }

    // Determine the status code
    let status: number | undefined;

    if (err instanceof Response) {
      status = err.status;
    } else if (err && 'status' in err && typeof err.status === 'number') {
      status = err.status;
    }

    // Handle network errors
    if (err instanceof Error &&
      (err.message.includes('network') ||
        err.message.includes('connection') ||
        err.message.includes('offline'))) {
      return 'network-error';
    }

    // If there's no status code, it's probably a network error
    if (!status) {
      return 'network-error';
    }

    // Look for the error verb corresponding to the status code
    for (const [verb, codes] of Object.entries(VERB_TO_STATUS_CODE)) {
      if (Array.isArray(codes) ? codes.includes(status) : codes === status) {
        return verb as ErrorVerb;
      }
    }

    // If the code is 5xx, it's a server error
    if (status >= 500 && status < 600) {
      return 'server-error';
    }

    // By default, any other code is an unknown error
    return 'unknown';
  },

  /**
   * Extracts additional metadata from the Fetch error.
   * @param error - The Fetch error.
   * @returns Metadata extracted from the error.
   */
  extractMetadata: async (error: unknown): Promise<Record<string, unknown>> => {
    const err = error as FetchError | Response;

    if (err instanceof Response) {
      let responseData;
      try {
        // Try to read the response body as JSON
        responseData = await err.clone().json();
      } catch {
        try {
          // If it's not JSON, try to read as text
          responseData = await err.clone().text();
        } catch {
          // If we can't read the body, leave it empty
          responseData = null;
        }
      }

      return {
        url: err.url,
        status: err.status,
        statusText: err.statusText,
        responseData,
        headers: Object.fromEntries(err.headers.entries())
      };
    }

    // For FetchError
    if (err && err instanceof Error) {
      return {
        message: err.message,
        status: 'status' in err ? err.status : undefined,
        statusText: 'statusText' in err ? err.statusText : undefined,
        url: 'url' in err ? err.url : undefined,
        responseData: 'responseData' in err ? err.responseData : undefined
      };
    }

    // Fallback
    return {
      error: err
    };
  }
};

export default fetchAdapter;