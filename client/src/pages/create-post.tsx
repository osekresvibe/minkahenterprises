
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
import { Upload, Image, Video, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Post created successfully",
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

    createPostMutation.mutate({ ...data, imageUrl });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Create Post
          </h1>
          <p className="text-muted-foreground">
            Share updates and announcements with your community
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...form.register("title", { required: true })}
                placeholder="Enter post title"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                {...form.register("content", { required: true })}
                placeholder="Write your announcement..."
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
                {uploadingMedia ? "Uploading media..." : createPostMutation.isPending ? "Creating..." : "Create Post"}
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
    </div>
  );
}
