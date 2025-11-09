import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, CheckCircle, Clock } from "lucide-react";
import type { CheckIn } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function CheckInPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");

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

  const { data: checkIns = [], isLoading } = useQuery<CheckIn[]>({
    queryKey: ["/api/check-ins/my-history"],
    enabled: !!user,
  });

  const checkInMutation = useMutation({
    mutationFn: async (notes: string) => {
      await apiRequest("POST", "/api/check-ins", { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins/my-history"] });
      toast({
        title: "Success",
        description: "Checked in successfully!",
      });
      setNotes("");
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
        description: "Failed to check in",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const todayCheckIns = checkIns.filter((c) => {
    const checkInDate = new Date(c.checkInTime);
    const today = new Date();
    return (
      checkInDate.toDateString() === today.toDateString()
    );
  });

  const hasCheckedInToday = todayCheckIns.length > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Check In
          </h1>
          <p className="text-muted-foreground">
            Mark your attendance and connect with the community
          </p>
        </div>

        {/* Check-in Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              {hasCheckedInToday ? "Checked In Today!" : "Check In Now"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasCheckedInToday ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-semibold text-foreground mb-2">
                  Welcome Back!
                </h3>
                <p className="text-muted-foreground">
                  You checked in today at{" "}
                  {new Date(todayCheckIns[0].checkInTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Ready to join us? Check in to mark your attendance.
                </p>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notes (Optional)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any prayer requests or notes?"
                    rows={3}
                    data-testid="textarea-checkin-notes"
                  />
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => checkInMutation.mutate(notes)}
                  disabled={checkInMutation.isPending}
                  data-testid="button-checkin"
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  {checkInMutation.isPending ? "Checking In..." : "Check In"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Check-in History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Check-in History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : checkIns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No check-ins yet
              </p>
            ) : (
              <div className="space-y-3">
                {checkIns.slice(0, 10).map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-start justify-between p-4 border border-border rounded-lg"
                    data-testid={`checkin-history-${checkIn.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">
                          {new Date(checkIn.checkInTime).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(checkIn.checkInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {checkIn.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {checkIn.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        {checkIns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{checkIns.length}</p>
                  <p className="text-sm text-muted-foreground">Total Check-ins</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round((checkIns.length / 52) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Yearly Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
