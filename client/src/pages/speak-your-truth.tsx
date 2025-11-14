
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Video, X, Camera, MapPin, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon } from "lucide-react";
import { Instagram } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

interface TruthPostFormData {
  content: string;
  location?: string;
}

export default function SpeakYourTruth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [location, setLocation] = useState<string>("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TruthPostFormData>({
    defaultValues: {
      content: "",
      location: "",
    },
  });

  const { data: myTruthPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/truth-posts/my-posts"],
    enabled: !!user,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file",
        variant: "destructive",
      });
      return;
    }

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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
      }
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to capture photos",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setUseCamera(false);
    }
  };

  const getLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const cityState = `${data.address.city || data.address.town || data.address.village}, ${data.address.state}`;
            setLocation(cityState);
            form.setValue("location", cityState);
            toast({
              title: "Location found",
              description: cityState,
            });
          } catch (error) {
            toast({
              title: "Location error",
              description: "Could not get location details",
              variant: "destructive",
            });
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          toast({
            title: "Location access denied",
            description: "Please enable location services",
            variant: "destructive",
          });
          setGettingLocation(false);
        }
      );
    }
  };

  const shareToSocialMedia = (postUrl: string, platform: string) => {
    const text = encodeURIComponent(form.getValues("content"));
    const url = encodeURIComponent(postUrl);
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing, opens Instagram
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };

    if (platform === 'instagram') {
      // For Instagram, copy link and notify user to paste in their bio/story
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

  const createTruthPostMutation = useMutation({
    mutationFn: async (data: TruthPostFormData & { imageUrl?: string }) => {
      return await apiRequest("POST", "/api/truth-posts", data);
    },
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ["/api/truth-posts/my-posts"] });
      toast({
        title: "Success",
        description: "Truth post created successfully",
      });
      
      // Generate shareable link
      const postUrl = `${window.location.origin}/truth/${newPost.id}`;
      
      // Show share options
      toast({
        title: "Share your truth!",
        description: "Click to share on social media",
        action: (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'facebook')}>
              <Facebook className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'twitter')}>
              <Twitter className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => shareToSocialMedia(postUrl, 'instagram')}>
              <Instagram className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => copyPostLink(postUrl)}>
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      });
      
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setLocation("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create truth post",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: TruthPostFormData) => {
    let imageUrl: string | undefined;

    if (selectedFile) {
      setUploadingMedia(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', 'truth');
        formData.append('description', data.content);

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
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

    createTruthPostMutation.mutate({ ...data, imageUrl });
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
            Speak Your Truth
          </h1>
          <p className="text-muted-foreground">
            Share your journey, connect with others in new cities, and spread your faith
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create a Truth Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="content">Your Truth *</Label>
                <Textarea
                  id="content"
                  {...form.register("content", { required: true })}
                  placeholder="Share your thoughts, experiences, or testimony..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where are you posting from?"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getLocation}
                    disabled={gettingLocation}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {gettingLocation ? "Getting..." : "Get Location"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Media (Optional)</Label>
                
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo/Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </Button>
                </div>

                {useCamera && (
                  <div className="space-y-2">
                    <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2">
                      <Button type="button" onClick={capturePhoto}>
                        Capture Photo
                      </Button>
                      <Button type="button" variant="outline" onClick={stopCamera}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {previewUrl && !useCamera && (
                  <div className="relative border border-border rounded-lg overflow-hidden">
                    {selectedFile?.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-96 object-contain bg-muted" />
                    ) : (
                      <video src={previewUrl} controls className="w-full h-auto max-h-96 object-contain bg-muted" />
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
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={createTruthPostMutation.isPending || uploadingMedia}
              >
                {uploadingMedia ? "Uploading..." : createTruthPostMutation.isPending ? "Posting..." : "Share Your Truth"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold">Your Truth Posts</h2>
          {myTruthPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">You haven't shared any truth posts yet</p>
              </CardContent>
            </Card>
          ) : (
            myTruthPosts.map((post) => (
              <Card key={post.id}>
                {(post.imageUrl || post.videoUrl) && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                    {post.videoUrl ? (
                      <video src={post.videoUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={post.imageUrl!} alt={post.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const postUrl = `${window.location.origin}/truth/${post.id}`;
                        shareToSocialMedia(postUrl, 'facebook');
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{post.content}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocialMedia(`${window.location.origin}/truth/${post.id}`, 'facebook')}
                    >
                      <Facebook className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocialMedia(`${window.location.origin}/truth/${post.id}`, 'twitter')}
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocialMedia(`${window.location.origin}/truth/${post.id}`, 'instagram')}
                    >
                      <Instagram className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocialMedia(`${window.location.origin}/truth/${post.id}`, 'linkedin')}
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPostLink(`${window.location.origin}/truth/${post.id}`)}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
