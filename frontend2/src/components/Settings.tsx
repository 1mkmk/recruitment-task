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
  Moon, 
  Sun, 
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
import { Switch } from '@/components/ui/switch';
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
  const [newDirectory, setNewDirectory] = React.useState(environmentInfo?.outputDirectory || '');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    // Initialize theme from cookie or document class
    if (typeof window !== 'undefined') {
      const savedTheme = getThemeFromCookie();
      // Apply the theme to document
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return savedTheme;
    }
    return 'light';
  });

  // Update directory state when environmentInfo changes
  React.useEffect(() => {
    if (environmentInfo?.outputDirectory) {
      setNewDirectory(environmentInfo.outputDirectory);
    }
  }, [environmentInfo?.outputDirectory]);

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
      if (updatedInfo && environmentInfo) {
        setEnvironmentInfo({
          environment: environmentInfo.environment,
          version: environmentInfo.version,
          outputDirectory: newDirectory,
          lastFetchTime: updatedInfo.lastFetchTime || ''
        });
        setLastFetchTime(updatedInfo.lastFetchTime || '');
        toast.success('Output directory updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update output directory');
      console.error('Update directory error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const saveSettings = async () => {
    await handleUpdateDirectory();
    // Add any other settings that need to be saved here
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Update document class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save theme preference in cookie
    setThemeCookie(newTheme);
    
    toast.success(`Theme switched to ${newTheme} mode`);
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
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          aria-label="Open settings"
          onClick={() => setIsOpen(true)}
        >
          <SettingsIcon size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Application Settings
          </DialogTitle>
          <DialogDescription>
            Configure application settings and view system information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            {/* Theme Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Appearance</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark mode
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun size={16} className={theme === 'light' ? 'text-amber-500' : 'text-gray-500'} />
                  <Switch 
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                  <Moon size={16} className={theme === 'dark' ? 'text-blue-400' : 'text-gray-500'} />
                </div>
              </div>
            </div>

            <Separator />
            
            {/* Output Directory Setting */}
            <div className="space-y-3">
              <div className="flex items-center">
                <HardDrive size={16} className="mr-2 text-blue-500" />
                <Label className="text-base">Storage Settings</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure where saved posts will be stored
              </p>
              
              <div className="pt-2 space-y-2">
                <Label>Output Directory</Label>
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-gray-500 shrink-0" />
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

            <Button 
              onClick={saveSettings}
              disabled={isUpdating || !newDirectory || newDirectory === environmentInfo.outputDirectory}
              className="w-full mt-2"
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save size={14} className="mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="environment" className="space-y-6">
            {/* Environment Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Info size={16} className="mr-2 text-blue-500" />
                <h3 className="text-base font-medium">System Information</h3>
              </div>
              
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 text-sm border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                <span className="font-medium text-gray-500 dark:text-gray-400">Environment:</span>
                <Badge variant={getBadgeVariant()} className="justify-self-start">
                  {environmentInfo.environment.toUpperCase()}
                </Badge>
                
                <span className="font-medium text-gray-500 dark:text-gray-400">Version:</span>
                <span>{environmentInfo.version}</span>
                
                <span className="font-medium text-gray-500 dark:text-gray-400">Output Directory:</span>
                <span className="break-all">{environmentInfo.outputDirectory}</span>
                
                <span className="font-medium text-gray-500 dark:text-gray-400">Last Updated:</span>
                <div className="flex items-center gap-1">
                  <Clock size={14} className="shrink-0 text-gray-500 dark:text-gray-400" />
                  <span>{environmentInfo.lastFetchTime || 'Unknown'}</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleRefresh} 
                disabled={isRefreshing}
              >
                <RefreshCw size={14} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh System Information
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="pt-2">
          <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 