import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Sparkles, 
  Info, 
  CreditCard, 
  Search,
  AlertCircle,
  CheckCircle,
  Download,
  HelpCircle
} from "lucide-react";
import { N8NInstructions } from "./N8NInstructions";
import { toast } from "sonner@2.0.3";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
}

interface AIWorkflowGenerationProps {
  user: User;
  onBuyTokens: () => void;
  onBrowseTemplates: () => void;
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: any[];
  connections: any[];
  metadata: {
    generatedAt: Date;
    useCase: string;
    estimatedComplexity: string;
    requiredCredentials: string[];
  };
}

export function AIWorkflowGeneration({ user, onBuyTokens, onBrowseTemplates }: AIWorkflowGenerationProps) {
  const [useCase, setUseCase] = useState("");
  const [includeGuideNotes, setIncludeGuideNotes] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  
  const maxLength = 2000;
  const remainingChars = maxLength - useCase.length;
  const tokensRequired = 100;
  const hasInsufficientTokens = (user.tokens || 0) < tokensRequired;

  const handleGenerate = async () => {
    if (hasInsufficientTokens) {
      return;
    }

    if (!useCase.trim()) {
      toast.error("Please describe your use case first");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated workflow
      const workflow: GeneratedWorkflow = {
        name: `AI Generated: ${useCase.slice(0, 50)}...`,
        description: `Magical workflow generated based on: "${useCase}"`,
        nodes: [
          {
            id: "trigger",
            type: "webhook",
            name: "Webhook Trigger",
            parameters: {
              httpMethod: "POST",
              path: "webhook"
            }
          },
          {
            id: "process",
            type: "function",
            name: "Process Data", 
            parameters: {
              functionCode: "// AI-generated magical processing logic\nreturn items;"
            }
          },
          {
            id: "output",
            type: "webhook-response",
            name: "Response",
            parameters: {
              responseCode: 200,
              responseData: "{{ $json }}"
            }
          }
        ],
        connections: [
          { source: "trigger", target: "process" },
          { source: "process", target: "output" }
        ],
        metadata: {
          generatedAt: new Date(),
          useCase: useCase,
          estimatedComplexity: "Intermediate",
          requiredCredentials: ["webhook", "database"]
        }
      };

      setGeneratedWorkflow(workflow);
      toast.success("Magical workflow generated successfully!");
      
      // Show instructions automatically
      setInstructionsOpen(true);

    } catch (error) {
      toast.error("Failed to generate workflow. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestCustom = () => {
    // Navigate to custom workflow request
    window.open('mailto:support@n8nbazar.com?subject=Custom Workflow Request', '_blank');
  };

  const handleCopyJSON = () => {
    if (generatedWorkflow) {
      navigator.clipboard.writeText(JSON.stringify(generatedWorkflow, null, 2));
      toast.success("Workflow JSON copied to clipboard!");
    }
  };

  const showInstructions = () => {
    setInstructionsOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-yellow-300 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-medium mb-2">AI Workflow Generation</h1>
                <p className="text-muted-foreground">
                  Describe your problem and our magical AI will generate a tailored n8n workflow
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Generated Workflow Results */}
            {generatedWorkflow && (
              <Card className="p-6 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                      Magical Workflow Generated Successfully!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-200 mb-4">
                      Your custom magical workflow "{generatedWorkflow.name}" is ready to use in N8N.
                    </p>
                    
                    <div className="flex items-center gap-3 text-sm text-green-600 dark:text-green-300 mb-4">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {generatedWorkflow.metadata.estimatedComplexity}
                      </Badge>
                      <span>•</span>
                      <span>{generatedWorkflow.nodes.length} nodes</span>
                      <span>•</span>
                      <span>Generated {generatedWorkflow.metadata.generatedAt.toLocaleTimeString()}</span>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        size="sm" 
                        onClick={handleCopyJSON}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Copy JSON
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={showInstructions}
                        className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-300 dark:hover:bg-green-950"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        How to Use in N8N
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Use Case Input Section */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-sm font-medium">1</span>
                  </div>
                  <h3 className="font-medium">Describe your magical use case</h3>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Tell our magical AI what you want to automate. Include inputs, outputs, apps, and any constraints.
                </p>

                <div className="space-y-3">
                  <Textarea
                    placeholder="Example: I need to validate email addresses from contact form submissions, check if they're deliverable, and send different magical responses based on the validation results..."
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="min-h-[120px] resize-none border-border focus:border-primary/50 bg-background"
                    maxLength={maxLength}
                  />
                  
                  {/* Character Counter and Options */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Remaining: <span className={remainingChars < 100 ? 'text-destructive' : ''}>{remainingChars}</span>
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <Switch 
                          id="guide-notes"
                          checked={includeGuideNotes}
                          onCheckedChange={setIncludeGuideNotes}
                          className="data-[state=checked]:bg-primary"
                        />
                        <label htmlFor="guide-notes" className="text-sm text-muted-foreground cursor-pointer">
                          Include magical guide notes
                        </label>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Info className="w-4 h-4 mr-2" />
                      Insufficient Credits
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Looking for something more complex or bespoke?{" "}
                  <button 
                    onClick={handleRequestCustom}
                    className="text-primary hover:underline"
                  >
                    Request a custom magical workflow or node
                  </button>
                </p>
              </div>
            </Card>

            {/* Insufficient Credits Warning */}
            {hasInsufficientTokens && (
              <Alert className="border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/30">
                <AlertCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <AlertDescription className="text-cyan-800 dark:text-cyan-200">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Insufficient Credits for Magical Workflow Generation</h4>
                      <p className="text-sm">
                        You need at least {tokensRequired} tokens to generate a magical workflow. You currently have{" "}
                        <span className="font-medium">{user.tokens || 0} tokens</span> remaining.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Get More Credits</h5>
                        <p className="text-xs mb-3">
                          Purchase additional tokens to continue generating custom magical workflows with our AI.
                        </p>
                        <Button 
                          size="sm" 
                          onClick={onBuyTokens}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Purchase Credits
                        </Button>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Browse Existing Magical Templates</h5>
                        <p className="text-xs mb-3">
                          Explore our collection of pre-built magical templates that you can use immediately without generating new workflows.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={onBrowseTemplates}
                          className="border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Browse Magical Templates
                        </Button>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={!useCase.trim() || hasInsufficientTokens || isGenerating}
                size="lg"
                className="px-8 bg-gradient-to-r from-primary via-yellow-300 to-cyan-400 hover:from-primary/90 hover:via-yellow-300/90 hover:to-cyan-400/90 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 font-medium shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-600/40 border-t-slate-800 rounded-full animate-spin mr-2" />
                    Generating Magical Workflow...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Magical Workflow
                  </>
                )}
              </Button>
            </div>

            {/* Tips Section */}
            <Card className="p-6 bg-muted/30">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Tips for Better Magical Results
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✨</span>
                  <span>Be specific about the apps and services you want to magically connect</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✨</span>
                  <span>Describe the magical trigger that should start your workflow</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✨</span>
                  <span>Mention any data transformations or magical conditions needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✨</span>
                  <span>Include expected inputs and desired magical outputs</span>
                </li>
              </ul>
            </Card>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">{user.tokens || 0}</div>
                <div className="text-sm text-muted-foreground">Tokens Remaining</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">{tokensRequired}</div>
                <div className="text-sm text-muted-foreground">Tokens Required</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">~5min</div>
                <div className="text-sm text-muted-foreground">Generation Time</div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {generatedWorkflow && (
        <N8NInstructions
          isOpen={instructionsOpen}
          onClose={() => setInstructionsOpen(false)}
          type="ai-workflow"
          title={generatedWorkflow.name}
          jsonData={generatedWorkflow}
        />
      )}
    </div>
  );
}