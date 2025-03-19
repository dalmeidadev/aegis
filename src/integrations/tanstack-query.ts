/**
 * @module integrations/react-query
 * @description Integration with React Query for error handling.
 */

import { ErrorHandler } from '../core/ErrorHandler';
import { ErrorResult } from '../core/types';

/**
 * Options for the React Query error handler.
 */
export interface ReactQueryErrorHandlerOptions {
  /** Error handler to use. */
  errorHandler: ErrorHandler;
  /** Prefix for query names in logs. */
  queryNamePrefix?: string;
  /** Function to show toast messages. */
  showToast?: (message: string, options?: { duration?: number }) => void;
  /** Function to handle specific errors. */
  onError?: (error: unknown, result: ErrorResult) => void;
}

/**
 * Creates an error handler optimized for React Query.
 * 
 * @param options - Configuration options.
 * @returns An object with utility functions for React Query.
 * 
 * @example
 * ```tsx
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { ErrorHandler, createReactQueryErrorHandler } from 'aegis';
 * import { toast } from 'your-toast-library';
 * 
 * const errorHandler = new ErrorHandler();
 * 
 * const queryErrorHandler = createReactQueryErrorHandler({
 *   errorHandler,
 *   showToast: (message, options) => {
 *     toast.error(message, { 
 *       duration: options?.duration,
 *       position: 'top-center' 
 *     });
 *   }
 * });
 * 
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       retry: queryErrorHandler.shouldRetry,
 *       onError: queryErrorHandler.createErrorHandler('global')
 *     },
 *     mutations: {
 *       onError: queryErrorHandler.createErrorHandler('global-mutation')
 *     }
 *   }
 * });
 * 
 * // In a specific component:
 * const { data } = useQuery({
 *   queryKey: ['users'],
 *   queryFn: fetchUsers,
 *   onError: queryErrorHandler.createErrorHandler('fetchUsers')
 * });
 * ```
 */
export function createReactQueryErrorHandler(options: ReactQueryErrorHandlerOptions) {
  const {
    errorHandler,
    queryNamePrefix = '',
    showToast,
    onError
  } = options;

  return {
    /**
     * Creates an error handler for React Query.
     * @param queryName - Query name for logging purposes.
     * @returns A function that handles React Query errors.
     */
    createErrorHandler: (queryName: string) => {
      const fullQueryName = queryNamePrefix ? `${queryNamePrefix}.${queryName}` : queryName;

      return (error: unknown) => {
        const result = errorHandler.handle(error);

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
    },

    /**
     * Determines if a query should be retried based on the error type.
     * @param failureCount - Number of previous failures.
     * @param error - The error that occurred.
     * @returns True if the query should be retried.
     */
    shouldRetry: (failureCount: number, error: unknown) => {
      // Don't retry after a certain number of attempts
      if (failureCount >= 3) return false;

      const result = errorHandler.handle(error);

      // Retry only certain types of errors
      const retryableErrors: string[] = [
        'network-error',
        'timeout',
        'server-error',
        'too-many-requests'
      ];

      return retryableErrors.includes(result.errorVerb);
    }
  };
}

export default createReactQueryErrorHandler;