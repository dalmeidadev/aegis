/**
 * @module integrations/swr
 * @description Integration with SWR for error handling.
 */

import { ErrorHandler } from '../core/ErrorHandler';
import { ErrorResult } from '../core/types';

/**
 * Options for the SWR error handler.
 */
export interface SWRErrorHandlerOptions {
  /** Error handler to use. */
  errorHandler: ErrorHandler;
  /** Prefix for query keys in logs. */
  keyPrefix?: string;
  /** Function to show toast messages. */
  showToast?: (message: string, options?: { duration?: number }) => void;
  /** Function to handle specific errors. */
  onError?: (error: unknown, result: ErrorResult) => void;
}

/**
 * Creates an error handler for SWR.
 * 
 * @param options - Configuration options.
 * @returns An onError function configured for SWR.
 * 
 * @example
 * ```tsx
 * import { SWRConfig } from 'swr';
 * import { ErrorHandler, createSWRErrorHandler } from 'aegis';
 * import { toast } from 'your-toast-library';
 * 
 * const errorHandler = new ErrorHandler();
 * 
 * const swrErrorHandler = createSWRErrorHandler({
 *   errorHandler,
 *   showToast: (message, options) => {
 *     toast.error(message, { 
 *       duration: options?.duration,
 *       position: 'top-center' 
 *     });
 *   }
 * });
 * 
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <SWRConfig 
 *       value={{
 *         onError: swrErrorHandler
 *       }}
 *     >
 *       <Component {...pageProps} />
 *     </SWRConfig>
 *   );
 * }
 * ```
 */
export function createSWRErrorHandler(options: SWRErrorHandlerOptions) {
  const {
    errorHandler,
    keyPrefix = '',
    showToast,
    onError
  } = options;

  /**
   * Error handling function for SWR.
   * @param error - The error that occurred.
   * @param key - The SWR query key.
   */
  return async (error: unknown, key: string) => {
    const result = await errorHandler.handle(error);

    // Prepare the key for logging
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

    // Log the error with SWR context
    console.error(`[SWR] Error in query [${fullKey}]:`, error);

    // Show toast if configured
    if (showToast) {
      showToast(result.message, { duration: result.duration });
    }

    // Execute custom handler if it exists
    if (onError) {
      onError(error, result);
    }

    // Return the message for compatibility
    return result.message;
  };
}

export default createSWRErrorHandler;