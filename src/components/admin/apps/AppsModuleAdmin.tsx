import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutGrid,
  Settings,
  Shield,
  Search,
  MessageSquare,
  Heart,
  Image,
  Video,
  Clock,
  Users,
  Film,
  Radio,
  MessageCircle,
  MessagesSquare,
  Gamepad2,
  Store,
  FileText,
  BarChart3,
  Trophy,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import ForumsModuleAdmin from './ForumsModuleAdmin';
// Dating module removed
import PhotosModuleAdmin from './PhotosModuleAdmin';
import VideosModuleAdmin from './VideosModuleAdmin';
import BlogModuleAdmin from './BlogModuleAdmin';
import WWWModuleAdmin from './WWWModuleAdmin';
import GenericModuleAdmin from './GenericModuleAdmin';
import AdminMovies from './AdminMovies';

interface AppModule {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  is_enabled: boolean;
  is_visible: boolean;
  requires_auth: boolean;
  min_age: number;
  allowed_genders: string[];
  sort_order: number;
}

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, Heart, Image, Video, Clock, Users, Film, Radio,
  MessageCircle, MessagesSquare, Gamepad2, Store, FileText, BarChart3, Trophy
};

interface AppsModuleAdminProps {
  onBack: () => void;
}

export default function AppsModuleAdmin({ onBack }: AppsModuleAdminProps) {
  const { toast } = useToast();
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_modules')
      .select('id, name, display_name, description, icon, is_enabled, is_visible, requires_auth, min_age, allowed_genders, sort_order')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setModules(data);
    }
    setLoading(false);
  };

  const toggleModule = async (moduleId: string, field: 'is_enabled' | 'is_visible', value: boolean) => {
    await supabase.from('app_modules').update({ [field]: value }).eq('id', moduleId);
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, [field]: value } : m));
    toast({ title: 'განახლდა' });
  };

  const filteredModules = modules.filter(m =>
    m.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (iconName: string | null) => iconMap[iconName || ''] || LayoutGrid;

  const renderModuleAdmin = () => {
    switch (selectedModule) {
      case 'forums': return <ForumsModuleAdmin onBack={() => setSelectedModule(null)} />;
      // Dating module removed
      case 'photos': return <PhotosModuleAdmin onBack={() => setSelectedModule(null)} />;
      case 'videos': return <VideosModuleAdmin onBack={() => setSelectedModule(null)} />;
      case 'blogs': return <BlogModuleAdmin onBack={() => setSelectedModule(null)} />;
      case 'www_quiz': return <WWWModuleAdmin onBack={() => setSelectedModule(null)} />;
      case 'movies': return <AdminMovies />;
      default: 
        const mod = modules.find(m => m.name === selectedModule);
        return <GenericModuleAdmin moduleName={selectedModule || ''} displayName={mod?.display_name || ''} onBack={() => setSelectedModule(null)} />;
    }
  };

  if (selectedModule) return renderModuleAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            აპლიკაციები
          </h2>
          <p className="text-sm text-muted-foreground">მართე ყველა მოდული</p>
        </div>
        <Badge variant="outline">{modules.filter(m => m.is_enabled).length}/{modules.length}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ძებნა..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map(module => {
            const Icon = getIcon(module.icon);
            return (
              <Card key={module.id} className={`cursor-pointer hover:shadow-md ${!module.is_enabled ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${module.is_enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${module.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{module.display_name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{module.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch checked={module.is_enabled} onCheckedChange={(c) => toggleModule(module.id, 'is_enabled', c)} className="scale-75" />
                      {module.requires_auth && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedModule(module.name)}>
                      მართვა <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
