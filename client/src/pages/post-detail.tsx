import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Share2, Facebook, Instagram } from "lucide-react";
import type { Post } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function PostDetail({ params }: { params: { id?: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const postId = params.id || "";

  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) throw new Error("Post not found");
      return response.json();
    },
    enabled: postId.length > 0,
  });

  // Update meta tags for social sharing
  useEffect(() => {
    if (!post || !post.title) return;

    // Set page title
    document.title = `${post.title} | Community Feed`;

    // Remove existing meta tags
    document.querySelectorAll('meta[property^="og:"]').forEach((el) => el.remove());
    document.querySelectorAll('meta[name^="twitter:"]').forEach((el) => el.remove());

    // Add Open Graph meta tags for Facebook/social sharing
    const metaTags: Array<{ property?: string; name?: string; content: string }> = [
      { property: "og:title", content: post.title },
      { property: "og:description", content: post.content.substring(0, 160) },
      { property: "og:type", content: "article" },
      { property: "og:url", content: window.location.href },
      ...(post.imageUrl
        ? [
            { property: "og:image", content: `${window.location.origin}${post.imageUrl}` },
            { property: "og:image:type", content: "image/jpeg" },
          ]
        : []),
      { name: "twitter:card", content: post.imageUrl ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: post.title },
      { name: "twitter:description", content: post.content.substring(0, 160) },
      ...(post.imageUrl ? [{ name: "twitter:image", content: `${window.location.origin}${post.imageUrl}` }] : []),
    ];

    metaTags.forEach((tag) => {
      const meta = document.createElement("meta");
      if (tag.property) {
        meta.setAttribute("property", tag.property);
      } else if (tag.name) {
        meta.setAttribute("name", tag.name);
      }
      meta.setAttribute("content", tag.content);
      document.head.appendChild(meta);
    });
  }, [post]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-4">Post Not Found</h1>
        <Button onClick={() => navigate("/feed")}>Back to Feed</Button>
      </div>
    );
  }

  const shareToSocial = (platform: "facebook" | "instagram") => {
    const postUrl = window.location.href;
    const text = encodeURIComponent(`${post.title}\n${post.content}`);
    const url = encodeURIComponent(postUrl);

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      instagram: `https://www.instagram.com/`,
    };

    if (platform === "instagram") {
      navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied for Instagram!",
        description: "Open Instagram and share the link in your story",
      });
    }

    window.open(shareUrls[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" size="icon" onClick={() => navigate("/feed")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-serif text-lg font-semibold flex-1 text-center">Post</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="overflow-hidden">
          {/* Media */}
          {(post.imageUrl || post.videoUrl) && (
            <div className="relative aspect-video w-full overflow-hidden">
              {post.videoUrl ? (
                <video src={post.videoUrl} controls className="w-full h-full object-cover" data-testid={`video-${post.id}`} />
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

          {/* Content */}
          <CardHeader>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-foreground mb-2" data-testid={`post-title-${post.id}`}>
                  {post.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-lg text-foreground whitespace-pre-wrap leading-relaxed" data-testid={`post-content-${post.id}`}>
              {post.content}
            </p>

            {/* Share Buttons */}
            <div className="border-t pt-6">
              <p className="text-sm font-medium text-foreground mb-3">Share to social media:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => shareToSocial("facebook")}
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
                <Button
                  onClick={() => shareToSocial("instagram")}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                  data-testid="button-share-instagram"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-6">
          <Button asChild variant="outline" data-testid="button-back-to-feed">
            <a href="/feed">Back to Community Feed</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
