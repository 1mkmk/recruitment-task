import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

// Reset the store between tests to avoid state leakage
const initialState = useAppStore.getState();

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(initialState);
  });

  it('has correct initial state', () => {
    const state = useAppStore.getState();
    
    expect(state.selectedPost).toBeNull();
    expect(state.lastFetchTime).toBeNull();
  });

  it('can set selected post', () => {
    const mockPost = {
      id: 1,
      userId: 1,
      title: 'Test Post',
      body: 'Test body',
      fetchDate: '2025-05-06 12:00:00'
    };
    
    // Set the selected post
    useAppStore.getState().setSelectedPost(mockPost);
    
    // Check if state was updated
    const state = useAppStore.getState();
    expect(state.selectedPost).toEqual(mockPost);
  });

  it('can set last fetch time', () => {
    const timestamp = '2025-05-06 12:30:45';
    
    // Set the last fetch time
    useAppStore.getState().setLastFetchTime(timestamp);
    
    // Check if state was updated
    const state = useAppStore.getState();
    expect(state.lastFetchTime).toBe(timestamp);
  });

  it('can clear selected post by setting it to null', () => {
    // First set a selected post
    const mockPost = {
      id: 1,
      userId: 1,
      title: 'Test Post',
      body: 'Test body',
      fetchDate: '2025-05-06 12:00:00'
    };
    
    useAppStore.getState().setSelectedPost(mockPost);
    expect(useAppStore.getState().selectedPost).toEqual(mockPost);
    
    // Then clear it
    useAppStore.getState().setSelectedPost(null);
    expect(useAppStore.getState().selectedPost).toBeNull();
  });
}); 