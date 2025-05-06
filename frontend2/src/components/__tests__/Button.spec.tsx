import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../ui/button';

describe('Button Component', () => {
  it('renders with default styles', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    
    const button = getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
    expect(button).toHaveClass('bg-primary');
  });

  it('applies variant classes correctly', () => {
    const { getByRole } = render(<Button variant="destructive">Delete</Button>);
    
    const button = getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('applies size classes correctly', () => {
    const { getByRole } = render(<Button size="sm">Small Button</Button>);
    
    const button = getByRole('button');
    expect(button).toHaveClass('h-8 rounded-md gap-1.5 px-3');
  });

  it('handles clicks', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = getByRole('button');
    await userEvent.setup().click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    
    const button = getByRole('button');
    expect(button).toBeDisabled();
  });

  it('forwards className prop', () => {
    const { getByRole } = render(
      <Button className="custom-class">Custom Button</Button>
    );
    
    const button = getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
}); 