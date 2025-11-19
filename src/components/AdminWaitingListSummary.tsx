import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export const AdminWaitingListSummary = () => {
  const [summary, setSummary] = useState({ total: 0, byDate: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    const { data, error } = await supabase
      .from('waiting_list')
      .select('appointment_date')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching waiting list summary:', error);
    } else {
      const byDate = (data || []).reduce((acc, entry) => {
        const existing = acc.find(item => item.date === entry.appointment_date);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ date: entry.appointment_date, count: 1 });
        }
        return acc;
      }, []);

      setSummary({
        total: data?.length || 0,
        byDate: byDate.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
      });
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Waiting List</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-3xl font-bold text-primary">{summary.total}</p>
          <p className="text-sm text-muted-foreground">Active waiting list entries</p>
        </div>
        {summary.byDate.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <p className="text-sm font-medium">Top dates:</p>
            {summary.byDate.map((item) => (
              <div key={item.date} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
