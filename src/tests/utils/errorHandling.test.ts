import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleApiError, showSuccess } from '@/utils/errorHandling';

// Mock console methods
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock alert
const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

describe('errorHandling utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message');

      handleApiError(error);

      expect(alertSpy).toHaveBeenCalledWith('Error: Test error message');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', error);
    });

    it('should handle string errors', () => {
      const error = 'String error message';

      handleApiError(error);

      expect(alertSpy).toHaveBeenCalledWith('Error: String error message');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', error);
    });

    it('should handle unknown error types with default message', () => {
      const error = { someProperty: 'value' };

      handleApiError(error);

      expect(alertSpy).toHaveBeenCalledWith('Error: An unexpected error occurred');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', error);
    });

    it('should handle null/undefined errors', () => {
      handleApiError(null);

      expect(alertSpy).toHaveBeenCalledWith('Error: An unexpected error occurred');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', null);

      handleApiError(undefined);

      expect(alertSpy).toHaveBeenCalledWith('Error: An unexpected error occurred');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', undefined);
    });

    it('should handle empty string errors', () => {
      handleApiError('');

      expect(alertSpy).toHaveBeenCalledWith('Error: ');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', '');
    });
  });

  describe('showSuccess', () => {
    it('should display success message', () => {
      const message = 'Operation completed successfully';

      showSuccess(message);

      expect(alertSpy).toHaveBeenCalledWith('Success: Operation completed successfully');
      expect(consoleLogSpy).toHaveBeenCalledWith('Success:', message);
    });

    it('should handle empty success message', () => {
      showSuccess('');

      expect(alertSpy).toHaveBeenCalledWith('Success: ');
      expect(consoleLogSpy).toHaveBeenCalledWith('Success:', '');
    });

    it('should handle success message with special characters', () => {
      const message = 'Success! 🎉 Data saved & updated.';

      showSuccess(message);

      expect(alertSpy).toHaveBeenCalledWith('Success: Success! 🎉 Data saved & updated.');
      expect(consoleLogSpy).toHaveBeenCalledWith('Success:', message);
    });
  });
});
