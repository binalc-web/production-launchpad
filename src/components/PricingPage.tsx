import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check, Zap, Crown, Rocket, ArrowRight, Star, Percent, Gift, Plus } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Logo } from "./Logo";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  tokens: number;
  originalTokens: number;
  features: string[];
  popular?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  extraDiscount?: boolean;
}

interface PricingPageProps {
  onSelectPlan: (planId: string) => void;
  onSkipPricing: () => void;
}

export function PricingPage({ onSelectPlan, onSkipPricing }: PricingPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const pricingTiers: PricingTier[] = [
    {
      id: "starter",
      name: "Starter",
      price: 19,
      tokens: 2000,
      originalTokens: 2500,
      icon: Zap,
      description: "Perfect for individuals getting started with automation",
      features: [
        "2,000 automation tokens",
        "Access to template library",
        "Basic node library",
        "Community support",
        "Export workflows",
        "Basic integrations"
      ]
    },
    {
      id: "professional",
      name: "Professional",
      price: 49,
      tokens: 5418,
      originalTokens: 5200,
      icon: Crown,
      description: "Ideal for professionals and small teams", 
      popular: true,
      badge: "Most Popular",
      extraDiscount: true,
      features: [
        "5,418 automation tokens (+4% bonus)",
        "Priority template access",
        "Advanced node library",
        "Email support",
        "Custom workflow builder",
        "Team collaboration",
        "Advanced integrations",
        "Workflow scheduling"
      ]
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 99,
      originalTokens: 10425,
      tokens: 10942,
      icon: Rocket,
      description: "For large teams and organizations",
      badge: "Best Value",
      extraDiscount: true,
      features: [
        "10,942 automation tokens (+5% bonus)",
        "Unlimited template access",
        "Complete node library",
        "Priority support",
        "Advanced workflow builder",
        "Team management",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "Advanced analytics"
      ]
    }
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    const plan = pricingTiers.find(p => p.id === planId);
    toast.success(`${plan?.name} plan selected! Proceeding to checkout...`);
    
    // Simulate a brief delay then proceed
    setTimeout(() => {
      onSelectPlan(planId);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start automating your workflows with our flexible pricing plans. 
            Get bonus tokens and premium features as you scale.
          </p>
          
          {/* Limited Time Offer Banner */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-cyan-400/10 border border-primary/20 rounded-full px-6 py-2 mt-6">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Limited Time: Get bonus tokens + extra 5% discount on Pro & Enterprise!</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier) => {
            const IconComponent = tier.icon;
            const isSelected = selectedPlan === tier.id;
            const bonusTokens = tier.tokens - tier.originalTokens;
            const bonusPercentage = tier.originalTokens > tier.tokens 
              ? Math.round(((tier.originalTokens - tier.tokens) / tier.originalTokens) * 100)
              : Math.round((bonusTokens / tier.originalTokens) * 100);
            
            return (
              <Card 
                key={tier.id}
                className={`relative p-8 transition-all duration-300 hover:shadow-xl ${
                  tier.popular 
                    ? 'border-2 border-primary shadow-lg scale-105' 
                    : 'border border-border hover:border-primary/50'
                } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {/* Popular Badge */}
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge 
                      className={`px-4 py-1 ${
                        tier.popular 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      }`}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                {/* Bonus Token Badge or Extra Discount Badge */}
                <div className="absolute -top-3 -right-3">
                  <div className="relative">
                    {tier.extraDiscount ? (
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-4 border-background">
                        <div className="text-center">
                          <div className="text-xs">+5%</div>
                          <div className="text-xs opacity-90">OFF</div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-cyan-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-4 border-background">
                        <div className="text-center">
                          <div className="text-xs">VALUE</div>
                          <div className="text-xs opacity-90">PACK</div>
                        </div>
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                      {tier.extraDiscount ? (
                        <Percent className="w-3 h-3 text-white" />
                      ) : (
                        <Zap className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      tier.popular 
                        ? 'bg-gradient-to-br from-primary to-cyan-400' 
                        : 'bg-muted'
                    }`}>
                      <IconComponent className={`w-8 h-8 ${
                        tier.popular ? 'text-white' : 'text-primary'
                      }`} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-muted-foreground mb-4">{tier.description}</p>
                  
                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-4xl font-bold text-primary">
                        ${tier.price}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                      {tier.extraDiscount && (
                        <Badge className="bg-orange-500 text-white text-xs ml-2">
                          +5% OFF
                        </Badge>
                      )}
                    </div>
                    
                    {/* Token Display with Discount */}
                    <div className="bg-muted/30 border border-border rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        {/* Original Tokens - Strikethrough */}
                        <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded-lg">
                          <span className="text-lg text-muted-foreground line-through">
                            {tier.originalTokens.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">tokens</span>
                        </div>
                        
                        {/* Arrow pointing to actual tokens */}
                        <ArrowRight className="w-4 h-4 text-primary" />
                        
                        {/* Actual Tokens - Main highlighted amount */}
                        <div className="flex items-center gap-1">
                          <span className="text-2xl font-bold text-primary">
                            {tier.tokens.toLocaleString()}
                          </span>
                          <span className="text-sm text-primary/70">tokens</span>
                        </div>
                      </div>
                      
                      {/* Bonus/Value highlight */}
                      {tier.tokens > tier.originalTokens ? (
                        <div className="flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-primary">
                            +{bonusTokens.toLocaleString()} bonus tokens included
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                          <Zap className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Optimized token allocation
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Value proposition */}
                    <div className="text-sm text-muted-foreground">
                      ${(tier.price / tier.tokens * 1000).toFixed(2)} per 1000 tokens
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full gap-2 ${
                    tier.popular 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-gradient-to-r from-primary to-cyan-400 hover:from-primary/90 hover:to-cyan-400/90'
                  }`}
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isSelected}
                >
                  {isSelected ? (
                    "Selected"
                  ) : (
                    <>
                      {tier.extraDiscount ? "Get 5% Extra Discount" : "Get Started"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
                
                {/* Money back guarantee */}
                <p className="text-xs text-center text-muted-foreground mt-3">
                  14-day money-back guarantee
                </p>
              </Card>
            );
          })}
        </div>

        {/* Token Bonus Banner */}
        <Card className="p-6 mb-12 bg-gradient-to-r from-primary/5 to-cyan-400/5 border-primary/20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">Special Launch Pricing</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Limited time offer: Get bonus tokens on all plans plus an extra 5% discount on Professional and Enterprise plans. 
              More automation power for less!
            </p>
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span>Tokens never expire</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Features Comparison */}
        <Card className="p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">What's Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Automation Tokens</h3>
              <p className="text-muted-foreground">
                Use tokens to run your workflows and automations. More tokens = more automation power.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-400/20 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Template Library</h3>
              <p className="text-muted-foreground">
                Access thousands of pre-built workflow templates to jumpstart your automation journey.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Node Library</h3>
              <p className="text-muted-foreground">
                Connect to hundreds of services and applications with our comprehensive node library.
              </p>
            </div>
          </div>
        </Card>

        {/* FAQ Section */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 text-left">
              <h3 className="font-semibold mb-2">How long is this special pricing available?</h3>
              <p className="text-muted-foreground text-sm">
                This is a limited-time launch offer. Bonus tokens and extra discounts are added immediately and never expire.
              </p>
            </Card>
            <Card className="p-6 text-left">
              <h3 className="font-semibold mb-2">What are automation tokens?</h3>
              <p className="text-muted-foreground text-sm">
                Tokens are used to execute workflow steps. Each action in your automation consumes tokens based on complexity.
              </p>
            </Card>
            <Card className="p-6 text-left">
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can change your plan at any time. Unused tokens roll over to the next billing cycle.
              </p>
            </Card>
            <Card className="p-6 text-left">
              <h3 className="font-semibold mb-2">Do tokens expire?</h3>
              <p className="text-muted-foreground text-sm">
                No! All tokens, including bonus tokens, never expire. Use them at your own pace.
              </p>
            </Card>
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Want to explore first?
          </p>
          <Button 
            variant="outline" 
            onClick={onSkipPricing}
            className="gap-2"
          >
            Continue with Free Tier
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            100 free tokens • Limited features • Upgrade anytime
          </p>
        </div>
      </div>
    </div>
  );
}