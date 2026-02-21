import { Heart, Inbox, Send, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRelationshipStatus } from '@/hooks/useRelationshipStatus';
import RelationshipRequestCard from './RelationshipRequestCard';

interface RelationshipRequestsViewProps {
  onBack?: () => void;
}

const RelationshipRequestsView = ({ onBack }: RelationshipRequestsViewProps) => {
  const {
    pendingRequests,
    sentRequests,
    loading,
    actionLoading,
    acceptRequest,
    rejectRequest,
    cancelRequest
  } = useRelationshipStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPending = pendingRequests.length;
  const totalSent = sentRequests.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-red-500" />
        <h2 className="text-xl font-semibold">ურთიერთობის შეთავაზებები</h2>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="received" className="gap-2">
            <Inbox className="w-4 h-4" />
            მიღებული
            {totalPending > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {totalPending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="w-4 h-4" />
            გაგზავნილი
            {totalSent > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {totalSent}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4 space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>მიღებული შეთავაზებები არ არის</p>
            </div>
          ) : (
            pendingRequests.map(request => (
              <RelationshipRequestCard
                key={request.id}
                request={request}
                type="received"
                onAccept={acceptRequest}
                onReject={rejectRequest}
                loading={actionLoading}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-3">
          {sentRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>გაგზავნილი შეთავაზებები არ არის</p>
            </div>
          ) : (
            sentRequests.map(request => (
              <RelationshipRequestCard
                key={request.id}
                request={request}
                type="sent"
                onCancel={cancelRequest}
                loading={actionLoading}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RelationshipRequestsView;
