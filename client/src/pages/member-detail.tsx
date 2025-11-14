
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, Heart, Users, Shield, ArrowLeft } from "lucide-react";
import { useRoute, Link } from "wouter";
import type { User as UserType } from "@shared/schema";

export default function MemberDetail() {
  const { user: currentUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/members/:id");
  const memberId = params?.id;

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || currentUser?.role !== "church_admin")) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [currentUser, isAuthenticated, authLoading, toast]);

  const { data: members = [] } = useQuery<UserType[]>({
    queryKey: ["/api/members"],
    enabled: !!currentUser && currentUser.role === "church_admin",
  });

  const member = members.find(m => m.id === memberId);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-semibold mb-4">Member Not Found</h1>
          <Link href="/members">
            <Button>Back to Members</Button>
          </Link>
        </div>
      </div>
    );
  }

  const InfoSection = ({ icon: Icon, title, content }: { icon: any, title: string, content: string | undefined }) => {
    if (!content) return null;
    return (
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-base">{content}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/members">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Button>
        </Link>

        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={member.profileImageUrl || undefined}
                  alt={`${member.firstName} ${member.lastName}`}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl">
                  {member.firstName?.[0]}{member.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-semibold mb-2">
                  {member.firstName} {member.lastName}
                </h1>
                <p className="text-muted-foreground mb-4">{member.email}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge variant={member.role === "church_admin" ? "default" : "secondary"}>
                    {member.role === "church_admin" ? "Admin" : "Member"}
                  </Badge>
                  {member.memberSince && (
                    <Badge variant="outline">
                      Member since {new Date(member.memberSince).getFullYear()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {member.bio && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{member.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoSection icon={Mail} title="Email" content={member.email || undefined} />
            <InfoSection icon={Phone} title="Phone" content={member.phone || undefined} />
            <InfoSection icon={MapPin} title="Address" content={member.address || undefined} />
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.dateOfBirth && (
              <InfoSection 
                icon={Calendar} 
                title="Date of Birth" 
                content={new Date(member.dateOfBirth).toLocaleDateString()} 
              />
            )}
            <InfoSection icon={Heart} title="Marital Status" content={member.maritalStatus || undefined} />
            <InfoSection icon={Briefcase} title="Occupation" content={member.occupation || undefined} />
            <InfoSection icon={GraduationCap} title="Education" content={member.education || undefined} />
            {member.familyInfo && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Family Information</p>
                  <p className="text-base whitespace-pre-line">{member.familyInfo}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Church Involvement */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Church Involvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.baptismDate && (
              <InfoSection 
                icon={Calendar} 
                title="Baptism Date" 
                content={new Date(member.baptismDate).toLocaleDateString()} 
              />
            )}
            {member.memberSince && (
              <InfoSection 
                icon={Calendar} 
                title="Member Since" 
                content={new Date(member.memberSince).toLocaleDateString()} 
              />
            )}
            {member.servingAreas && (
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ministry Areas</p>
                  <p className="text-base whitespace-pre-line">{member.servingAreas}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hobbies & Interests */}
        {member.hobbies && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Hobbies & Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">{member.hobbies}</p>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {(member.emergencyContactName || member.emergencyContactPhone) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoSection icon={User} title="Name" content={member.emergencyContactName || undefined} />
              <InfoSection icon={Phone} title="Phone" content={member.emergencyContactPhone || undefined} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
