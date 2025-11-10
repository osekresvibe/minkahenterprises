// Referenced from javascript_log_in_with_replit blueprint
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// Pages
import Landing from "@/pages/landing";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import ChurchAdminDashboard from "@/pages/church-admin-dashboard";
import MemberHome from "@/pages/member-home";
import Events from "@/pages/events";
import Messages from "@/pages/messages";
import CheckInPage from "@/pages/check-in";
import RegisterChurch from "@/pages/register-church";
import Members from "@/pages/members";
import ChurchSettings from "@/pages/church-settings";
import InviteMembers from "@/pages/invite-members";
import AcceptInvite from "@/pages/accept-invite";
import MinistryTeams from "@/pages/ministry-teams";
import TeamDirectory from "@/pages/team-directory";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not authenticated - show public routes
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/register-church" component={RegisterChurch} />
        <Route path="/accept-invite/:token" component={AcceptInvite} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Determine role-based layout
  const isSuperAdmin = user?.role === "super_admin";
  const isChurchAdmin = user?.role === "church_admin";
  const isMember = user?.role === "member";

  // Sidebar configuration for church admins
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  // Church Admin Layout with Sidebar
  if (isChurchAdmin) {
    return (
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-4 border-b border-border bg-card">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </header>
            <main className="flex-1 overflow-auto">
              <Switch>
                <Route path="/" component={ChurchAdminDashboard} />
                <Route path="/dashboard" component={ChurchAdminDashboard} />
                <Route path="/members" component={Members} />
                <Route path="/invite-members" component={InviteMembers} />
                <Route path="/ministry-teams" component={MinistryTeams} />
                <Route path="/events" component={Events} />
                <Route path="/messages" component={Messages} />
                <Route path="/check-ins" component={CheckInPage} />
                <Route path="/settings" component={ChurchSettings} />
                <Route path="/accept-invite/:token" component={AcceptInvite} />
                <Route path="/register-church" component={RegisterChurch} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Super Admin Layout (no sidebar)
  if (isSuperAdmin) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/api/logout"}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        <Switch>
          <Route path="/" component={SuperAdminDashboard} />
          <Route path="/admin" component={SuperAdminDashboard} />
          <Route path="/admin/churches" component={SuperAdminDashboard} />
          <Route path="/admin/approvals" component={SuperAdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </>
    );
  }

  // Member Layout (custom nav in pages)
  return (
    <Switch>
      <Route path="/" component={MemberHome} />
      <Route path="/events" component={Events} />
      <Route path="/messages" component={Messages} />
      <Route path="/check-in" component={CheckInPage} />
      <Route path="/team-directory" component={TeamDirectory} />
      <Route path="/members" component={Members} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
