import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { LoyaltyPoints } from "@/components/LoyaltyPoints";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { WaitingListManager } from "@/components/WaitingListManager";
import { Calendar, Clock, User as UserIcon, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchBarbers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchAppointments(session.user.id);
    fetchProfile(session.user.id);
  };

  const fetchAppointments = async (userId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (name, price),
        barbers (name)
      `)
      .eq('customer_id', userId)
      .order('appointment_date', { ascending: false });

    if (data) {
      setAppointments(data);
    }
    setLoading(false);
  };

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setBarbers(data);
      if (data.length > 0) {
        setSelectedBarber(data[0].id); // Auto-select first barber
      }
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    if (!user || !profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  const cancelAppointment = async (appointmentId) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Appointment cancelled",
      });
      if (user) fetchAppointments(user.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const upcomingAppointments = appointments.filter(
    apt => apt.status !== 'cancelled' && apt.status !== 'completed'
  );

  const pastAppointments = appointments.filter(
    apt => apt.status === 'completed' || apt.status === 'cancelled'
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            My Dashboard
          </h1>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              {user && <LoyaltyPoints userId={user.id} />}
            </div>
            <div>
              <Card className="p-4 bg-card/50 backdrop-blur-sm">
                <Button onClick={() => navigate("/booking")} className="w-full mb-2">
                  Book New Appointment
                </Button>
                <Button onClick={() => navigate("/beverages")} variant="outline" className="w-full">
                  Order Beverages
                </Button>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="waiting-list">Waiting List</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Upcoming Appointments</h2>
                {upcomingAppointments.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No upcoming appointments</p>
                    <Button onClick={() => navigate("/booking")}>
                      Book an Appointment
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {upcomingAppointments.map((apt) => (
                      <Card key={apt.id} className="p-6 hover:shadow-[var(--shadow-gold)] transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <h3 className="text-xl font-bold">{apt.services.name}</h3>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {new Date(apt.appointment_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {apt.appointment_time}
                              </div>
                              {apt.barbers && (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4" />
                                  {apt.barbers.name}
                                </div>
                              )}
                            </div>
                            {apt.notes && (
                              <p className="text-sm text-muted-foreground">
                                Note: {apt.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            {getStatusBadge(apt.status)}
                            {apt.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelAppointment(apt.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Past Appointments</h2>
                {pastAppointments.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No past appointments</p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pastAppointments.map((apt) => (
                      <Card key={apt.id} className="p-6 opacity-75">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold">{apt.services.name}</h3>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {new Date(apt.appointment_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {apt.appointment_time}
                              </div>
                              {apt.barbers && (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4" />
                                  {apt.barbers.name}
                                </div>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(apt.status)}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="waiting-list">
              <div>
                <h2 className="text-2xl font-bold mb-4">My Waiting List</h2>
                <WaitingListManager />
              </div>
            </TabsContent>

            <TabsContent value="availability">
              <div className="space-y-4">
                <Card className="p-4 bg-card/50 backdrop-blur-sm">
                  <Label htmlFor="barber-select" className="text-base font-semibold mb-2 block">
                    Select Barber to View Availability
                  </Label>
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger id="barber-select">
                      <SelectValue placeholder="Choose a barber" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            {barber.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Card>
                
                {selectedBarber && (
                  <AvailabilityCalendar barberId={selectedBarber} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">My Profile</h2>
                {profile && (
                  <form onSubmit={updateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{user?.email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={profile.phone || ''}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          value={profile.address || ''}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button type="submit">Update Profile</Button>
                  </form>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;