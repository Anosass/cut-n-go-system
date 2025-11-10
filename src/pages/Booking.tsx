import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Calendar as CalendarIcon, Clock, User as UserIcon, CheckCircle, XCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
}

const Booking = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableBarbers, setAvailableBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [fullyBookedSlots, setFullyBookedSlots] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30"
  ];

  useEffect(() => {
    checkUser();
    fetchServices();
    fetchBarbers();
    
    // Pre-select service if coming from services page
    if (location.state?.serviceId) {
      setSelectedService(location.state.serviceId);
    }
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      fetchAvailableBarbers();
    } else if (selectedDate) {
      fetchBookedSlotsForDate();
    }
  }, [selectedDate, selectedTime, barbers]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please login to book an appointment",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes, category')
      .eq('is_active', true)
      .neq('category', 'Beverages') // Exclude beverages from appointment booking
      .order('name');
    
    if (data) setServices(data);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (data) setBarbers(data);
  };

  const fetchBookedSlotsForDate = async () => {
    if (!selectedDate) return;

    const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_time, barber_id')
      .eq('appointment_date', appointmentDate)
      .neq('status', 'cancelled');

    if (!appointments) return;

    // Track which time slots have bookings
    const booked = new Set<string>();
    const fullyBooked = new Set<string>();

    // Count bookings per time slot
    const bookingCounts = new Map<string, number>();
    appointments.forEach(apt => {
      booked.add(apt.appointment_time);
      const count = bookingCounts.get(apt.appointment_time) || 0;
      bookingCounts.set(apt.appointment_time, count + 1);
    });

    // Mark slots as fully booked if all barbers are taken
    bookingCounts.forEach((count, time) => {
      if (count >= barbers.length) {
        fullyBooked.add(time);
      }
    });

    setBookedSlots(booked);
    setFullyBookedSlots(fullyBooked);
  };

  const fetchAvailableBarbers = async () => {
    if (!selectedDate || !selectedTime) {
      setAvailableBarbers(barbers);
      return;
    }

    const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('barber_id')
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', selectedTime)
      .neq('status', 'cancelled');

    if (!bookedAppointments) {
      setAvailableBarbers(barbers);
      return;
    }

    const bookedBarberIds = new Set(
      bookedAppointments
        .filter(apt => apt.barber_id)
        .map(apt => apt.barber_id)
    );

    const available = barbers.filter(barber => !bookedBarberIds.has(barber.id));
    setAvailableBarbers(available);
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Check for time conflicts
    const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
    const barberId = selectedBarber === 'any' ? null : selectedBarber;

    // Query for existing appointments at the same time
    const conflictQuery = supabase
      .from('appointments')
      .select('id, barber_id')
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', selectedTime)
      .neq('status', 'cancelled');

    const { data: conflicts } = await conflictQuery;

    // If a specific barber is selected, check if that barber has a conflict
    if (barberId && conflicts && conflicts.length > 0) {
      const barberConflict = conflicts.find(apt => apt.barber_id === barberId);
      if (barberConflict) {
        setLoading(false);
        toast({
          title: "Time slot unavailable",
          description: "This barber is already booked at this time. Please choose a different time or barber.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // If no specific barber selected, check if ALL barbers are booked
    if (!barberId && conflicts && conflicts.length >= barbers.length) {
      setLoading(false);
      toast({
        title: "Time slot unavailable",
        description: "All barbers are booked at this time. Please choose a different time.",
        variant: "destructive",
      });
      return;
    }

    // Proceed with booking if no conflicts
    const { error } = await supabase
      .from('appointments')
      .insert({
        customer_id: user.id,
        service_id: selectedService,
        barber_id: barberId,
        appointment_date: appointmentDate,
        appointment_time: selectedTime,
        notes: notes,
        status: 'pending'
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Your appointment has been booked successfully",
      });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8 animate-fade-up">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Book Your Appointment
            </h1>
            <p className="text-muted-foreground">Choose your service, barber, and preferred time</p>
          </div>

          <Card className="p-8 animate-scale-in">
            <div className="space-y-6">
              {/* Service Selection */}
              <div className="space-y-2">
                <Label>Select Service *</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Select Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label>Select Time *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => {
                    const isFullyBooked = fullyBookedSlots.has(time);
                    const hasBookings = bookedSlots.has(time);
                    const isSelected = selectedTime === time;

                    return (
                      <Button
                        key={time}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={`flex flex-col items-center justify-center h-auto py-3 ${
                          isFullyBooked 
                            ? 'opacity-50 cursor-not-allowed bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/10' 
                            : hasBookings
                            ? 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10'
                            : 'border-green-500/50 bg-green-500/5 hover:bg-green-500/10'
                        }`}
                        disabled={isFullyBooked}
                        onClick={() => setSelectedTime(time)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isFullyBooked ? (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span className="text-xs">Full</span>
                            </>
                          ) : hasBookings ? (
                            <>
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-amber-500 text-amber-600">
                                Limited
                              </Badge>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600">Open</span>
                            </>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Barber Selection */}
              <div className="space-y-2">
                <Label>
                  Select Barber {selectedTime && availableBarbers.length > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({availableBarbers.length} available)
                    </span>
                  )}
                </Label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      selectedTime && availableBarbers.length === 0 
                        ? "No barbers available at this time" 
                        : "Any available barber"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedTime || availableBarbers.length > 0 ? (
                      <SelectItem value="any">Any available barber</SelectItem>
                    ) : null}
                    {(selectedTime ? availableBarbers : barbers).map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          {barber.name}
                          {selectedTime && availableBarbers.some(b => b.id === barber.id) && (
                            <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Any special requests or preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleBooking} 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Booking;