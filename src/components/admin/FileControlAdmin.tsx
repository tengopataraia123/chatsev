import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileText, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Eye,
  ArrowRight,
  X,
  Play,
  RefreshCw,
  Users,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FileRecord {
  id: string;
  messageId: string;
  conversationId?: string;
  source: 'private' | 'group';
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  sender: {
    userId: string;
    username: string;
  };
  receiver: {
    userId: string;
    username: string;
  } | null;
  roomName?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SourceFilter = 'all' | 'private' | 'group';

// Memoized thumbnail component for better performance
const FileThumbnail = memo(({ file, onClick }: { file: FileRecord; onClick: () => void }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (file.fileType === 'image') {
    return (
      <div 
        className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative"
        onClick={onClick}
      >
        {!imgLoaded && !imgError && (
          <Skeleton className="absolute inset-0" />
        )}
        {!imgError && (
          <img 
            src={file.fileUrl} 
            alt=""
            loading="lazy"
            className={`w-full h-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        {imgError && <FileImage className="h-5 w-5 text-blue-500" />}
      </div>
    );
  }

  if (file.fileType === 'video') {
    return (
      <div 
        className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative"
        onClick={onClick}
      >
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Play className="h-6 w-6 text-white fill-white" />
        </div>
        <FileVideo className="h-5 w-5 text-purple-500" />
      </div>
    );
  }

  return (
    <div 
      className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      {file.fileType === 'audio' ? (
        <FileAudio className="h-5 w-5 text-green-500" />
      ) : (
        <FileText className="h-5 w-5 text-orange-500" />
      )}
    </div>
  );
});

FileThumbnail.displayName = 'FileThumbnail';

export const FileControlAdmin = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

  const fetchFiles = useCallback(async (page: number = 1, source: SourceFilter = 'all', isRefresh = false) => {
    if (!user) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await supabase.functions.invoke('file-control', {
        body: { page, limit: 50, source }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch files');
      }

      if (response.data?.error) {
        setError(response.data.error);
        setFiles([]);
        return;
      }

      setFiles(response.data.files || []);
      setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err: unknown) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFiles(1, sourceFilter);
    }
  }, [user, sourceFilter]);

  const getFileTypeBadge = useCallback((type: string) => {
    const colors: Record<string, string> = {
      image: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      video: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      audio: 'bg-green-500/10 text-green-600 border-green-500/20',
      document: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    };
    const labels: Record<string, string> = {
      image: 'ფოტო',
      video: 'ვიდეო',
      audio: 'აუდიო',
      document: 'დოკუმენტი'
    };
    return (
      <Badge variant="outline" className={`text-[10px] ${colors[type] || colors.document}`}>
        {labels[type] || type}
      </Badge>
    );
  }, []);

  const getSourceBadge = useCallback((source: string) => {
    if (source === 'group') {
      return (
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
          <Users className="h-2.5 w-2.5 mr-0.5" />
          ჯგუფი
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 border-pink-500/20">
        <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
        პირადი
      </Badge>
    );
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchFiles(newPage, sourceFilter);
    }
  }, [pagination.totalPages, fetchFiles, sourceFilter]);

  const handleRefresh = useCallback(() => {
    fetchFiles(pagination.page, sourceFilter, true);
  }, [fetchFiles, pagination.page, sourceFilter]);

  const handleSourceChange = useCallback((newSource: SourceFilter) => {
    setSourceFilter(newSource);
    fetchFiles(1, newSource);
  }, [fetchFiles]);

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteFile = useCallback(async (file: FileRecord) => {
    setDeleting(file.id);
    try {
      const response = await supabase.functions.invoke('file-control', {
        body: { 
          action: 'delete', 
          fileUrl: file.fileUrl, 
          messageId: file.messageId,
          source: file.source 
        }
      });

      if (response.data?.success) {
        toast.success('ფაილი წარმატებით წაიშალა');
        setFiles(prev => prev.filter(f => f.id !== file.id));
        if (previewFile?.id === file.id) setPreviewFile(null);
      } else {
        toast.error(response.data?.message || 'ფაილის წაშლა ვერ მოხერხდა');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('ფაილის წაშლა ვერ მოხერხდა');
    } finally {
      setDeleting(null);
    }
  }, [previewFile]);

  const [bulkDeleting, setBulkDeleting] = useState(false);
  

  const handleDeleteAll = useCallback(async () => {
    setBulkDeleting(true);
    
    try {
      const response = await supabase.functions.invoke('file-control', {
        body: { 
          action: 'delete-all',
          source: sourceFilter === 'all' ? 'all' : sourceFilter
        }
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'ყველა ფაილი წაიშალა');
        setFiles([]);
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
      } else {
        toast.error(response.data?.message || 'წაშლა ვერ მოხერხდა');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setBulkDeleting(false);
      fetchFiles(1, sourceFilter);
    }
  }, [sourceFilter, fetchFiles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Shield className="h-12 w-12 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg text-destructive">წვდომა აკრძალულია</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight">File Control</h2>
            <p className="text-xs text-muted-foreground truncate">
              მულტიმედია ფაილების მონიტორინგი • {pagination.total} ფაილი
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={files.length === 0 || bulkDeleting}
                className="h-8 text-xs gap-1 flex-1 sm:flex-none"
              >
                <Trash2 className={`h-3.5 w-3.5 shrink-0 ${bulkDeleting ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {bulkDeleting 
                    ? 'მიმდინარეობს...' 
                    : `ყველას წაშლა (${pagination.total})`
                  }
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ყველა ფაილის წაშლა</AlertDialogTitle>
                <AlertDialogDescription>
                  ნამდვილად გსურთ <strong>ყველა ({pagination.total})</strong> ფაილის წაშლა? 
                  ფაილები წაიშლება როგორც storage-დან, ისე ბაზიდან. ეს მოქმედება ვეღარ გაუქმდება!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  დიახ, ყველა წაიშალოს
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing || bulkDeleting}
            className="h-8 w-8 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Source Filter */}
      <div className="flex gap-1.5">
        <Button
          variant={sourceFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSourceChange('all')}
          className="h-8 text-xs"
        >
          ყველა
        </Button>
        <Button
          variant={sourceFilter === 'private' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSourceChange('private')}
          className="h-8 text-xs gap-1"
        >
          <MessageSquare className="h-3 w-3" />
          პირადი
        </Button>
        <Button
          variant={sourceFilter === 'group' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSourceChange('group')}
          className="h-8 text-xs gap-1"
        >
          <Users className="h-3 w-3" />
          ჯგუფური
        </Button>
      </div>

      {/* Files List */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-1.5">
          {files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>ფაილები არ მოიძებნა</p>
            </div>
          ) : (
            files.map((file) => (
              <Card key={file.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Thumbnail */}
                    <FileThumbnail file={file} onClick={() => setPreviewFile(file)} />

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {getFileTypeBadge(file.fileType)}
                        {getSourceBadge(file.source)}
                        <span className="text-[11px] text-muted-foreground truncate">
                          {file.fileName.length > 20 ? file.fileName.substring(0, 20) + '...' : file.fileName}
                        </span>
                      </div>

                      {/* Sender -> Receiver */}
                      <div className="flex items-center gap-1 text-[11px] mb-0.5">
                        <span className="font-medium text-blue-600">{file.sender.username}</span>
                        {file.source === 'private' && file.receiver && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="font-medium text-pink-600">{file.receiver.username}</span>
                          </>
                        )}
                        {file.source === 'group' && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="font-medium text-amber-600">ჯგუფური ჩათი</span>
                          </>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(file.createdAt), 'dd.MM.yy HH:mm')}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => window.open(file.fileUrl, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deleting === file.id}
                          >
                            <Trash2 className={`h-3.5 w-3.5 ${deleting === file.id ? 'animate-spin' : ''}`} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ფაილის წაშლა</AlertDialogTitle>
                            <AlertDialogDescription>
                              ნამდვილად გსურთ ამ ფაილის წაშლა? ეს მოქმედება ვეღარ გაუქმდება. ფაილი წაიშლება როგორც storage-დან, ისე ბაზიდან.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteFile(file)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              წაშლა
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      <div className="flex flex-col items-center gap-2 pt-3 pb-4 border-t">
        <div className="text-xs text-muted-foreground">
          გვერდი {pagination.page} / {pagination.totalPages || 1} • სულ {pagination.total} ფაილი
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="h-9 px-3 gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">წინა</span>
            </Button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(pageNum => {
                if (pageNum === 1 || pageNum === pagination.totalPages) return true;
                if (Math.abs(pageNum - pagination.page) <= 1) return true;
                return false;
              })
              .map((pageNum, idx, arr) => {
                const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1;
                return (
                  <div key={pageNum} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="text-muted-foreground px-0.5">...</span>
                    )}
                    <Button
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-9 w-9 p-0 text-sm font-medium"
                    >
                      {pageNum}
                    </Button>
                  </div>
                );
              })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="h-9 px-3 gap-1"
            >
              <span className="hidden sm:inline">შემდეგი</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90dvh] p-0 overflow-hidden rounded-xl">
          <div className="relative flex flex-col max-h-[90dvh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setPreviewFile(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            
            {previewFile && (
              <>
                <div className="bg-black flex items-center justify-center min-h-[200px] flex-1 overflow-hidden">
                  {previewFile.fileType === 'image' && (
                    <img 
                      src={previewFile.fileUrl} 
                      alt={previewFile.fileName}
                      className="w-full h-full max-h-[60dvh] object-contain"
                      loading="eager"
                    />
                  )}
                  {previewFile.fileType === 'video' && (
                    <video 
                      src={previewFile.fileUrl} 
                      controls
                      autoPlay
                      preload="auto"
                      playsInline
                      className="w-full max-h-[60dvh]"
                    />
                  )}
                  {previewFile.fileType === 'audio' && (
                    <div className="p-6 w-full">
                      <audio src={previewFile.fileUrl} controls autoPlay className="w-full" />
                    </div>
                  )}
                  {previewFile.fileType === 'document' && (
                    <div className="p-6 text-center text-white">
                      <FileText className="h-14 w-14 mx-auto mb-3 opacity-50" />
                      <p className="mb-3 text-sm break-all">{previewFile.fileName}</p>
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(previewFile.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        ჩამოტვირთვა
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-card border-t shrink-0">
                  <div className="flex flex-col gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {getFileTypeBadge(previewFile.fileType)}
                        {getSourceBadge(previewFile.source)}
                        <span className="font-medium text-xs truncate max-w-[150px] sm:max-w-[200px]">{previewFile.fileName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] flex-wrap">
                        <span className="text-blue-600 font-medium">{previewFile.sender.username}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className={previewFile.source === 'group' ? 'text-amber-600 font-medium' : 'text-pink-600 font-medium'}>
                          {previewFile.source === 'group' ? 'ჯგუფური ჩათი' : (previewFile.receiver?.username || '?')}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(previewFile.createdAt), 'dd.MM.yy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleting === previewFile.id}
                            className="h-8 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            წაშლა
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ფაილის წაშლა</AlertDialogTitle>
                            <AlertDialogDescription>
                              ნამდვილად გსურთ ამ ფაილის წაშლა? ფაილი წაიშლება storage-დან და ბაზიდან.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteFile(previewFile)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              წაშლა
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => window.open(previewFile.fileUrl, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        გახსნა
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};