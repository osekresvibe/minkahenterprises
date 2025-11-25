import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Image, Video, X, Facebook, Instagram, ArrowLeft, Share2, Heart, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

interface PostFormData {
  title: string;
  content: string;
}

interface PostWithAuthor extends Post {
  author?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  } | null;
}

export default function MemberFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lastUploadedImageUrl, setLastUploadedImageUrl] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(null);

  const form = useForm<PostFormData>({
    defaultValues: {
      title: "",
      content: "",
    },
  });

  // Fetch all posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts"],
    enabled: !!(user && user.churchId),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData & { imageUrl?: string }) => {
      return await apiRequest("POST", "/api/member-posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member-posts"] });
      setShowCreateModal(false);
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setLastUploadedImageUrl(undefined);
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: PostFormData) => {
    let imageUrl = lastUploadedImageUrl;

    if (selectedFile && !imageUrl) {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append("media", selectedFile);
      formData.append("title", data.title);
      formData.append("content", data.content);

      try {
        const response = await fetch("/api/member-posts/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const mediaFile = await response.json();
        imageUrl = mediaFile.imageUrl || mediaFile.videoUrl;
        setLastUploadedImageUrl(imageUrl);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to upload media file",
          variant: "destructive",
        });
        setUploadingMedia(false);
        return;
      }
      setUploadingMedia(false);
    }

    createPostMutation.mutate({ ...data, imageUrl: imageUrl || undefined });
  };

  const openShareModal = (post: Post) => {
    setSelectedPostForShare(post);
    setShowShareModal(true);
  };

  const handleShareToSocial = (platform: "facebook" | "instagram", shareType: "feed" | "story") => {
    if (!selectedPostForShare) return;

    const postUrl = `${window.location.origin}/feed-post/${selectedPostForShare.id}`;
    const title = selectedPostForShare.title;
    const content = selectedPostForShare.content;
    const text = encodeURIComponent(`${title}\n${content}`);
    const url = encodeURIComponent(postUrl);

    if (platform === "facebook") {
      const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      window.open(facebookShareUrl, "_blank", "width=600,height=400");
      toast({
        title: "Facebook Share Dialog",
        description: "Choose where to share - your feed or a story!",
      });
    } else if (platform === "instagram") {
      // Copy the link to clipboard for Instagram
      navigator.clipboard.writeText(postUrl);
      
      if (shareType === "story") {
        toast({
          title: "Link copied for Instagram Story!",
          description: "Open Instagram, tap the Stories camera, and add the link to your story",
        });
      } else {
        toast({
          title: "Link copied for Instagram Feed!",
          description: "Open Instagram and create a new post, then paste the link",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-serif text-xl font-semibold text-foreground">Community Feed</h1>
                <p className="text-xs text-muted-foreground">Share updates and connect with your community</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-new-post">
              <MessageCircle className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>
      </header>

      {/* Main Feed */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (posts as PostWithAuthor[]).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No posts yet in your community</p>
              <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-post">
                Create the first post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(posts as PostWithAuthor[]).map((post: PostWithAuthor) => (
              <Card key={post.id} className="hover-elevate transition-shadow duration-200" data-testid={`post-card-${post.id}`}>
                {/* Media */}
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

                {/* Header */}
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.author?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground" data-testid={`post-author-${post.id}`}>
                              {post.author?.firstName} {post.author?.lastName}
                            </p>
                            <h3 className="font-semibold text-foreground" data-testid={`post-title-${post.id}`}>
                              {post.title}
                            </h3>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Content */}
                <CardContent className="space-y-4">
                  <p className="text-foreground whitespace-pre-wrap" data-testid={`post-content-${post.id}`}>
                    {post.content}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => openShareModal(post)}
                      data-testid={`button-share-${post.id}`}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" data-testid={`button-like-${post.id}`}>
                      <Heart className="h-4 w-4 mr-2" />
                      Like
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create a New Post</DialogTitle>
            <DialogDescription>
              Share images, videos, or updates with your community
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Post Title</label>
              <Input
                {...form.register("title", { required: "Title is required" })}
                placeholder="Give your post a title..."
                data-testid="input-post-title"
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Content</label>
              <Textarea
                {...form.register("content", { required: "Content is required" })}
                placeholder="Share your thoughts, updates, or news..."
                rows={4}
                data-testid="input-post-content"
              />
              {form.formState.errors.content && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.content.message}</p>
              )}
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Add Image or Video (Optional)</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload"
                  data-testid="input-media"
                />
                <label htmlFor="media-upload" className="cursor-pointer block">
                  {previewUrl ? (
                    <div className="relative">
                      {selectedFile?.type.startsWith("video/") ? (
                        <video src={previewUrl} className="max-h-64 mx-auto rounded" />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded" />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        data-testid="button-remove-media"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload image or video</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF, MP4, WebM up to 100MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  form.reset();
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                data-testid="button-cancel-post"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPostMutation.isPending || uploadingMedia}
                data-testid="button-publish-post"
              >
                {createPostMutation.isPending || uploadingMedia ? "Publishing..." : "Publish Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share This Post</DialogTitle>
            <DialogDescription>
              Share your post to Instagram Stories, Facebook, or other platforms
            </DialogDescription>
          </DialogHeader>

          {selectedPostForShare && (
            <div className="space-y-4">
              {/* Preview */}
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
                    <video src={selectedPostForShare.videoUrl} className="w-full h-32 object-cover rounded mb-2" />
                  )}
                  <h4 className="font-semibold text-sm text-foreground">{selectedPostForShare.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{selectedPostForShare.content}</p>
                </CardContent>
              </Card>

              {/* Share Options */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Facebook</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleShareToSocial("facebook", "feed")}
                      className="flex items-center justify-center gap-2 text-xs"
                      data-testid="button-share-facebook-feed"
                    >
                      <Facebook className="h-4 w-4" />
                      Feed
                    </Button>
                    <Button
                      onClick={() => handleShareToSocial("facebook", "story")}
                      variant="outline"
                      className="flex items-center justify-center gap-2 text-xs"
                      data-testid="button-share-facebook-story"
                    >
                      <Facebook className="h-4 w-4" />
                      Story
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Instagram</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleShareToSocial("instagram", "feed")}
                      className="flex items-center justify-center gap-2 text-xs"
                      data-testid="button-share-instagram-feed"
                    >
                      <Instagram className="h-4 w-4" />
                      Feed
                    </Button>
                    <Button
                      onClick={() => handleShareToSocial("instagram", "story")}
                      variant="outline"
                      className="flex items-center justify-center gap-2 text-xs"
                      data-testid="button-share-instagram-story"
                    >
                      <Instagram className="h-4 w-4" />
                      Story
                    </Button>
                  </div>
                </div>
              </div>

              {/* Copy Link */}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const postUrl = `${window.location.origin}/feed-post/${selectedPostForShare.id}`;
                    navigator.clipboard.writeText(postUrl);
                    toast({
                      title: "Copied",
                      description: "Post link copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-link"
                >
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
