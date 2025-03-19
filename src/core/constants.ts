/**
 * @module constants
 * @description Constants used in error handling.
 */

import type { ErrorConfig, ErrorVerb } from "./types";

/**
 * Maps error verbs to their corresponding HTTP status codes.
 */
export const VERB_TO_STATUS_CODE: { [key in ErrorVerb]?: number | number[] } = {
	"not-found": 404,
	unauthorized: 401,
	forbidden: 403,
	"bad-request": 400,
	"server-error": [500, 501, 502, 503],
	"network-error": 0,
	timeout: [408, 504],
	conflict: 409,
	"too-many-requests": 429,
	"unprocessable-entity": 422,
	cancelled: -1, // No standard HTTP code for cancelled requests
};

/**
 * Default configuration for error messages by type.
 */
export const DEFAULT_ERROR_MESSAGES: { [key in ErrorVerb]: string } = {
	"not-found": "The requested resource could not be found.",
	unauthorized: "Your session has expired. Please log in again.",
	forbidden: "You do not have permission to access this resource.",
	"bad-request":
		"The request contains invalid data. Please review and try again.",
	"server-error":
		"We are having trouble connecting to the server. Please try again later.",
	"network-error":
		"Unable to connect to the server. Please check your internet connection.",
	timeout: "The request has taken too long. Please try again.",
	conflict:
		"The request could not be completed due to a conflict with the current state of the resource.",
	"too-many-requests":
		"You have exceeded the allowed number of requests. Please wait a moment before trying again.",
	"unprocessable-entity":
		"The request could not be processed due to invalid data.",
	cancelled: "The request was cancelled.",
	unknown: "An unknown error has occurred. Please try again later.",
};

/**
 * Default severity configuration by error type.
 */
export const DEFAULT_ERROR_SEVERITIES: {
	[key in ErrorVerb]: ErrorConfig["severity"];
} = {
	"not-found": "warning",
	unauthorized: "warning",
	forbidden: "warning",
	"bad-request": "warning",
	"server-error": "error",
	"network-error": "error",
	timeout: "warning",
	conflict: "warning",
	"too-many-requests": "warning",
	"unprocessable-entity": "warning",
	cancelled: "info",
	unknown: "error",
};

/**
 * Default configuration to indicate if an error should be reported to monitoring systems.
 */
export const DEFAULT_REPORTABLE_ERRORS: { [key in ErrorVerb]: boolean } = {
	"not-found": false,
	unauthorized: false,
	forbidden: false,
	"bad-request": false,
	"server-error": true,
	"network-error": true,
	timeout: true,
	conflict: false,
	"too-many-requests": true,
	"unprocessable-entity": false,
	cancelled: false,
	unknown: true,
};

/**
 * Complete default configuration for all error types.
 */
export const DEFAULT_ERROR_CONFIGS: { [key in ErrorVerb]: ErrorConfig } =
	Object.entries(DEFAULT_ERROR_MESSAGES).reduce(
		(acc, [key, message]) => {
			const errorVerb = key as ErrorVerb;
			acc[errorVerb] = {
				message,
				severity: DEFAULT_ERROR_SEVERITIES[errorVerb],
				reportable: DEFAULT_REPORTABLE_ERRORS[errorVerb],
			};
			return acc;
		},
		{} as { [key in ErrorVerb]: ErrorConfig },
	);

/**
 * Base time for toast messages (in milliseconds).
 */
export const BASE_TOAST_DURATION = 2000;

/**
 * Maximum time for toast messages (in milliseconds).
 */
export const MAX_TOAST_DURATION = 10000;

/**
 * Default reading speed (words per second).
 */
export const DEFAULT_READING_SPEED = 3;
