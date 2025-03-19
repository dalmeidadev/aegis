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
export const fetchAdapter: ErrorAdapter<FetchError | Response> = {
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
  getErrorVerb: (error: FetchError | Response): ErrorVerb => {
    // Handle request abort
    if (error instanceof Error && error.name === 'AbortError') {
      return 'cancelled';
    }

    // Determine the status code
    let status: number | undefined;

    if (error instanceof Response) {
      status = error.status;
    } else if ('status' in error && typeof error.status === 'number') {
      status = error.status;
    }

    // Handle network errors
    if (error instanceof Error &&
      (error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('offline'))) {
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
  extractMetadata: async (error: FetchError | Response): Promise<Record<string, unknown>> => {
    if (error instanceof Response) {
      let responseData;
      try {
        // Try to read the response body as JSON
        responseData = await error.clone().json();
      } catch {
        try {
          // If it's not JSON, try to read as text
          responseData = await error.clone().text();
        } catch {
          // If we can't read the body, leave it empty
          responseData = null;
        }
      }

      return {
        url: error.url,
        status: error.status,
        statusText: error.statusText,
        responseData,
        headers: Object.fromEntries(error.headers.entries())
      };
    }

    return {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      responseData: error.responseData
    };
  }
};

export default fetchAdapter;