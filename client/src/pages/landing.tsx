import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Calendar, MessageSquare, UserCheck, Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Building2,
      title: "Multi-Church Platform",
      description: "Manage multiple church communities from one powerful SaaS solution",
    },
    {
      icon: Users,
      title: "Member Management",
      description: "Track members, roles, and engagement across your community",
    },
    {
      icon: Calendar,
      title: "Events & RSVP",
      description: "Organize events with easy RSVP tracking and reminders",
    },
    {
      icon: MessageSquare,
      title: "Real-Time Chat",
      description: "Connect your community with organized channels and messaging",
    },
    {
      icon: UserCheck,
      title: "Digital Check-In",
      description: "Track attendance with simple, secure check-in system",
    },
    {
      icon: Heart,
      title: "Community First",
      description: "Built with love for faith communities to thrive together",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/20 to-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <Building2 className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Connect Your Church
              <br />
              <span className="text-primary">Community Together</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A modern platform designed for church communities to manage members,
              events, messaging, and engagement—all in one beautiful, easy-to-use system.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="min-w-48 text-base"
                onClick={() => setLocation("/login")}
                data-testid="button-login"
              >
                Sign In
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-48 text-base"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">
              Sign in to register your organization, browse and join existing communities, or wait for an invitation from your organization admin.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            Everything Your Church Needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for church communities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-card-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0">
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary-foreground mb-4">
              Ready to Transform Your Community?
            </h2>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8">
              Join churches worldwide using our platform to build stronger,
              more connected communities.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="min-w-48 text-base"
              onClick={() => setLocation("/login")}
              data-testid="button-get-started-cta"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-serif font-semibold text-foreground">
                MinkahEnterprises
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 MinkahEnterprises. Building stronger communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
