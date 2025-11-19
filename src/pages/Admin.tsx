import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { AdminWaitingListSummary } from "@/components/AdminWaitingListSummary";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign, 
  TrendingUp,
  User as UserIcon,
  Clock,
  BarChart3
} from "lucide-react";

const Admin = () => {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    totalCustomers: 0,
    totalRevenue: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  // Real-time subscription for appointments
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          toast({
            title: "New Appointment",
            description: "A new appointment has been created",
          });
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          if (oldStatus !== newStatus) {
            toast({
              title: "Appointment Status Changed",
              description: `Status updated from ${oldStatus} to ${newStatus}`,
            });
            fetchDashboardData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    // Fetch appointments with service and barber details
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (name, price),
        barbers (name)
      `)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error fetching admin appointments:', error.message);
      setLoading(false);
      return;
    }

    if (appointmentsData && appointmentsData.length > 0) {
      // Fetch customer profiles for these appointments
      const customerIds = Array.from(
        new Set(appointmentsData.map((apt) => apt.customer_id))
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', customerIds);

      if (profilesError) {
        console.error('Error fetching profiles for admin view:', profilesError.message);
      }

      const profilesMap = new Map();
      (profilesData || []).forEach((profile) => {
        profilesMap.set(profile.id, { full_name: profile.full_name });
      });

      const enrichedAppointments = appointmentsData.map((apt) => ({
        ...apt,
        profiles: profilesMap.get(apt.customer_id) || { full_name: 'Unknown' },
      }));

      setAppointments(enrichedAppointments);

      const today = new Date().toISOString().split('T')[0];
      const todayCount = appointmentsData.filter(
        (apt) => apt.appointment_date === today && apt.status !== 'cancelled'
      ).length;

      const revenue = appointmentsData
        .filter((apt) => apt.status === 'completed')
        .reduce((sum, apt) => sum + Number(apt.services.price), 0);

      setStats({
        totalAppointments: appointmentsData.length,
        todayAppointments: todayCount,
        totalCustomers: new Set(appointmentsData.map((apt) => apt.customer_id)).size,
        totalRevenue: revenue,
      });
    } else {
      setAppointments([]);
      setStats({
        totalAppointments: 0,
        todayAppointments: 0,
        totalCustomers: 0,
        totalRevenue: 0,
      });
    }

    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (!error) {
      // If appointment was cancelled, trigger waiting list notifications
      if (newStatus === 'cancelled') {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
          try {
            await supabase.functions.invoke('notify-waiting-list', {
              body: {
                appointmentDate: appointment.appointment_date,
                appointmentTime: appointment.appointment_time,
                barberId: appointment.barber_id
              }
            });
            console.log('Waiting list notified for cancelled appointment');
          } catch (notifyError) {
            console.error('Error notifying waiting list:', notifyError);
          }
        }
      }
      fetchDashboardData();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Appointments</p>
                      <p className="text-3xl font-bold mt-2">{stats.totalAppointments}</p>
                    </div>
                    <Calendar className="h-12 w-12 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Today's Appointments</p>
                      <p className="text-3xl font-bold mt-2">{stats.todayAppointments}</p>
                    </div>
                    <Clock className="h-12 w-12 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
                    </div>
                    <Users className="h-12 w-12 text-primary opacity-50" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-3xl font-bold mt-2">${stats.totalRevenue}</p>
                    </div>
                    <DollarSign className="h-12 w-12 text-primary opacity-50" />
                  </div>
                </Card>

                <AdminWaitingListSummary />
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <AdminAnalytics appointments={appointments} />
            </TabsContent>

            <TabsContent value="appointments">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">All Appointments</h2>
            
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No appointments yet</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <Card key={apt.id} className="p-4 hover:bg-card/80 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <UserIcon className="h-5 w-5 text-primary" />
                          <span className="font-semibold">{apt.profiles.full_name}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4" />
                            {apt.services.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(apt.appointment_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {apt.appointment_time}
                          </div>
                        </div>
                        
                        {apt.barbers && (
                          <div className="text-sm text-muted-foreground">
                            Barber: {apt.barbers.name}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(apt.status)}
                        <div className="flex gap-2">
                          {apt.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          {apt.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;