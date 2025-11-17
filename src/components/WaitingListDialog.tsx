import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, Clock, Bell } from "lucide-react";

interface Service {
  id: string;
  name: string;
}

interface Barber {
  id: string;
  name: string;
}

interface WaitingListDialogProps {
  services: Service[];
  barbers: Barber[];
}

export const WaitingListDialog = ({ services, barbers }: WaitingListDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedBarber, setSelectedBarber] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30"
  ];

  const handleJoinWaitingList = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to join the waiting list",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if already on waiting list for this slot
    const { data: existing } = await supabase
      .from('waiting_list')
      .select('id')
      .eq('user_id', user.id)
      .eq('service_id', selectedService)
      .eq('appointment_date', format(selectedDate, 'yyyy-MM-dd'))
      .eq('appointment_time', selectedTime)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      toast({
        title: "Already on waiting list",
        description: "You're already waiting for this time slot",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('waiting_list')
      .insert({
        user_id: user.id,
        service_id: selectedService,
        barber_id: selectedBarber === 'any' ? null : selectedBarber,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        appointment_time: selectedTime,
        status: 'active'
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to join waiting list. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Added to waiting list!",
      description: "We'll notify you when this time slot becomes available.",
    });

    setOpen(false);
    setSelectedService("");
    setSelectedBarber("any");
    setSelectedDate(undefined);
    setSelectedTime("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          Join Waiting List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Join Waiting List</DialogTitle>
          <DialogDescription>
            Get notified when your desired time slot becomes available
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="waiting-service">Service</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger id="waiting-service">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waiting-time">Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger id="waiting-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waiting-barber">Barber Preference (Optional)</Label>
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger id="waiting-barber">
                <SelectValue placeholder="Any available barber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any available barber</SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleJoinWaitingList} 
            disabled={loading} 
            className="w-full"
          >
            {loading ? "Adding..." : "Join Waiting List"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
