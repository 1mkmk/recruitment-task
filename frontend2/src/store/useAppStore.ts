import { create } from 'zustand';

export interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
  fetchDate?: string;
}

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

interface AppState {
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  environmentInfo: EnvironmentInfo | null;
  setEnvironmentInfo: (info: EnvironmentInfo) => void;
  error: string | null;
  setError: (error: string | null) => void;
  lastFetchTime: string | null;
  setLastFetchTime: (time: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPost: null,
  setSelectedPost: (post) => set({ selectedPost: post }),
  environmentInfo: null,
  setEnvironmentInfo: (info) => set({ environmentInfo: info }),
  error: null,
  setError: (error) => set({ error }),
  lastFetchTime: null,
  setLastFetchTime: (time) => set({ lastFetchTime: time }),
})); 