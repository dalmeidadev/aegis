import { describe, it, expect } from 'vitest';
import { calculateToastDuration } from '../../src/utils/duration';

describe('Duration Utilities', () => {
  it('should calculate toast duration based on text length', () => {
    const shortText = 'Error occurred';
    const mediumText = 'A slightly longer error message that needs a bit more time to read';
    const longText = 'This is a much longer error message that contains many words and should therefore have a longer calculated display duration based on the reading speed configured in the application settings and potentially other factors that influence reading time';

    const shortDuration = calculateToastDuration(shortText);
    const mediumDuration = calculateToastDuration(mediumText);
    const longDuration = calculateToastDuration(longText);

    // Short text should get at least the base time
    expect(shortDuration).toBe(2000);

    // Medium text should be longer than short text
    expect(mediumDuration).toBeGreaterThan(shortDuration);

    // Long text should be longer than medium text
    expect(longDuration).toBeGreaterThan(mediumDuration);

    // Long text shouldn't exceed max duration
    expect(longDuration).toBeLessThanOrEqual(10000);
  });

  it('should respect custom base time', () => {
    const text = 'Error message';
    const customBaseTime = 3000;

    const duration = calculateToastDuration(text, customBaseTime);

    expect(duration).toBe(customBaseTime);
  });

  it('should respect custom reading speed', () => {
    const text = 'This is a message with exactly ten words in it';

    // Default speed (3 words per second) = 10/3 * 1000 = ~3333ms
    const defaultSpeedDuration = calculateToastDuration(text);

    // Faster speed (5 words per second) = 10/5 * 1000 = 2000ms
    const fasterSpeedDuration = calculateToastDuration(text, 2000, 5);

    // Slower speed (1 word per second) = 10/1 * 1000 = 10000ms
    const slowerSpeedDuration = calculateToastDuration(text, 2000, 1);

    expect(fasterSpeedDuration).toBeLessThan(defaultSpeedDuration);
    expect(slowerSpeedDuration).toBeGreaterThan(defaultSpeedDuration);
    expect(slowerSpeedDuration).toBe(10000); // Should be capped at max duration
  });

  it('should handle empty string', () => {
    const emptyText = '';
    const duration = calculateToastDuration(emptyText);

    // Should return base time
    expect(duration).toBe(2000);
  });
});