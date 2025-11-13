import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, UserCheck, Heart, MessageCircle } from "lucide-react";
import type { Post, Event } from "@shared/schema";
import { Link } from "wouter";

export default function MemberHome() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "member")) {
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

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    enabled: !!user && user.role === "member",
  });

  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/upcoming"],
    enabled: !!user && user.role === "member",
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-serif font-semibold text-lg">Church Community</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild size="sm" variant="ghost" data-testid="button-messages">
                <Link href="/messages">
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" data-testid="button-profile">
                <Link href="/profile">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button asChild className="h-auto py-6 flex-col gap-2" data-testid="button-check-in-action">
                <Link href="/check-in">
                  <UserCheck className="h-6 w-6" />
                  <span>Check In</span>
                </Link>
              </Button>
              <Button asChild className="h-auto py-6 flex-col gap-2" variant="outline" data-testid="button-view-events">
                <Link href="/events">
                  <Calendar className="h-6 w-6" />
                  <span>View Events</span>
                </Link>
              </Button>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                Recent Updates
              </h2>

              {postsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : posts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No announcements yet</p>
                  </CardContent>
                </Card>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="hover-elevate transition-shadow duration-200" data-testid={`post-${post.id}`}>
                    {post.imageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {post.videoUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                        <video
                          src={post.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-card-foreground">
                              {post.title}
                            </h3>
                            {post.isPinned && (
                              <Badge variant="secondary" className="text-xs">
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-card-foreground whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Upcoming Events</h2>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border border-border rounded-lg hover-elevate transition-shadow duration-200 cursor-pointer"
                        data-testid={`event-${event.id}`}
                      >
                        <h3 className="font-semibold text-sm mb-1">{event.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.startTime).toLocaleDateString()} at{" "}
                          {new Date(event.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {upcomingEvents.length > 3 && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3"
                    data-testid="button-see-all-events"
                  >
                    <Link href="/events">See all events</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Community Info */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Community</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-join-messages"
                >
                  <Link href="/messages">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Join Conversations
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
