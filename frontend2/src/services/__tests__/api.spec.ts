import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPosts, getCurrentDateTime, getRefreshStatus } from '../api';
import type { Post } from '@/store/useAppStore';

// Mock global fetch
global.fetch = vi.fn();

describe('API Services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPosts', () => {
    it('fetches posts without relations by default', async () => {
      const mockPosts: Post[] = [
        { 
          id: 1, 
          userId: 1, 
          title: 'Test Post', 
          body: 'Test body', 
          fetchDate: '2025-05-06 12:00:00'
        }
      ];

      // Setup the mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      });

      // Call the function
      const result = await getPosts();

      // Assert on the result
      expect(result).toEqual(mockPosts);

      // Check fetch was called with the right URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/posts?withRelations=false'),
        expect.any(Object)
      );
    });

    it('includes withRelations param when true', async () => {
      const mockPosts: Post[] = [
        { 
          id: 1, 
          userId: 1, 
          title: 'Test Post', 
          body: 'Test body', 
          fetchDate: '2025-05-06 12:00:00'
        }
      ];

      // Setup the mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      });

      // Call the function with withRelations=true
      await getPosts(false, true);

      // Check fetch was called with the right URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/posts?withRelations=true'),
        expect.any(Object)
      );
    });

    it('includes filter parameters when provided', async () => {
      const mockPosts: Post[] = [
        { 
          id: 1, 
          userId: 1, 
          title: 'Test Post', 
          body: 'Test body', 
          fetchDate: '2025-05-06 12:00:00'
        }
      ];

      // Setup the mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      });

      // Call the function with filters
      await getPosts(false, false, {
        minId: 1,
        maxId: 10,
        titleContains: 'test',
      });

      // Check fetch was called with the right URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/posts?withRelations=false&minId=1&maxId=10&titleContains=test'),
        expect.any(Object)
      );
    });

    it('throws an error when fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      // Call the function and expect it to throw
      await expect(getPosts()).rejects.toThrow('API error');
    });
  });

  describe('getCurrentDateTime', () => {
    it('returns a formatted date string', () => {
      // Mock Date.now to return a consistent date
      const mockDate = new Date('2025-05-06T12:00:00Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = getCurrentDateTime();
      
      // Format will depend on locale, but should include year, month, day
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}[/:]\d{1,2}[/:]\d{1,4}/);
    });
  });

  describe('getRefreshStatus', () => {
    it('fetches refresh status from the API', async () => {
      const mockStatus = {
        isRefreshing: false,
        refreshStartTime: null,
        refreshType: null,
        withRelations: null
      };

      // Setup the mock fetch response
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: true,
        json: async () => mockStatus,
      }));

      // Clear any previous calls
      (global.fetch as any).mockClear();

      // Call the function
      const result = await getRefreshStatus();

      // Assert on the result
      expect(result).toEqual(mockStatus);

      // Check fetch was called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Check that the URL contains the refresh-status endpoint
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/refresh-status');
    });
  });
}); 