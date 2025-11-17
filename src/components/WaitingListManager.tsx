import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, Clock, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WaitingListEntry {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string };
  barbers: { name: string } | null;
  notified_at: string | null;
}

export const WaitingListManager = () => {
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWaitingList();
  }, []);

  const fetchWaitingList = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('waiting_list')
      .select(`
        *,
        services (name),
        barbers (name)
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'notified'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching waiting list:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const removeFromWaitingList = async (id: string) => {
    const { error } = await supabase
      .from('waiting_list')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove from waiting list",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Removed",
        description: "Successfully removed from waiting list",
      });
      fetchWaitingList();
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading waiting list...</div>;
  }

  if (entries.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          You have no active waiting list entries.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{entry.services.name}</h3>
                <Badge variant={entry.status === 'notified' ? 'default' : 'secondary'}>
                  {entry.status === 'notified' ? 'Slot Available!' : 'Waiting'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(entry.appointment_date), 'PPP')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {entry.appointment_time}
                </div>
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  {entry.barbers?.name || 'Any barber'}
                </div>
              </div>
              {entry.notified_at && (
                <p className="text-xs text-green-600">
                  Notified: {format(new Date(entry.notified_at), 'PPP p')}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFromWaitingList(entry.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
