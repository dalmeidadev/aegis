/**
 * @module adapters/axios
 * @description Adapter for Axios errors.
 */

import { AxiosError } from 'axios';
import { ErrorAdapter, ErrorVerb } from '../core/types';
import { VERB_TO_STATUS_CODE } from '../core/constants';

/**
 * Adapter to handle Axios errors.
 */
export const axiosAdapter: ErrorAdapter = {
  name: 'AxiosAdapter',

  /**
   * Checks if this adapter can handle the given error.
   * @param error - The error to check.
   * @returns True if the error is an AxiosError.
   */
  canHandle: (error: unknown): boolean => {
    return error instanceof AxiosError;
  },

  /**
   * Gets the appropriate error verb based on the Axios error.
   * @param error - The Axios error.
   * @returns The corresponding error verb.
   */
  getErrorVerb: (error: unknown): ErrorVerb => {
    const axiosError = error as AxiosError;
    // Handle cancelled requests
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_CANCELED') {
      return 'cancelled';
    }

    // Handle network errors
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
      return 'network-error';
    }

    // Get the HTTP status code
    const status = axiosError.response?.status;

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
   * Extracts additional metadata from the Axios error.
   * @param error - The Axios error.
   * @returns Metadata extracted from the error.
   */
  extractMetadata: (error: unknown): Record<string, unknown> => {
    const axiosError = error as AxiosError;
    return {
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      headers: axiosError.config?.headers,
      data: axiosError.response?.data,
      code: axiosError.code
    };
  }
};

export default axiosAdapter;