import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AcceptInvite() {
  const [, params] = useRoute("/accept-invite/:token");
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("POST", `/api/invitations/accept/${token}`);
      return response;
    },
    onSuccess: () => {
      setAccepted(true);
      toast({
        title: "Welcome!",
        description: "You've successfully joined the church community.",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to accept the invitation",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [authLoading, isAuthenticated, toast]);

  const handleAccept = () => {
    if (params?.token) {
      acceptMutation.mutate(params.token);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!params?.token) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>
              This invitation link is invalid. Please check your email for the correct link or contact your church administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Welcome to the Community!</CardTitle>
            </div>
            <CardDescription>
              Your invitation has been accepted. Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-serif">Church Invitation</CardTitle>
          </div>
          <CardDescription>
            You've been invited to join a church community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              <span>Invited as:</span>
            </div>
            <p className="font-medium" data-testid="text-user-email">{user?.email}</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="w-full"
              data-testid="button-accept-invitation"
            >
              {acceptMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-decline-invitation"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By accepting, you'll join this church community and gain access to events, messages, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
