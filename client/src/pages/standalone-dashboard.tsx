import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, Plus, Search, Home, Calendar, MessageSquare, 
  Settings, Bell, Heart, Share2, Bookmark, TrendingUp,
  Sparkles, Globe, ArrowRight
} from "lucide-react";
import { useFirebaseAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState } from "react";

export default function StandaloneDashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, setLocation] = useLocation();
  const [newPost, setNewPost] = useState("");

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Home className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-serif font-semibold text-lg hidden sm:inline">MinkahEnterprises</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation("/profile")}
                data-testid="button-profile"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.profileImageUrl ?? undefined} />
                    <AvatarFallback>
                      {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2"
                    onClick={() => setLocation("/profile")}
                    data-testid="link-my-profile"
                  >
                    <Settings className="h-4 w-4" />
                    My Profile
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2"
                    onClick={logout}
                    data-testid="button-logout"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Get More from the Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Join or create an organization to unlock events, messaging, teams, and more!
                </p>
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => setLocation("/browse-organizations")}
                    data-testid="button-browse-organizations"
                  >
                    <Search className="h-4 w-4" />
                    Browse Organizations
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setLocation("/register-church")}
                    data-testid="button-create-organization"
                  >
                    <Plus className="h-4 w-4" />
                    Create Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.profileImageUrl ?? undefined} />
                    <AvatarFallback>
                      {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea 
                      placeholder="Share something with the community..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[80px] resize-none"
                      data-testid="input-new-post"
                    />
                    <div className="flex justify-end">
                      <Button 
                        disabled={!newPost.trim()}
                        data-testid="button-post"
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="feed" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="feed" data-testid="tab-feed">
                  <Home className="h-4 w-4 mr-2" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="discover" data-testid="tab-discover">
                  <Globe className="h-4 w-4 mr-2" />
                  Discover
                </TabsTrigger>
                <TabsTrigger value="trending" data-testid="tab-trending">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trending
                </TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Your feed is empty</h3>
                    <p className="text-muted-foreground mb-4">
                      Join organizations to see posts from communities you're part of, or check out the Discover tab to explore public content.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setLocation("/browse-organizations")}
                      data-testid="button-explore-communities"
                    >
                      Explore Communities
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discover" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/20">
                        <AvatarFallback className="bg-primary/20 text-primary">ME</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">MinkahEnterprises</p>
                        <p className="text-xs text-muted-foreground">Platform Announcement</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-foreground">
                      Welcome to MinkahEnterprises! We're building a platform where communities thrive. 
                      Whether you're part of a church, nonprofit, business, or club - we've got you covered.
                    </p>
                    <p className="text-foreground">
                      Browse existing organizations to join, or create your own community and invite members. 
                      Together, we can build something amazing!
                    </p>
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Heart className="h-4 w-4" />
                        <span className="text-xs">24</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs">5</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 ml-auto">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-accent/20">
                        <AvatarFallback className="bg-accent/20 text-accent-foreground">TIP</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">Getting Started Tips</p>
                        <p className="text-xs text-muted-foreground">Community Guide</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-foreground">
                      Here are some tips to get the most out of the platform:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">1.</span>
                        Complete your profile to help others recognize you
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">2.</span>
                        Browse organizations to find communities that match your interests
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">3.</span>
                        Or start your own organization and invite friends and family
                      </li>
                    </ul>
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Heart className="h-4 w-4" />
                        <span className="text-xs">12</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs">2</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 ml-auto">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trending" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Trending content coming soon</h3>
                    <p className="text-muted-foreground">
                      As more communities join the platform, you'll see trending posts and discussions here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Join an organization to see their upcoming events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Suggested Organizations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Find communities that match your interests
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation("/browse-organizations")}
                  data-testid="button-view-all-organizations"
                >
                  View All
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Join an organization to message other members
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
