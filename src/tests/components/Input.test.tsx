import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/common/Input';

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required asterisk when required prop is true', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required asterisk when required prop is false', () => {
    render(<Input label="Email" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<Input label="Email" error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-rose-500');
  });

  it('does not display error message when error prop is not provided', () => {
    render(<Input label="Email" />);

    // Check that no error icon is present
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveClass('border-rose-500');
  });

  it('applies error styles when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByRole('textbox');

    expect(input).toHaveClass('border-rose-500', 'bg-rose-50');
  });

  it('calls onChange handler when input value changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Email" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('accepts and applies custom className', () => {
    render(<Input label="Email" className="custom-class" />);
    const input = screen.getByRole('textbox');

    expect(input).toHaveClass('custom-class');
  });

  it('passes through HTML input attributes', () => {
    render(
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        disabled
        value="test@example.com"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter your email');
    expect(input).toBeDisabled();
    expect(input).toHaveValue('test@example.com');
  });

  it('renders error icon when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);

    // Check for SVG icon in error message
    const errorContainer = screen.getByText('Invalid email').parentElement;
    expect(errorContainer?.querySelector('svg')).toBeInTheDocument();
  });

  it('applies input-modern class by default', () => {
    render(<Input label="Email" />);
    const input = screen.getByRole('textbox');

    expect(input).toHaveClass('input-modern');
  });
});
