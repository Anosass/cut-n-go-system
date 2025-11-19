import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Star } from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export const AdminAnalytics = ({ appointments }) => {
  // Calculate booking trends over last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const last7Days = getLast7Days();
  const bookingTrends = last7Days.map(date => {
    const count = appointments.filter(apt => apt.appointment_date === date && apt.status !== 'cancelled').length;
    const revenue = appointments
      .filter(apt => apt.appointment_date === date && apt.status === 'completed')
      .reduce((sum, apt) => sum + Number(apt.services.price), 0);
    
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bookings: count,
      revenue: revenue
    };
  });

  // Popular services
  const serviceStats = appointments
    .filter(apt => apt.status !== 'cancelled')
    .reduce((acc, apt) => {
      const serviceName = apt.services.name;
      if (!acc[serviceName]) {
        acc[serviceName] = { name: serviceName, count: 0, revenue: 0 };
      }
      acc[serviceName].count++;
      if (apt.status === 'completed') {
        acc[serviceName].revenue += Number(apt.services.price);
      }
      return acc;
    }, {});

  const popularServicesArray = Object.values(serviceStats);
  const popularServices = popularServicesArray
    .filter(item => item && typeof item === 'object')
    .sort((a, b) => ((b).count || 0) - ((a).count || 0))
    .slice(0, 6);

  // Barber performance
  const barberStats = appointments
    .filter(apt => apt.barbers && apt.status !== 'cancelled')
    .reduce((acc, apt) => {
      const barberName = apt.barbers!.name;
      if (!acc[barberName]) {
        acc[barberName] = { name: barberName, appointments: 0, revenue: 0, completed: 0 };
      }
      acc[barberName].appointments++;
      if (apt.status === 'completed') {
        acc[barberName].completed++;
        acc[barberName].revenue += Number(apt.services.price);
      }
      return acc;
    }, {});

  const barberStatsArray = Object.values(barberStats);
  const barberPerformance = barberStatsArray
    .filter(item => item && typeof item === 'object')
    .map(barber => {
    const b = barber;
    const completionRate = ((b).appointments || 0) > 0 ? Math.round((((b).completed || 0) / ((b).appointments || 0)) * 100) : 0;
    return Object.assign({}, b, { completionRate });
  }).sort((a, b) => ((b).revenue || 0) - ((a).revenue || 0));

  // Status distribution
  const statusDistribution = appointments.reduce((acc, apt) => {
    if (!acc[apt.status]) {
      acc[apt.status] = 0;
    }
    acc[apt.status]++;
    return acc;
  }, {});

  const statusData = Object.entries(statusDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Summary stats
  const totalRevenue = appointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + Number(apt.services.price), 0);

  const avgBookingValue = appointments.filter(apt => apt.status === 'completed').length > 0
    ? totalRevenue / appointments.filter(apt => apt.status === 'completed').length
    : 0;

  const completionRate = appointments.length > 0
    ? Math.round((appointments.filter(apt => apt.status === 'completed').length / appointments.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-secondary/10">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Booking Value</p>
              <p className="text-2xl font-bold">${avgBookingValue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Star className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Booking Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Booking Trends (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={bookingTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Line type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} name="Bookings" />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--secondary))" strokeWidth={2} name="Revenue ($)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Popular Services */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Popular Services</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularServices}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Appointment Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Appointment Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Barber Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Barber Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4">Barber</th>
                <th className="text-center p-4">Total Appointments</th>
                <th className="text-center p-4">Completed</th>
                <th className="text-center p-4">Completion Rate</th>
                <th className="text-right p-4">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {barberPerformance.map((barber) => (
                <tr key={barber.name} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4 font-medium">{barber.name}</td>
                  <td className="text-center p-4">{barber.appointments}</td>
                  <td className="text-center p-4">{barber.completed}</td>
                  <td className="text-center p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      barber.completionRate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      barber.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {barber.completionRate}%
                    </span>
                  </td>
                  <td className="text-right p-4 font-semibold">${barber.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
