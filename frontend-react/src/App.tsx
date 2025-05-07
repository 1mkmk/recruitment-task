import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { getEnvironmentInfo, getCurrentDateTime } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { PostList } from '@/components/PostList';
import { PostDetails } from '@/components/PostDetails';
import { Settings } from '@/components/Settings';
import { ActionBar } from '@/components/ActionBar';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { toast } from 'sonner';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 0,
      staleTime: Infinity, // Prevents automatic refetching
      refetchInterval: false, // Disable periodic refetching
    },
  },
});

function App() {
  const { selectedPost, setEnvironmentInfo, error, setError, environmentInfo, setLastFetchTime } = useAppStore();

  // Fetch environment info
  useEffect(() => {
    const fetchEnvironmentInfo = async () => {
      try {
        const info = await getEnvironmentInfo();
        setEnvironmentInfo(info);
        setLastFetchTime(info.lastFetchTime || getCurrentDateTime());
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load environment information');
        setError(error);
        console.error('Error fetching environment info:', err);
        // Show error toast
        toast.error('Backend Connection Error', {
          description: 'Make sure the backend is running and accessible',
          duration: 5000,
        });
      }
    };

    fetchEnvironmentInfo();
  }, [setEnvironmentInfo, setError, setLastFetchTime]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800">
          <header className="w-full bg-gray-800/90 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
            <div className="container mx-auto py-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-600 w-8 h-8 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    JSONPlaceholder
                    <span className="ml-1 text-blue-600 dark:text-blue-400">posts downloader</span>
                  </h1>
                </div>
                
                <div className="flex items-center gap-4">
                  <Settings />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-grow w-full container mx-auto p-4 md:p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                <div className="shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Connection Error</p>
                  <p>{error.message}</p>
                  <p className="text-sm mt-1">
                    Please ensure that the backend server is running on http://localhost:8080
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Posts
                  </h2>
                  <PostList />
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {selectedPost ? 'Post Details' : 'Select a Post'}
                  </h2>
                  {selectedPost ? (
                    <PostDetails postId={selectedPost.id} />
                  ) : (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      <p className="font-medium text-lg">No Post Selected</p>
                      <p className="mt-2">Select a post from the list to view its details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          <footer className="w-full bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 border-t py-4 px-6">
            <div className="container mx-auto text-center text-gray-600 dark:text-gray-400 flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
                <p className="font-medium">JSONPlaceholder posts downloader</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {environmentInfo?.environment || 'DEV'}
                  </span>
                  <span>v{environmentInfo?.version || '1.0.0'}</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-6 text-sm">
                <a 
                  href="https://jsonplaceholder.typicode.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  JSONPlaceholder API
                </a>
              </div>
            </div>
          </footer>
        </div>
        
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
