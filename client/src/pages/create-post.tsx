
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Image, Video, X, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, Download } from "lucide-react";
import { Instagram } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { generatePostImage, downloadImage, shareImageToClipboard, type PostImageData } from "@/lib/shareImage";

interface PostFormData {
  title: string;
  content: string;
  isPinned: boolean;
}

export default function CreatePost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [shareImageData, setShareImageData] = useState<{ title: string; content: string; imageUrl?: string } | null>(null);
  const [shareImagePreview, setShareImagePreview] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lastUploadedImageUrl, setLastUploadedImageUrl] = useState<string | undefined>(undefined);

  const shareToSocialMedia = (postUrl: string, platform: string, content: string, shareType?: 'feed' | 'story' | 'reel') => {
    const text = encodeURIComponent(content);
    const url = encodeURIComponent(postUrl);
    
    if (platform === 'facebook') {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      window.open(facebookUrl, '_blank', 'width=600,height=400');
      
      if (shareType === 'story') {
        toast({
          title: "Facebook Share",
          description: "After sharing, you can also add this to your Facebook Story from your profile",
        });
      } else {
        toast({
          title: "Facebook Share",
          description: "Post will be shared to your Facebook feed",
        });
      }
    } else if (platform === 'instagram') {
      navigator.clipboard.writeText(postUrl);
      
      if (shareType === 'story') {
        toast({
          title: "Link copied for Instagram Story!",
          description: "Open Instagram app → Stories camera → Add link sticker → Paste",
        });
      } else if (shareType === 'reel') {
        toast({
          title: "Link copied for Instagram Reel!",
          description: "Open Instagram app → Create Reel → Add description → Paste link",
        });
      } else {
        toast({
          title: "Link copied for Instagram!",
          description: "Open Instagram app → Create post → Paste link in caption",
        });
      }
      
      window.open('https://www.instagram.com/', '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
    }
  };

  const copyPostLink = (postUrl: string) => {
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    });
  };

  const handleGenerateAndOpenShareModal = async (title: string, content: string, imageUrl?: string) => {
    setShareImageData({ title, content, imageUrl });
    setIsShareModalOpen(true);
    setIsGeneratingImage(true);

    try {
      const imageData: PostImageData = {
        title,
        content,
        imageUrl,
        organizationName: "Our Community",
        createdAt: new Date(),
      };

      const blob = await generatePostImage(imageData);
      const previewUrl = URL.createObjectURL(blob);
      setShareImagePreview(previewUrl);
      
      // Store blob for download
      (window as any).__shareImageBlob = blob;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share image",
        variant: "destructive",
      });
      setIsShareModalOpen(false);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = async () => {
    const blob = (window as any).__shareImageBlob;
    if (blob && shareImageData) {
      downloadImage(blob, `${shareImageData.title.replace(/\s+/g, "-")}.png`);
      toast({
        title: "Downloaded",
        description: "Image saved to your downloads folder",
      });
    }
  };

  const handleCopyImageToClipboard = async () => {
    const blob = (window as any).__shareImageBlob;
    if (blob) {
      try {
        await shareImageToClipboard(blob);
        toast({
          title: "Copied",
          description: "Image copied to clipboard, ready to paste",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to copy image. Try downloading instead",
          variant: "destructive",
        });
      }
    }
  };

  const form = useForm<PostFormData>({
    defaultValues: {
      title: "",
      content: "",
      isPinned: false,
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData & { imageUrl?: string }) => {
      return await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: (newPost: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      const postUrl = `${window.location.origin}/post/${newPost.id}`;
      const title = form.getValues('title');
      const content = form.getValues('content');
      
      toast({
        title: "Truth shared! Spread the word",
        description: "Share your truth on social media",
        action: (
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={() => handleGenerateAndOpenShareModal(title, content, lastUploadedImageUrl)}>
              <Share2 className="h-4 w-4 mr-1" />
              Share Options
            </Button>
          </div>
        ),
      });
      
      navigate("/");
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
    let imageUrl: string | undefined;

    // Upload media if selected
    if (selectedFile) {
      setUploadingMedia(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', 'post');
        formData.append('description', data.title);

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
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

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Speak Your Truth
          </h1>
          <p className="text-muted-foreground">
            Share your journey, testimony, and experiences with your community
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share Your Truth</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Give your truth a title..."
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Your Truth *</Label>
              <Textarea
                id="content"
                {...form.register("content", { required: true })}
                placeholder="Share your journey, experiences, testimony, or thoughts..."
                rows={8}
                data-testid="textarea-content"
              />
            </div>

            <div className="space-y-4">
              <Label>Media (Optional)</Label>
              
              {!selectedFile ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="media-upload"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Images or videos up to 100MB
                    </div>
                  </label>
                </div>
              ) : (
                <div className="relative border border-border rounded-lg overflow-hidden">
                  {selectedFile.type.startsWith('image/') ? (
                    <img
                      src={previewUrl!}
                      alt="Preview"
                      className="w-full h-auto max-h-96 object-contain bg-muted"
                    />
                  ) : (
                    <video
                      src={previewUrl!}
                      controls
                      className="w-full h-auto max-h-96 object-contain bg-muted"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="p-3 bg-muted border-t border-border flex items-center gap-2">
                    {selectedFile.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPinned"
                checked={form.watch("isPinned")}
                onCheckedChange={(checked) => form.setValue("isPinned", checked)}
                data-testid="switch-pinned"
              />
              <Label htmlFor="isPinned" className="cursor-pointer">
                Pin this post to the top
              </Label>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createPostMutation.isPending || uploadingMedia}
                data-testid="button-submit"
              >
                {uploadingMedia ? "Uploading media..." : createPostMutation.isPending ? "Sharing..." : "Share Your Truth"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Share Options Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Your Truth</DialogTitle>
            <DialogDescription>
              Choose how you'd like to share on social media
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Share Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Share Directly</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium mb-2">Facebook</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const postUrl = `${window.location.origin}/post/${createPostMutation.data?.id}`;
                        shareToSocialMedia(postUrl, 'facebook', shareImageData?.title || '', 'feed');
                      }}
                      className="flex-1"
                    >
                      <Facebook className="h-4 w-4 mr-1" />
                      Feed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const postUrl = `${window.location.origin}/post/${createPostMutation.data?.id}`;
                        shareToSocialMedia(postUrl, 'facebook', shareImageData?.title || '', 'story');
                      }}
                      className="flex-1"
                    >
                      Story
                    </Button>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-medium mb-2">Instagram</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const postUrl = `${window.location.origin}/post/${createPostMutation.data?.id}`;
                        shareToSocialMedia(postUrl, 'instagram', shareImageData?.content || '', 'feed');
                      }}
                      className="flex-1"
                    >
                      <Instagram className="h-4 w-4 mr-1" />
                      Post
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const postUrl = `${window.location.origin}/post/${createPostMutation.data?.id}`;
                        shareToSocialMedia(postUrl, 'instagram', shareImageData?.content || '', 'story');
                      }}
                      className="flex-1"
                    >
                      Story
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const postUrl = `${window.location.origin}/post/${createPostMutation.data?.id}`;
                      shareToSocialMedia(postUrl, 'instagram', shareImageData?.content || '', 'reel');
                    }}
                    className="w-full mt-2"
                  >
                    Reel
                  </Button>
                </div>
              </div>
            </div>

            {/* Share as Image Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Share as Image</h3>
              {isGeneratingImage ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : shareImagePreview ? (
                <div className="space-y-4">
                  <div className="border border-border rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={shareImagePreview} 
                      alt="Post preview"
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Download or copy this image to share on Instagram Stories, Reels, or any platform
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyImageToClipboard}
                      className="flex-1"
                      data-testid="button-copy-image"
                    >
                      Copy Image
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownloadImage}
                      className="flex-1"
                      data-testid="button-download-image"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsShareModalOpen(false)}
              data-testid="button-close-share"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
