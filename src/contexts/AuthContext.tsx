/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import { User } from '@/types';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode,
  fetchAuthSession,
} from 'aws-amplify/auth';

/**
 * Authentication context type definition
 */
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}

/**
 * Authentication context
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthState = async () => {
    try {
      const cognitoUser = await getCurrentUser();

      setUser({
        id: cognitoUser.userId,
        email: cognitoUser.signInDetails?.loginId || '',
        name: cognitoUser.username,
        role: 'user',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        await checkAuthState();
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const result = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            name: name,
          },
        },
      });

      console.log('Signup result:', result);
      // Note: User will need to confirm their email before they can sign in
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSignUpHandler = async (email: string, code: string) => {
    setIsLoading(true);
    try {
      const result = await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code,
      });

      console.log('Confirmation result:', result);

      if (result.isSignUpComplete) {
        // Optionally auto-login after confirmation
        // await checkAuthState();
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationCodeHandler = async (email: string) => {
    setIsLoading(true);
    try {
      await resendSignUpCode({ username: email });
      console.log('Verification code resent successfully');
    } catch (error) {
      console.error('Resend verification code error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Token fetch error:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    signup,
    confirmSignUp: confirmSignUpHandler,
    resendVerificationCode: resendVerificationCodeHandler,
    getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
