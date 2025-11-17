import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarberGallery } from "@/components/BarberGallery";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  profiles: { full_name: string };
  services: { name: string };
}

const Barber = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barberId, setBarberId] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkBarber();
  }, []);

  const checkBarber = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: barber, error } = await supabase
      .from('barbers')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching barber:', error);
      toast({
        title: "Error",
        description: "Failed to load barber profile",
        variant: "destructive",
      });
      return;
    }

    if (!barber) {
      toast({
        title: "No Barber Profile",
        description: "You need to create your barber profile first.",
        variant: "destructive",
      });
      navigate("/barber-profile-setup");
      return;
    }

    setBarberId(barber.id);
    fetchAppointments(barber.id);
  };

  const fetchAppointments = async (barberId: string) => {
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(`*, services (name)`)
      .eq('barber_id', barberId)
      .order('appointment_date', { ascending: true });

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (appointmentsData && profilesData) {
      const enriched = appointmentsData.map(apt => ({
        ...apt,
        profiles: profilesData.find(p => p.id === apt.customer_id) || { full_name: 'Unknown' }
      }));
      setAppointments(enriched as any);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (!error) {
      toast({ title: "Status updated" });
      fetchAppointments(barberId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Barber Dashboard
          </h1>

          <Tabs defaultValue="schedule" className="space-y-6">
            <TabsList>
              <TabsTrigger value="schedule">My Schedule</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="gallery">Portfolio</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4">
              {appointments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No appointments scheduled</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <Card key={apt.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <span className="font-bold">{apt.profiles.full_name}</span>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(apt.appointment_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {apt.appointment_time}
                            </div>
                          </div>
                          <p className="text-sm">{apt.services.name}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge>{apt.status}</Badge>
                          {apt.status === 'confirmed' && (
                            <Button size="sm" onClick={() => updateStatus(apt.id, 'completed')}>
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="availability">
              {barberId && <AvailabilityCalendar barberId={barberId} />}
            </TabsContent>

            <TabsContent value="gallery">
              {barberId && <BarberGallery barberId={barberId} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Barber;
