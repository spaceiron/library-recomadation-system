import { describe, it, expect } from 'vitest';
import { mockBooks, mockUsers, mockReadingLists } from '@/services/mockData';

describe('Mock Data', () => {
  describe('mockBooks', () => {
    it('should contain array of books', () => {
      expect(Array.isArray(mockBooks)).toBe(true);
      expect(mockBooks.length).toBeGreaterThan(0);
    });

    it('should have valid book structure', () => {
      const book = mockBooks[0];

      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('genre');
      expect(book).toHaveProperty('description');
      expect(book).toHaveProperty('coverImage');
      expect(book).toHaveProperty('rating');
      expect(book).toHaveProperty('publishedYear');
      expect(book).toHaveProperty('isbn');
    });

    it('should have valid data types', () => {
      const book = mockBooks[0];

      expect(typeof book.id).toBe('string');
      expect(typeof book.title).toBe('string');
      expect(typeof book.author).toBe('string');
      expect(typeof book.genre).toBe('string');
      expect(typeof book.description).toBe('string');
      expect(typeof book.coverImage).toBe('string');
      expect(typeof book.rating).toBe('number');
      expect(typeof book.publishedYear).toBe('number');
      expect(typeof book.isbn).toBe('string');
    });

    it('should have valid rating range', () => {
      mockBooks.forEach((book) => {
        expect(book.rating).toBeGreaterThanOrEqual(0);
        expect(book.rating).toBeLessThanOrEqual(5);
      });
    });

    it('should have unique IDs', () => {
      const ids = mockBooks.map((book) => book.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid published years', () => {
      mockBooks.forEach((book) => {
        expect(book.publishedYear).toBeGreaterThan(1000);
        expect(book.publishedYear).toBeLessThanOrEqual(new Date().getFullYear());
      });
    });
  });

  describe('mockUsers', () => {
    it('should contain array of users', () => {
      expect(Array.isArray(mockUsers)).toBe(true);
      expect(mockUsers.length).toBeGreaterThan(0);
    });

    it('should have valid user structure', () => {
      const user = mockUsers[0];

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');
    });

    it('should have valid user roles', () => {
      mockUsers.forEach((user) => {
        expect(['user', 'admin']).toContain(user.role);
      });
    });

    it('should have valid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      mockUsers.forEach((user) => {
        expect(emailRegex.test(user.email)).toBe(true);
      });
    });

    it('should have unique IDs', () => {
      const ids = mockUsers.map((user) => user.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique emails', () => {
      const emails = mockUsers.map((user) => user.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(emails.length);
    });
  });

  describe('mockReadingLists', () => {
    it('should contain array of reading lists', () => {
      expect(Array.isArray(mockReadingLists)).toBe(true);
      expect(mockReadingLists.length).toBeGreaterThan(0);
    });

    it('should have valid reading list structure', () => {
      const list = mockReadingLists[0];

      expect(list).toHaveProperty('id');
      expect(list).toHaveProperty('userId');
      expect(list).toHaveProperty('name');
      expect(list).toHaveProperty('description');
      expect(list).toHaveProperty('bookIds');
      expect(list).toHaveProperty('createdAt');
      expect(list).toHaveProperty('updatedAt');
    });

    it('should have valid data types', () => {
      const list = mockReadingLists[0];

      expect(typeof list.id).toBe('string');
      expect(typeof list.userId).toBe('string');
      expect(typeof list.name).toBe('string');
      expect(typeof list.description).toBe('string');
      expect(Array.isArray(list.bookIds)).toBe(true);
      expect(typeof list.createdAt).toBe('string');
      expect(typeof list.updatedAt).toBe('string');
    });

    it('should have valid date formats', () => {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

      mockReadingLists.forEach((list) => {
        expect(isoDateRegex.test(list.createdAt)).toBe(true);
        expect(isoDateRegex.test(list.updatedAt)).toBe(true);
      });
    });

    it('should reference valid user IDs', () => {
      const userIds = mockUsers.map((user) => user.id);

      mockReadingLists.forEach((list) => {
        expect(userIds).toContain(list.userId);
      });
    });

    it('should reference valid book IDs', () => {
      const bookIds = mockBooks.map((book) => book.id);

      mockReadingLists.forEach((list) => {
        list.bookIds.forEach((bookId) => {
          expect(bookIds).toContain(bookId);
        });
      });
    });
  });
});
