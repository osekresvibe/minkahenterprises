import { Button } from "@/components/ui/button";
import { Building2, Home, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

interface AppHeaderProps {
  title?: string;
  showBackHome?: boolean;
}

export function AppHeader({ title, showBackHome = true }: AppHeaderProps) {
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

  const getHomeUrl = () => {
    if (!user) return "/";
    if (user.role === "super_admin") return "/admin";
    if (user.role === "church_admin" && user.churchId) return "/dashboard";
    if (user.churchId) return "/";
    return "/"; // Standalone users go to standalone dashboard
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <Link href={getHomeUrl()} data-testid="link-home">
              <div className="flex items-center gap-2 hover-elevate rounded-lg p-1 -m-1 cursor-pointer">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-serif font-semibold text-foreground hidden sm:inline">
                  MinkahEnterprises
                </span>
              </div>
            </Link>
            {title && (
              <>
                <span className="text-muted-foreground hidden sm:inline">/</span>
                <span className="font-medium text-foreground truncate">{title}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showBackHome && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(getHomeUrl())}
                data-testid="button-home"
              >
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/profile")}
              data-testid="button-profile"
            >
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
