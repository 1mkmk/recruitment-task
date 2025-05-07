import React from 'react';
import { type Post, type PostWithRelations, useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, User, MessageCircle, Calendar, Download, Square, CheckSquare } from 'lucide-react';
import { deletePost, downloadPostsAsZip } from '@/services/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PostCardProps {
  post: Post | PostWithRelations;
  isActive?: boolean;
  onSelect?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
  detailed?: boolean;
  onDelete?: () => void;
}

export function PostCard({ 
  post, 
  isActive, 
  onSelect, 
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  className = "",
  detailed = false,
  onDelete
}: PostCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const queryClient = useQueryClient();
  const { selectedPost, setSelectedPost } = useAppStore();
  
  // Check if post has relations
  const hasRelations = 'user' in post || 'comments' in post;
  const postWithRelations = post as PostWithRelations;
  
  // Delete post function
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  // Download post function
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsDownloading(true);
      await downloadPostsAsZip({ 
        postIds: [post.id],
        withRelations: hasRelations 
      });
      toast.success('Post download started');
    } catch (error) {
      toast.error('Failed to download post');
      console.error('Error downloading post:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle click when in selection mode
  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
    } else if (onSelect) {
      onSelect();
    }
  };

  // Format body for display
  const bodyDisplay = detailed 
    ? post.body 
    : post.body.length > 150 
      ? `${post.body.substring(0, 150)}...` 
      : post.body;

  return (
    <Card 
      className={`border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
        detailed 
          ? 'hover:shadow-none cursor-default' 
          : 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer'
      } ${isActive ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
      ${isSelectionMode && isSelected ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
      ${className}`}
      onClick={!detailed ? handleClick : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {isSelectionMode && !detailed && (
              <div 
                className="cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect && onToggleSelect();
                }}
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </div>
            )}
            <div>
              <CardTitle className={detailed ? 'text-xl' : 'text-lg'}>
                {post.title}
              </CardTitle>
              {hasRelations && postWithRelations.user && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <User size={14} />
                  <span>{postWithRelations.user.name}</span>
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="outline" className="ml-2 shrink-0">ID: {post.id}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line text-sm">
          {bodyDisplay}
        </p>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-0">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          {post.fetchDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-gray-500" />
              Fetched: {post.fetchDate}
            </span>
          )}
          {hasRelations && postWithRelations.comments && postWithRelations.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle size={12} className="text-blue-500" />
              {postWithRelations.comments.length} comments
            </span>
          )}
        </div>
        
        {!isSelectionMode && (
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    <Download size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardFooter>
    </Card>
  );
} 