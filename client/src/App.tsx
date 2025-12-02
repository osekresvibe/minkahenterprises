// Referenced from javascript_log_in_with_replit blueprint
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useEffect } from "react";

// Pages
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import RegisterChurch from "@/pages/register-church";
import AcceptInvite from "@/pages/accept-invite";
import BrowseOrganizations from "@/pages/browse-organizations";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import ChurchAdminDashboard from "@/pages/church-admin-dashboard";
import MemberHome from "@/pages/member-home";
import Members from "@/pages/members";
import MemberDetail from "@/pages/member-detail";
import Profile from "@/pages/profile";
import ChurchSettings from "@/pages/church-settings";
import InviteMembers from "@/pages/invite-members";
import MinistryTeams from "@/pages/ministry-teams";
import TeamDirectory from "@/pages/team-directory";
import Events from "@/pages/events";
import Messages from "@/pages/messages";
import CheckInPage from "@/pages/check-in"; // Corrected import name to match usage below
import CreatePost from "@/pages/create-post";
import MemberFeed from "@/pages/member-feed";
import PostDetail from "@/pages/post-detail";
import MediaLibrary from "@/pages/media-library";
import Reports from "@/pages/reports";
import UserProfile from "@/pages/user-profile";
import SpeakYourTruth from "@/pages/speak-your-truth";
import Channels from "@/pages/channels";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect based on user role - must be before any early returns
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    if (!user) return;

    // Super admin goes to admin dashboard
    if (user.role === "super_admin") {
      if (location !== "/admin") {
        setLocation("/admin");
      }
      return;
    }

    // Church admin goes to church admin dashboard
    if (user.role === "church_admin") {
      if (location !== "/dashboard") {
        setLocation("/dashboard");
      }
      return;
    }

    // Regular members go to member home
    if (user.role === "member" && user.churchId) {
      if (location === "/" || location === "/admin" || location === "/dashboard") {
        setLocation("/home");
      }
      return;
    }

    // New user without church or role - redirect to onboarding
    if (!user.churchId && !user.role && location === "/") {
      setLocation("/onboarding");
      return;
    }

    // User without church but has role (pending church approval)
    if (!user.churchId && location === "/") {
      // Stay on landing or redirect to onboarding
      setLocation("/onboarding");
      return;
    }
  }, [user, isAuthenticated, isLoading, location, setLocation]);

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
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/register-church" component={RegisterChurch} />
        <Route path="/browse-organizations" component={BrowseOrganizations} />
        <Route path="/accept-invite/:token?" component={AcceptInvite} />
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

  // Super Admin Layout
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
                <Route path="/members/:id" component={MemberDetail} />
                <Route path="/invite-members" component={InviteMembers} />
                <Route path="/posts/new" component={CreatePost} />
                <Route path="/feed" component={MemberFeed} />
                <Route path="/events" component={Events} />
                <Route path="/events/new" component={Events} />
                <Route path="/reports" component={Reports} />
                <Route path="/messages" component={Messages} />
                <Route path="/media" component={MediaLibrary} />
                <Route path="/ministry-teams" component={MinistryTeams} />
                <Route path="/check-ins" component={CheckInPage} />
                <Route path="/profile" component={Profile} />
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

  // Member Layout (custom nav in pages)
  return (
    <Switch>
      <Route path="/" component={MemberHome} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/feed" component={MemberFeed} />
      <Route path="/feed-post/:id" component={PostDetail} />
      <Route path="/members/:userId" component={UserProfile} />
      <Route path="/events" component={Events} />
      <Route path="/messages" component={Messages} />
      <Route path="/media" component={MediaLibrary} />
      <Route path="/check-in" component={CheckInPage} />
      <Route path="/team-directory" component={TeamDirectory} />
      <Route path="/profile" component={Profile} />
      <Route path="/accept-invite/:token" component={AcceptInvite} />
      <Route path="/speak-your-truth" component={SpeakYourTruth} />
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