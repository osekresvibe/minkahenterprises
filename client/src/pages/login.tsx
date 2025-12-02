
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/auth/firebase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          credentials: "include",
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Check if user has a church/organization assigned
          if (userData.churchId) {
            window.location.href = "/";
          } else {
            // New user without organization - go to onboarding
            window.location.href = "/onboarding";
          }
        } else {
          toast({
            title: "Login failed",
            description: "Could not authenticate with the server",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="font-serif text-3xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your church community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleLogin}
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a href="/" className="text-primary hover:underline">
                Learn more
              </a>
            </p>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              New users will be prompted to register their organization or browse existing communities after signing in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
