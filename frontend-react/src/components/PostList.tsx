import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Post } from '@/store/useAppStore';
import { PostCard } from './PostCard';
import { SelectionActionsMenu } from './SelectionActionsMenu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Clock, Trash2, ArrowDown, ArrowUp, Loader2, Download, Filter, X, CheckSquare, Square, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from '@tanstack/react-query';

// Define sorting options
type SortOrder = 'asc' | 'desc';

// Define filter schema
const filterFormSchema = z.object({
  userId: z.array(z.number()).optional(),
  minId: z.number().min(1).max(100),
  maxId: z.number().min(1).max(100),
  titleContains: z.string().optional(),
  bodyContains: z.string().optional(),
  fetchDateAfter: z.string().optional(),
}).refine((data) => data.minId <= data.maxId, {
  message: "Minimum ID must be less than or equal to Maximum ID",
  path: ["minId"],
});

type FilterFormValues = z.infer<typeof filterFormSchema>;

export function PostList() {
  // Get state and actions from store
  const {
    posts,
    selectedPost,
    lastFetchTime,
    hasRelations,
    backendFilters,
    isLoading,
    error,
    setSelectedPost,
    setBackendFilters,
    fetchPosts,
    clearAllPosts,
    deletePost,
    quickRefresh,
    hardRefresh,
    downloadAsZip
  } = useAppStore();

  const queryClient = useQueryClient();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isQuickRefreshing, setIsQuickRefreshing] = useState(false);
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Partial<FilterFormValues>>({});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleteSelectionConfirmOpen, setIsDeleteSelectionConfirmOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [isDeleteSinglePostDialogOpen, setIsDeleteSinglePostDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  const [isDeletingSinglePost, setIsDeletingSinglePost] = useState(false);
  const [withRelations, setWithRelations] = useState(false);

  // Sync withRelations state with hasRelations from store
  useEffect(() => {
    setWithRelations(hasRelations);
  }, [hasRelations]);

  // Create form
  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      minId: 1,
      maxId: 100,
      titleContains: "",
      bodyContains: "",
      fetchDateAfter: "",
    },
  });

  // Initial data fetch
  useEffect(() => {
    fetchPosts(false, withRelations);
  }, [fetchPosts, withRelations]);

  // Handle clearing posts
  const handleClearPosts = async () => {
    try {
      setIsClearing(true);
      setIsConfirmOpen(false);
      
      // Clear selected post and selection mode
      setSelectedPost(null);
      setSelectedPosts([]);
      setIsSelectionMode(false);

      await clearAllPosts();
      toast.success('All posts have been cleared');
    } catch (error) {
      console.error('Clear posts error:', error);
      toast.error('Failed to clear posts');
    } finally {
      setIsClearing(false);
    }
  };

  // Handle hard refresh
  const handleHardRefresh = async () => {
    try {
      setIsHardRefreshing(true);
      await hardRefresh({ withRelations });
      toast.success('Posts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing posts:', error);
      toast.error('Failed to refresh posts');
    } finally {
      setIsHardRefreshing(false);
    }
  };

  // Handle quick refresh
  const handleQuickRefresh = async () => {
    try {
      setIsQuickRefreshing(true);
      await quickRefresh({ withRelations });
      toast.success('New posts fetched successfully');
    } catch (error) {
      console.error('Error refreshing posts:', error);
      toast.error('Failed to refresh posts');
    } finally {
      setIsQuickRefreshing(false);
    }
  };

  // Handle download as ZIP
  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadAsZip({ postIds: selectedPosts, withRelations });
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download posts');
      console.error('Error downloading posts:', error);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  // Handle sort order change
  const handleSortOrderChange = (value: string) => {
    setSortOrder(value as SortOrder);
  };

  // Function to apply filters
  const applyFilters = (values: FilterFormValues) => {
    const newFilters = {
      minId: values.minId,
      maxId: values.maxId,
      titleContains: values.titleContains || "",
      bodyContains: values.bodyContains || "",
      fetchDateAfter: values.fetchDateAfter || "",
    };
    
    setBackendFilters(newFilters);
    setIsFilterOpen(false);
    fetchPosts();
  };

  // Function to clear filters
  const clearFilters = () => {
    form.reset({
      minId: 1,
      maxId: 100,
      titleContains: "",
      bodyContains: "",
      fetchDateAfter: "",
    });
    
    const defaultFilters = {
      minId: 1,
      maxId: 100,
      titleContains: "",
      bodyContains: "",
      fetchDateAfter: "",
    };
    
    setBackendFilters(defaultFilters);
    setIsFilterOpen(false);
    fetchPosts();
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedPosts([]);
    }
  };

  // Toggle post selection
  const togglePostSelection = (postId: number) => {
    setSelectedPosts(prev => {
      if (prev.includes(postId)) {
        return prev.filter(id => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  };

  // Select all visible posts
  const selectAllPosts = () => {
    if (!filteredPosts) return;
    
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id));
    }
  };

  // Delete selected posts
  const handleDeleteSelectedPosts = async () => {
    if (selectedPosts.length === 0) return;
    
    try {
      setIsDeletingSelected(true);
      setIsDeleteSelectionConfirmOpen(false);
      
      for (const postId of selectedPosts) {
        await deletePost(postId);
      }
      
      setSelectedPosts([]);
      toast.success(`Deleted ${selectedPosts.length} posts`);
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast.error('Failed to delete selected posts');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Handle single post deletion
  const handleDeleteSinglePost = async (postId: number) => {
    try {
      setIsDeletingSinglePost(true);
      setIsDeleteSinglePostDialogOpen(false);
      
      await deletePost(postId);
      
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
      
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeletingSinglePost(false);
      setPostToDelete(null);
    }
  };

  // Open single post deletion dialog
  const handleOpenDeleteSinglePostDialog = (postId: number) => {
    setPostToDelete(postId);
    setIsDeleteSinglePostDialogOpen(true);
  };

  // Filter posts based on search query
  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return posts.filter(
        (post: Post) => 
          post.title.toLowerCase().includes(query) || 
          post.body.toLowerCase().includes(query) ||
          post.id.toString().includes(query)
      );
    }
    
    return posts;
  }, [posts, searchQuery]);

  // Sort posts based on sort order
  const sortedPosts = React.useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.id - b.id;
      } else {
        return b.id - a.id;
      }
    });
  }, [filteredPosts, sortOrder]);

  // Calculate if some or all posts are selected
  const areAllPostsSelected = filteredPosts && filteredPosts.length > 0 && selectedPosts.length === filteredPosts.length;
  const areSomePostsSelected = selectedPosts.length > 0;

  // Handle bulk download of selected posts
  const handleDownloadSelected = async () => {
    if (selectedPosts.length === 0) return;
    
    try {
      setIsDownloadingSelected(true);
      await downloadAsZip({ postIds: selectedPosts, withRelations });
      toast.success(`Started downloading ${selectedPosts.length} posts`);
    } catch (error) {
      console.error('Error downloading selected posts:', error);
      toast.error('Failed to download selected posts');
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  // Handle bulk deletion of selected posts
  const handleDeleteSelected = () => {
    if (selectedPosts.length === 0) return;
    setIsDeleteSelectionConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Input 
          placeholder="Search posts..." 
          disabled
        />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">Error loading posts</h3>
            <p className="text-sm mb-3">{error.message}</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchPosts()}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <RefreshCw size={14} className="mr-2" />
                Try again
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Refresh page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSelectionMode}
            title={isSelectionMode ? "Exit selection mode" : "Enter selection mode"}
            className={isSelectionMode ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" : ""}
          >
            {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
          </Button>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={hasActiveFilters ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" : ""}
              >
                <Filter size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <h4 className="font-medium">Filter Posts</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Apply filters to narrow down the posts list
                </p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(applyFilters)} className="space-y-4 p-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control as any}
                      name="minId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Minimum ID</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control as any}
                      name="maxId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Maximum ID</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control as any}
                      name="titleContains"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Title contains</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control as any}
                      name="bodyContains"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Body contains</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control as any}
                      name="fetchDateAfter"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Fetch date after</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                    >
                      Clear
                    </Button>
                    <Button type="submit" size="sm">
                      Apply
                    </Button>
                  </div>
                </form>
              </Form>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={hasRelations ? "default" : "outline"} className="px-2 py-1">
              {hasRelations ? "With relations" : "Without relations"}
            </Badge>
            <div className="flex items-center space-x-2">
              <Switch
                id="with-relations"
                checked={withRelations}
                disabled={isHardRefreshing}
                onCheckedChange={async (checked) => {
                  try {
                    setIsHardRefreshing(true);
                    // Clear selected post and cache first
                    setSelectedPost(null);
                    setSelectedPosts([]);
                    // Clear React Query cache
                    queryClient.clear();
                    await hardRefresh({ withRelations: checked });
                    setWithRelations(checked);
                    toast.success('Posts refreshed successfully');
                  } catch (error) {
                    console.error('Error refreshing posts:', error);
                    toast.error('Failed to refresh posts');
                  } finally {
                    setIsHardRefreshing(false);
                  }
                }}
              />
              <Label htmlFor="with-relations" className="text-sm">
                {isHardRefreshing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading posts {withRelations ? 'with' : 'without'} relations...</span>
                  </div>
                ) : (
                  'Fetch with relations'
                )}
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleQuickRefresh}
                    disabled={isHardRefreshing || isQuickRefreshing}
                    className="h-8 w-8"
                  >
                    {isQuickRefreshing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quick Refresh (Add Missing Posts)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleHardRefresh}
                    disabled={isHardRefreshing || isQuickRefreshing}
                    className="h-8 w-8"
                  >
                    {isHardRefreshing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCw size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hard Refresh (Reload All Posts)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={isClearing}
                    className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50"
                  >
                    {isClearing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear All Posts</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDownloadZip}
                    disabled={isDownloading}
                    className="h-8 w-8"
                  >
                    {isDownloading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export All as ZIP</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {isSelectionMode && (
          <div className="mt-2">
            <SelectionActionsMenu
              selectedCount={selectedPosts.length}
              onDeleteSelected={handleDeleteSelected}
              onDownloadSelected={handleDownloadSelected}
              onSelectAll={selectAllPosts}
              onDeselectAll={() => setSelectedPosts([])}
              isDeleting={isDeletingSelected}
              isDownloading={isDownloadingSelected}
              areAllSelected={areAllPostsSelected}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 pb-1">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Last fetch: {lastFetchTime || 'never'}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-4 flex justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">Sort:</span>
          <Select
            value={sortOrder}
            onValueChange={(value: string) => handleSortOrderChange(value)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Sort Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Post ID</SelectLabel>
                <SelectItem value="asc">Ascending <ArrowUp size={12} className="ml-2 inline" /></SelectItem>
                <SelectItem value="desc">Descending <ArrowDown size={12} className="ml-2 inline" /></SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-grow relative min-h-0">
        <ScrollArea className="h-[calc(100vh-380px)] pr-4">
          <div className="space-y-3 pb-4">
            {sortedPosts?.length === 0 ? (
              <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                No posts found.
              </div>
            ) : (
              sortedPosts?.map((post) => (
                <PostCard 
                  key={post.id}
                  post={post} 
                  isActive={selectedPost?.id === post.id}
                  onSelect={() => setSelectedPost(post)}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedPosts.includes(post.id)}
                  onToggleSelect={() => togglePostSelection(post.id)}
                  onDelete={() => handleOpenDeleteSinglePostDialog(post.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Clear posts confirmation dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all saved posts?</DialogTitle>
            <DialogDescription>
              This operation will remove all posts saved in the output directory. This operation cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearPosts}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear All Posts'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete selection confirmation dialog */}
      <Dialog open={isDeleteSelectionConfirmOpen} onOpenChange={setIsDeleteSelectionConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Posts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedPosts.length} selected posts? This operation cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteSelectionConfirmOpen(false)}
              disabled={isDeletingSelected}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedPosts}
              disabled={isDeletingSelected}
            >
              {isDeletingSelected ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Selected Posts'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single post deletion dialog */}
      <Dialog open={isDeleteSinglePostDialogOpen} onOpenChange={setIsDeleteSinglePostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This operation cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteSinglePostDialogOpen(false);
                setPostToDelete(null);
              }}
              disabled={isDeletingSinglePost}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => postToDelete && handleDeleteSinglePost(postToDelete)}
              disabled={isDeletingSinglePost}
            >
              {isDeletingSinglePost ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Post'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 