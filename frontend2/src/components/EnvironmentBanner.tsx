import React from 'react';
import { Badge } from '@/components/ui/badge';
import { type EnvironmentInfo } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { FolderOpen, Settings as SettingsIcon, RefreshCw, Clock, Save, X } from 'lucide-react';
import { getEnvironmentInfo, updateOutputDirectory } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface EnvironmentBannerProps {
  environmentInfo: EnvironmentInfo;
}

export function EnvironmentBanner({ environmentInfo }: EnvironmentBannerProps) {
  const { setEnvironmentInfo, setLastFetchTime } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [newDirectory, setNewDirectory] = React.useState(environmentInfo.outputDirectory);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const newInfo = await getEnvironmentInfo(true); // Force refresh
      setEnvironmentInfo(newInfo);
      setLastFetchTime(newInfo.lastFetchTime || '');
      toast.success('Information refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateDirectory = async () => {
    try {
      setIsUpdating(true);
      const updatedInfo = await updateOutputDirectory(newDirectory);
      setEnvironmentInfo(updatedInfo);
      setLastFetchTime(updatedInfo.lastFetchTime || '');
      toast.success('Output directory updated successfully');
    } catch (error) {
      toast.error('Failed to update output directory');
      console.error('Update directory error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getBadgeVariant = () => {
    switch (environmentInfo.environment.toLowerCase()) {
      case 'development':
        return 'default';
      case 'staging':
        return 'secondary';
      case 'production':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getBadgeColor = () => {
    switch (environmentInfo.environment.toLowerCase()) {
      case 'development':
        return 'bg-blue-500';
      case 'staging':
        return 'bg-amber-500';
      case 'production':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="Open settings"
      >
        <SettingsIcon size={18} />
      </button>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Configure application settings and view system information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Environment Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Environment Information</h3>
              
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Type:</span>
                <Badge variant={getBadgeVariant()} className="justify-self-start">
                  {environmentInfo.environment.toUpperCase()}
                </Badge>
                
                <span className="font-medium text-gray-500 dark:text-gray-400">Version:</span>
                <span>{environmentInfo.version}</span>
                
                <span className="font-medium text-gray-500 dark:text-gray-400">Last Updated:</span>
                <div className="flex items-center gap-1">
                  <Clock size={14} className="shrink-0 text-gray-500 dark:text-gray-400" />
                  <span>{environmentInfo.lastFetchTime || 'Unknown'}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto"
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Output Directory Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Storage Settings</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Output Directory
                </label>
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-gray-500 shrink-0" />
                  <Input 
                    placeholder="Enter output directory path" 
                    value={newDirectory}
                    onChange={(e) => setNewDirectory(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Directory where posts will be saved when using the Save Post function.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSettingsOpen(false);
                setNewDirectory(environmentInfo.outputDirectory); // Reset to original
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDirectory}
              disabled={isUpdating || !newDirectory || newDirectory === environmentInfo.outputDirectory}
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 