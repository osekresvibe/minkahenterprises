
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Edit, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Profile() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    dateOfBirth: "",
    occupation: "",
    education: "",
    maritalStatus: "",
    familyInfo: "",
    hobbies: "",
    servingAreas: "",
    baptismDate: "",
    memberSince: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "member")) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        bio: user.bio || "",
        dateOfBirth: user.dateOfBirth || "",
        occupation: user.occupation || "",
        education: user.education || "",
        maritalStatus: user.maritalStatus || "",
        familyInfo: user.familyInfo || "",
        hobbies: user.hobbies || "",
        servingAreas: user.servingAreas || "",
        baptismDate: user.baptismDate || "",
        memberSince: user.memberSince || "",
        emergencyContactName: user.emergencyContactName || "",
        emergencyContactPhone: user.emergencyContactPhone || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
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
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        bio: user.bio || "",
        dateOfBirth: user.dateOfBirth || "",
        occupation: user.occupation || "",
        education: user.education || "",
        maritalStatus: user.maritalStatus || "",
        familyInfo: user.familyInfo || "",
        hobbies: user.hobbies || "",
        servingAreas: user.servingAreas || "",
        baptismDate: user.baptismDate || "",
        memberSince: user.memberSince || "",
        emergencyContactName: user.emergencyContactName || "",
        emergencyContactPhone: user.emergencyContactPhone || "",
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
              My Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your personal information
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user?.profileImageUrl || undefined}
                  alt={`${user?.firstName || ''} ${user?.lastName || ''}`}
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    disabled={!isEditing}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    disabled={!isEditing}
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={!isEditing}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="(555) 123-4567"
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="123 Main St, City, State 12345"
                  data-testid="input-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  data-testid="input-bio"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Input
                    id="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, maritalStatus: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Single, Married, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) =>
                      setFormData({ ...formData, occupation: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Your profession"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) =>
                      setFormData({ ...formData, education: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Highest level of education"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyInfo">Family Information</Label>
                <Textarea
                  id="familyInfo"
                  value={formData.familyInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, familyInfo: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Spouse, children, family details..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hobbies">Hobbies & Interests</Label>
                <Textarea
                  id="hobbies"
                  value={formData.hobbies}
                  onChange={(e) =>
                    setFormData({ ...formData, hobbies: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="What do you enjoy doing?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servingAreas">Ministry Areas of Interest</Label>
                <Textarea
                  id="servingAreas"
                  value={formData.servingAreas}
                  onChange={(e) =>
                    setFormData({ ...formData, servingAreas: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Where would you like to serve?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="baptismDate">Baptism Date</Label>
                  <Input
                    id="baptismDate"
                    type="date"
                    value={formData.baptismDate}
                    onChange={(e) =>
                      setFormData({ ...formData, baptismDate: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberSince">Member Since</Label>
                  <Input
                    id="memberSince"
                    type="date"
                    value={formData.memberSince}
                    onChange={(e) =>
                      setFormData({ ...formData, memberSince: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyContactName: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyContactPhone: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
