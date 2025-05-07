import { create } from 'zustand';
import { getPosts, getCurrentDateTime, clearPosts, downloadPostsAsZip, deletePost, quickRefreshPosts, hardRefreshPosts } from '@/services/api';
import type { PostFilterOptions } from '@/services/api';

export type Post = {
  id: number;
  userId: number;
  title: string;
  body: string;
  fetchDate: string;
  user?: any;
  comments?: any[];
};

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  website?: string;
  company?: {
    name: string;
    catchPhrase?: string;
    bs?: string;
  };
  address?: {
    street?: string;
    suite?: string;
    city?: string;
    zipcode?: string;
    geo?: {
      lat?: string;
      lng?: string;
    };
  };
}

export interface Comment {
  postId: number;
  id: number;
  name: string;
  email: string;
  body: string;
}

export interface PostWithRelations extends Post {
  user?: User;
  comments?: Comment[];
}

export interface EnvironmentInfo {
  environment: string;
  version: string;
  outputDirectory: string;
  lastFetchTime?: string;
}

export interface AppState {
  posts: Post[];
  selectedPost: Post | null;
  lastFetchTime: string | null;
  hasRelations: boolean;
  backendFilters: PostFilterOptions;
  isLoading: boolean;
  error: Error | null;
  environmentInfo: EnvironmentInfo | null;
  setSelectedPost: (post: Post | null) => void;
  setBackendFilters: (filters: PostFilterOptions) => void;
  setError: (error: Error | null) => void;
  setEnvironmentInfo: (info: EnvironmentInfo | null) => void;
  setLastFetchTime: (time: string | null) => void;
  fetchPosts: (refresh?: boolean, withRelations?: boolean) => Promise<void>;
  clearAllPosts: () => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  quickRefresh: (options?: { withRelations?: boolean }) => Promise<void>;
  hardRefresh: (options?: { withRelations?: boolean }) => Promise<void>;
  downloadAsZip: (options: { postIds?: number[]; withRelations?: boolean }) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  posts: [],
  selectedPost: null,
  lastFetchTime: null,
  hasRelations: false,
  backendFilters: {
    minId: 1,
    maxId: 100,
    titleContains: "",
    bodyContains: "",
    fetchDateAfter: "",
  },
  isLoading: false,
  error: null,
  environmentInfo: null,

  setSelectedPost: (post) => set({ selectedPost: post }),
  
  setBackendFilters: (filters) => set({ backendFilters: filters }),

  setError: (error) => set({ error }),

  setEnvironmentInfo: (info) => set({ environmentInfo: info }),

  setLastFetchTime: (time) => set({ lastFetchTime: time }),

  fetchPosts: async () => {
    try {
      set({ isLoading: true, error: null });
      const { backendFilters } = get();
      const response = await getPosts(false, backendFilters);
      set({ 
        posts: response.posts, 
        hasRelations: response.hasRelations,
        lastFetchTime: getCurrentDateTime(),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to fetch posts'),
        isLoading: false 
      });
    }
  },

  clearAllPosts: async () => {
    try {
      set({ isLoading: true, error: null });
      await clearPosts();
      set({ 
        posts: [],
        selectedPost: null,
        lastFetchTime: getCurrentDateTime(),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to clear posts'),
        isLoading: false 
      });
      throw error;
    }
  },

  deletePost: async (postId: number) => {
    try {
      set({ isLoading: true, error: null });
      await deletePost(postId);
      const { posts, selectedPost } = get();
      const updatedPosts = posts.filter(post => post.id !== postId);
      set({ 
        posts: updatedPosts,
        selectedPost: selectedPost?.id === postId ? null : selectedPost,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to delete post'),
        isLoading: false 
      });
      throw error;
    }
  },

  quickRefresh: async () => {
    try {
      set({ isLoading: true, error: null });
      const { backendFilters, posts } = get();
      const result = await quickRefreshPosts(false, backendFilters);
      
      // Merge current posts with new ones, avoiding duplicates
      const updatedPosts = [...posts];
      result.posts.forEach(newPost => {
        if (!updatedPosts.some(post => post.id === newPost.id)) {
          updatedPosts.push(newPost);
        }
      });

      set({ 
        posts: updatedPosts,
        lastFetchTime: getCurrentDateTime(),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to refresh posts'),
        isLoading: false 
      });
      throw error;
    }
  },

  hardRefresh: async (options?: { withRelations?: boolean }) => {
    try {
      set({ isLoading: true, error: null });
      // Clear all caches first
      set({ 
        posts: [],
        selectedPost: null,
        lastFetchTime: null
      });
      const result = await hardRefreshPosts({ withRelations: options?.withRelations });
      set({ 
        posts: result.posts,
        lastFetchTime: getCurrentDateTime(),
        isLoading: false,
        hasRelations: options?.withRelations ?? false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to refresh posts'),
        isLoading: false 
      });
      throw error;
    }
  },

  downloadAsZip: async (options: { postIds?: number[]; withRelations?: boolean }) => {
    try {
      set({ isLoading: true, error: null });
      await downloadPostsAsZip(options);
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to download posts'),
        isLoading: false 
      });
      throw error;
    }
  },
})); 