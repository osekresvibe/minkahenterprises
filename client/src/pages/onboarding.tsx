
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserPlus, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-4xl font-semibold text-foreground">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-lg text-muted-foreground">
            How would you like to get started?
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/register-church")}>
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Register an Organization</CardTitle>
              <CardDescription className="text-base">
                Create a new church, nonprofit, or community organization
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Perfect if you want to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Manage members and ministry teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Create events and posts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Build your community platform</span>
                </li>
              </ul>
              <Button className="w-full" size="lg">
                Register Organization
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/browse-organizations")}>
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl">Browse Organizations</CardTitle>
              <CardDescription className="text-base">
                Explore and request to join existing organizations
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You'll be able to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Discover organizations near you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>View organization details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Request to join instantly</span>
                </li>
              </ul>
              <Button className="w-full" size="lg" variant="secondary">
                Browse Now
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Wait for Invite</CardTitle>
              <CardDescription className="text-base">
                Join using an invitation link from an admin
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You'll be able to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Join once your admin sends an invite</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Access events and community feed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Connect with other members</span>
                </li>
              </ul>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <UserPlus className="h-4 w-4 inline mr-2" />
                  Ask your organization admin to send you an invitation link
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an invitation link? Click it to join directly.
        </p>
      </div>
    </div>
  );
}
