import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Image, Video, X, Share2, Facebook, Instagram, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PostFormData {
  title: string;
  content: string;
}

export default function MemberFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lastUploadedImageUrl, setLastUploadedImageUrl] = useState<string | undefined>(undefined);
  const [lastCreatedPostId, setLastCreatedPostId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const form = useForm<PostFormData>({
    defaultValues: {
      title: "",
      content: "",
    },
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
    onSuccess: (newPost: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-posts"] });
      setLastCreatedPostId(newPost.id);
      setShowShareModal(true);
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setLastUploadedImageUrl(undefined);
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
        imageUrl = mediaFile.fileUrl;
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

  const handleShareToSocial = (platform: "facebook" | "instagram") => {
    if (!lastCreatedPostId) return;

    const postUrl = `${window.location.origin}/feed-post/${lastCreatedPostId}`;
    const title = form.getValues("title");
    const content = form.getValues("content");
    const text = encodeURIComponent(`${title}\n${content}`);
    const url = encodeURIComponent(postUrl);

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      instagram: `https://www.instagram.com/`,
    };

    if (platform === "instagram") {
      navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied for Instagram!",
        description: "Open Instagram and share the link",
      });
    }

    window.open(shareUrls[platform], "_blank", "width=600,height=400");
  };

  const shareDirectToSocial = async (platform: "facebook" | "instagram") => {
    if (!lastCreatedPostId) return;

    const title = form.getValues("title");
    const content = form.getValues("content");

    try {
      const response = await apiRequest("POST", "/api/share-to-social", {
        postId: lastCreatedPostId,
        platform,
        title,
        content,
        imageUrl: lastUploadedImageUrl,
      });

      toast({
        title: "Success",
        description: `Post shared to ${platform}!`,
      });
      setShowShareModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to share to ${platform}. Try using the regular share button.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">Share with Your Community</h1>
            <p className="text-muted-foreground">Post updates and share directly to social media</p>
          </div>
        </div>

        {/* Create Post Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create a Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Post Title</label>
                <Input
                  {...form.register("title", { required: true })}
                  placeholder="What's on your mind?"
                  data-testid="input-post-title"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Content</label>
                <Textarea
                  {...form.register("content", { required: true })}
                  placeholder="Share your thoughts, updates, or news..."
                  rows={5}
                  data-testid="input-post-content"
                />
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
                          <video src={previewUrl} className="max-h-64 mx-auto" />
                        ) : (
                          <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto" />
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
                        {selectedFile?.type.startsWith("image/") ? (
                          <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                        ) : (
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        )}
                        <p className="text-sm font-medium">Click to upload image or video</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF, MP4, WebM up to 100MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={createPostMutation.isPending || uploadingMedia}
                  data-testid="button-post"
                  className="flex-1"
                >
                  {createPostMutation.isPending || uploadingMedia ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Post</DialogTitle>
            <DialogDescription>
              Share your post directly to Instagram or Facebook without downloading
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Choose how you'd like to share your post:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => shareDirectToSocial("facebook")}
                className="flex items-center justify-center gap-2"
                data-testid="button-share-facebook-direct"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>

              <Button
                onClick={() => shareDirectToSocial("instagram")}
                variant="outline"
                className="flex items-center justify-center gap-2"
                data-testid="button-share-instagram-direct"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Or use regular sharing:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleShareToSocial("facebook")}
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="h-4 w-4" />
                  Share Link
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleShareToSocial("instagram")}
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-instagram"
                >
                  <Instagram className="h-4 w-4" />
                  Share Link
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)} data-testid="button-close-share">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
