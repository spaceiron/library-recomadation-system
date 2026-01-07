import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateRequired } from '@/utils/validation';

describe('validation utils', () => {
  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co',
      ];

      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid.com',
        'invalid@com',
        'invalid @example.com',
        'invalid@example .com',
        'invalid@@example.com',
      ];

      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid passwords', () => {
      const validPasswords = ['Password1', 'MySecure123', 'Test1234', 'Abcdefgh1', 'ComplexPass99'];

      validPasswords.forEach((password) => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    it('should return false for passwords shorter than 8 characters', () => {
      const shortPasswords = ['Pass1', 'Abc123', 'Test1', '', '1234567'];

      shortPasswords.forEach((password) => {
        expect(validatePassword(password)).toBe(false);
      });
    });

    it('should return false for passwords without uppercase letters', () => {
      const noUppercasePasswords = ['password1', 'mypassword123', 'test12345', 'abcdefgh1'];

      noUppercasePasswords.forEach((password) => {
        expect(validatePassword(password)).toBe(false);
      });
    });

    it('should return false for passwords without lowercase letters', () => {
      const noLowercasePasswords = ['PASSWORD1', 'MYPASSWORD123', 'TEST12345', 'ABCDEFGH1'];

      noLowercasePasswords.forEach((password) => {
        expect(validatePassword(password)).toBe(false);
      });
    });

    it('should return false for passwords without numbers', () => {
      const noNumberPasswords = ['Password', 'MySecurePass', 'TestPassword', 'Abcdefgh'];

      noNumberPasswords.forEach((password) => {
        expect(validatePassword(password)).toBe(false);
      });
    });
  });

  describe('validateRequired', () => {
    it('should return true for non-empty strings', () => {
      const validValues = [
        'test',
        'hello world',
        '123',
        'a',
        '   text   ', // should trim and still be valid
      ];

      validValues.forEach((value) => {
        expect(validateRequired(value)).toBe(true);
      });
    });

    it('should return false for empty or whitespace-only strings', () => {
      const invalidValues = ['', '   ', '\t', '\n', '  \t  \n  '];

      invalidValues.forEach((value) => {
        expect(validateRequired(value)).toBe(false);
      });
    });
  });
});
