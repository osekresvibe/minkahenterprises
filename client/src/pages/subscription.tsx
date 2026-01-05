import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Sparkles, ArrowLeft, Shield, Users, Calendar, MessageSquare, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  };
  product: {
    id: string;
    name: string;
    description: string;
  };
}

export default function Subscription() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: pricesResponse, isLoading: pricesLoading } = useQuery<{ data: StripePrice[] }>({
    queryKey: ['/api/stripe/prices'],
  });

  const prices = pricesResponse?.data || [];
  const monthlyPrice = prices.find(p => p.recurring?.interval === 'month');
  const yearlyPrice = prices.find(p => p.recurring?.interval === 'year');

  const platformFeatures = [
    { icon: Users, text: "Unlimited members management" },
    { icon: Calendar, text: "Event planning with RSVP tracking" },
    { icon: MessageSquare, text: "Real-time messaging & channels" },
    { icon: BarChart3, text: "Analytics & reporting dashboard" },
    { icon: Shield, text: "Ministry team organization" },
    { icon: Check, text: "Digital check-in system" },
    { icon: Check, text: "News feed & announcements" },
    { icon: Check, text: "Member invitations" },
    { icon: Check, text: "Media library" },
    { icon: Check, text: "Priority support" },
  ];

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to a plan.",
      });
      window.location.href = "/login";
      return;
    }

    setIsLoading(priceId);

    try {
      const response = await apiRequest("POST", "/api/stripe/checkout", {
        priceId,
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading("portal");

    try {
      const response = await apiRequest("POST", "/api/stripe/portal", {
        returnUrl: window.location.href,
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to access billing portal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const hasActiveSubscription = !!user?.stripeSubscriptionId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Subscription Plans</h1>
            <p className="text-sm text-muted-foreground">Choose the plan that's right for your organization</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Platform Subscription
          </Badge>
          <h2 className="text-3xl font-bold mb-4 font-serif">
            Empower Your Community
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get full access to all platform features including member management, events, messaging, and comprehensive analytics.
          </p>
        </div>

        {pricesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {monthlyPrice && (
              <Card className="relative">
                <CardHeader>
                  <CardTitle className="text-xl">Monthly</CardTitle>
                  <CardDescription>Flexible month-to-month billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{formatPrice(monthlyPrice.unit_amount)}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3">
                    {platformFeatures.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">All platform features included</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleSubscribe(monthlyPrice.id)}
                    disabled={isLoading !== null || hasActiveSubscription}
                    className="w-full"
                    variant="outline"
                    data-testid="button-subscribe-monthly"
                  >
                    {isLoading === monthlyPrice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {hasActiveSubscription ? "Already Subscribed" : "Subscribe Monthly"}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {yearlyPrice && (
              <Card className="relative border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Crown className="h-3 w-3 mr-1" />
                    Best Value - Save 20%
                  </Badge>
                </div>
                <CardHeader className="pt-8">
                  <CardTitle className="text-xl">Annual</CardTitle>
                  <CardDescription>Best value with yearly billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{formatPrice(yearlyPrice.unit_amount)}</span>
                    <span className="text-muted-foreground">/year</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      That's just {formatPrice(yearlyPrice.unit_amount / 12)}/month
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {platformFeatures.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">All platform features included</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleSubscribe(yearlyPrice.id)}
                    disabled={isLoading !== null || hasActiveSubscription}
                    className="w-full"
                    data-testid="button-subscribe-yearly"
                  >
                    {isLoading === yearlyPrice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {hasActiveSubscription ? "Already Subscribed" : "Subscribe Yearly"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        )}

        <div className="text-center mb-12">
          <h3 className="text-xl font-semibold mb-6">Everything You Need to Manage Your Community</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {platformFeatures.map((feature, index) => (
              <div key={index} className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                <feature.icon className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm text-center">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {user?.stripeCustomerId && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Manage Your Subscription
              </CardTitle>
              <CardDescription>
                Update your payment method, view invoices, or manage your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleManageSubscription}
                disabled={isLoading !== null}
                variant="outline"
                className="w-full"
                data-testid="button-billing-portal"
              >
                {isLoading === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Open Billing Portal
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Secure payment processing powered by Stripe. Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
