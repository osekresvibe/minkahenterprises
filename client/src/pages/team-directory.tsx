import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersRound, User } from "lucide-react";
import type { MinistryTeam, TeamMember } from "@shared/schema";

type TeamWithMembers = MinistryTeam & {
  members: (TeamMember & {
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      profileImageUrl?: string | null;
    };
  })[];
};

export default function TeamDirectory() {
  const { data: teams, isLoading } = useQuery<TeamWithMembers[]>({
    queryKey: ["/api/team-directory"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const sortedTeams = teams?.slice().sort((a, b) => a.name.localeCompare(b.name)) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1
          className="text-4xl font-serif font-bold text-foreground mb-2"
          data-testid="heading-team-directory"
        >
          Ministry Teams
        </h1>
        <p className="text-muted-foreground text-lg" data-testid="text-team-description">
          Discover our ministry teams and connect with those serving our community
        </p>
      </div>

      {!sortedTeams || sortedTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-teams">
              No ministry teams yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2" data-testid="grid-teams">
          {sortedTeams.map((team) => {
            const leader = team.members?.find((m) => m.role === "leader");
            const otherMembers = team.members?.filter((m) => m.role !== "leader") || [];
            
            return (
              <Card
                key={team.id}
                className="hover-elevate"
                data-testid={`card-team-${team.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle
                        className="text-xl font-serif mb-2"
                        data-testid={`text-team-name-${team.id}`}
                      >
                        {team.name}
                      </CardTitle>
                      {team.description && (
                        <CardDescription
                          className="line-clamp-2"
                          data-testid={`text-team-description-${team.id}`}
                        >
                          {team.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {leader && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Team Leader
                      </p>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={leader.user.profileImageUrl || undefined}
                            alt={`${leader.user.firstName || ''} ${leader.user.lastName || ''}`}
                          />
                          <AvatarFallback>
                            {leader.user.firstName?.[0] || leader.user.email?.[0] || '?'}
                            {leader.user.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-medium text-foreground truncate"
                            data-testid={`text-leader-name-${team.id}`}
                          >
                            {leader.user.firstName || leader.user.email} {leader.user.lastName || ''}
                          </p>
                          <Badge variant="default" className="text-xs mt-1">
                            Leader
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {otherMembers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Team Members ({otherMembers.length})
                      </p>
                      <div className="space-y-2">
                        {otherMembers.slice(0, 3).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3"
                            data-testid={`row-member-${member.id}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={member.user.profileImageUrl || undefined}
                                alt={`${member.user.firstName || ''} ${member.user.lastName || ''}`}
                              />
                              <AvatarFallback className="text-xs">
                                {member.user.firstName?.[0] || member.user.email?.[0] || '?'}
                                {member.user.lastName?.[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">
                                {member.user.firstName || member.user.email} {member.user.lastName || ''}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {member.role.replace("_", " ")}
                            </Badge>
                          </div>
                        ))}
                        {otherMembers.length > 3 && (
                          <p
                            className="text-xs text-muted-foreground pt-1"
                            data-testid={`text-more-members-${team.id}`}
                          >
                            +{otherMembers.length - 3} more member{otherMembers.length - 3 !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!team.members || team.members.length === 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <User className="h-4 w-4" />
                      <p className="text-sm">No members assigned yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
