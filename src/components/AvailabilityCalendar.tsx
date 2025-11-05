import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export const AvailabilityCalendar = ({ barberId }: { barberId?: string }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const allTimeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30"
  ];

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability();
    }

    // Real-time subscription for appointment changes
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, barberId]);

  const fetchAvailability = async () => {
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    let query = supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');

    if (barberId) {
      query = query.eq('barber_id', barberId);
    }

    const { data: bookedAppointments } = await query;

    const bookedTimes = new Set(
      bookedAppointments?.map((apt) => apt.appointment_time) || []
    );

    const slots: TimeSlot[] = allTimeSlots.map((time) => ({
      time,
      isAvailable: !bookedTimes.has(time)
    }));

    setTimeSlots(slots);
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <h3 className="text-2xl font-bold mb-6">
        {barberId ? 'Barber Availability' : 'Shop Availability'}
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            disabled={(date) => date < new Date() || date.getDay() === 0}
            className="rounded-md border"
          />
        </div>

        <div>
          <div className="mb-4">
            <h4 className="font-semibold mb-2">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h4>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Booked</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-2">
            {loading ? (
              <p className="col-span-3 text-center text-muted-foreground py-8">
                Loading...
              </p>
            ) : (
              timeSlots.map((slot) => (
                <Badge
                  key={slot.time}
                  variant={slot.isAvailable ? "outline" : "secondary"}
                  className={`justify-center py-2 ${
                    slot.isAvailable
                      ? 'border-green-500/50 text-green-600 dark:text-green-400'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {slot.time}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
