import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/common/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any modals that might be left open
    document.body.style.overflow = 'unset';
  });

  it('renders modal when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    // Find the backdrop (the div with bg-black bg-opacity-50)
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when other keys are pressed', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Space' });
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('sets body overflow to hidden when modal is open', () => {
    render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('resets body overflow when modal is closed', () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('unset');
  });

  it('renders modal content correctly', () => {
    const customContent = (
      <div>
        <p>Custom paragraph</p>
        <button>Custom button</button>
      </div>
    );

    render(<Modal {...defaultProps} children={customContent} />);

    expect(screen.getByText('Custom paragraph')).toBeInTheDocument();
    expect(screen.getByText('Custom button')).toBeInTheDocument();
  });

  it('displays the correct title', () => {
    render(<Modal {...defaultProps} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('has correct CSS classes for styling', () => {
    render(<Modal {...defaultProps} />);

    // Check for backdrop
    const backdrop = document.querySelector('.fixed.inset-0.z-50');
    expect(backdrop).toBeInTheDocument();

    // Check for modal container
    const modalContainer = document.querySelector('.bg-white.rounded-lg.shadow-xl');
    expect(modalContainer).toBeInTheDocument();
  });

  it('renders close button with correct icon', () => {
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByRole('button');
    const svg = closeButton.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-6', 'h-6');
  });

  it('cleans up event listeners when unmounted', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<Modal {...defaultProps} />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
