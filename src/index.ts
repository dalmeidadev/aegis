/**
 * @module aegis
 * @description Professional library for error handling in frontend applications.
 */

// Export core components
export { ErrorHandler } from "./core/ErrorHandler";
export * from "./core/types";
export * from "./core/constants";

// Export adapters
export * from "./adapters";

// Export integrations
export * from "./integrations";

// Export utilities
export { calculateToastDuration } from "./utils/duration";

import { axiosAdapter } from "./adapters/axios";
import { fetchAdapter } from "./adapters/fetch";
// Simplified creation function
import { ErrorHandler } from "./core/ErrorHandler";
import type { ErrorConfig, ErrorConfigMap } from "./core/types";

/**
 * Creates an ErrorHandler instance with default configurations and common adapters.
 *
 * @param defaultConfig - Optional default configuration for errors.
 * @param customConfigs - Optional custom configurations for specific error types.
 * @returns A configured ErrorHandler instance.
 *
 * @example
 * ```typescript
 * // Create an error handler with default configuration
 * const errorHandler = createErrorHandler();
 *
 * // Create an error handler with custom configurations
 * const customErrorHandler = createErrorHandler({
 *   message: 'Something went wrong. Please try again later.',
 *   severity: 'error'
 * }, {
 *   'unauthorized': {
 *     message: 'Your session has expired. Please log in again.',
 *     action: () => { redirectToLogin(); }
 *   },
 *   'network-error': {
 *     message: 'Unable to connect to the server. Please check your internet connection.',
 *     severity: 'warning'
 *   }
 * });
 * ```
 */
export function createErrorHandler(
	defaultConfig?: ErrorConfig,
	customConfigs?: ErrorConfigMap,
) {
	// Create instance with default configuration if provided
	const errorHandler = new ErrorHandler({
		defaultConfig,
		configs: customConfigs,
	});

	// Register common adapters
	errorHandler.registerAdapter(axiosAdapter);
	errorHandler.registerAdapter(fetchAdapter);

	return errorHandler;
}

/**
 * Convenience function to handle errors quickly.
 *
 * @param error - The error to handle.
 * @param customConfigs - Optional custom configurations for specific error types.
 * @param callback - Optional callback function to process the error result.
 * @returns The error handling result.
 *
 * @example
 * ```typescript
 * try {
 *   // Some operation that might throw an error
 * } catch (error) {
 *   const result = handleError(error);
 *   console.error(result.message);
 * }
 *
 * // With callback to show a toast
 * try {
 *   // Some operation that might throw an error
 * } catch (error) {
 *   handleError(error, {}, (result) => {
 *     toast.error(result.message, {
 *       duration: result.duration
 *     });
 *   });
 * }
 * ```
 */
export async function handleError(
	error: unknown,
	customConfigs?: ErrorConfigMap,
	callback?: (result: Awaited<ReturnType<ErrorHandler["handle"]>>) => void,
) {
	const errorHandler = createErrorHandler(undefined, customConfigs);
	const result = await errorHandler.handle(error);

	if (callback) {
		callback(result);
	}

	return result;
}
