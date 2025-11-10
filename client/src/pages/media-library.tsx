
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Image as ImageIcon, Video, Trash2, Edit, X } from "lucide-react";
import type { MediaFile } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function MediaLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  const { data: mediaFiles = [] } = useQuery<MediaFile[]>({
    queryKey: ["/api/media", filterType],
    queryFn: async () => {
      const params = filterType !== "all" ? `?mediaType=${filterType}` : "";
      const response = await fetch(`/api/media${params}`);
      if (!response.ok) throw new Error("Failed to fetch media");
      return response.json();
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      setIsUploadDialogOpen(false);
      resetUploadForm();
      toast({ title: "File uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      setSelectedMedia(null);
      toast({ title: "File deleted successfully" });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("tags", tags);

    uploadMutation.mutate(formData);
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setCategory("general");
    setDescription("");
    setTags("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredMedia = filterType === "all" 
    ? mediaFiles 
    : mediaFiles.filter(m => m.mediaType === filterType);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold">Media Library</h1>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Photo or Video</DialogTitle>
              <DialogDescription>
                Upload images or videos from your device or take a photo with your camera
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Upload Options */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6" />
                  Choose File
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6" />
                  Take Photo/Video
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Preview */}
              {previewUrl && (
                <div className="relative border rounded-lg overflow-hidden">
                  {selectedFile?.type.startsWith('video/') ? (
                    <video src={previewUrl} controls className="w-full max-h-96" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full max-h-96 object-contain" />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={resetUploadForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {selectedFile && (
                <>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="ministry">Ministry</SelectItem>
                        <SelectItem value="profile">Profile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="worship, praise, sunday service"
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="all">All Media</TabsTrigger>
          <TabsTrigger value="image">
            <ImageIcon className="h-4 w-4 mr-2" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="h-4 w-4 mr-2" />
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="mt-6">
          {filteredMedia.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No media files yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload photos or videos to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((media) => (
                <Card key={media.id} className="overflow-hidden group cursor-pointer hover-elevate transition-shadow">
                  <div className="relative aspect-square bg-muted">
                    {media.mediaType === 'video' ? (
                      <video
                        src={media.fileUrl}
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedMedia(media)}
                      />
                    ) : (
                      <img
                        src={media.fileUrl}
                        alt={media.fileName}
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedMedia(media)}
                      />
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(media.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {media.mediaType === 'video' && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        <Video className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{media.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(media.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Media Detail Dialog */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedMedia.fileName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMedia.mediaType === 'video' ? (
                <video src={selectedMedia.fileUrl} controls className="w-full rounded-lg" />
              ) : (
                <img src={selectedMedia.fileUrl} alt={selectedMedia.fileName} className="w-full rounded-lg" />
              )}
              {selectedMedia.description && (
                <p className="text-sm">{selectedMedia.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span> {selectedMedia.category}
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span> {(selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded:</span> {new Date(selectedMedia.createdAt).toLocaleString()}
                </div>
                {selectedMedia.tags && (
                  <div>
                    <span className="text-muted-foreground">Tags:</span> {selectedMedia.tags}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
