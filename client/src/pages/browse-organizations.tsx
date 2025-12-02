import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Users, MapPin, Mail, Phone, Globe, CheckCircle } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Church } from "@shared/schema";
import { AppHeader } from "@/components/app-header";

export default function BrowseOrganizations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: organizations, isLoading } = useQuery<Church[]>({
    queryKey: ["browse-organizations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/organizations/browse");
      return await response.json();
    },
  });

  const requestJoinMutation = useMutation({
    mutationFn: async (churchId: string) => {
      const response = await apiRequest("POST", `/api/organizations/${churchId}/request-join`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "You have successfully joined the organization.",
      });
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join organization",
        variant: "destructive",
      });
    },
  });

  const filteredOrganizations = organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.organizationType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Browse Organizations" />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-4xl font-semibold text-foreground">
            Explore Organizations
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover and join organizations in your community
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, type, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-organizations"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations?.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {org.organizationType || "organization"}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{org.name}</CardTitle>
                {org.description && (
                  <CardDescription className="line-clamp-2">
                    {org.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {org.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{org.address}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {org.email && (
                    <a
                      href={`mailto:${org.email}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  )}
                  {org.phone && (
                    <a
                      href={`tel:${org.phone}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                  )}
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>

                <Button
                  onClick={() => requestJoinMutation.mutate(String(org.id))}
                  disabled={requestJoinMutation.isPending || user?.churchId === String(org.id)}
                  className="w-full"
                  data-testid={`button-request-join-${org.id}`}
                >
                  {user?.churchId === String(org.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Already a Member
                    </>
                  ) : requestJoinMutation.isPending ? (
                    "Joining..."
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Join Organization
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrganizations?.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or check back later for new organizations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
