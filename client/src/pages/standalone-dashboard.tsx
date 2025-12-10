import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, Plus, Search, Home, Calendar, MessageSquare, 
  Settings, Bell, Heart, Share2, Bookmark, TrendingUp,
  Sparkles, Globe, ArrowRight, Image, Video, X, Upload,
  Facebook, Twitter, Instagram, Link as LinkIcon, Copy
} from "lucide-react";
import { useFirebaseAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  authorId: string;
  createdAt: string;
  author?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

export default function StandaloneDashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, setLocation] = useLocation();
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/standalone-posts"],
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; imageUrl?: string; videoUrl?: string }) => {
      return await apiRequest("POST", "/api/standalone-posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/standalone-posts"] });
      setNewPostContent("");
      setNewPostTitle("");
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({
        title: "Posted!",
        description: "Your post has been shared with the community.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file under 50MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast({
        title: "Content required",
        description: "Please write something to share.",
        variant: "destructive",
      });
      return;
    }

    let imageUrl: string | undefined;
    let videoUrl: string | undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("category", "post");

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        const mediaFile = await response.json();

        if (selectedFile.type.startsWith("video/")) {
          videoUrl = mediaFile.fileUrl;
        } else {
          imageUrl = mediaFile.fileUrl;
        }
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to upload media. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    createPostMutation.mutate({
      title: newPostTitle || "Untitled Post",
      content: newPostContent,
      imageUrl,
      videoUrl,
    });
  };

  const handleShare = (post: Post) => {
    setSelectedPostForShare(post);
    setShowShareModal(true);
  };

  const shareToSocialMedia = (platform: string) => {
    if (!selectedPostForShare) return;
    
    const postUrl = `${window.location.origin}/post/${selectedPostForShare.id}`;
    const text = encodeURIComponent(selectedPostForShare.content.substring(0, 100));
    const url = encodeURIComponent(postUrl);

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      instagram: `https://www.instagram.com/`,
    };

    if (platform === "instagram") {
      navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied for Instagram!",
        description: "Paste this link in your Instagram bio or story.",
      });
    }

    window.open(shareUrls[platform], "_blank", "width=600,height=400");
  };

  const copyPostLink = () => {
    if (!selectedPostForShare) return;
    const postUrl = `${window.location.origin}/post/${selectedPostForShare.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "Link copied",
      description: "Post link has been copied to clipboard.",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    });
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
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user?.profileImageUrl ?? undefined} />
                    <AvatarFallback>
                      {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Post title (optional)"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="font-medium"
                      data-testid="input-post-title"
                    />
                    <Textarea 
                      placeholder="Share something with the community..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="min-h-[80px] resize-none"
                      data-testid="input-new-post"
                    />

                    {previewUrl && (
                      <div className="relative rounded-lg overflow-hidden border">
                        {selectedFile?.type.startsWith("video/") ? (
                          <video src={previewUrl} controls className="max-h-64 w-full object-cover" />
                        ) : (
                          <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-cover" />
                        )}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeFile}
                          data-testid="button-remove-media"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="media-upload"
                          data-testid="input-media"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                          data-testid="button-add-image"
                        >
                          <Image className="h-4 w-4" />
                          <span className="hidden sm:inline">Image</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                          data-testid="button-add-video"
                        >
                          <Video className="h-4 w-4" />
                          <span className="hidden sm:inline">Video</span>
                        </Button>
                      </div>
                      <Button 
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim() || isUploading || createPostMutation.isPending}
                        data-testid="button-post"
                      >
                        {isUploading ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-pulse" />
                            Uploading...
                          </>
                        ) : createPostMutation.isPending ? (
                          "Posting..."
                        ) : (
                          "Post"
                        )}
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
                {postsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : posts.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Your feed is empty</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first post above, or join organizations to see posts from communities.
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
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="hover-elevate" data-testid={`post-card-${post.id}`}>
                      {(post.imageUrl || post.videoUrl) && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                          {post.videoUrl ? (
                            <video
                              src={post.videoUrl}
                              controls
                              className="w-full h-full object-cover"
                              data-testid={`video-${post.id}`}
                            />
                          ) : post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="w-full h-full object-cover"
                              data-testid={`image-${post.id}`}
                            />
                          ) : null}
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.author?.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(post.author?.firstName, post.author?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">
                              {post.author?.firstName} {post.author?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {post.title && post.title !== "Untitled Post" && (
                          <h3 className="font-semibold text-lg">{post.title}</h3>
                        )}
                        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-like-${post.id}`}>
                            <Heart className="h-4 w-4" />
                            <span className="text-xs">Like</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-comment-${post.id}`}>
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs">Comment</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => handleShare(post)}
                            data-testid={`button-share-${post.id}`}
                          >
                            <Share2 className="h-4 w-4" />
                            <span className="text-xs">Share</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 ml-auto" data-testid={`button-bookmark-${post.id}`}>
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
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

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share This Post</DialogTitle>
            <DialogDescription>
              Share to social media or copy the link
            </DialogDescription>
          </DialogHeader>

          {selectedPostForShare && (
            <div className="space-y-4">
              <Card className="bg-muted">
                <CardContent className="p-4">
                  {selectedPostForShare.imageUrl && (
                    <img
                      src={selectedPostForShare.imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  {selectedPostForShare.videoUrl && (
                    <video 
                      src={selectedPostForShare.videoUrl} 
                      className="w-full h-32 object-cover rounded mb-2" 
                    />
                  )}
                  <h4 className="font-semibold text-sm text-foreground">{selectedPostForShare.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{selectedPostForShare.content}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => shareToSocialMedia("facebook")}
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
                <Button
                  onClick={() => shareToSocialMedia("twitter")}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-twitter"
                >
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Button>
                <Button
                  onClick={() => shareToSocialMedia("instagram")}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-instagram"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Button>
                <Button
                  onClick={copyPostLink}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                  data-testid="button-copy-link"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShareModal(false)}
              data-testid="button-close-share"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
