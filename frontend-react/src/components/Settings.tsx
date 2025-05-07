import React from 'react';
import { Badge } from '@/components/ui/badge';
import { type EnvironmentInfo } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  Settings as SettingsIcon, 
  RefreshCw, 
  Clock, 
  Save, 
  Info, 
  HardDrive
} from 'lucide-react';
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
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Function to get theme from cookie
const getThemeFromCookie = (): 'light' | 'dark' => {
  if (typeof document === 'undefined') return 'light';
  
  const themeCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('theme='));
    
  if (themeCookie) {
    const theme = themeCookie.split('=')[1];
    return theme === 'dark' ? 'dark' : 'light';
  }
  
  // Check if user prefers dark mode
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  // Default to light if no cookie and no preference
  return 'light';
};

// Function to set theme cookie
const setThemeCookie = (theme: 'light' | 'dark'): void => {
  // Set cookie with 30 day expiration
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  document.cookie = `theme=${theme}; expires=${expirationDate.toUTCString()}; path=/`;
};

export function Settings() {
  const { environmentInfo, setEnvironmentInfo, setLastFetchTime } = useAppStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [newDirectory, setNewDirectory] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Update directory state when environmentInfo changes or component mounts
  React.useEffect(() => {
    if (environmentInfo) {
      setNewDirectory(environmentInfo.outputDirectory);
    }
  }, [environmentInfo]);

  // Refresh environment info when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      handleRefresh();
    }
  }, [isOpen]);

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
    if (!environmentInfo) return;
    
    try {
      setIsUpdating(true);
      const updatedInfo = await updateOutputDirectory(newDirectory);
      setEnvironmentInfo(updatedInfo);
      setLastFetchTime(updatedInfo.lastFetchTime || '');
      toast.success('Output directory updated successfully');
      setIsOpen(false); // Close the dialog after successful update
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update output directory';
      toast.error(errorMessage);
      console.error('Update directory error:', error);
      setNewDirectory(environmentInfo.outputDirectory); // Reset to original on error
    } finally {
      setIsUpdating(false);
    }
  };

  const saveSettings = async () => {
    await handleUpdateDirectory();
  };

  const getBadgeVariant = () => {
    if (!environmentInfo) return 'outline';
    
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

  if (!environmentInfo) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          className="flex items-center gap-2 text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors p-2 rounded-md bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          aria-label="Open settings"
          onClick={() => setIsOpen(true)}
        >
          <SettingsIcon size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <SettingsIcon className="h-5 w-5" />
            Application Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure application settings and view system information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <Separator />
            
            {/* Output Directory Setting */}
            <div className="space-y-3">
              <div className="flex items-center">
                <HardDrive size={16} className="mr-2 text-primary" />
                <Label className="text-base text-foreground">Storage Settings</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure where saved posts will be stored
              </p>
              
              <div className="pt-2 space-y-2">
                <Label className="text-foreground">Output Directory</Label>
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-muted-foreground shrink-0" />
                  <Input 
                    placeholder="Enter output directory path" 
                    value={newDirectory}
                    onChange={(e) => setNewDirectory(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Directory where posts will be saved when using the Save Post function.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="environment" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Environment</h4>
                  <p className="text-sm text-muted-foreground">
                    Current application environment
                  </p>
                </div>
                <Badge variant={getBadgeVariant()}>
                  {environmentInfo.environment}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Version</h4>
                  <p className="text-sm text-muted-foreground">
                    Application version
                  </p>
                </div>
                <span className="text-sm font-medium">{environmentInfo.version}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Last Fetch</h4>
                  <p className="text-sm text-muted-foreground">
                    Last successful data fetch
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{environmentInfo.lastFetchTime || 'Never'}</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Info
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={saveSettings} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 