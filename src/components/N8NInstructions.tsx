import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { 
  Download,
  Copy,
  ExternalLink,
  CheckCircle,
  Play,
  Settings,
  Upload,
  FileText,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  Zap,
  Code,
  Link
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface N8NInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'template' | 'ai-workflow' | 'node' | 'my-template';
  title?: string;
  downloadUrl?: string;
  jsonData?: any;
}

export function N8NInstructions({ 
  isOpen, 
  onClose, 
  type, 
  title = "Workflow",
  downloadUrl,
  jsonData 
}: N8NInstructionsProps) {
  const [activeTab, setActiveTab] = useState("instructions");
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopyJSON = () => {
    if (jsonData) {
      navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      toast.success("Workflow JSON copied to clipboard!");
    }
  };

  const handleCopyStep = (stepContent: string, stepIndex: number) => {
    navigator.clipboard.writeText(stepContent);
    setCopiedStep(stepIndex);
    toast.success("Step copied to clipboard!");
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const getInstructionsByType = () => {
    switch (type) {
      case 'template':
        return {
          title: `How to Use "${title}" in N8N`,
          description: "Follow these steps to import and set up your downloaded template in N8N",
          steps: [
            {
              title: "Download the Template",
              description: "First, download the workflow JSON file to your computer",
              action: "Click the download button above to save the .json file",
              copyContent: downloadUrl || "Download the workflow JSON file",
              icon: Download
            },
            {
              title: "Access Your N8N Instance",
              description: "Open your N8N workflow editor",
              action: "Go to your N8N instance at https://your-n8n-instance.com or open your local N8N installation",
              copyContent: "https://your-n8n-instance.com",
              icon: ExternalLink
            },
            {
              title: "Create New Workflow",
              description: "Start with a fresh workflow in N8N",
              action: "Click 'New Workflow' in your N8N dashboard or use Ctrl+Alt+N",
              copyContent: "Create New Workflow (Ctrl+Alt+N)",
              icon: Play
            },
            {
              title: "Import the Template",
              description: "Import the downloaded JSON file into N8N",
              action: "Go to 'Settings' → 'Import from File' → Select your downloaded .json file → Click 'Import'",
              copyContent: "Settings → Import from File → Select .json file → Import",
              icon: Upload
            },
            {
              title: "Configure Credentials",
              description: "Set up authentication for connected services",
              action: "Review each node with a warning icon and add your API keys, OAuth tokens, or connection credentials",
              copyContent: "Configure credentials for all nodes requiring authentication",
              icon: Settings
            },
            {
              title: "Test Your Workflow",
              description: "Execute a test run to ensure everything works",
              action: "Click 'Execute Workflow' button or press F5 to test the workflow with sample data",
              copyContent: "Execute Workflow (F5)",
              icon: Play
            },
            {
              title: "Activate & Deploy",
              description: "Turn on your workflow for automatic execution",
              action: "Toggle the 'Active' switch in the top-right corner to enable automatic execution",
              copyContent: "Toggle 'Active' switch to enable workflow",
              icon: CheckCircle
            }
          ],
          tips: [
            "Always test with sample data before activating",
            "Check that all required credentials are properly configured",
            "Review trigger conditions to ensure they match your needs",
            "Monitor the execution log for any errors after activation"
          ]
        };

      case 'ai-workflow':
        return {
          title: `How to Implement Your AI-Generated Workflow`,
          description: "Follow these steps to set up your custom AI-generated workflow in N8N",
          steps: [
            {
              title: "Copy Generated JSON",
              description: "Copy the AI-generated workflow configuration",
              action: "Click 'Copy JSON' button to copy the generated workflow to your clipboard",
              copyContent: "Copy the generated workflow JSON",
              icon: Copy
            },
            {
              title: "Open N8N Workflow Editor",
              description: "Navigate to your N8N instance",
              action: "Open your N8N instance and create a new workflow",
              copyContent: "Open N8N → Create New Workflow",
              icon: ExternalLink
            },
            {
              title: "Import via JSON",
              description: "Paste the generated workflow into N8N",
              action: "In N8N: Settings → Import from JSON → Paste the copied JSON → Import",
              copyContent: "Settings → Import from JSON → Paste JSON → Import",
              icon: Code
            },
            {
              title: "Review AI Suggestions",
              description: "Examine the AI-generated nodes and connections",
              action: "Review each node's configuration and modify parameters as needed for your specific use case",
              copyContent: "Review and customize node configurations",
              icon: Lightbulb
            },
            {
              title: "Add Missing Credentials",
              description: "Configure authentication for external services",
              action: "Set up credentials for APIs, databases, and other services used in the workflow",
              copyContent: "Configure authentication credentials",
              icon: Settings
            },
            {
              title: "Customize & Validate",
              description: "Adapt the workflow to your exact requirements",
              action: "Modify trigger conditions, data transformations, and output formats as needed",
              copyContent: "Customize workflow for your specific needs",
              icon: Settings
            },
            {
              title: "Test & Deploy",
              description: "Run tests and activate the workflow",
              action: "Execute test runs, fix any issues, then activate for production use",
              copyContent: "Test workflow → Fix issues → Activate",
              icon: CheckCircle
            }
          ],
          tips: [
            "AI-generated workflows are starting points - customize for your needs",
            "Test thoroughly with your actual data before going live",
            "The AI may suggest placeholder values - replace with real data",
            "Consider security and privacy when handling sensitive information"
          ]
        };

      case 'node':
        return {
          title: `How to Use This Node in Your N8N Workflow`,
          description: "Learn how to integrate this node into your N8N workflows",
          steps: [
            {
              title: "Open N8N Workflow Editor",
              description: "Start by opening your N8N instance",
              action: "Navigate to your N8N instance and open the workflow where you want to add this node",
              copyContent: "Open N8N workflow editor",
              icon: ExternalLink
            },
            {
              title: "Add the Node",
              description: "Search and add the node to your workflow",
              action: "Click the '+' button → Search for the node name → Click to add it to your canvas",
              copyContent: "Click '+' → Search node name → Add to canvas",
              icon: Play
            },
            {
              title: "Configure Node Settings",
              description: "Set up the node's parameters and options",
              action: "Double-click the node → Configure required fields, parameters, and options",
              copyContent: "Double-click node → Configure parameters",
              icon: Settings
            },
            {
              title: "Set Up Authentication",
              description: "Configure credentials if required",
              action: "If the node requires authentication, click 'Credential' → Create new or select existing credentials",
              copyContent: "Configure node credentials if required",
              icon: Settings
            },
            {
              title: "Connect to Other Nodes",
              description: "Link this node in your workflow chain",
              action: "Drag from the output connector to connect this node to the next step in your workflow",
              copyContent: "Connect node to workflow chain",
              icon: Link
            },
            {
              title: "Test the Node",
              description: "Verify the node works correctly",
              action: "Click 'Execute Node' to test with sample data and verify the output",
              copyContent: "Execute Node to test functionality",
              icon: Play
            }
          ],
          tips: [
            "Check the node documentation for specific configuration details",
            "Test individual nodes before building complex workflows",
            "Use the node's help documentation for parameter explanations",
            "Some nodes may require specific input data formats"
          ]
        };

      case 'my-template':
        return {
          title: `How to Use Your Uploaded Template`,
          description: "Steps to implement your own template that you've uploaded to the platform",
          steps: [
            {
              title: "Download Your Template",
              description: "Get your template file from the platform",
              action: "Click the 'Download' button next to your template to save the JSON file",
              copyContent: "Download template JSON file",
              icon: Download
            },
            {
              title: "Verify Template Structure",
              description: "Ensure your template is properly formatted",
              action: "Open the JSON file in a text editor to verify it contains valid N8N workflow structure",
              copyContent: "Verify JSON structure in text editor",
              icon: FileText
            },
            {
              title: "Import to N8N",
              description: "Load your template into N8N",
              action: "In N8N: Go to Settings → Import from File → Select your JSON file → Click Import",
              copyContent: "Settings → Import from File → Select JSON → Import",
              icon: Upload
            },
            {
              title: "Review & Update",
              description: "Check the imported workflow configuration",
              action: "Review all nodes, connections, and settings. Update any outdated configurations",
              copyContent: "Review nodes and connections, update configurations",
              icon: Settings
            },
            {
              title: "Configure Environment",
              description: "Set up credentials and environment-specific settings",
              action: "Add your API keys, database connections, and other credentials specific to your setup",
              copyContent: "Configure credentials and environment settings",
              icon: Settings
            },
            {
              title: "Test & Validate",
              description: "Ensure your template works in your environment",
              action: "Run test executions with your data to validate the workflow performs as expected",
              copyContent: "Test workflow with your actual data",
              icon: CheckCircle
            }
          ],
          tips: [
            "Keep your templates updated with the latest N8N version format",
            "Document any special setup requirements for your templates",
            "Test templates in a staging environment before production use",
            "Consider creating template variants for different use cases"
          ]
        };

      default:
        return {
          title: "N8N Integration Instructions",
          description: "General instructions for using N8N workflows",
          steps: [],
          tips: []
        };
    }
  };

  const instructions = getInstructionsByType();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            {instructions.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="instructions">Step-by-Step Guide</TabsTrigger>
            <TabsTrigger value="tips">Tips & Best Practices</TabsTrigger>
            <TabsTrigger value="resources">Resources & Links</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-muted-foreground">{instructions.description}</p>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              {jsonData && (
                <Button onClick={handleCopyJSON} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </Button>
              )}
              {downloadUrl && (
                <Button variant="outline" asChild>
                  <a href={downloadUrl} download className="gap-2">
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </Button>
              )}
              <Button variant="outline" asChild>
                <a 
                  href="https://docs.n8n.io/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  N8N Docs
                </a>
              </Button>
            </div>

            <div className="space-y-4">
              {instructions.steps.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <Card key={index} className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">{step.title}</h3>
                        </div>
                        
                        <p className="text-muted-foreground">{step.description}</p>
                        
                        <Alert>
                          <ArrowRight className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Action:</strong> {step.action}
                          </AlertDescription>
                        </Alert>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyStep(step.copyContent, index)}
                          className="gap-2"
                        >
                          {copiedStep === index ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy Step
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Tips & Best Practices</h3>
              </div>

              {instructions.tips.map((tip, index) => (
                <Alert key={index}>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>{tip}</AlertDescription>
                </Alert>
              ))}

              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-2">Important Security Note</h4>
                    <p className="text-sm text-muted-foreground">
                      Always review and validate any workflow before using it with sensitive data. 
                      Ensure all credentials are properly secured and follow your organization's security policies.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentation
                </h4>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://docs.n8n.io/" target="_blank" rel="noopener noreferrer">
                      N8N Official Documentation
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://docs.n8n.io/workflows/" target="_blank" rel="noopener noreferrer">
                      Workflow Creation Guide
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://docs.n8n.io/credentials/" target="_blank" rel="noopener noreferrer">
                      Credentials Setup
                    </a>
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Community
                </h4>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://community.n8n.io/" target="_blank" rel="noopener noreferrer">
                      N8N Community Forum
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://github.com/n8n-io/n8n" target="_blank" rel="noopener noreferrer">
                      N8N GitHub Repository
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://n8n.io/workflows/" target="_blank" rel="noopener noreferrer">
                      Template Library
                    </a>
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Tutorials
                </h4>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://docs.n8n.io/getting-started/" target="_blank" rel="noopener noreferrer">
                      Getting Started Guide
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://www.youtube.com/c/n8n-io" target="_blank" rel="noopener noreferrer">
                      Video Tutorials
                    </a>
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Tools
                </h4>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://n8n.io/integrations/" target="_blank" rel="noopener noreferrer">
                      Available Integrations
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                    <a href="https://docs.n8n.io/hosting/" target="_blank" rel="noopener noreferrer">
                      Self-Hosting Guide
                    </a>
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <a href="https://n8n.io/" target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open N8N
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}