import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader2, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SelectionActionsMenuProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isDeleting: boolean;
  isDownloading: boolean;
  areAllSelected: boolean;
}

export function SelectionActionsMenu({
  selectedCount,
  onDeleteSelected,
  onDownloadSelected,
  onSelectAll,
  onDeselectAll,
  isDeleting,
  isDownloading,
  areAllSelected,
}: SelectionActionsMenuProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <Badge variant="secondary" className="px-2 py-1">
        {selectedCount} {selectedCount === 1 ? 'post' : 'posts'} selected
      </Badge>
      
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSelectAll}
              disabled={areAllSelected}
              className="h-8 w-8"
            >
              <CheckSquare size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select All</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
              className="h-8 w-8"
            >
              <Square size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Deselect All</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDownloadSelected}
              disabled={isDownloading || selectedCount === 0}
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download Selected</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteSelected}
              disabled={isDeleting || selectedCount === 0}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete Selected</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 