import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Award, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const LoyaltyPoints = ({ userId }) => {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyPoints();

    // Real-time subscription for points updates
    const channel = supabase
      .channel('loyalty-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loyalty_points',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            setLoyalty(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchLoyaltyPoints = async () => {
    const { data } = await supabase
      .from('loyalty_points')
      .select('total_points, lifetime_points')
      .eq('user_id', userId)
      .maybeSingle();

    setLoyalty(data);
    setLoading(false);
  };

  if (loading) return null;

  const pointsToNextReward = 100;
  const progress = loyalty ? (loyalty.total_points % pointsToNextReward) : 0;
  const progressPercent = (progress / pointsToNextReward) * 100;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Loyalty Rewards</h3>
          <p className="text-sm text-muted-foreground">Earn points with every visit</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-3xl font-bold text-primary">
              {loyalty?.total_points || 0}
            </p>
            <p className="text-sm text-muted-foreground">Available Points</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm">Lifetime</p>
            </div>
            <p className="text-xl font-semibold">{loyalty?.lifetime_points || 0}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next reward</span>
            <span className="font-medium">{progress}/{pointsToNextReward} pts</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            💡 Earn 1 point per dollar spent on services and beverages
          </p>
        </div>
      </div>
    </Card>
  );
};
