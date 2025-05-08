import type { Post, EnvironmentInfo } from '@/store/useAppStore';

// Use the direct URL to the backend server
// This bypasses Vite's proxy which might be causing issues
const API_URL = 'http://localhost:8080/api';

// Interfejs dla opcji filtrowania postów
export interface PostFilterOptions {
  minId?: number;
  maxId?: number;
  titleContains?: string;
  bodyContains?: string;
  fetchDateAfter?: string;
  withRelations?: boolean;
}

// Opcje dla pobierania wielu postów na raz
export interface DownloadOptions {
  postIds?: number[];
  withRelations?: boolean;
}

// Default fetch options to use for all API calls
const defaultFetchOptions: RequestInit = {
  headers: { 
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`API error (${response.status}): ${errorText}`);
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  return await response.json() as T;
}

// Helper function to normalize API responses with mixed string/boolean values
const normalizeResponse = (data: any) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === 'true') result[key] = true;
    else if (value === 'false') result[key] = false;
    else result[key] = value;
  }
  
  return result;
};

// Get current formatted datetime
export const getCurrentDateTime = (): string => {
  return new Date().toLocaleString();
};

// API endpoints
export const getEnvironmentInfo = async (forceRefresh: boolean = false): Promise<EnvironmentInfo> => {
  try {
    // Add cache-busting query parameter if forceRefresh is true
    const url = forceRefresh 
      ? `${API_URL}/info?refresh=${Date.now()}` 
      : `${API_URL}/info`;
      
    const response = await fetch(url, {
      ...defaultFetchOptions,
      headers: {
        ...defaultFetchOptions.headers,
        'Cache-Control': 'no-cache'
      },
    });
    const data = await handleResponse<EnvironmentInfo>(response);
    
    // Ensure outputDirectory is always a string
    return {
      ...data,
      outputDirectory: data.outputDirectory || './posts',
      lastFetchTime: getCurrentDateTime()
    };
  } catch (error) {
    console.error('Failed to fetch environment info:', error);
    // Provide fallback environment info when the API is unavailable
    return {
      environment: 'development',
      version: '1.0.0',
      outputDirectory: './posts',
      lastFetchTime: getCurrentDateTime()
    };
  }
};

// Update the output directory setting
export const updateOutputDirectory = async (directory: string): Promise<EnvironmentInfo> => {
  try {
    const response = await fetch(`${API_URL}/config/output-directory`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ outputDirectory: directory })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to update output directory: ${errorText}`);
    }
    
    const data = await handleResponse<{ success: boolean; message: string; config: EnvironmentInfo }>(response);
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update output directory');
    }
    
    // Ensure outputDirectory is always a string
    if (!data.config.outputDirectory) {
      throw new Error('Invalid response: outputDirectory is missing');
    }
    
    // Return the config object directly since it contains all the necessary information
    return {
      ...data.config,
      lastFetchTime: getCurrentDateTime()
    };
  } catch (error) {
    console.error('Error updating output directory:', error);
    throw error;
  }
};

// Define new types for related entities
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

// Funkcja do usuwania relacji z postów
export const stripRelationsFromPosts = (posts: any[]): Post[] => {
  if (!posts || !Array.isArray(posts)) return [];
  
  return posts.map(post => ({
    id: post.id,
    userId: post.userId,
    title: post.title,
    body: post.body,
    fetchDate: post.fetchDate
  }));
};

// Add new interface for posts response
interface PostsResponse {
  posts: Post[];
  hasRelations: boolean;
}

export const getPosts = async (
  forceRefresh: boolean = false, 
  filters?: PostFilterOptions
): Promise<PostsResponse> => {
  try {
    // Build URL with query parameters
    let url = `${API_URL}/posts`;
    const params = new URLSearchParams();
    
    // Add cache-busting parameter if force refresh is requested
    if (forceRefresh) {
      params.append('refresh', Date.now().toString());
    }
    
    // Add filter parameters if provided
    if (filters) {
      if (filters.minId !== undefined) {
        params.append('minId', filters.minId.toString());
      }
      
      if (filters.maxId !== undefined) {
        params.append('maxId', filters.maxId.toString());
      }
      
      if (filters.titleContains) {
        params.append('titleContains', filters.titleContains);
      }
      
      if (filters.bodyContains) {
        params.append('bodyContains', filters.bodyContains);
      }
      
      if (filters.fetchDateAfter) {
        params.append('fetchDateAfter', filters.fetchDateAfter);
      }

      if (filters.withRelations) {
        params.append('withRelations', 'true');
      }
    }
    
    // Add parameters to URL
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    // Configure fetch options with cache control
    const fetchOptions: RequestInit = {
      ...defaultFetchOptions,
      headers: {
        ...defaultFetchOptions.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    
    console.log(`Fetching posts from: ${url}`);
    const response = await fetch(url, fetchOptions);
    const data = await handleResponse<PostsResponse>(response);
    console.log(`Fetched ${data.posts.length} posts with relations=${data.hasRelations}`);
    
    return data;
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    throw error;
  }
};

export const getPost = async (id: number, forceRefresh: boolean = false, withRelations: boolean = false): Promise<Post> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (forceRefresh) {
      params.append('refresh', Date.now().toString());
    }
    
    if (withRelations) {
      params.append('withRelations', 'true');
    }
    
    // Add cache-busting query parameter if forceRefresh is true
    let url = `${API_URL}/posts/${id}`;
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
      
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<Post>(response);
  } catch (error) {
    console.error(`Failed to fetch post ${id}:`, error);
    throw error;
  }
};

export const savePost = async (id: number, withRelations: boolean = false): Promise<{ success: boolean; message: string; filePath: string }> => {
  try {
    // Build URL with query parameters if needed
    let url = `${API_URL}/posts/save/${id}`;
    if (withRelations) {
      url += `?withRelations=true`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<{ success: boolean; message: string; filePath: string }>(response);
  } catch (error) {
    console.error(`Failed to save post ${id}:`, error);
    throw error;
  }
};

export const deletePost = async (id: number): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  } catch (error) {
    console.error(`Failed to delete post ${id}:`, error);
    throw error;
  }
};

export const saveAllPosts = async (withRelations: boolean = false): Promise<{ success: boolean; totalPosts: number; savedPosts: number; directory: string }> => {
  try {
    // Build URL with query parameters if needed
    let url = `${API_URL}/posts/save-all`;
    if (withRelations) {
      url += `?withRelations=true`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse<{ success: boolean; totalPosts: number; savedPosts: number; directory: string }>(response);
  } catch (error) {
    console.error('Failed to save all posts:', error);
    throw error;
  }
};

export const clearPosts = async (): Promise<{ success: boolean; directory: string }> => {
  try {
    // First check if there's any refresh in progress
    const refreshStatus = await getRefreshStatus();
    if (refreshStatus.isRefreshing) {
      console.warn('Refresh already in progress:', refreshStatus);
      throw new Error(`Operation in progress (${refreshStatus.refreshType})`);
    }
    
    // Remove the timestamp parameter which is causing serialization issues
    const url = `${API_URL}/posts`;
    console.log('Clearing posts with URL:', url);
    
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'DELETE',
      headers: { 
        ...defaultFetchOptions.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Clear posts error (${response.status}): ${errorText}`);
      throw new Error(`Failed to clear posts: ${errorText}`);
    }
    
    const result = await response.json();
    const normalizedResult = normalizeResponse(result);
    console.log('Clear posts response:', normalizedResult);
    return normalizedResult;
  } catch (error) {
    console.error('Failed to clear posts:', error);
    throw error;
  }
};

/**
 * Download posts as a ZIP file
 * @param options Optional settings for the download
 * @param options.postIds Array of post IDs to download (if not provided, all posts are downloaded)
 * @param options.withRelations Whether to include relations (user and comments) in the download
 */
export const downloadPostsAsZip = async (options?: { 
  postIds?: number[]; 
  withRelations?: boolean;
}): Promise<void> => {
  try {
    // Create a URL with a timestamp to avoid caching
    const timestamp = new Date().getTime();
    let url = `${API_URL}/posts/download-zip?t=${timestamp}`;
    
    // Add options as query parameters if provided
    if (options) {
      if (options.withRelations) {
        url += `&withRelations=true`;
      }
      
      if (options.postIds && options.postIds.length > 0) {
        url += `&ids=${options.postIds.join(',')}`;
      }
    }
    
    // Open the URL in a new window or tab, which will trigger the file download
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to download posts as ZIP:', error);
    throw error;
  }
};

// Add types for refresh status
export interface RefreshStatus {
  isRefreshing: boolean;
  refreshStartTime: number | null;
  refreshType: string | null;
  withRelations: boolean | null;
}

// Funkcja do sprawdzania stanu odświeżania
export const getRefreshStatus = async (): Promise<RefreshStatus> => {
  try {
    // Dodaj parameter cache-busting, ale bez użycia Date objects które mogą nie działać w testach
    const timestamp = Math.floor(Math.random() * 1000000);
    const url = `${API_URL}/refresh-status?t=${timestamp}`;
    
    const response = await fetch(url, {
      ...defaultFetchOptions,
      headers: {
        ...defaultFetchOptions.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const data = await handleResponse<RefreshStatus>(response);
    console.log('Refresh status:', data);
    return data;
  } catch (error) {
    console.error('Failed to get refresh status:', error);
    // Return default state if API fails
    return {
      isRefreshing: false,
      refreshStartTime: null,
      refreshType: null,
      withRelations: null
    };
  }
};

// Update the hardRefreshPosts function to check for ongoing refreshes
export const hardRefreshPosts = async (options?: PostFilterOptions): Promise<HardRefreshResponse> => {
  try {
    // First check if there's any refresh in progress
    const refreshStatus = await getRefreshStatus();
    if (refreshStatus.isRefreshing) {
      console.warn('Refresh already in progress:', refreshStatus);
      throw new Error(`Refresh already in progress (${refreshStatus.refreshType})`);
    }
    
    // Build URL with query parameters
    let url = `${API_URL}/posts/hard-refresh`;
    const params = new URLSearchParams();
    
    if (options) {
      if (options.withRelations) {
        params.append('withRelations', 'true');
      }
      // Add other filter parameters as needed
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log('Hard refreshing posts from:', url);
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'POST',
      headers: {
        ...defaultFetchOptions.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) { // Too Many Requests
        const errorData = await response.json();
        console.warn('Refresh already in progress:', errorData);
        throw new Error(`Refresh already in progress (${errorData.refreshType})`);
      }
      throw new Error(`Refresh failed with status: ${response.status}`);
    }
    
    const data = await handleResponse<HardRefreshResponse>(response);
    console.log(`Hard refresh complete: ${data.totalRefreshed} posts refreshed`);
    
    return data;
  } catch (error) {
    console.error('Failed to hard refresh posts:', error);
    throw error;
  }
};

// Also update quickRefreshPosts with similar pattern
export const quickRefreshPosts = async (options?: PostFilterOptions): Promise<QuickRefreshResponse> => {
  try {
    // First check if there's any refresh in progress
    const refreshStatus = await getRefreshStatus();
    if (refreshStatus.isRefreshing) {
      console.warn('Refresh already in progress:', refreshStatus);
      throw new Error(`Refresh already in progress (${refreshStatus.refreshType})`);
    }
    
    // Build URL with query parameters
    let url = `${API_URL}/posts/quick-refresh`;
    const params = new URLSearchParams();
    
    // Add filter parameters if provided
    if (options) {
      if (options.minId !== undefined) {
        params.append('minId', options.minId.toString());
      }
      
      if (options.maxId !== undefined) {
        params.append('maxId', options.maxId.toString());
      }
      
      if (options.titleContains) {
        params.append('titleContains', options.titleContains);
      }
      
      if (options.bodyContains) {
        params.append('bodyContains', options.bodyContains);
      }
      
      if (options.fetchDateAfter) {
        params.append('fetchDateAfter', options.fetchDateAfter);
      }
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log('Quick refreshing posts from:', url);
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'POST',
      headers: {
        ...defaultFetchOptions.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) { // Too Many Requests
        const errorData = await response.json();
        console.warn('Refresh already in progress:', errorData);
        throw new Error(`Refresh already in progress (${errorData.refreshType})`);
      }
      throw new Error(`Refresh failed with status: ${response.status}`);
    }
    
    const data = await handleResponse<QuickRefreshResponse>(response);
    console.log(`Quick refresh complete: ${data.totalAdded} new posts added`);
    
    return data;
  } catch (error) {
    console.error('Failed to quick refresh posts:', error);
    throw error;
  }
};

// Add new interfaces for responses
export interface QuickRefreshResponse {
  success: boolean;
  totalChecked: number;
  totalAdded: number;
  posts: Post[];
}

export interface HardRefreshResponse {
  success: boolean;
  totalFetched: number;
  totalRefreshed: number;
  posts: Post[];
}