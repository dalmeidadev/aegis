import { describe, it, expect } from 'vitest';
import {
  VERB_TO_STATUS_CODE,
  DEFAULT_ERROR_MESSAGES,
  DEFAULT_ERROR_SEVERITIES,
  DEFAULT_REPORTABLE_ERRORS,
  DEFAULT_ERROR_CONFIGS,
  BASE_TOAST_DURATION,
  MAX_TOAST_DURATION,
  DEFAULT_READING_SPEED
} from '../../src/core/constants';
import { ERROR_VERBS } from '../../src/core/types';

describe('Constants', () => {
  it('should have correct mapping for status codes', () => {
    expect(VERB_TO_STATUS_CODE['not-found']).toBe(404);
    expect(VERB_TO_STATUS_CODE['unauthorized']).toBe(401);

    // Array of status codes
    expect(Array.isArray(VERB_TO_STATUS_CODE['server-error'])).toBe(true);
    expect(VERB_TO_STATUS_CODE['server-error']).toContain(500);

    // Special case for network-error
    expect(VERB_TO_STATUS_CODE['network-error']).toBe(0);

    // Special case for cancelled
    expect(VERB_TO_STATUS_CODE['cancelled']).toBe(-1);
  });

  it('should have default messages for all error verbs', () => {
    // All error verbs have a default message
    ERROR_VERBS.forEach((verb) => {
      expect(typeof DEFAULT_ERROR_MESSAGES[verb]).toBe('string');
    });

    // Sample some specific messages
    expect(DEFAULT_ERROR_MESSAGES['network-error']).toContain('connection');
    expect(DEFAULT_ERROR_MESSAGES['unauthorized']).toContain('session');
  });

  it('should have severity levels for all error types', () => {
    ERROR_VERBS.forEach((verb) => {
      expect(DEFAULT_ERROR_SEVERITIES[verb]).toBeDefined();
    });

    // Network errors are usually "error" severity
    expect(DEFAULT_ERROR_SEVERITIES['network-error']).toBe('error');

    // Cancelled is usually just "info"
    expect(DEFAULT_ERROR_SEVERITIES['cancelled']).toBe('info');
  });

  it('should have reportable flags for all error types', () => {
    ERROR_VERBS.forEach((verb) => {
      expect(typeof DEFAULT_REPORTABLE_ERRORS[verb]).toBe('boolean');
    });

    // Server errors should be reported
    expect(DEFAULT_REPORTABLE_ERRORS['server-error']).toBe(true);

    // Not found errors usually don't need reporting
    expect(DEFAULT_REPORTABLE_ERRORS['not-found']).toBe(false);
  });

  it('should have complete default configurations', () => {
    ERROR_VERBS.forEach((verb) => {
      const config = DEFAULT_ERROR_CONFIGS[verb];
      expect(config).toBeDefined();
      expect(config.message).toBe(DEFAULT_ERROR_MESSAGES[verb]);
      expect(config.severity).toBe(DEFAULT_ERROR_SEVERITIES[verb]);
      expect(config.reportable).toBe(DEFAULT_REPORTABLE_ERRORS[verb]);
    });
  });

  it('should have correct toast timing constants', () => {
    expect(BASE_TOAST_DURATION).toBe(2000);
    expect(MAX_TOAST_DURATION).toBe(10000);
    expect(DEFAULT_READING_SPEED).toBe(3);
  });
});