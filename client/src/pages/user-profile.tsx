
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin, Calendar, ArrowLeft } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useRoute, Link } from "wouter";

export default function UserProfile() {
  const { user: currentUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/members/:userId");
  const userId = params?.userId;

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (currentUser?.role !== "church_admin" && currentUser?.role !== "member"))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [currentUser, isAuthenticated, authLoading, toast]);

  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/members", userId],
    queryFn: async () => {
      const response = await fetch(`/api/members/${userId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId && !!currentUser,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/members">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
              Member Profile
            </h1>
            <p className="text-muted-foreground">
              View member details and information
            </p>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.profileImageUrl || undefined}
                  alt={`${user.firstName || ''} ${user.lastName || ''}`}
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-1">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-muted-foreground mb-2">{user.email}</p>
                <Badge
                  variant={user.role === "church_admin" ? "default" : user.role === "super_admin" ? "destructive" : "secondary"}
                >
                  {user.role === "church_admin" ? "Church Admin" : user.role === "super_admin" ? "Super Admin" : "Member"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.bio && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                <p className="mt-1 text-card-foreground">{user.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <p className="text-card-foreground">{user.email || "Not provided"}</p>
              </div>

              {user.phone && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <p className="text-card-foreground">{user.phone}</p>
                </div>
              )}

              {user.address && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <p className="text-card-foreground">{user.address}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </Label>
                <p className="text-card-foreground">
                  {new Date(user.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
