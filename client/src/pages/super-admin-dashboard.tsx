import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CheckCircle, Clock, Activity, MessageSquare, Calendar, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Church, ActivityLog } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function SuperAdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedChurch, setSelectedChurch] = useState<string | null>(null);

  // Redirect if not super admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "super_admin")) {
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

  const { data: churches = [], isLoading: churchesLoading } = useQuery<Church[]>({
    queryKey: ["/api/admin/churches"],
    enabled: !!user && user.role === "super_admin",
  });

  const { data: platformStats } = useQuery({
    queryKey: ["/api/admin/analytics"],
    enabled: !!user && user.role === "super_admin",
  });

  const { data: recentActivity = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity", selectedChurch],
    queryFn: async () => {
      const url = selectedChurch 
        ? `/api/admin/activity?churchId=${selectedChurch}&limit=20`
        : "/api/admin/activity?limit=20";
      return await apiRequest("GET", url);
    },
    enabled: !!user && user.role === "super_admin",
  });

  const { data: churchActivity } = useQuery({
    queryKey: ["/api/admin/churches", selectedChurch, "activity"],
    enabled: !!selectedChurch && !!user && user.role === "super_admin",
  });

  const approveMutation = useMutation({
    mutationFn: async (churchId: string) => {
      await apiRequest("POST", `/api/admin/churches/${churchId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      toast({
        title: "Success",
        description: "Church approved successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve church",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (churchId: string) => {
      await apiRequest("POST", `/api/admin/churches/${churchId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/churches"] });
      toast({
        title: "Success",
        description: "Church rejected",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reject church",
        variant: "destructive",
      });
    },
  });

  if (authLoading || churchesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingChurches = churches.filter((c) => c.status === "pending");
  const approvedChurches = churches.filter((c) => c.status === "approved");
  const rejectedChurches = churches.filter((c) => c.status === "rejected");

  const formatActivityAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage church approvals and monitor platform activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Churches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-churches">
              {platformStats?.totalChurches || churches.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalPosts || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats?.totalEvents || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-churches">
              {pendingChurches.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingChurches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingChurches.map((church) => (
              <div
                key={church.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg"
                data-testid={`card-church-${church.id}`}
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground">{church.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {church.description}
                  </p>
                  {church.email && (
                    <p className="text-sm text-muted-foreground mt-1">{church.email}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(church.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-${church.id}`}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(church.id)}
                    disabled={rejectMutation.isPending}
                    data-testid={`button-reject-${church.id}`}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activity Monitoring and Church Management */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="activity">Platform Activity</TabsTrigger>
          <TabsTrigger value="churches">All Churches</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Platform Activity
              </CardTitle>
              {churches.length > 0 && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={selectedChurch === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChurch(null)}
                  >
                    All Churches
                  </Button>
                  {churches.map((church) => (
                    <Button
                      key={church.id}
                      variant={selectedChurch === church.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedChurch(church.id)}
                    >
                      {church.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{formatActivityAction(activity.action)}</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.entityType || 'system'}
                          </Badge>
                        </div>
                        {activity.metadata && (
                          <p className="text-sm text-muted-foreground">
                            {JSON.stringify(activity.metadata).replace(/[{}]/g, '').replace(/"/g, '').replace(/,/g, ', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                All Churches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {churches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No churches registered yet</p>
              ) : (
                <div className="space-y-2">
                  {churches.map((church) => (
                    <div
                      key={church.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                      data-testid={`list-church-${church.id}`}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-card-foreground">{church.name}</h3>
                        <p className="text-sm text-muted-foreground">{church.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            church.status === "approved"
                              ? "default"
                              : church.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          data-testid={`badge-status-${church.id}`}
                        >
                          {church.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedChurch(church.id)}
                        >
                          View Activity
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
