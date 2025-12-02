import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Plus, Search, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function StandaloneDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-serif font-semibold text-foreground">
                MinkahEnterprises
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/profile")}
                data-testid="button-profile"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
            Welcome, {user?.firstName || "there"}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            You're signed in but not part of any organization yet. Get started by creating your own community or joining an existing one.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/register-church")}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Create Organization</CardTitle>
              <CardDescription className="text-base">
                Start your own church, nonprofit, or community
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span>
                  <span>Full control over your community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span>
                  <span>Invite members and manage teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span>
                  <span>Create events, posts, and more</span>
                </li>
              </ul>
              <Button className="w-full" size="lg" data-testid="button-create-organization">
                Get Started
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/browse-organizations")}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl">Browse Organizations</CardTitle>
              <CardDescription className="text-base">
                Explore and request to join existing communities
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span>
                  <span>Find communities near you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span>
                  <span>Request to join organizations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span>
                  <span>Connect with like-minded people</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" size="lg" data-testid="button-browse-organizations">
                Browse Communities
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-muted/50 border-dashed">
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Have an invitation?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you received an invitation link from an organization admin, click on it to join their community directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
