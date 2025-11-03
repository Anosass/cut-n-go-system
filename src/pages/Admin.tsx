import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign, 
  TrendingUp,
  User as UserIcon,
  Clock
} from "lucide-react";

interface Stats {
  totalAppointments: number;
  todayAppointments: number;
  totalCustomers: number;
  totalRevenue: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  profiles: { full_name: string };
  services: { name: string; price: number };
  barbers: { name: string } | null;
}

const Admin = () => {
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    todayAppointments: 0,
    totalCustomers: 0,
    totalRevenue: 0
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, []);

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
    // Fetch appointments with customer details
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(`
        *,
        services (name, price),
        barbers (name)
      `)
      .order('appointment_date', { ascending: false });
    
    // Fetch profiles separately
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (appointmentsData && profilesData) {
      // Merge profiles data
      const enrichedAppointments = appointmentsData.map(apt => ({
        ...apt,
        profiles: profilesData.find(p => p.id === apt.customer_id) || { full_name: 'Unknown' }
      }));
      
      setAppointments(enrichedAppointments as any);
      
      const today = new Date().toISOString().split('T')[0];
      const todayCount = appointmentsData.filter(
        apt => apt.appointment_date === today && apt.status !== 'cancelled'
      ).length;

      const revenue = appointmentsData
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + Number(apt.services.price), 0);

      setStats({
        totalAppointments: appointmentsData.length,
        todayAppointments: todayCount,
        totalCustomers: new Set(appointmentsData.map(apt => apt.customer_id)).size,
        totalRevenue: revenue
      });
    }

    setLoading(false);
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

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (!error) {
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          </div>

          {/* Appointments Management */}
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
        </div>
      </div>
    </div>
  );
};

export default Admin;