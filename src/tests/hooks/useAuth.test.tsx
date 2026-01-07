import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

// Mock AuthContext value
const mockAuthContextValue: AuthContextType = {
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    createdAt: '2024-01-01',
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  confirmSignUp: vi.fn(),
  resendVerificationCode: vi.fn(),
  getAuthToken: vi.fn(),
};

// Test wrapper with AuthContext
const AuthWrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={mockAuthContextValue}>{children}</AuthContext.Provider>
);

describe('useAuth Hook', () => {
  it('returns auth context when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthWrapper,
    });

    expect(result.current).toEqual(mockAuthContextValue);
    expect(result.current.user).toEqual(mockAuthContextValue.user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('provides access to auth functions', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthWrapper,
    });

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.signup).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('throws error when used outside AuthProvider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('returns correct user data structure', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthWrapper,
    });

    const { user } = result.current;
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('createdAt');
  });
});
