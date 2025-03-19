/**
 * @module ErrorHandler
 * @description Main class for handling and configuring errors in applications.
 */

import {
  ErrorVerb,
  ErrorConfig,
  ErrorConfigMap,
  ErrorHandlerOptions,
  ErrorResult,
  ErrorAdapter
} from './types';
import {
  DEFAULT_ERROR_CONFIGS,
  BASE_TOAST_DURATION,
  MAX_TOAST_DURATION,
  DEFAULT_READING_SPEED
} from './constants';

/**
 * A class for handling and configuring error responses in an application.
 * 
 * @example
 * ```typescript
 * const errorHandler = new ErrorHandler({
 *   defaultConfig: {
 *     message: 'Oops! Something went wrong. Please try again.',
 *     severity: 'error'
 *   },
 *   configs: {
 *     'unauthorized': {
 *       message: 'Please log in to access this resource.',
 *       action: () => { redirectToLogin(); }
 *     }
 *   }
 * });
 * 
 * try {
 *   // Some operation that might throw an error
 * } catch (error) {
 *   const result = errorHandler.handle(error);
 *   console.error(result.message);
 * }
 * ```
 */
export class ErrorHandler {
  /** Default configuration for unspecified errors */
  private defaultConfig: ErrorConfig;

  /** Configurations for specific error types */
  private errorConfigs: ErrorConfigMap = {};

  /** Registered adapters to handle different error types */
  private adapters: ErrorAdapter[] = [];

  /** Logger function to log errors */
  private logger: (message: string, error: unknown, metadata?: Record<string, unknown>) => void;

  /** Minimum severity level to log errors */
  private logLevel: ErrorHandlerOptions['logLevel'];

  /** If true, errors will always be logged even if they're handled */
  private logAllErrors: boolean;

  /**
   * Creates an instance of ErrorHandler.
   * @param options - Options to configure the error handler.
   */
  constructor(options: ErrorHandlerOptions = {}) {
    // Configure default error handling
    // Important: Set defaultConfig before initializing errorConfigs
    this.defaultConfig = options.defaultConfig
      ? { ...options.defaultConfig }
      : { ...DEFAULT_ERROR_CONFIGS['unknown'] };

    // Initialize error configurations with default values
    this.errorConfigs = { ...DEFAULT_ERROR_CONFIGS };

    // Override the unknown error configuration with the default config 
    // This is the critical part that was missing
    this.errorConfigs['unknown'] = { ...this.defaultConfig };

    // Apply custom configurations
    if (options.configs) {
      this.configure(options.configs);
    }

    // Configure logger
    this.logger = options.logger || ((message, error) => {
      console.error(message, error);
    });

    // Configure log level
    this.logLevel = options.logLevel || 'error';

    // Configure if all errors are logged
    this.logAllErrors = options.logAllErrors || false;
  }

  /**
   * Registers an error adapter to handle specific error types.
   * @param adapter - The adapter to register.
   * @returns The ErrorHandler instance for chaining.
   * 
   * @example
   * ```typescript
   * errorHandler.registerAdapter({
   *   name: 'MyCustomAdapter',
   *   canHandle: (error) => error instanceof MyCustomError,
   *   getErrorVerb: (error) => {
   *     const customError = error as MyCustomError;
   *     return customError.code === 'AUTH_FAILED' ? 'unauthorized' : 'unknown';
   *   }
   * });
   * ```
   */
  public registerAdapter(adapter: ErrorAdapter): ErrorHandler {
    this.adapters.push(adapter);
    return this;
  }

  /**
   * Configures custom error messages and actions for specific error types.
   * @param configs - An object mapping error verbs to their configurations.
   * @returns The ErrorHandler instance for chaining.
   * 
   * @example
   * ```typescript
   * errorHandler.configure({
   *   'not-found': {
   *     message: 'The requested resource could not be found.',
   *     action: () => { console.log('Resource not found'); }
   *   },
   *   'unauthorized': {
   *     message: 'Please log in to access this resource.',
   *     action: () => { redirectToLogin(); }
   *   }
   * });
   * ```
   */
  public configure(configs: ErrorConfigMap): ErrorHandler {
    this.errorConfigs = { ...this.errorConfigs, ...configs };
    return this;
  }

  /**
   * Configures the default error handling.
   * @param config - The default configuration for errors.
   * @returns The ErrorHandler instance for chaining.
   * 
   * @example
   * ```typescript
   * errorHandler.setDefaultConfig({
   *   message: 'An unexpected error occurred. Please try again later.',
   *   severity: 'error',
   *   reportable: true
   * });
   * ```
   */
  public setDefaultConfig(config: ErrorConfig): ErrorHandler {
    this.defaultConfig = config;
    this.errorConfigs['unknown'] = { ...config };
    return this;
  }

  /**
   * Handles an error and returns the appropriate result.
   * @param error - The error to handle.
   * @returns The error handling result.
   * 
   * @example
   * ```typescript
   * try {
   *   // Some operation that might throw an error
   * } catch (error) {
   *   const result = errorHandler.handle(error);
   *   showToast(result.message, { duration: result.duration });
   *   
   *   if (result.config.action) {
   *     result.config.action();
   *   }
   * }
   * ```
   */
  public async handle(error: unknown): Promise<ErrorResult> {
    // Determine the error type
    const errorVerb = this.getErrorVerb(error);

    // Get the appropriate configuration
    const config = this.errorConfigs[errorVerb] || this.defaultConfig;

    // Calculate message duration
    const duration = this.calculateMessageDuration(config.message);

    // Log the error if needed
    await this.logErrorIfNeeded(errorVerb, config, error);

    // Execute the associated action if it exists
    if (config.action) {
      config.action();
    }

    // Return the result
    return {
      message: config.message,
      errorVerb,
      config,
      originalError: error,
      duration
    };
  }

  /**
   * Gets the error verb based on the error type.
   * @param error - The error to analyze.
   * @returns The corresponding error verb.
   */
  private getErrorVerb(error: unknown): ErrorVerb {
    // Try to use registered adapters
    for (const adapter of this.adapters) {
      if (adapter.canHandle(error)) {
        return adapter.getErrorVerb(error);
      }
    }

    // If no adapters can handle this error
    return 'unknown';
  }

  /**
   * Logs an error if it meets the logging criteria.
   * @param errorVerb - The identified error verb.
   * @param config - The error configuration.
   * @param error - The original error.
   */
  private async logErrorIfNeeded(
    errorVerb: ErrorVerb,
    config: ErrorConfig,
    error: unknown
  ): Promise<void> {
    // Determine if this error should be logged
    const shouldLog = this.logAllErrors || this.shouldLogError(config.severity || 'error');

    if (!shouldLog) {
      return;
    }

    // Prepare metadata
    const metadata: Record<string, unknown> = {
      ...config.metadata,
      errorVerb
    };

    // Look for adapter that can extract additional metadata
    for (const adapter of this.adapters) {
      if (adapter.canHandle(error) && adapter.extractMetadata) {
        const adapterMetadata = await Promise.resolve(adapter.extractMetadata(error));
        Object.assign(metadata, adapterMetadata);
        break;
      }
    }

    // Log the error
    this.logger(`[${errorVerb}] ${config.message}`, error, metadata);
  }

  /**
   * Determines if an error should be logged based on its severity.
   * @param severity - The error severity.
   * @returns True if the error should be logged.
   */
  private shouldLogError(severity: ErrorConfig['severity']): boolean {
    // If log level is none, never log
    if (this.logLevel === 'none') return false;

    // If no severity provided, use info as default
    const actualSeverity = severity || 'info';

    const severityLevels = {
      'info': 0,
      'warning': 1,
      'error': 2,
      'critical': 3
    };

    const errorLevel = severityLevels[actualSeverity];
    const minLevel = severityLevels[this.logLevel || 'error'];

    // Only log if the error severity is >= configured log level
    return errorLevel >= minLevel;
  }

  /**
   * Calculates the duration for a toast message based on text length and reading speed.
   * @param text - The text to be displayed in the toast.
   * @param baseTime - The base time for the toast in milliseconds.
   * @param wordsPerSecond - The reading speed in words per second.
   * @returns The calculated duration in milliseconds.
   */
  public calculateMessageDuration(
    text: string,
    baseTime = BASE_TOAST_DURATION,
    wordsPerSecond = DEFAULT_READING_SPEED
  ): number {
    const wordCount = text.split(/\s+/).length;
    const readingTime = (wordCount / wordsPerSecond) * 1000;
    return Math.max(baseTime, Math.min(readingTime, MAX_TOAST_DURATION));
  }

  /**
   * Creates an error handler for use with React Query.
   * @param queryName - The name of the query (for logging purposes).
   * @param onError - An optional function to handle the error in addition to the default handling.
   * @returns A function that can be used as the onError handler in React Query.
   * 
   * @example
   * ```typescript
   * import { useQuery } from '@tanstack/react-query';
   * 
   * const useUserData = (userId: string) => {
   *   return useQuery({
   *     queryKey: ['user', userId],
   *     queryFn: fetchUserData,
   *     onError: errorHandler.createQueryErrorHandler('fetchUserData', (error, result) => {
   *       showToast(result.message, { duration: result.duration });
   *     })
   *   });
   * };
   * ```
   */
  public createQueryErrorHandler(
    queryName: string,
    onError?: (error: unknown, result: ErrorResult) => void
  ): (error: unknown) => Promise<void> {
    return async (error: unknown) => {
      const result = await this.handle(error);

      // Log error with additional context
      this.logger(
        `Error in query [${queryName}]: ${result.message}`,
        error,
        { queryName, ...result.config.metadata }
      );

      // Execute custom handler if it exists
      if (onError) {
        onError(error, result);
      }
    };
  }
}