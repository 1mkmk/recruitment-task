import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPost } from '@/services/api';
import { type PostWithRelations } from '@/store/useAppStore';
import { User, MessageCircle, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PostDetailsProps {
  postId: number;
}

export function PostDetails({ postId }: PostDetailsProps) {
  const { 
    data: post, 
    isLoading,
    error
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId, false, true) as Promise<PostWithRelations>,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800">
        <h3 className="font-semibold">Error loading post</h3>
        <p>{error instanceof Error ? error.message : 'Could not load post details'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{post.title}</h1>
      
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {post.user && (
          <div className="flex items-center gap-2">
            <User size={14} />
            <span>
              By <span className="font-medium">{post.user.name}</span> ({post.user.email})
            </span>
          </div>
        )}
        
        {post.fetchDate && (
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>Fetched: {post.fetchDate}</span>
          </div>
        )}
      </div>
      
      <div className="py-2">
        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{post.body}</p>
      </div>
      
      {post.comments && post.comments.length > 0 && (
        <>
          <Separator />
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} className="text-blue-500" />
              <h3 className="font-medium">
                Comments <Badge variant="outline">{post.comments.length}</Badge>
              </h3>
            </div>
            
            <Accordion type="single" collapsible defaultValue="comments">
              <AccordionItem value="comments">
                <AccordionTrigger>
                  <span className="text-sm">Show {post.comments.length} comments</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 mt-2">
                    {post.comments.map(comment => (
                      <div key={comment.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{comment.name}</span>
                          <span className="text-xs text-muted-foreground">{comment.email}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </>
      )}
    </div>
  );
} 