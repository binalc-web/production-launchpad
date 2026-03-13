import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent } from "./ui/dialog";
import { 
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Sparkles,
  Search,
  Library,
  Upload,
  CreditCard,
  Zap,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Target
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    callback: () => void;
  };
  condition?: (user: User | null) => boolean;
}

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSectionChange: (section: string) => void;
  currentSection: string;
}

export function ProductTour({ 
  isOpen, 
  onClose, 
  user, 
  onSectionChange,
  currentSection 
}: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Define tour steps
  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to N8N Bazar! 🎉',
      description: 'Your one-stop platform for N8N workflow templates, AI-generated automations, and powerful integrations. Let\'s take a quick tour to get you started!',
      position: 'center',
      icon: Sparkles,
    },
    {
      id: 'search-templates',
      title: 'Discover Amazing Workflows',
      description: 'Search through thousands of pre-built N8N workflow templates. Use our AI-powered search or browse by category to find exactly what you need.',
      target: '[data-tour="main-search"]',
      position: 'bottom',
      icon: Search,
      action: {
        label: 'Try Search',
        callback: () => onSectionChange('search')
      },
      condition: (user) => !!user
    },
    {
      id: 'ai-generation',
      title: 'AI Workflow Generation',
      description: 'Describe your automation needs and our AI will generate a custom N8N workflow tailored to your requirements. Perfect for complex or unique use cases.',
      target: '[data-tour="ai-generation"]',
      position: 'right',
      icon: Sparkles,
      action: {
        label: 'Try AI Generation',
        callback: () => onSectionChange('ai-generation')
      },
      condition: (user) => !!user
    },
    {
      id: 'node-library',
      title: 'Explore Node Library',
      description: 'Browse our comprehensive library of N8N nodes. Learn how to use individual nodes and integrate them into your workflows.',
      target: '[data-tour="node-library"]',
      position: 'right',
      icon: Library,
      action: {
        label: 'Browse Nodes',
        callback: () => onSectionChange('node-library')
      },
      condition: (user) => !!user
    },
    {
      id: 'my-templates',
      title: 'Share Your Templates',
      description: 'Upload and manage your own N8N workflow templates. Share your creations with the community and contribute to the platform.',
      target: '[data-tour="my-templates"]',
      position: 'right',
      icon: Upload,
      action: {
        label: 'Upload Templates',
        callback: () => onSectionChange('my-templates')
      },
      condition: (user) => !!user
    },
    {
      id: 'tokens',
      title: 'Manage Your Credits',
      description: 'Keep track of your token usage and upgrade your plan for more features. Tokens are used for AI generation and premium features.',
      target: '[data-tour="buy-tokens"]',
      position: 'right',
      icon: CreditCard,
      action: {
        label: 'View Pricing',
        callback: () => onSectionChange('buy-tokens')
      },
      condition: (user) => !!user
    },
    {
      id: 'integration',
      title: 'Easy N8N Integration',
      description: 'Every template and generated workflow comes with step-by-step instructions for importing into your N8N instance. We make integration seamless!',
      position: 'center',
      icon: Zap,
    },
    {
      id: 'completion',
      title: 'You\'re All Set! 🚀',
      description: 'You now know how to use N8N Bazar effectively. Start exploring templates, generate custom workflows, or upload your own creations. Happy automating!',
      position: 'center',
      icon: CheckCircle,
    }
  ];

  // Filter steps based on user authentication
  const availableSteps = tourSteps.filter(step => 
    !step.condition || step.condition(user)
  );

  const currentTourStep = availableSteps[currentStep];

  useEffect(() => {
    if (isOpen && currentTourStep?.target) {
      updateHighlight();
    }
  }, [isOpen, currentStep, currentTourStep]);

  const updateHighlight = () => {
    if (currentTourStep?.target) {
      const element = document.querySelector(currentTourStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
      }
    } else {
      setHighlightRect(null);
    }
  };

  const nextStep = () => {
    if (currentStep < availableSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const completeTour = () => {
    setIsCompleted(true);
    localStorage.setItem('hasCompletedTour', 'true');
    toast.success('Tour completed! Welcome to N8N Bazar!');
    setTimeout(() => {
      onClose();
      setIsCompleted(false);
      setCurrentStep(0);
    }, 1500);
  };

  const skipTour = () => {
    localStorage.setItem('hasCompletedTour', 'true');
    onClose();
    setCurrentStep(0);
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsCompleted(false);
  };

  if (!isOpen) return null;

  const IconComponent = currentTourStep?.icon || HelpCircle;

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        style={{ pointerEvents: isCompleted ? 'auto' : 'none' }}
      >
        {/* Highlight spotlight */}
        {highlightRect && (
          <div
            className="absolute border-4 border-primary rounded-lg shadow-2xl"
            style={{
              left: highlightRect.left - 8,
              top: highlightRect.top - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6), 0 4px 20px rgba(0, 212, 170, 0.3)`,
              pointerEvents: 'none',
              zIndex: 51
            }}
          />
        )}

        {/* Tour Dialog */}
        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-auto z-52">
          <Card className={`w-full max-w-lg mx-auto shadow-2xl border-2 ${
            currentTourStep?.position === 'center' ? '' : 'relative'
          }`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{currentTourStep?.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Step {currentStep + 1} of {availableSteps.length}</span>
                    <Badge variant="outline" className="text-xs">
                      {((currentStep + 1) / availableSteps.length * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={skipTour}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-6">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / availableSteps.length) * 100}%` }}
                />
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="leading-relaxed">{currentTourStep?.description}</p>
                
                {/* Action Button */}
                {currentTourStep?.action && (
                  <div className="mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={currentTourStep.action.callback}
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Target className="w-3 h-3" />
                      {currentTourStep.action.label}
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {availableSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep 
                          ? 'bg-primary scale-125' 
                          : index < currentStep 
                            ? 'bg-primary/60' 
                            : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Previous
                  </Button>
                  
                  {currentStep === availableSteps.length - 1 ? (
                    <Button 
                      size="sm"
                      onClick={completeTour}
                      className="gap-2 bg-gradient-to-r from-primary to-cyan-400 hover:from-primary/90 hover:to-cyan-400/90"
                    >
                      Complete Tour
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={nextStep}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Skip Option */}
              {currentStep === 0 && (
                <div className="text-center mt-4 pt-4 border-t border-border">
                  <button 
                    onClick={skipTour}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip tour and explore on my own
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Completion Animation */}
        {isCompleted && (
          <div className="fixed inset-0 flex items-center justify-center z-53 pointer-events-none">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4 mx-auto animate-pulse">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Tour Complete!</h3>
              <p className="text-white/80">You're ready to explore N8N Bazar</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Helper component for tour trigger button
export function TourTrigger({ onStartTour }: { onStartTour: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStartTour}
      className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
    >
      <Play className="w-3 h-3" />
      Take Tour
    </Button>
  );
}