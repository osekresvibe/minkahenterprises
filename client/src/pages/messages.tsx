import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import type { DirectMessage, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Messages() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Get all users in the organization for selection
  const { data: organizationUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // Get conversation partners
  const { data: partners = [] } = useQuery<User[]>({
    queryKey: ["/api/direct-messages/partners"],
    enabled: !!user,
  });

  // Get messages with selected user
  const { data: messages = [] } = useQuery<DirectMessage[]>({
    queryKey: ["/api/direct-messages", selectedUserId],
    enabled: !!selectedUserId && !!user,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/direct-messages`, {
        recipientId: selectedUserId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/direct-messages", selectedUserId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/direct-messages/partners"],
      });
      setMessageContent("");
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim() && selectedUserId) {
      sendMutation.mutate(messageContent);
    }
  };

  const selectedPartner = organizationUsers.find((u) => u.id === selectedUserId);
  const otherUsers = organizationUsers.filter((u) => u.id !== user?.id);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Users List */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col overflow-hidden">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="font-semibold text-sidebar-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </h2>
        </div>
        
        {/* Conversation Partners */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-2">Recent Conversations</p>
            {partners.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">No conversations yet</p>
            ) : (
              partners.map((partner) => (
                <button
                  key={partner.id}
                  onClick={() => setSelectedUserId(partner.id)}
                  className={`w-full px-3 py-2 text-left hover-elevate rounded-md transition-all mb-1 flex items-center gap-2 ${
                    selectedUserId === partner.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground"
                  }`}
                  data-testid={`button-user-${partner.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={partner.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback>
                      {partner.firstName?.[0]}
                      {partner.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {partner.firstName} {partner.lastName}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* All Organization Users */}
          <div className="p-2 border-t border-sidebar-border">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-2">Organization Members</p>
            <div className="max-h-48 overflow-y-auto">
              {otherUsers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedUserId(member.id)}
                  className={`w-full px-3 py-2 text-left hover-elevate rounded-md transition-all mb-1 flex items-center gap-2 ${
                    selectedUserId === member.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground"
                  }`}
                  data-testid={`button-member-${member.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={member.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback>
                      {member.firstName?.[0]}
                      {member.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {member.firstName} {member.lastName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedPartner && user ? (
          <>
            {/* User Header */}
            <div className="p-4 border-b border-border bg-card flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedPartner.profileImageUrl || undefined} className="object-cover" />
                <AvatarFallback>
                  {selectedPartner.firstName?.[0]}
                  {selectedPartner.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-card-foreground">
                  {selectedPartner.firstName} {selectedPartner.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedPartner.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === user.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                      data-testid={`message-${message.id}`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage
                          src={isOwnMessage ? user.profileImageUrl || undefined : selectedPartner.profileImageUrl || undefined}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {isOwnMessage ? user.firstName?.[0] : selectedPartner.firstName?.[0]}
                          {isOwnMessage ? user.lastName?.[0] : selectedPartner.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 ${isOwnMessage ? "items-end" : "items-start"} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-4 py-2 max-w-md ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={`Message ${selectedPartner.firstName}...`}
                  className="flex-1"
                  disabled={sendMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  disabled={!messageContent.trim() || sendMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select a person to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
