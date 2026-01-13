import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, MessageSquare, UserCheck, Heart, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import logoIcon from "@assets/WhatsApp_Image_2026-01-13_at_10.32.57_1768333779520.jpeg";
import logoFull from "@assets/WhatsApp_Image_2026-01-13_at_10.57.36_1768333784140.jpeg";

export default function Landing() {
  const [, setLocation] = useLocation();
  const siteUrl = "https://christianhashtag.com";

  const features = [
    {
      icon: Building2,
      title: "Multi-Organization Platform",
      description: "Manage churches, nonprofits, clubs and communities from one powerful SaaS solution",
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
              <img 
                src={logoFull} 
                alt="Christian Hashtag" 
                className="h-24 sm:h-32 w-auto"
              />
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Connect Your
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
                onClick={() => {
                  const featuresSection = document.querySelector('h2');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
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
            Everything Your Community Needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for faith communities
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

      {/* QR Code Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h3 className="font-serif text-xl font-semibold text-foreground mb-4">
              Scan to Access
            </h3>
            <p className="text-muted-foreground mb-6">
              Scan this QR code to open Christian Hashtag on your mobile device
            </p>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <QRCodeSVG 
                  value={siteUrl || "https://christianhashtag.com"} 
                  size={180}
                  level="H"
                  includeMargin={false}
                  fgColor="#1e1b4b"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Perfect for sharing at events or in printed materials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0">
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary-foreground mb-4">
              Ready to Transform Your Community?
            </h2>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8">
              Join communities worldwide using our platform to build stronger,
              more connected groups.
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
            <div className="flex items-center gap-3">
              <img 
                src={logoIcon} 
                alt="Christian Hashtag" 
                className="h-10 w-auto"
              />
              <span className="font-serif font-semibold text-foreground">
                Christian Hashtag
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Christian Hashtag. Building stronger communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
