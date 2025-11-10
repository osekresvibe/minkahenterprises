import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMinistryTeamSchema, insertTeamMemberSchema, type MinistryTeam, type TeamMember, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { z } from "zod";

type TeamMemberWithUser = TeamMember & { user: User };

export default function MinistryTeamsPage() {
  const { toast } = useToast();
  
  // Separate state for each dialog to avoid coupling
  const [teamBeingEdited, setTeamBeingEdited] = useState<MinistryTeam | null>(null);
  const [teamMembersDialogId, setTeamMembersDialogId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  const { data: teams = [], isLoading: teamsLoading } = useQuery<MinistryTeam[]>({
    queryKey: ["/api/ministry-teams"],
  });

  const { data: selectedTeamMembers = [] } = useQuery<TeamMemberWithUser[]>({
    queryKey: ["/api/ministry-teams", teamMembersDialogId, "members"],
    enabled: !!teamMembersDialogId,
  });

  const { data: availableMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/members"],
  });

  const selectedTeam = teams.find(t => t.id === teamMembersDialogId);

  const createTeamForm = useForm<z.infer<typeof insertMinistryTeamSchema>>({
    resolver: zodResolver(insertMinistryTeamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editTeamForm = useForm<z.infer<typeof insertMinistryTeamSchema>>({
    resolver: zodResolver(insertMinistryTeamSchema),
  });

  const addMemberForm = useForm<z.infer<typeof insertTeamMemberSchema>>({
    resolver: zodResolver(insertTeamMemberSchema),
    defaultValues: {
      userId: "",
      role: "member",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertMinistryTeamSchema>) => {
      return await apiRequest(`/api/ministry-teams`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-teams"] });
      setIsCreateDialogOpen(false);
      createTeamForm.reset();
      toast({ title: "Team created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create team", variant: "destructive" });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertMinistryTeamSchema>> }) => {
      return await apiRequest(`/api/ministry-teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-teams"] });
      setTeamBeingEdited(null);
      toast({ title: "Team updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update team", variant: "destructive" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/ministry-teams/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-teams"] });
      setTeamMembersDialogId(null);
      toast({ title: "Team deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertTeamMemberSchema>) => {
      return await apiRequest(`/api/ministry-teams/${teamMembersDialogId}/members`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-teams", teamMembersDialogId, "members"] });
      setShowAddMemberForm(false);
      addMemberForm.reset();
      toast({ title: "Member added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add member", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      return await apiRequest(`/api/ministry-teams/${teamId}/members/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-teams", teamMembersDialogId, "members"] });
      toast({ title: "Member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ teamId, userId, role }: { teamId: string; userId: string; role: string }) => {
      return await apiRequest(`/api/ministry-teams/${teamId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-teams", teamMembersDialogId, "members"] });
      toast({ title: "Member role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update member role", variant: "destructive" });
    },
  });

  const handleEditTeam = (team: MinistryTeam) => {
    editTeamForm.reset({
      name: team.name,
      description: team.description || "",
    });
    setTeamBeingEdited(team);
  };

  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading ministry teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-semibold font-serif text-foreground" data-testid="heading-ministry-teams">Ministry Teams</h1>
          <p className="text-muted-foreground mt-2">Organize your church members into ministry teams</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-team">
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-team">
            <DialogHeader>
              <DialogTitle>Create Ministry Team</DialogTitle>
              <DialogDescription>
                Create a new ministry team to organize your church members.
              </DialogDescription>
            </DialogHeader>
            <Form {...createTeamForm}>
              <form onSubmit={createTeamForm.handleSubmit((data) => createTeamMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={createTeamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Worship Team" {...field} data-testid="input-team-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createTeamForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the team's purpose and responsibilities..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-team-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createTeamMutation.isPending} data-testid="button-submit-create-team">
                    {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="hover-elevate" data-testid={`card-team-${team.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-team-name-${team.id}`}>{team.name}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEditTeam(team)}
                    data-testid={`button-edit-team-${team.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this team?")) {
                        deleteTeamMutation.mutate(team.id);
                      }
                    }}
                    data-testid={`button-delete-team-${team.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {team.description && (
                <CardDescription className="mt-2" data-testid={`text-team-description-${team.id}`}>
                  {team.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setTeamMembersDialogId(team.id)}
                data-testid={`button-view-team-${team.id}`}
              >
                <Users className="mr-2 h-4 w-4" />
                View Members
              </Button>
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No ministry teams yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-team">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Team
            </Button>
          </div>
        )}
      </div>

      {/* Team Members Dialog - No nesting, inline add form instead */}
      <Dialog open={!!teamMembersDialogId} onOpenChange={(open) => !open && setTeamMembersDialogId(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-team-members">
          <DialogHeader>
            <DialogTitle data-testid="text-selected-team-name">{selectedTeam?.name} Members</DialogTitle>
            <DialogDescription>
              Manage team members and their roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!showAddMemberForm ? (
              <Button className="w-full" onClick={() => setShowAddMemberForm(true)} data-testid="button-show-add-member-form">
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Add Team Member</CardTitle>
                    <Button size="icon" variant="ghost" onClick={() => {
                      setShowAddMemberForm(false);
                      addMemberForm.reset();
                    }} data-testid="button-cancel-add-member">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...addMemberForm}>
                    <form onSubmit={addMemberForm.handleSubmit((data) => addMemberMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={addMemberForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-member">
                                  <SelectValue placeholder="Select a member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableMembers
                                  .filter(m => !selectedTeamMembers.some(tm => tm.userId === m.id))
                                  .map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.firstName} {member.lastName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addMemberForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="leader">Leader</SelectItem>
                                <SelectItem value="co_leader">Co-Leader</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="volunteer">Volunteer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={addMemberMutation.isPending} className="w-full" data-testid="button-submit-add-member">
                        {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {selectedTeamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`row-team-member-${member.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid={`text-member-name-${member.userId}`}>
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        updateMemberRoleMutation.mutate({
                          teamId: teamMembersDialogId!,
                          userId: member.userId,
                          role,
                        })
                      }
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-member-role-${member.userId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leader">Leader</SelectItem>
                        <SelectItem value="co_leader">Co-Leader</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        removeMemberMutation.mutate({
                          teamId: teamMembersDialogId!,
                          userId: member.userId,
                        })
                      }
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {selectedTeamMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No members yet. Add your first member to get started.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog - Separate from members dialog */}
      <Dialog open={!!teamBeingEdited} onOpenChange={(open) => !open && setTeamBeingEdited(null)}>
        <DialogContent data-testid="dialog-edit-team">
          <DialogHeader>
            <DialogTitle>Edit Ministry Team</DialogTitle>
            <DialogDescription>
              Update the team's name and description.
            </DialogDescription>
          </DialogHeader>
          <Form {...editTeamForm}>
            <form
              onSubmit={editTeamForm.handleSubmit((data) =>
                teamBeingEdited && updateTeamMutation.mutate({ id: teamBeingEdited.id, data })
              )}
              className="space-y-4"
            >
              <FormField
                control={editTeamForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Worship Team" {...field} data-testid="input-edit-team-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTeamForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the team's purpose and responsibilities..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-team-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateTeamMutation.isPending} data-testid="button-submit-edit-team">
                  {updateTeamMutation.isPending ? "Updating..." : "Update Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
