import React from 'react';
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Create a custom render function that includes providers
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      gcTime: Infinity, // Previously cacheTime in v4
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    user: userEvent.setup(),
  };
}

// Mock API services
export const mockApiServices = {
  getPosts: vi.fn(),
  getCurrentDateTime: vi.fn().mockReturnValue('2025-05-06 12:00:00'),
  clearPosts: vi.fn(),
  downloadPostsAsZip: vi.fn(),
  deletePost: vi.fn(),
  quickRefreshPosts: vi.fn(),
  hardRefreshPosts: vi.fn(),
  getRefreshStatus: vi.fn().mockReturnValue({
    isRefreshing: false,
    refreshStartTime: null,
    refreshType: null,
    withRelations: null
  }),
}; 