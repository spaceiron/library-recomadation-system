import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home } from '@/pages/Home';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home Page', () => {
  it('renders main heading', () => {
    renderWithRouter(<Home />);

    expect(screen.getByText('Discover Your Next')).toBeInTheDocument();
    expect(screen.getByText('Favorite Book')).toBeInTheDocument();
  });

  it('displays AI-powered badge', () => {
    renderWithRouter(<Home />);

    expect(screen.getByText('✨ Powered by AI')).toBeInTheDocument();
  });

  it('shows descriptive subtitle', () => {
    renderWithRouter(<Home />);

    expect(
      screen.getByText(/AI-powered recommendations tailored to your unique reading preferences/)
    ).toBeInTheDocument();
  });

  it('renders Browse Books button with correct link', () => {
    renderWithRouter(<Home />);

    const browseBooksLink = screen.getByRole('link', { name: /browse books/i });
    expect(browseBooksLink).toHaveAttribute('href', '/books');
  });

  it('renders Get Recommendations button with correct link', () => {
    renderWithRouter(<Home />);

    const recommendationsLink = screen.getByRole('link', { name: /get recommendations/i });
    expect(recommendationsLink).toHaveAttribute('href', '/recommendations');
  });

  it('has hero section with correct styling', () => {
    const { container } = renderWithRouter(<Home />);

    const heroSection = container.querySelector('.section-hero');
    expect(heroSection).toBeInTheDocument();
    expect(heroSection).toHaveClass('animated-bg', 'text-white');
  });

  it('renders animated background elements', () => {
    const { container } = renderWithRouter(<Home />);

    const animatedElements = container.querySelectorAll('.animate-pulse-slow');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('displays statistics section', () => {
    renderWithRouter(<Home />);

    expect(screen.getByText('10,000+')).toBeInTheDocument();
    expect(screen.getByText('Books Available')).toBeInTheDocument();
    expect(screen.getByText('50,000+')).toBeInTheDocument();
    expect(screen.getByText('Happy Readers')).toBeInTheDocument();
  });

  it('shows features section with correct title', () => {
    renderWithRouter(<Home />);

    expect(screen.getByText('Why Choose LibraryAI?')).toBeInTheDocument();
  });

  it('displays feature description', () => {
    renderWithRouter(<Home />);

    expect(screen.getByText(/Experience the future of book discovery/)).toBeInTheDocument();
  });
});
