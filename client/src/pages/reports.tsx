import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import type { User, Event, CheckIn } from "@shared/schema";

export default function Reports() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/members"],
    enabled: !!user,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user,
  });

  const { data: checkIns = [] } = useQuery<CheckIn[]>({
    queryKey: ["/api/check-ins/recent"],
    enabled: !!user,
  });

  // Process check-in data by week
  const weeklyCheckIns = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (4 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = checkIns.filter(c => {
      const checkInDate = new Date(c.createdAt);
      return checkInDate >= weekStart && checkInDate <= weekEnd;
    }).length;

    return {
      week: `Week ${i + 1}`,
      checkIns: count,
    };
  });

  // Member distribution by role
  const roleDistribution = [
    { name: "Church Admins", value: members.filter(m => m.role === "church_admin").length },
    { name: "Members", value: members.filter(m => m.role === "member").length },
  ];

  const COLORS = ["#8b5cf6", "#ec4899"];

  // Event statistics
  const upcomingEvents = events.filter(e => new Date(e.startTime) > new Date()).length;
  const pastEvents = events.filter(e => new Date(e.startTime) <= new Date()).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Community Reports</h1>
        <p className="text-muted-foreground mt-1">Analytics and insights for your church community</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-members">
              {members.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-events">
              {events.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-checkins">
              {checkIns.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-attendance">
              {events.length > 0 ? Math.round(checkIns.length / events.length) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Check-ins Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyCheckIns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="checkIns" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Member Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Event Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Event Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Upcoming Events</h3>
              <p className="text-3xl font-bold" data-testid="text-upcoming-events">{upcomingEvents}</p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed Events</h3>
              <p className="text-3xl font-bold" data-testid="text-completed-events">{pastEvents}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
