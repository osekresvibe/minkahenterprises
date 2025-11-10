import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  UserCheck,
  Building2,
  Settings,
  CheckCircle,
  ChevronRight,
  UsersRound,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const isChurchAdmin = user?.role === "church_admin";
  const isMember = user?.role === "member";

  const superAdminItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Churches", url: "/admin/churches", icon: Building2 },
    { title: "Pending Approvals", url: "/admin/approvals", icon: CheckCircle },
  ];

  const churchAdminItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Members", url: "/members", icon: Users },
    { title: "Invite Members", url: "/invite-members", icon: UserCheck },
    { title: "Ministry Teams", url: "/ministry-teams", icon: UsersRound },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Check-ins", url: "/check-ins", icon: UserCheck },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const memberItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Check In", url: "/check-in", icon: UserCheck },
  ];

  const menuItems = isSuperAdmin
    ? superAdminItems
    : isChurchAdmin
    ? churchAdminItems
    : memberItems;

  const getRoleBadgeVariant = () => {
    if (isSuperAdmin) return "default";
    if (isChurchAdmin) return "secondary";
    return "outline";
  };

  const getRoleLabel = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isChurchAdmin) return "Admin";
    return "Member";
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-semibold text-lg text-sidebar-foreground truncate">
              {isSuperAdmin ? "MinkahEnterprises" : "Church Portal"}
            </h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={`${user?.firstName || ''} ${user?.lastName || ''}`}
              className="object-cover"
            />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <Badge
              variant={getRoleBadgeVariant()}
              className="text-xs mt-1"
              data-testid="badge-user-role"
            >
              {getRoleLabel()}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
