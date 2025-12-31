import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Users, Calendar, MessageSquare, UserCheck, Plus, Upload, X, Image as ImageIcon, Video, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon } from "lucide-react";
import { Instagram } from "lucide-react";
import type { User, Event, Post, CheckIn } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";

export default function ChurchAdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");

  const shareToSocialMedia = (postUrl: string, platform: string, content: string) => {
    const text = encodeURIComponent(content);
    const url = encodeURIComponent(postUrl);
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      instagram: `https://www.instagram.com/`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };

    if (platform === 'instagram') {
      navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied for Instagram!",
        description: "Paste this link in your Instagram bio or story",
      });
      window.open(shareUrls[platform], '_blank');
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const copyPostLink = (postUrl: string) => {
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    });
  };

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "church_admin")) {
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

  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/members"],
    enabled: !!user && user.role === "church_admin",
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user && user.role === "church_admin",
  });

  const { data: recentCheckIns = [] } = useQuery<CheckIn[]>({
    queryKey: ["/api/check-ins/recent"],
    enabled: !!user && user.role === "church_admin",
  });

  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/posts/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      const postUrl = `${window.location.origin}/post/${newPost.id}`;
      
      toast({
        title: "Post created! Share it now",
        description: "Click to share on social media",
        action: (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'facebook', postTitle)}>
              <Facebook className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'twitter', postTitle)}>
              <Twitter className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'instagram', postTitle)}>
              <Instagram className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'linkedin', postTitle)}>
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => copyPostLink(postUrl)}>
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      });
      
      setIsCreatePostOpen(false);
      setPostTitle("");
      setPostContent("");
      setSelectedMedia(null);
      setMediaPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        description: "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    const formData = new FormData();
    formData.append("title", postTitle);
    formData.append("content", postContent);
    if (selectedMedia) {
      formData.append("media", selectedMedia);
    }
    createPostMutation.mutate(formData);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const upcomingEvents = events.filter(
    (e) => new Date(e.startTime) > new Date()
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your church community
          </p>
        </div>
        <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreatePostOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>
                Share an update with the community.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Enter post title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-content">Content</Label>
                <Textarea
                  id="post-content"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your truth..."
                  rows={4}
                />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Photo or Video (Optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
                {!selectedMedia ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image or Video
                  </Button>
                ) : (
                  <div className="relative">
                    <div className="border rounded-lg p-2">
                      {selectedMedia.type.startsWith('video/') ? (
                        <div className="flex items-center gap-2">
                          <Video className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm">{selectedMedia.name}</span>
                        </div>
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0"
                      onClick={() => {
                        setSelectedMedia(null);
                        setMediaPreview("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreatePost}
                disabled={!postTitle || !postContent || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? "Creating..." : "Create Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-members">
              {members.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-events">
              {upcomingEvents.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-checkins-today">
              {recentCheckIns.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-channels">
              3
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild className="h-auto py-4 flex-col gap-2" data-testid="button-add-member">
              <Link href="/members/new">
                <Plus className="h-5 w-5" />
                <span>Add Member</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4 flex-col gap-2" variant="outline" data-testid="button-create-event">
              <Link href="/events/new">
                <Plus className="h-5 w-5" />
                <span>Create Event</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4 flex-col gap-2" variant="outline" data-testid="button-new-announcement">
              <Link href="/posts/new">
                <Plus className="h-5 w-5" />
                <span>New Announcement</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-4 flex-col gap-2" variant="outline" data-testid="button-view-reports">
              <Link href="/reports">
                <Users className="h-5 w-5" />
                <span>View Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-events">
              <Link href="/events">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg hover-elevate transition-shadow duration-200"
                  data-testid={`card-event-${event.id}`}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-1">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {event.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startTime).toLocaleDateString()} at{" "}
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Check-ins */}
      {recentCheckIns.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Check-ins
            </CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-checkins">
              <Link href="/check-ins">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCheckIns.slice(0, 5).map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                  data-testid={`checkin-${checkIn.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Member checked in</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(checkIn.checkInTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}