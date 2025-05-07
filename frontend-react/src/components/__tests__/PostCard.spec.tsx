import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { PostCard } from '../PostCard';

// Mock the useAppStore
vi.mock('@/store/useAppStore', () => ({
  useAppStore: () => ({
    selectedPost: null,
    setSelectedPost: vi.fn(),
  }),
}));

describe('PostCard Component', () => {
  const mockPost = {
    id: 1,
    userId: 1,
    title: 'Test Post Title',
    body: 'Test post body content',
    fetchDate: '2025-05-06 12:00:00',
  };

  const onSelectMock = vi.fn();
  const onToggleSelectMock = vi.fn();

  it('renders post data correctly', () => {
    const { getByText } = renderWithProviders(
      <PostCard 
        post={mockPost} 
        isActive={false}
        onSelect={onSelectMock}
        isSelectionMode={false}
        isSelected={false}
        onToggleSelect={onToggleSelectMock}
      />
    );

    expect(getByText('Test Post Title')).toBeInTheDocument();
    expect(getByText('Test post body content')).toBeInTheDocument();
    expect(getByText('ID: 1')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const { getByText, user } = renderWithProviders(
      <PostCard 
        post={mockPost} 
        isActive={false}
        onSelect={onSelectMock}
        isSelectionMode={false}
        isSelected={false}
        onToggleSelect={onToggleSelectMock}
      />
    );

    // Click on the card (find by title since it's part of the clickable area)
    await user.click(getByText('Test Post Title'));
    expect(onSelectMock).toHaveBeenCalled();
  });

  it('shows selection icon in selection mode', () => {
    const { container } = renderWithProviders(
      <PostCard 
        post={mockPost} 
        isActive={false}
        onSelect={onSelectMock}
        isSelectionMode={true}
        isSelected={false}
        onToggleSelect={onToggleSelectMock}
      />
    );

    // Find the Square icon which is used for checkbox in non-selected state
    const checkboxIcon = container.querySelector('svg');
    expect(checkboxIcon).toBeInTheDocument();
  });

  it('calls onToggleSelect when selection icon clicked', async () => {
    const { container, user } = renderWithProviders(
      <PostCard 
        post={mockPost} 
        isActive={false}
        onSelect={onSelectMock}
        isSelectionMode={true}
        isSelected={false}
        onToggleSelect={onToggleSelectMock}
      />
    );

    // Find the checkbox container div and click it
    const checkboxContainer = container.querySelector('.cursor-pointer');
    if (!checkboxContainer) throw new Error("Checkbox container not found");
    
    await user.click(checkboxContainer);
    expect(onToggleSelectMock).toHaveBeenCalled();
  });

  it('applies active styles when isActive is true', () => {
    const { container } = renderWithProviders(
      <PostCard 
        post={mockPost} 
        isActive={true}
        onSelect={onSelectMock}
        isSelectionMode={false}
        isSelected={false}
        onToggleSelect={onToggleSelectMock}
      />
    );

    // Find the main card element
    const card = container.querySelector('.border-blue-500');
    expect(card).toBeInTheDocument();
  });
}); 