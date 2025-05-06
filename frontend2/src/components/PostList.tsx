import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPosts, getCurrentDateTime, clearPosts, downloadPostsAsZip, deletePost, quickRefreshPosts, hardRefreshPosts, getRefreshStatus } from '@/services/api';
import type { PostFilterOptions, RefreshStatus } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Post } from '@/store/useAppStore';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Clock, Trash2, ArrowDown, ArrowUp, Loader2, Download, Filter, X, CheckSquare, Square, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useQueryClient } from '@tanstack/react-query';
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
  // State declarations
  const [withRelations, setWithRelations] = React.useState(false);
  const [backendFilters, setBackendFilters] = React.useState<PostFilterOptions>({
    minId: 1,
    maxId: 100,
    titleContains: "",
    bodyContains: "",
    fetchDateAfter: "",
  });

  // Query to fetch posts
  const { 
    data: posts, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['posts', withRelations, backendFilters],
    queryFn: () => {
      console.log(`[DEBUG] Wywołanie queryFn - pobieranie postów z withRelations=${withRelations}`);
      return getPosts(false, withRelations, backendFilters);
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: true,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const { selectedPost, setSelectedPost, setLastFetchTime, lastFetchTime } = useAppStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isClearing, setIsClearing] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [isQuickRefreshing, setIsQuickRefreshing] = React.useState(false);
  const [isHardRefreshing, setIsHardRefreshing] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [activeFilters, setActiveFilters] = React.useState<Partial<FilterFormValues>>({});
  const [hasActiveFilters, setHasActiveFilters] = React.useState(false);
  const [selectedPosts, setSelectedPosts] = React.useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [isDeleteSelectionConfirmOpen, setIsDeleteSelectionConfirmOpen] = React.useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = React.useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = React.useState(false);
  const [isRelationsDialogOpen, setIsRelationsDialogOpen] = React.useState(false);
  const [pendingRelationsValue, setPendingRelationsValue] = React.useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const refreshCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Refs for tracking state changes
  const prevWithRelationsRef = React.useRef(withRelations);
  const isInitialMount = React.useRef(true);

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

  // Dodaj funkcję do sprawdzania stanu odświeżania z backendu
  const checkBackendRefreshStatus = useCallback(async () => {
    try {
      const status = await getRefreshStatus();
      
      // Zaktualizuj stan tylko jeśli zmienił się status odświeżania
      if (!refreshStatus || 
          refreshStatus.isRefreshing !== status.isRefreshing || 
          refreshStatus.refreshType !== status.refreshType) {
        
        setRefreshStatus(status);
        
        // Jeśli odświeżanie zostało zakończone, odśwież dane
        if (refreshStatus?.isRefreshing && !status.isRefreshing) {
          console.log('Odświeżanie na backendzie zakończone, odświeżam dane frontendowe');
          // Aktualizuj czas ostatniego pobrania
          const currentTime = getCurrentDateTime();
          setLastFetchTime(currentTime);
          
          // Odśwież cache
          await queryClient.invalidateQueries({ 
            queryKey: ['posts', withRelations, backendFilters] 
          });
          
          // Resetuj flagi odświeżania na frontendzie
          setIsQuickRefreshing(false);
          setIsHardRefreshing(false);
          setIsClearing(false);
          
          toast.success('Odświeżanie zakończone');
        }
        
        // Jeśli odświeżanie jest w toku, a flagi frontendowe nie są ustawione
        if (status.isRefreshing && !isHardRefreshing && !isQuickRefreshing && !isClearing) {
          console.log('Wykryto trwające odświeżanie na backendzie:', status);
          
          // Ustaw odpowiednie flagi frontendowe
          if (status.refreshType === 'hard_refresh') {
            setIsHardRefreshing(true);
          } else if (status.refreshType === 'quick_refresh') {
            setIsQuickRefreshing(true);
          } else if (status.refreshType === 'clear_posts') {
            setIsClearing(true);
          }
          
          toast.info(`Trwa operacja na backendzie: ${status.refreshType}`, {
            duration: 3000,
            position: 'top-center'
          });
        }
      }
    } catch (error) {
      console.error('Błąd podczas sprawdzania stanu odświeżania:', error);
    }
  }, [refreshStatus, withRelations, backendFilters, queryClient, setLastFetchTime, isHardRefreshing, isQuickRefreshing, isClearing]);
  
  // Sprawdzaj stan odświeżania przy ładowaniu strony i co 3 sekundy
  React.useEffect(() => {
    // Sprawdź stan odświeżania przy pierwszym ładowaniu
    checkBackendRefreshStatus();
    
    // Sprawdzaj stan odświeżania co 5 sekund (zamiast 3 sekund)
    refreshCheckIntervalRef.current = setInterval(() => {
      // Dodaj dodatkową logikę - sprawdzaj tylko jeśli trwa operacja lub nie wykonano jeszcze pierwszego sprawdzenia
      if (isHardRefreshing || isQuickRefreshing || isClearing || !refreshStatus) {
        console.log('Sprawdzanie stanu odświeżania...');
        checkBackendRefreshStatus();
      }
    }, 5000);
    
    return () => {
      // Wyczyść interwał przy odmontowaniu komponentu
      if (refreshCheckIntervalRef.current) {
        clearInterval(refreshCheckIntervalRef.current);
      }
    };
  }, [checkBackendRefreshStatus, isHardRefreshing, isQuickRefreshing, isClearing, refreshStatus]);
  
  // Dodaj efekt do blokowania interakcji z przyciskami, gdy trwa odświeżanie
  React.useEffect(() => {
    // Jeśli status odświeżania pokazuje, że trwa odświeżanie, zaktualizuj stany frontendowe
    if (refreshStatus?.isRefreshing) {
      if (refreshStatus.refreshType === 'hard_refresh') {
        setIsHardRefreshing(true);
      } else if (refreshStatus.refreshType === 'quick_refresh') {
        setIsQuickRefreshing(true);
      } else if (refreshStatus.refreshType === 'clear_posts') {
        setIsClearing(true);
      }
    } else if (refreshStatus && !refreshStatus.isRefreshing) {
      // Gdy odświeżanie się zakończyło, zresetuj wszystkie flagi
      setIsHardRefreshing(false);
      setIsQuickRefreshing(false);
      setIsClearing(false);
    }
  }, [refreshStatus]);

  // Dodaj funkcję forceDataRefresh na początku komponentu
  const forceDataRefresh = async () => {
    try {
      // Wyczyść cache dla bieżącego zapytania
      queryClient.resetQueries({
        queryKey: ['posts', withRelations, backendFilters]
      });
      
      // Pobierz świeże dane bezpośrednio z API z wymuszeniem odświeżenia
      const freshPosts = await getPosts(true, withRelations, backendFilters);
      
      // Zaktualizuj cache świeżymi danymi
      queryClient.setQueryData(['posts', withRelations, backendFilters], freshPosts);
      
      // Zaktualizuj czas ostatniego odświeżenia
      const currentTime = getCurrentDateTime();
      setLastFetchTime(currentTime);
      
      return freshPosts;
    } catch (error) {
      console.error("Błąd podczas wymuszania odświeżenia danych:", error);
      toast.error("Nie udało się odświeżyć danych");
      throw error;
    }
  };

  // Sprawdz przy ladowaniu, czy posty maja relacje i zaktualizuj stan
  React.useEffect(() => {
    const checkRelationsStatus = async () => {
      try {
        console.log("Sprawdzanie stanu relacji...");

        // Zamiast pobierać posty bezpośrednio, co wywołuje błąd serializacji,
        // po prostu ustaw domyślny stan relacji na false i użyj localStorage
        const storedValue = localStorage.getItem('withRelations');
        if (storedValue !== null) {
          const savedValue = storedValue === 'true';
          
          // Synchronizuj stan z localStorage
          if (savedValue !== withRelations) {
            console.log(`Inicjalizacja: wczytano stan relacji: ${savedValue}`);
            setWithRelations(savedValue);
            prevWithRelationsRef.current = savedValue;
          }
        } else {
          // Jeśli brak wartości w localStorage, domyślnie ustaw na false
          localStorage.setItem('withRelations', 'false');
        }
      } catch (error) {
        console.error('Błąd przy sprawdzaniu statusu relacji:', error);
      }
    };
    
    // Uruchom sprawdzanie po małym opóźnieniu, aby dać czas na inicjalizację
    setTimeout(checkRelationsStatus, 500);
    
    // Nasłuchuj zmiany w localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'withRelations') {
        const newValue = event.newValue === 'true';
        if (newValue !== withRelations) {
          setWithRelations(newValue);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Sprawdź, czy w localStorage jest już zapisana wartość
    const storedValue = localStorage.getItem('withRelations');
    if (storedValue !== null) {
      const savedValue = storedValue === 'true';
      if (savedValue !== withRelations) {
        console.log(`Przywracam zapisany stan relacji: ${savedValue}`);
        setWithRelations(savedValue);
      }
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Efekt zapisujący zmiany do localStorage
  React.useEffect(() => {
    // Nie wykonuj zapisu przy pierwszym renderowaniu
    if (prevWithRelationsRef.current !== withRelations) {
      // Zapisz stan relacji w localStorage gdy się zmieni
      localStorage.setItem('withRelations', withRelations.toString());
      console.log(`Stan relacji zmieniony na: ${withRelations}, zapisuję do localStorage`);
    }
  }, [withRelations]);
  
  // Dodaj efekt zapobiegający automatycznemu odświeżaniu przy starcie aplikacji
  React.useEffect(() => {
    // Pomiń wykonanie efektu przy pierwszym montowaniu
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Sprawdź, czy withRelations faktycznie się zmienił
    if (prevWithRelationsRef.current !== withRelations) {
      console.log(`Stan withRelations zmieniony na: ${withRelations}, wywołuję refetch`);
      
      // Wyczyść aktualnie wybrany post tylko przy zmianie trybu relacji
      if (selectedPost) {
        console.log('Czyszczę aktualnie wybrany post przy zmianie trybu relacji');
        setSelectedPost(null);
      }
      
      // Aktualizuj referencję
      prevWithRelationsRef.current = withRelations;
      
      // Gdy withRelations zmieni się, wywołaj refetch
      refetch();
    }
  }, [withRelations, refetch, setSelectedPost, selectedPost]);

  // Function to apply filters
  const applyFilters = (values: FilterFormValues) => {
    console.log('Applying filters:', values);
    
    // Create valid filter object with all properties set explicitly (no undefined values)
    const newFilters: PostFilterOptions = {
      minId: values.minId,
      maxId: values.maxId,
      titleContains: values.titleContains || "",
      bodyContains: values.bodyContains || "",
      fetchDateAfter: values.fetchDateAfter || "",
    };
    
    setBackendFilters(newFilters);
    setIsFilterOpen(false);
    
    // Explicitly refetch with the new filters
    refetch();
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
    
    // Use a consistent filter object with empty strings instead of undefined values
    const defaultFilters: PostFilterOptions = {
      minId: 1,
      maxId: 100,
      titleContains: "",
      bodyContains: "",
      fetchDateAfter: "",
    };
    
    setBackendFilters(defaultFilters);
    setIsFilterOpen(false);
    
    // Explicitly refetch with the default filters
    refetch();
  };

  // Funkcja do weryfikacji, czy post ma relacje
  const hasRelationsInPost = React.useCallback((post: any): boolean => {
    // Sprawdź, czy post ma właściwość comments, która jest tablicą z elementami
    const hasComments = Array.isArray(post?.comments) && post.comments.length > 0;
    
    // Sprawdź, czy post ma właściwość user
    const hasUser = post?.user !== undefined && post.user !== null;
    
    // Post ma relacje, jeśli ma komentarze lub informacje o użytkowniku
    return hasComments || hasUser;
  }, []);
  
  // Funkcja do czyszczenia relacji z postów - implementacja komponentowa
  const ensurePostsWithoutRelations = React.useCallback((posts: Post[] | undefined): Post[] => {
    if (!posts || posts.length === 0) return [];
    
    // Sprawdź, czy którykolwiek post ma relacje
    const postsWithRelations = posts.filter(post => hasRelationsInPost(post));
    
    if (postsWithRelations.length > 0) {
      console.warn(`Znaleziono ${postsWithRelations.length} postów z relacjami mimo withRelations=false. Usuwam relacje.`);
    }
    
    return posts.map(post => ({
      id: post.id,
      userId: post.userId,
      title: post.title,
      body: post.body,
      fetchDate: post.fetchDate
      // Pominięcie komentarzy i użytkownika usuwa relacje
    }));
  }, [hasRelationsInPost]);

  // Dodaj efekt czyszczący cache przy zmianie withRelations
  React.useEffect(() => {
    // Ten efekt będzie uruchamiany przy każdej zmianie stanu withRelations
    if (!withRelations) {
      console.log('withRelations zmieniony na false - upewniam się, że w cache nie ma postów z relacjami');
      
      // Pobierz posty z cache React Query
      const cachedPosts = queryClient.getQueryData<Post[]>(['posts', withRelations, backendFilters]);
      
      if (cachedPosts) {
        // Sprawdź, czy posty mają relacje
        const postsWithRelations = cachedPosts.filter(post => hasRelationsInPost(post));
        
        if (postsWithRelations.length > 0) {
          console.warn(`W cache znaleziono ${postsWithRelations.length} postów z relacjami mimo withRelations=false. Wymuszam oczyszczenie cache.`);
          
          // Zastąp cache oczyszczonymi postami
          const postsWithoutRelations = ensurePostsWithoutRelations(cachedPosts);
          queryClient.setQueryData(['posts', withRelations, backendFilters], postsWithoutRelations);
        }
      }
    }
  }, [withRelations, backendFilters, hasRelationsInPost, ensurePostsWithoutRelations, queryClient]);

  // Modyfikacja filteredPosts, aby zawsze czyściła relacje gdy withRelations=false
  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    
    // Najpierw upewnij się, że posty nie mają relacji, jeśli withRelations=false
    const postsToUse = withRelations ? posts : ensurePostsWithoutRelations(posts);
    
    // Następnie zastosuj filtrowanie wyszukiwania
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return postsToUse.filter(
        (post: Post) => 
          post.title.toLowerCase().includes(query) || 
          post.body.toLowerCase().includes(query) ||
          post.id.toString().includes(query)
      );
    }
    
    return postsToUse;
  }, [posts, searchQuery, withRelations, ensurePostsWithoutRelations]);
  
  // Funkcja do sprawdzania, czy dane są zgodne z wybranym trybem relacji
  const verifyRelationsConsistency = React.useCallback((data: any[]): {isConsistent: boolean, hasRelations: boolean} => {
    if (!data || data.length === 0) return {isConsistent: true, hasRelations: false}; // Brak danych do weryfikacji
    
    // Sprawdź pierwszy post w danych
    const firstPost = data[0];
    const hasRelations = hasRelationsInPost(firstPost);
    
    console.log(`Weryfikacja spójności relacji: ${hasRelations ? 'posty mają relacje' : 'posty nie mają relacji'}`);
    console.log(`Aktualny stan withRelations: ${withRelations}`);
    
    // Zwróć true, jeśli stan relacji w danych jest zgodny z withRelations,
    // false w przeciwnym przypadku
    return {
      isConsistent: (hasRelations === withRelations) || !hasRelations, // Usuń błędne relacje - posty bez relacji są zawsze prawidłowe
      hasRelations
    };
  }, [withRelations, hasRelationsInPost]);
  
  // Dodaj efekt do weryfikacji relacji w danych i synchronizacji stanu switcha
  React.useEffect(() => {
    if (posts && posts.length > 0) {
      const {isConsistent, hasRelations} = verifyRelationsConsistency(posts);
      
      if (!isConsistent) {
        console.error('Wykryto niespójność relacji!');
        toast.warning('Wykryto niespójność danych. Synchronizuję ustawienia...');
        
        // Jeśli dane są niespójne, dostosuj stan switcha do rzeczywistego stanu danych
        if (hasRelations !== withRelations) {
          console.log(`Korygowanie stanu przełącznika: ${withRelations} -> ${hasRelations}`);
          setWithRelations(hasRelations);
          localStorage.setItem('withRelations', hasRelations.toString());
        }
      }
    }
  }, [posts, verifyRelationsConsistency, withRelations]);
  
  // Dodatkowy efekt do sprawdzania stanu przełącznika po załadowaniu
  React.useEffect(() => {
    const checkRelationsStatus = async () => {
      try {
        // Najpierw sprawdź wartość w localStorage
        const storedValue = localStorage.getItem('withRelations');
        
        if (storedValue !== null) {
          const savedValue = storedValue === 'true';
          
          // Jeśli mamy już dane, sprawdź czy są zgodne z zapisaną wartością
          if (posts && posts.length > 0) {
            const firstPost = posts[0];
            const actualHasRelations = hasRelationsInPost(firstPost);
            
            // Jeśli istnieje rozbieżność, dostosuj stan do rzeczywistych danych
            if (actualHasRelations !== savedValue) {
              console.log(`Korygowanie stanu przełącznika z localStorage: ${savedValue} -> ${actualHasRelations}`);
              setWithRelations(actualHasRelations);
              localStorage.setItem('withRelations', actualHasRelations.toString());
            }
          }
          // W przeciwnym razie ustaw stan zgodnie z localStorage
          else if (savedValue !== withRelations) {
            setWithRelations(savedValue);
          }
        }
      } catch (error) {
        console.error('Błąd przy sprawdzaniu statusu relacji:', error);
      }
    };
    
    checkRelationsStatus();
  }, []); // Uruchom tylko przy pierwszym renderowaniu
  
  // Dodaj nowy, zoptymalizowany efekt dla odświeżania przy zmianie relacji 
  React.useEffect(() => {
    // To jest równoważne instrukcji componentDidMount
    console.log("[DEBUG] Komponent PostList zamontowany - pierwsze renderowanie");
    
    // Wyłącz automatyczne odświeżanie przy pierwszym montowaniu
    const currentWithRelations = withRelations;
    prevWithRelationsRef.current = currentWithRelations;
    
    return () => {
      console.log("[DEBUG] Komponent PostList odmontowany");
    };
  }, []); // Uruchom tylko przy pierwszym renderowaniu

  // Handle toggling of relations
  const handleToggleRelations = async (checked: boolean) => {
    try {
      console.log(`Rozpoczynam zmianę trybu relacji na: ${checked}`);
      setIsHardRefreshing(true);
      
      // Wyświetl informację o trwającym odświeżaniu
      toast.info('Trwa odświeżanie danych...', {
        duration: 3000,
        position: 'top-center'
      });
      
      // Ustawienie flagi w localStorage
      localStorage.setItem('withRelations', checked.toString());
      
      // 1. Ustaw nowy stan relacji
      setWithRelations(checked);
      prevWithRelationsRef.current = checked;
      
      // 2. Wyczyść cache zapytań dla obu trybów
      queryClient.removeQueries({ 
        queryKey: ['posts'] 
      });
      
      // 3. Wykonaj forcedDataRefresh, który pobierze dane bezpośrednio
      await forceDataRefresh();
      
      // 4. Wyświetl komunikat o sukcesie
      toast.success(`Tryb relacji ${checked ? 'włączony' : 'wyłączony'}`, {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      console.error('Błąd przy zmianie trybu relacji:', error);
      toast.error('Błąd przy zmianie trybu relacji: ' + String(error), {
        duration: 3000,
        position: 'top-center'
      });
      
      // Przywróć poprzedni stan w przypadku błędu
      setWithRelations(!checked);
      localStorage.setItem('withRelations', (!checked).toString());
    } finally {
      setIsHardRefreshing(false);
      
      // Sprawdź stan odświeżania na backendzie po zakończeniu
      checkBackendRefreshStatus();
    }
  };

  // Function to handle hard refresh - reloads all posts - też zmodyfikuj
  const handleHardRefresh = async () => {
    try {
      setIsHardRefreshing(true);
      
      toast.info('Trwa pełne odświeżanie danych...', {
        duration: 3000,
        position: 'top-center'
      });
      
      // Instead of calling the backend API directly, use our forceDataRefresh function
      await forceDataRefresh();
      
      // Update the timestamp
      const currentTime = getCurrentDateTime();
      setLastFetchTime(currentTime);
      
      toast.success('Pełne odświeżenie zakończone');
    } catch (error) {
      console.error('Error refreshing posts:', error);
      toast.error('Failed to refresh posts: ' + String(error));
    } finally {
      setIsHardRefreshing(false);
      
      // Sprawdź stan odświeżania na backendzie po zakończeniu
      checkBackendRefreshStatus();
    }
  };

  // Function to handle quick refresh - tylko zmodyfikuj, żeby sprawdzało stan i wyświetlało informacje
  const handleQuickRefresh = async () => {
    try {
      setIsQuickRefreshing(true);
      
      toast.info('Trwa szybkie odświeżanie danych...', {
        duration: 3000,
        position: 'top-center'
      });
      
      // Use our forceDataRefresh function instead of direct API call
      await forceDataRefresh();
      
      // Update the timestamp
      const currentTime = getCurrentDateTime();
      setLastFetchTime(currentTime);
      
      toast.success('Szybkie odświeżanie zakończone');
    } catch (error) {
      console.error('Error refreshing posts:', error);
      toast.error('Failed to refresh posts: ' + String(error));
    } finally {
      setIsQuickRefreshing(false);
      
      // Sprawdź stan odświeżania na backendzie po zakończeniu
      checkBackendRefreshStatus();
    }
  };

  // Handle sort order change
  const handleSortOrderChange = (value: string) => {
    setSortOrder(value as SortOrder);
  };

  // Handle clear posts confirmation
  const handleOpenConfirm = () => {
    setIsConfirmOpen(true);
  };

  // Handle clearing posts - zmodyfikuj
  const handleClearPosts = async () => {
    // Najpierw sprawdź stan odświeżania na backendzie
    try {
      const status = await getRefreshStatus();
      if (status.isRefreshing) {
        console.log('Odświeżanie już trwa, pomijam kolejne żądanie:', status);
        toast.error(`Nie można wyczyścić postów, trwa operacja: ${status.refreshType}`, {
          duration: 3000,
          position: 'top-center'
        });
        setIsConfirmOpen(false);
        return;
      }
    } catch (error) {
      console.error('Błąd podczas sprawdzania stanu odświeżania:', error);
    }
    
    try {
      setIsClearing(true);
      setIsConfirmOpen(false); // Close the dialog immediately
      
      // Clear the selected post right away
      setSelectedPost(null);

      // Make the API call
      toast.promise(
        clearPosts(),
        {
          loading: 'Clearing posts...',
          success: (result) => {
            // Update the timestamp
            const currentTime = getCurrentDateTime();
            setLastFetchTime(currentTime);
            
            // Instead of forcing a refetch, just clear the cache
            queryClient.setQueryData(['posts', withRelations, backendFilters], []);
            // Also clear the other potential queries
            queryClient.setQueryData(['posts', !withRelations, backendFilters], []);
            
            // Sprawdź stan odświeżania na backendzie po zakończeniu
            checkBackendRefreshStatus();
            
            return `All posts deleted from ${result.directory}`;
          },
          error: (error) => {
            console.error('Clear posts error:', error);
            
            // Sprawdź stan odświeżania na backendzie po zakończeniu
            checkBackendRefreshStatus();
            
            return 'Failed to clear posts. Please try again.';
          }
        }
      );
    } catch (error) {
      console.error('Clear posts error:', error);
      toast.error('Failed to clear posts');
      
      // Sprawdź stan odświeżania na backendzie po zakończeniu
      checkBackendRefreshStatus();
    } finally {
      setIsClearing(false);
    }
  };

  // Handle download as ZIP
  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadPostsAsZip();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download posts');
      console.error('Error downloading posts:', error);
    } finally {
      // Short delay before resetting to allow the browser to start the download
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

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

  // Update the isLoadingData check to include both refresh states
  const isLoadingData = isLoading || isRefetching || isQuickRefreshing || isHardRefreshing;

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selected posts when exiting selection mode
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
      // Deselect all if all are already selected
      setSelectedPosts([]);
    } else {
      // Select all visible posts
      setSelectedPosts(filteredPosts.map(post => post.id));
    }
  };

  // Delete selected posts
  const handleDeleteSelectedPosts = async () => {
    if (selectedPosts.length === 0) return;
    
    try {
      setIsDeletingSelected(true);
      setIsDeleteSelectionConfirmOpen(false);
      
      // Delete each selected post sequentially
      for (const postId of selectedPosts) {
        await deletePost(postId);
      }
      
      // Refresh the posts list
      refetch();
      
      // Clear selection
      setSelectedPosts([]);
      
      toast.success(`${selectedPosts.length} posts deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete selected posts');
      console.error('Error deleting posts:', error);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Download selected posts
  const handleDownloadSelectedPosts = async () => {
    if (selectedPosts.length === 0) return;
    
    try {
      setIsDownloadingSelected(true);
      
      // Call the downloadPostsAsZip API with the selected post IDs
      await downloadPostsAsZip({
        postIds: selectedPosts,
        withRelations
      });
      
      toast.success(`${selectedPosts.length} posts prepared for download`);
    } catch (error) {
      toast.error('Failed to download selected posts');
      console.error('Error downloading selected posts:', error);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  // Calculate if some or all posts are selected
  const areAllPostsSelected = filteredPosts && filteredPosts.length > 0 && selectedPosts.length === filteredPosts.length;
  const areSomePostsSelected = selectedPosts.length > 0;

  // Przywróć prostą implementację applyRelationsChange
  const applyRelationsChange = async () => {
    // Close the dialog first
    setIsRelationsDialogOpen(false);
    
    try {
      // Show hard refreshing indicator
      setIsHardRefreshing(true);
      
      console.log(`Zmieniam stan relacji na: ${pendingRelationsValue}`);
      
      // Wyczyść aktualnie wybrany post
      setSelectedPost(null);
      
      // Ustaw withRelations na nową wartość
      setWithRelations(pendingRelationsValue);
      
      // Zapisz w localStorage
      localStorage.setItem('withRelations', pendingRelationsValue.toString());
      
      // Wykonaj wymuszenie odświeżenia danych
      await forceDataRefresh();
      
      // Force a component re-render to ensure UI updates
      setRenderKey(prev => prev + 1);
      
      toast.success(`Zmieniono tryb relacji. Dane zostały załadowane ponownie.`);
    } catch (error) {
      console.error('Błąd podczas zmiany trybu relacji:', error);
      // Revert the value if there was an error
      setWithRelations(!pendingRelationsValue);
      localStorage.setItem('withRelations', (!pendingRelationsValue).toString());
      toast.error('Nie udało się zmienić trybu relacji');
    } finally {
      setIsHardRefreshing(false);
    }
  };

  // Funkcja do automatycznej synchronizacji stanu przełącznika z faktycznym stanem postów
  const autoSyncRelationsState = React.useCallback((posts: Post[] | undefined) => {
    if (!posts || posts.length === 0) return;
    
    // Sprawdź czy którykolwiek post ma relacje
    const hasAnyRelations = posts.some(post => hasRelationsInPost(post));
    
    // Zapamiętaj aktualną wartość, aby sprawdzić czy nastąpiła zmiana
    const currentWithRelations = withRelations;
    
    // Jeśli stan przełącznika nie odpowiada rzeczywistości, zaktualizuj go
    if (!withRelations && hasAnyRelations) {
      console.warn("Wykryto posty z relacjami, ale przełącznik jest wyłączony. Włączam tryb z relacjami.");
      
      // Nie czyść wybranego postu, tylko zaktualizuj stan przełącznika
      setWithRelations(true);
      localStorage.setItem('withRelations', 'true');
      
      // Tylko jeśli stan faktycznie się zmienił, pokaż powiadomienie
      if (currentWithRelations !== true) {
        toast.success("Włączono tryb z relacjami, ponieważ wykryto posty zawierające relacje.");
      }
    } else if (withRelations && !hasAnyRelations) {
      console.warn("Nie wykryto postów z relacjami, ale przełącznik jest włączony. Wyłączam tryb z relacjami.");
      
      // Nie czyść wybranego postu, tylko zaktualizuj stan przełącznika
      setWithRelations(false);
      localStorage.setItem('withRelations', 'false');
      
      // Tylko jeśli stan faktycznie się zmienił, pokaż powiadomienie
      if (currentWithRelations !== false) {
        toast.info("Wyłączono tryb z relacjami, ponieważ nie wykryto postów zawierających relacje.");
      }
    }
  }, [withRelations, hasRelationsInPost, toast]);

  // Dodanie efektu, który będzie sprawdzał zgodność stanu relacji po załadowaniu postów
  React.useEffect(() => {
    if (posts && !isLoading) {
      autoSyncRelationsState(posts);
    }
  }, [posts, isLoading, autoSyncRelationsState]);

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
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
        <h3 className="font-semibold">Error loading posts</h3>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" key={renderKey}>
      {/* Pasek informacyjny o odświeżaniu z backendu */}
      {refreshStatus?.isRefreshing && (
        <div className="bg-yellow-100 dark:bg-yellow-800/30 p-2 mb-3 rounded-md border border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <Loader2 size={16} className="animate-spin" />
            <span>
              <strong>Odświeżanie w toku:</strong> {refreshStatus.refreshType} 
              {refreshStatus.withRelations !== null && ` (tryb relacji: ${refreshStatus.withRelations ? 'włączony' : 'wyłączony'})`}
            </span>
          </div>
        </div>
      )}
      
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
                  </div>
                  
                  <FormField
                    control={form.control as any}
                    name="titleContains"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Title contains</FormLabel>
                        <FormControl>
                          <Input placeholder="Filter by title text..." {...field} />
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
                          <Input placeholder="Filter by content text..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control as any}
                    name="fetchDateAfter"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Fetched after date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                    >
                      Clear All
                    </Button>
                    <Button type="submit" size="sm">Apply Filters</Button>
                  </div>
                </form>
              </Form>
            </PopoverContent>
          </Popover>
        </div>

        {/* Selection controls bar - simplified */}
        {isSelectionMode && (
          <div className="flex items-center justify-between gap-2 p-2 mb-4 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllPosts}
                className="h-8 text-xs"
              >
                {areAllPostsSelected ? "Deselect All" : "Select All"}
              </Button>
              <Badge variant="secondary" className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <CheckSquare size={14} className="mr-1.5 inline-block" />
                <span className="font-medium">{selectedPosts.length}</span> selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDeleteSelectionConfirmOpen(true)}
                disabled={!areSomePostsSelected || isDeletingSelected}
                className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50"
                title="Delete selected posts"
              >
                {isDeletingSelected ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownloadSelectedPosts}
                disabled={!areSomePostsSelected || isDownloadingSelected}
                className="h-8 w-8"
                title="Download selected posts"
              >
                {isDownloadingSelected ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Filter badges - simplified */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 p-2 mb-4 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
            <Badge variant="outline" className="px-2 py-1 text-xs font-normal">
              {Object.keys(activeFilters).length} active filters
            </Badge>
            
            <div className="flex-1"></div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              className="h-7 w-7"
              title="Clear all filters"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 pb-1">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Last fetch: {lastFetchTime || 'never'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>With relations:</span>
            <Switch
              checked={withRelations}
              onCheckedChange={handleToggleRelations}
              disabled={isHardRefreshing || isQuickRefreshing}
            />
            {isHardRefreshing && (
              <span className="text-yellow-600 dark:text-yellow-400">
                <Loader2 size={14} className="animate-spin inline-block mr-1" />
                Odświeżanie...
              </span>
            )}
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
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleQuickRefresh}
                  disabled={isQuickRefreshing || isHardRefreshing}
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
                  disabled={isQuickRefreshing || isHardRefreshing}
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
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleOpenConfirm}
            disabled={isClearing}
            className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50"
            title="Clear all posts"
          >
            {isClearing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="h-8 w-8"
            title="Export all as ZIP"
          >
            {isDownloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-grow relative min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            Failed to load posts. Please try refreshing.
          </div>
        ) : (
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
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Relations Change Confirmation Dialog */}
      <Dialog open={isRelationsDialogOpen} onOpenChange={setIsRelationsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Relations Mode</DialogTitle>
            <DialogDescription>
              Changing the "with relations" setting requires a complete reload of all posts data. 
              This will refresh the entire page and reset your current selection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRelationsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={applyRelationsChange}
              disabled={isHardRefreshing}
            >
              {isHardRefreshing ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Reloading...
                </>
              ) : (
                'Change & Reload Page'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all saved posts?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete all posts saved in the output directory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearPosts}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear All Posts'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete selection confirmation dialog */}
      <AlertDialog open={isDeleteSelectionConfirmOpen} onOpenChange={setIsDeleteSelectionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Posts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPosts.length} selected posts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedPosts} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 