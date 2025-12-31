
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2 } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentFormProps {
  amount?: number;
  description?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentForm({ 
  amount = 1000, 
  description = "Payment",
  onSuccess,
  onCancel 
}: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState((amount / 100).toString());
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const amountInCents = Math.round(parseFloat(customAmount) * 100);
      
      if (amountInCents < 50) {
        toast({
          title: "Invalid amount",
          description: "Minimum payment is $0.50",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Create payment intent
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: amountInCents,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      // Redirect to Stripe Checkout or use Elements
      // For simplicity, we'll use Stripe's Payment Element
      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment successful!",
          description: "Your payment has been processed.",
        });
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">$</span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.50"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay ${parseFloat(customAmount).toFixed(2)}</>
            )}
          </Button>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isProcessing}
            >
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Powered by Stripe. Your payment information is secure.
        </p>
      </CardContent>
    </Card>
  );
}
