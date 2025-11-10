import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Mail, Trash2, Clock, CheckCircle, XCircle, Copy, Check, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvitationSchema, type InsertInvitation, type Invitation } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";

export default function InviteMembers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailList, setEmailList] = useState("");

  const { data: invitations = [], isLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
    enabled: !!user && user.role === "church_admin",
  });

  const form = useForm<InsertInvitation>({
    resolver: zodResolver(insertInvitationSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvitation) => {
      await apiRequest("POST", "/api/invitations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation sent!",
        description: "The member will receive an email with the invitation link.",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Success",
        description: "Invitation cancelled",
      });
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
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const { data: userQueryData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const sendInvitesMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      return await apiRequest("/api/invitations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invitations sent!",
        description: `Successfully sent ${data.sent} invitation${data.sent !== 1 ? 's' : ''}`,
      });
      setEmailList("");
    },
    onError: () => {
      toast({
        title: "Failed to send invitations",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (invitation: Invitation) => {
    const isExpired = new Date(invitation.expiresAt) < new Date();

    if (invitation.status === "accepted") {
      return <Badge variant="default" data-testid={`badge-status-${invitation.id}`}><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (invitation.status === "declined") {
      return <Badge variant="destructive" data-testid={`badge-status-${invitation.id}`}><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    }
    if (isExpired || invitation.status === "expired") {
      return <Badge variant="secondary" data-testid={`badge-status-${invitation.id}`}><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="outline" data-testid={`badge-status-${invitation.id}`}><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "The invite link has been copied to your clipboard.",
    });
  };

  const handleSendInvites = () => {
    const emails = emailList
      .split(/[\n,]/)
      .map(email => email.trim())
      .filter(email => email && email.includes("@"));

    if (emails.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }

    sendInvitesMutation.mutate(emails);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Invite Members
            </h1>
            <p className="text-muted-foreground">
              Invite new members to join your church community
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          data-testid="button-toggle-invite-form"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Invite Member"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Send Invitation</CardTitle>
            <CardDescription>
              Enter the email address and role for the new member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="member@email.com"
                          data-testid="input-invite-email"
                        />
                      </FormControl>
                      <FormDescription>
                        An invitation link will be sent to this email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invite-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="church_admin">Church Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the role for this member
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    data-testid="button-cancel-invite"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-send-invite"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending & Recent Invitations</CardTitle>
          <CardDescription>
            Manage invitations you've sent to new members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invitations yet</p>
              <p className="text-sm">Click "Invite Member" to send your first invitation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`invitation-${invitation.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium" data-testid={`text-email-${invitation.id}`}>
                        {invitation.email}
                      </span>
                      {getStatusBadge(invitation)}
                      <Badge variant="secondary" data-testid={`badge-role-${invitation.id}`}>
                        {invitation.role === "church_admin" ? "Church Admin" : "Member"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-7">
                      Sent {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                      {invitation.status === "pending" && ` • Expires ${formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}`}
                    </p>
                  </div>

                  {invitation.status === "pending" && new Date(invitation.expiresAt) > new Date() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(invitation.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-cancel-${invitation.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Email Invitations
          </CardTitle>
          <CardDescription>
            Enter email addresses (one per line or comma-separated) to send personalized invitation emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email-list">Email Addresses</Label>
            <Textarea
              id="email-list"
              placeholder="john@example.com&#10;jane@example.com&#10;bob@example.com"
              value={emailList}
              onChange={(e) => setEmailList(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Enter one email per line or separate with commas
            </p>
          </div>
          <Button 
            onClick={handleSendInvites}
            disabled={sendInvitesMutation.isPending || !emailList.trim()}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            {sendInvitesMutation.isPending ? "Sending..." : "Send Invitations"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}