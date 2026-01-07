import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(outerDiv).toHaveClass('flex', 'justify-center', 'items-center');
    expect(spinner).toHaveClass('w-8', 'h-8', 'text-primary-600');
  });

  it('applies small size classes when size is sm', () => {
    const { container } = render(<LoadingSpinner size="sm" />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('applies medium size classes when size is md', () => {
    const { container } = render(<LoadingSpinner size="md" />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('applies large size classes when size is lg', () => {
    const { container } = render(<LoadingSpinner size="lg" />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('applies custom color class', () => {
    const { container } = render(<LoadingSpinner color="text-red-500" />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass('text-red-500');
  });

  it('applies default color when no color prop is provided', () => {
    const { container } = render(<LoadingSpinner />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass('text-primary-600');
  });

  it('has correct animation and styling classes', () => {
    const { container } = render(<LoadingSpinner />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass(
      'animate-spin',
      'rounded-full',
      'border-4',
      'border-gray-200',
      'border-t-current'
    );
  });

  it('combines size and color props correctly', () => {
    const { container } = render(<LoadingSpinner size="lg" color="text-blue-400" />);

    const outerDiv = container.firstChild as HTMLElement;
    const spinner = outerDiv.querySelector('div');

    expect(spinner).toHaveClass('w-12', 'h-12', 'text-blue-400');
  });
});
