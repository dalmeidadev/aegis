/**
 * @module types
 * @description Types and interfaces for error handling.
 */

/**
 * Represents different categories of errors that can be handled.
 */
export type ErrorVerb =
	| "not-found"
	| "unauthorized"
	| "forbidden"
	| "bad-request"
	| "server-error"
	| "network-error"
	| "timeout"
	| "conflict"
	| "too-many-requests"
	| "unprocessable-entity"
	| "cancelled"
	| "unknown";

// Create an array of all ErrorVerbs for iteration
export const ERROR_VERBS: ErrorVerb[] = [
	"not-found",
	"unauthorized",
	"forbidden",
	"bad-request",
	"server-error",
	"network-error",
	"timeout",
	"conflict",
	"too-many-requests",
	"unprocessable-entity",
	"cancelled",
	"unknown",
];

/**
 * Defines the structure for error configuration.
 */
export interface ErrorConfig {
	/** The error message to display. */
	message: string;
	/** An optional action to perform when this error occurs. */
	action?: () => void;
	/** Error severity, useful for logging systems and visualization. */
	severity?: "info" | "warning" | "error" | "critical";
	/** Recommended duration to show this message (in milliseconds). */
	duration?: number;
	/** Indicates if this error should be logged in monitoring systems. */
	reportable?: boolean;
	/** Additional metadata associated with this error type. */
	metadata?: Record<string, unknown>;
}

/**
 * A map of ErrorVerb to ErrorConfig.
 */
export type ErrorConfigMap = {
	[key in ErrorVerb]?: ErrorConfig;
};

/**
 * Options for creating a new ErrorHandler.
 */
export interface ErrorHandlerOptions {
	/** Default configuration for unspecified errors. */
	defaultConfig?: ErrorConfig;
	/** Initial configurations for specific error types. */
	configs?: ErrorConfigMap;
	/** Function to log errors. */
	logger?: (
		message: string,
		error: unknown,
		metadata?: Record<string, unknown>,
	) => void;
	/** Minimum severity level to log errors. */
	logLevel?: "info" | "warning" | "error" | "critical" | "none";
	/** If true, errors will always be logged even if they're handled. */
	logAllErrors?: boolean;
}

/**
 * Result of handling an error.
 */
export interface ErrorResult {
	/** The formatted error message. */
	message: string;
	/** The identified error verb. */
	errorVerb: ErrorVerb;
	/** The configuration used for this error. */
	config: ErrorConfig;
	/** The original error. */
	originalError: unknown;
	/** The calculated duration to display this message. */
	duration: number;
}

/**
 * Interface for error adapters that convert library/framework specific errors
 * to our error handling system.
 */
export interface ErrorAdapter {
	/** Adapter name for easy identification. */
	name: string;
	/** Checks if this adapter can handle the given error. */
	canHandle: (error: unknown) => boolean;
	/** Extracts information from the error to determine the ErrorVerb. */
	getErrorVerb: (error: unknown) => ErrorVerb;
	/** Extracts additional metadata from the error that may be useful. */
	extractMetadata?: (
		error: unknown,
	) => Record<string, unknown> | Promise<Record<string, unknown>>;
}
