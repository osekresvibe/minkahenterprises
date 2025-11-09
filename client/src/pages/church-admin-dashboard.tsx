import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, MessageSquare, UserCheck, Plus } from "lucide-react";
import type { User, Event, CheckIn } from "@shared/schema";
import { Link } from "wouter";

export default function ChurchAdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "church_admin")) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/members"],
    enabled: !!user && user.role === "church_admin",
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user && user.role === "church_admin",
  });

  const { data: recentCheckIns = [] } = useQuery<CheckIn[]>({
    queryKey: ["/api/check-ins/recent"],
    enabled: !!user && user.role === "church_admin",
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const upcomingEvents = events.filter(
    (e) => new Date(e.startTime) > new Date()
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your church community
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate transition-shadow duration-200">
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

        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-events">
              {upcomingEvents.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-checkins-today">
              {recentCheckIns.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-channels">
              3
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild className="h-auto py-4 flex-col gap-2" data-testid="button-add-member">
              <Link href="/members/new">
                <Plus className="h-5 w-5" />
                <span>Add Member</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4 flex-col gap-2" variant="outline" data-testid="button-create-event">
              <Link href="/events/new">
                <Plus className="h-5 w-5" />
                <span>Create Event</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4 flex-col gap-2" variant="outline" data-testid="button-new-announcement">
              <Link href="/posts/new">
                <Plus className="h-5 w-5" />
                <span>New Announcement</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4 flex-col gap-2" variant="outline" data-testid="button-view-reports">
              <Link href="/reports">
                <Users className="h-5 w-5" />
                <span>View Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-events">
              <Link href="/events">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg hover-elevate transition-shadow duration-200"
                  data-testid={`card-event-${event.id}`}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-1">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {event.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startTime).toLocaleDateString()} at{" "}
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Check-ins */}
      {recentCheckIns.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Check-ins
            </CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-checkins">
              <Link href="/check-ins">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCheckIns.slice(0, 5).map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                  data-testid={`checkin-${checkIn.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Member checked in</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(checkIn.checkInTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
