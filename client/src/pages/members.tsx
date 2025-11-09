import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import type { User } from "@shared/schema";
import { useState } from "react";

export default function Members() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user?.role !== "church_admin" && user?.role !== "member"))) {
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

  const { data: members = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/members"],
    enabled: !!user && (user.role === "church_admin" || user.role === "member"),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
    const email = (member.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
          Members
        </h1>
        <p className="text-muted-foreground">
          Church community members directory
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or email..."
              className="pl-10"
              data-testid="input-search-members"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "No members found" : "No members yet"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover-elevate transition-shadow duration-200"
                  data-testid={`card-member-${member.id}`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={member.profileImageUrl || undefined}
                      alt={`${member.firstName} ${member.lastName}`}
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {member.firstName?.[0]}
                      {member.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.email}
                    </p>
                    <Badge
                      variant={member.role === "church_admin" ? "default" : "secondary"}
                      className="text-xs mt-1"
                    >
                      {member.role === "church_admin" ? "Admin" : "Member"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
