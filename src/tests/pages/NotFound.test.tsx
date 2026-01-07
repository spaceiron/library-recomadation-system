import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotFound } from '@/pages/NotFound';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NotFound Page', () => {
  it('renders 404 heading', () => {
    renderWithRouter(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('displays descriptive error message', () => {
    renderWithRouter(<NotFound />);

    expect(
      screen.getByText(/Oops! The page you're looking for seems to have wandered off/)
    ).toBeInTheDocument();
  });

  it('renders go home button with correct link', () => {
    renderWithRouter(<NotFound />);

    const homeLink = screen.getByRole('link');
    const homeButton = screen.getByText('Go Home');

    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeButton).toBeInTheDocument();
  });

  it('renders book icon', () => {
    const { container } = renderWithRouter(<NotFound />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-24', 'h-24', 'text-slate-400');
  });

  it('has correct styling classes', () => {
    const { container } = renderWithRouter(<NotFound />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');
  });

  it('has animated bounce effect on icon', () => {
    const { container } = renderWithRouter(<NotFound />);

    const animatedDiv = container.querySelector('.animate-bounce');
    expect(animatedDiv).toBeInTheDocument();
    expect(animatedDiv).toHaveClass('animate-bounce');
  });
});
