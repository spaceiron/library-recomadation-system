import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Navigate component
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate(to, replace);
      return <div data-testid="navigate" data-to={to} data-replace={replace} />;
    },
  };
});

const TestComponent = () => <div>Protected Content</div>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    const { container } = renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    // Check for loading spinner container
    const loadingContainer = container.querySelector('.min-h-screen');
    expect(loadingContainer).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login', true);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', role: 'user', email: 'test@example.com' },
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders children when user is authenticated and is admin for admin route', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', role: 'admin', email: 'admin@example.com' },
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects to home when user is not admin but admin is required', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', role: 'user', email: 'user@example.com' },
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', true);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to home when user role is undefined but admin is required', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'user@example.com' }, // no role property
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', true);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('does not require admin when requireAdmin is false', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', role: 'user', email: 'user@example.com' },
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin={false}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles null user when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: null,
    });

    renderWithRouter(
      <ProtectedRoute requireAdmin>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', true);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
