import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { validateRequired } from '@/utils/validation';
import { handleApiError } from '@/utils/errorHandling';

/**
 * Email verification page component
 */
export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmSignUp, resendVerificationCode } = useAuth();

  // Get email from navigation state (passed from signup)
  const email = location.state?.email || '';

  const [verificationCode, setVerificationCode] = useState('');
  const [errors, setErrors] = useState<{ code?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: { code?: string } = {};

    if (!validateRequired(verificationCode)) {
      newErrors.code = 'Verification code is required';
    } else if (verificationCode.length !== 6) {
      newErrors.code = 'Verification code must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await confirmSignUp(email, verificationCode);
      // Show success message and redirect to login
      alert('Email verified successfully! Please login with your credentials.');
      navigate('/login');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 animated-bg">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Invalid Access</h1>
          <p className="text-slate-600 mb-6">Please sign up first to verify your email.</p>
          <Link to="/signup">
            <Button variant="primary">Go to Sign Up</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 animated-bg">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mx-auto">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            <span className="gradient-text">Verify Email</span>
          </h1>
          <p className="text-slate-600 text-lg">We sent a verification code to</p>
          <p className="text-violet-600 font-semibold text-lg">{email}</p>
        </div>

        <div className="glass-effect rounded-3xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit}>
            <Input
              label="Verification Code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={errors.code}
              required
              placeholder="123456"
              maxLength={6}
            />

            <div className="mb-6 text-center">
              <p className="text-sm text-slate-600">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="text-violet-600 hover:text-violet-700 font-semibold"
                  onClick={async () => {
                    try {
                      await resendVerificationCode(email);
                      alert('Verification code sent again!');
                    } catch (error) {
                      handleApiError(error);
                    }
                  }}
                >
                  Resend
                </button>
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Wrong email?{' '}
              <Link to="/signup" className="text-violet-600 hover:text-violet-700 font-semibold">
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
