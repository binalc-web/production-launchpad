import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Sparkles, 
  Check, 
  CreditCard, 
  Calendar,
  TrendingUp,
  Users,
  Zap,
  Star,
  Crown,
  Shield,
  ArrowRight,
  Gift,
  AlertCircle,
  Info
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
}

interface BuyTokensPageProps {
  user: User;
}

interface PricingTier {
  id: string;
  name: string;
  icon: any;
  description: string;
  baseTokens: number;
  normalTokens: number; // What they "normally" get
  bonusTokens: number; // Extra tokens as "bonus"
  price: number;
  originalPrice?: number; // For strikethrough effect
  features: string[];
  popular?: boolean;
  color: string;
  savingsMessage?: string;
}

export function BuyTokensPage({ user }: BuyTokensPageProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");
  const [selectedTier, setSelectedTier] = useState<string>("pro");
  const [additionalTokens, setAdditionalTokens] = useState<number[]>([0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"manage" | "plans">("manage");

  // Base rate: $20 per 2,500 tokens ($0.008 per token)
  const baseRate = 0.008; // $0.008 per token
  const addonRate = 0.01; // $0.01 per token for add-ons (25% higher)

  const pricingTiers: PricingTier[] = [
    {
      id: "starter",
      name: "Starter",
      icon: Sparkles,
      description: "Perfect for individuals getting started with automation",
      baseTokens: 2500,
      normalTokens: 2000,
      bonusTokens: 500,
      price: 20,
      color: "blue",
      savingsMessage: "25% bonus tokens included",
      features: [
        "2,500 tokens/month (normally 2,000)",
        "500 bonus tokens every month",
        "AI workflow generation",
        "Template access",
        "Email support",
        "Basic analytics"
      ]
    },
    {
      id: "pro",
      name: "Professional",
      icon: Crown,
      description: "Ideal for growing teams and businesses",
      baseTokens: 6000,
      normalTokens: 5000,
      bonusTokens: 1000,
      price: 40,
      originalPrice: 48,
      color: "primary",
      popular: true,
      savingsMessage: "Save up to 25% on your tokens",
      features: [
        "6,000 tokens/month (pay for 5,000)",
        "1,000 bonus tokens every month",
        "Priority AI generation",
        "Custom node creation",
        "Advanced templates",
        "Priority support",
        "Team collaboration",
        "Usage analytics",
        "API access"
      ]
    },
    {
      id: "premium",
      name: "Premium",
      icon: TrendingUp,
      description: "For power users with high automation needs",
      baseTokens: 13000,
      normalTokens: 12000,
      bonusTokens: 1000,
      price: 80,
      originalPrice: 96,
      color: "purple",
      savingsMessage: "Maximum value for heavy users",
      features: [
        "13,000 tokens/month (pay for 12,000)",
        "1,000 bonus tokens every month",
        "Unlimited AI generations",
        "Custom integrations",
        "White-label options",
        "Dedicated support",
        "Advanced security",
        "Custom training",
        "SLA guarantee"
      ]
    }
  ];

  const selectedTierData = pricingTiers.find(tier => tier.id === selectedTier)!;
  const additionalTokensCount = additionalTokens[0] * 1000;
  const additionalCost = additionalTokensCount * addonRate;
  const totalTokens = selectedTierData.baseTokens + additionalTokensCount;
  const totalPrice = selectedTierData.price + additionalCost;
  
  // Annual pricing (keep same monthly rate but bill annually)
  const annualPrice = totalPrice * 12;
  const annualDiscount = annualPrice * 0.15; // 15% annual discount
  const annualPriceWithDiscount = annualPrice - annualDiscount;

  const handlePurchase = async () => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Successfully subscribed to ${selectedTierData.name} plan!`);
      
      console.log({
        tier: selectedTier,
        billingPeriod,
        totalTokens,
        totalPrice: billingPeriod === "annually" ? annualPriceWithDiscount : totalPrice,
        additionalTokens: additionalTokensCount
      });
      
    } catch (error) {
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  // Check if upgrading to next tier is better value than adding tokens
  const getUpgradeRecommendation = () => {
    if (additionalTokensCount === 0) return null;
    
    const currentCostWithAddons = totalPrice;
    
    // Find the next tier up
    const currentIndex = pricingTiers.findIndex(tier => tier.id === selectedTier);
    const nextTier = pricingTiers[currentIndex + 1];
    
    if (!nextTier) return null;
    
    const nextTierTokens = nextTier.baseTokens;
    const nextTierPrice = nextTier.price;
    
    // If next tier gives more tokens for less money, recommend upgrade
    if (nextTierTokens >= totalTokens && nextTierPrice < currentCostWithAddons) {
      const savings = currentCostWithAddons - nextTierPrice;
      return {
        tier: nextTier,
        savings: savings,
        extraTokens: nextTierTokens - selectedTierData.baseTokens
      };
    }
    
    return null;
  };

  const upgradeRecommendation = getUpgradeRecommendation();

  // Mock current subscription data based on user
  const currentSubscription = {
    plan: "Pro",
    tokens: 6000,
    price: 40,
    nextBilling: "9/25/2025",
    isActive: true
  };

  if (viewMode === "manage" && user.plan !== "free") {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-medium">Billing & Subscription</h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Current Plan */}
              <div className="lg:col-span-2 space-y-6">
                {/* Manage Pro Section */}
                <Card>
                  <CardHeader className="pb-4">
                    <h2 className="text-lg font-medium">Manage Pro</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Pro plan • 6K tokens/month</span>
                    </div>
                    <div className="text-3xl font-bold">
                      $40<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full bg-gradient-to-r from-primary to-cyan-400 text-white">
                      Current Plan
                    </Button>
                  </CardContent>
                </Card>

                {/* Need More Tokens Section */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Need More Tokens?</h3>
                        <p className="text-sm text-muted-foreground">
                          Purchase additional tokens as a one-time purchase
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">0</div>
                        <div className="text-sm text-muted-foreground">additional tokens</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-medium">Additional Tokens (in thousands)</label>
                        <div className="text-sm text-muted-foreground">
                          +0 tokens
                        </div>
                      </div>
                      
                      <Slider
                        value={additionalTokens}
                        onValueChange={setAdditionalTokens}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>0</span>
                        <span>10K extra</span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-2">
                        60K extra
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        One-time purchase: <span className="font-medium">$0.01/token</span> 
                        <span className="text-primary ml-1">(25% higher than bundled rate)</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Buy 0 Tokens →
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Current Subscription */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Current Subscription</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Pro</div>
                        <div className="text-sm text-muted-foreground">6K tokens/month</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">$40/month</div>
                      <div className="text-sm text-muted-foreground">
                        Next billing: 9/25/2025
                      </div>
                    </div>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full text-red-600 bg-transparent border border-red-200 hover:bg-red-50"
                    >
                      ✕ Cancel Subscription
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <h3 className="font-medium">Current Plan</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">Pro</div>
                    <div className="text-sm text-muted-foreground">6K tokens/month</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <h3 className="font-medium">Available Tokens</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">6K</div>
                    <div className="text-sm text-muted-foreground">tokens remaining</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <h3 className="font-medium">Quick Actions</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setViewMode("plans")}
                    >
                      View All Plans
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Usage History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-yellow-300 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-medium mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get bonus tokens every month with our value-packed plans. Start small and scale as you grow.
            </p>
            
            {/* Current Plan Info */}
            {user.plan && user.plan !== "free" && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-primary">
                  Current plan: <span className="font-medium capitalize">{user.plan}</span> • 
                  {" "}<span className="font-medium">{user.tokens || 0} tokens</span> remaining
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setViewMode("manage")}
                >
                  Manage Subscription
                </Button>
              </div>
            )}
          </div>

          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4 p-1 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Monthly
                </span>
              </div>
              <Switch
                checked={billingPeriod === "annually"}
                onCheckedChange={(checked) => setBillingPeriod(checked ? "annually" : "monthly")}
                className="data-[state=checked]:bg-primary"
              />
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${billingPeriod === 'annually' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Annually
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  Save 15%
                </Badge>
              </div>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {pricingTiers.map((tier) => {
              const IconComponent = tier.icon;
              const isSelected = selectedTier === tier.id;
              const monthlyPrice = tier.price;
              const annualPrice = tier.price * 12 * 0.85; // 15% discount
              const displayPrice = billingPeriod === "annually" ? annualPrice / 12 : monthlyPrice;
              
              return (
                <Card 
                  key={tier.id}
                  className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    isSelected 
                      ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/30'
                  } ${tier.popular ? 'ring-2 ring-primary/30 scale-105' : ''}`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Best Value
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      tier.color === 'primary' ? 'from-primary via-yellow-300 to-cyan-400' :
                      tier.color === 'blue' ? 'from-blue-500 to-blue-600' :
                      tier.color === 'purple' ? 'from-purple-500 to-purple-600' :
                      'from-slate-500 to-slate-600'
                    } flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-medium mb-2">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-3xl font-bold">
                          {formatPrice(displayPrice)}
                        </div>
                        {tier.originalPrice && (
                          <div className="text-lg text-muted-foreground line-through">
                            {formatPrice(billingPeriod === "annually" ? tier.originalPrice * 12 * 0.85 / 12 : tier.originalPrice)}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">/month</p>
                      
                      {billingPeriod === "annually" && (
                        <p className="text-sm text-green-600 font-medium">
                          Save {formatPrice(tier.price * 12 * 0.15)} annually
                        </p>
                      )}
                      
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium text-primary">
                          {formatTokens(tier.baseTokens)} tokens included
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Normally {formatTokens(tier.normalTokens)} + {formatTokens(tier.bonusTokens)} bonus
                        </p>
                      </div>
                      
                      {tier.savingsMessage && (
                        <p className="text-sm text-green-600 font-medium">
                          {tier.savingsMessage}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full ${
                        isSelected 
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        'Select Plan'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Token Customization */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Need More Tokens?</h3>
                  <p className="text-sm text-muted-foreground">
                    Add extra tokens to your {selectedTierData.name} plan
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {formatTokens(totalTokens)}
                  </div>
                  <div className="text-sm text-muted-foreground">total tokens/month</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium">Additional Tokens (in thousands)</label>
                  <div className="text-sm text-muted-foreground">
                    +{additionalTokensCount.toLocaleString()} tokens
                  </div>
                </div>
                
                <Slider
                  value={additionalTokens}
                  onValueChange={setAdditionalTokens}
                  max={selectedTier === 'starter' ? 10 : selectedTier === 'pro' ? 20 : 50}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>0</span>
                  <span>{selectedTier === 'starter' ? '10K' : selectedTier === 'pro' ? '20K' : '50K'} extra</span>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  Add-on tokens: <span className="font-medium">${addonRate}/token</span> 
                  <span className="text-primary ml-1">(25% higher than bundled rate)</span>
                </div>
              </div>

              {/* Upgrade Recommendation */}
              {upgradeRecommendation && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                  <Gift className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="space-y-2">
                      <h4 className="font-medium">💡 Better Value Available!</h4>
                      <p className="text-sm">
                        Upgrade to <span className="font-medium">{upgradeRecommendation.tier.name}</span> for 
                        <span className="font-medium text-green-600 ml-1">{formatPrice(upgradeRecommendation.savings)} less</span> and get 
                        <span className="font-medium ml-1">{formatTokens(upgradeRecommendation.extraTokens)} more tokens</span>.
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedTier(upgradeRecommendation.tier.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Upgrade to {upgradeRecommendation.tier.name}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {additionalTokensCount > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span>{selectedTierData.name} plan ({formatTokens(selectedTierData.baseTokens)} tokens)</span>
                    <span>{formatPrice(selectedTierData.price)}/month</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span>Additional tokens ({additionalTokensCount.toLocaleString()} @ ${addonRate}/token)</span>
                    <span>+{formatPrice(additionalCost)}/month</span>
                  </div>
                  <div className="border-t border-border mt-2 pt-2 flex justify-between items-center font-medium">
                    <span>Total monthly</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  {billingPeriod === "annually" && (
                    <div className="text-sm text-green-600 mt-1">
                      Annual: {formatPrice(annualPriceWithDiscount)} 
                      <span className="text-muted-foreground ml-1">
                        (save {formatPrice(annualDiscount)})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Section */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium mb-2">Ready to get started?</h3>
                  <div className="space-y-1">
                    <p className="text-lg">
                      <span className="font-medium">{selectedTierData.name}</span> plan • 
                      <span className="font-medium ml-1">{formatTokens(totalTokens)} tokens/month</span>
                    </p>
                    <p className="text-3xl font-bold">
                      {billingPeriod === "annually" 
                        ? formatPrice(annualPriceWithDiscount / 12) 
                        : formatPrice(totalPrice)
                      }
                      <span className="text-base font-normal text-muted-foreground">/month</span>
                    </p>
                    {billingPeriod === "annually" && (
                      <p className="text-sm text-green-600">
                        Billed annually ({formatPrice(annualPriceWithDiscount)}) • Save {formatPrice(annualDiscount)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={isProcessing}
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    size="lg"
                    onClick={handlePurchase}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-primary via-yellow-300 to-cyan-400 hover:from-primary/90 hover:via-yellow-300/90 hover:to-cyan-400/90 text-slate-800 font-medium"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-600/40 border-t-slate-800 rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-medium mb-2">Bonus Tokens Included</h4>
              <p className="text-sm text-muted-foreground">
                Every plan includes bonus tokens - up to 25% more value than buying individually
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Secure & Instant</h4>
              <p className="text-sm text-muted-foreground">
                Tokens activate immediately after payment with enterprise-grade security
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Expert Support</h4>
              <p className="text-sm text-muted-foreground">
                Get help from our automation experts whenever you need it
              </p>
            </Card>
          </div>

          {/* FAQ */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Questions about pricing? Our team is here to help you choose the perfect plan.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:support@n8nbazar.com">Contact Support</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="#" target="_blank">Pricing FAQ</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}