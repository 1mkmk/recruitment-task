import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { saveAllPosts, clearPosts } from '@/services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { 
  SaveAll, 
  Trash2, 
  Loader2, 
  Link as LinkIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function ActionBar() {
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();

  const handleSaveAllPosts = async (withRelations: boolean = false) => {
    try {
      setIsSaving(true);
      const result = await saveAllPosts(withRelations);
      
      toast.success(
        `Posts saved successfully`, 
        { 
          description: `${result.savedPosts} of ${result.totalPosts} posts saved to ${result.directory}`
        }
      );
      
      // Invalidate the cache to refresh the posts list
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error) {
      toast.error('Failed to save posts');
      console.error('Save all posts error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPosts = async () => {
    if (confirm('Are you sure you want to clear all saved posts?')) {
      try {
        setIsClearing(true);
        const result = await clearPosts();
        
        toast.success(
          'Posts cleared successfully', 
          { 
            description: `All posts deleted from ${result.directory}`
          }
        );
        
        // Invalidate the cache to refresh the posts list
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      } catch (error) {
        toast.error('Failed to clear posts');
        console.error('Clear posts error:', error);
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SaveAll size={16} className="mr-2" />
          Save Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Manage Posts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={() => handleSaveAllPosts(false)}
            disabled={isSaving || isClearing}
          >
            {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <SaveAll size={16} className="mr-2" />}
            Save All Posts
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleSaveAllPosts(true)}
            disabled={isSaving || isClearing}
          >
            {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <LinkIcon size={16} className="mr-2" />}
            Save With Relations
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleClearPosts}
            disabled={isSaving || isClearing}
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            {isClearing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
            Clear All Saved Posts
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 