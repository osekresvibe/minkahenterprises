
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Subscription() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const plans = [
    {
      name: "Free",
      price: 0,
      priceId: null,
      features: [
        "Create posts",
        "Join organizations",
        "Basic messaging",
        "Event participation",
      ],
    },
    {
      name: "Premium",
      price: 9.99,
      priceId: "price_premium_monthly", // Replace with actual Stripe price ID
      features: [
        "Everything in Free",
        "Unlimited posts",
        "Priority support",
        "Advanced analytics",
        "Custom themes",
        "Ad-free experience",
      ],
      popular: true,
    },
    {
      name: "Pro",
      price: 19.99,
      priceId: "price_pro_monthly", // Replace with actual Stripe price ID
      features: [
        "Everything in Premium",
        "White-label options",
        "API access",
        "Dedicated support",
        "Custom integrations",
        "Team collaboration",
      ],
    },
  ];

  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) {
      toast({
        title: "Free plan",
        description: "You're already on the free plan!",
      });
      return;
    }

    setIsLoading(true);

    try {
      // This would typically open a Stripe checkout session
      toast({
        title: "Redirecting to checkout...",
        description: "You'll be redirected to complete your subscription.",
      });

      // In production, you'd create a Stripe checkout session here
      // const response = await fetch("/api/payments/create-subscription", {...});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to access billing portal");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to access billing portal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Upgrade to unlock premium features and take your experience to the next level
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? "border-primary shadow-lg" : ""}
            >
              <CardHeader>
                {plan.popular && (
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-semibold">Most Popular</span>
                  </div>
                )}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={isLoading}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.price === 0 ? "Current Plan" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {user?.stripeCustomerId && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Manage Subscription
              </CardTitle>
              <CardDescription>
                Update your payment method, view invoices, or cancel your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleManageSubscription}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                Open Billing Portal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
