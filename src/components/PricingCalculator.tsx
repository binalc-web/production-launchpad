import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Server,
  Globe,
  Shield,
  Clock,
  Users,
  Settings,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PricingParams {
  executions: number;
  dataTransfer: number; // GB per month
  storage: number; // GB
  concurrentWorkflows: number;
  users: number;
}

interface InfrastructurePricing {
  name: string;
  logo: string;
  color: string;
  monthlyBase: number;
  executionCost: number; // per 1000 executions
  storageCost: number; // per GB per month
  dataTransferCost: number; // per GB
  concurrencyCost: number; // per concurrent workflow
  userCost: number; // per user per month
  pros: string[];
  cons: string[];
  bestFor: string[];
  setupComplexity: 'Low' | 'Medium' | 'High';
  maintenance: 'Low' | 'Medium' | 'High';
  scalability: 'Low' | 'Medium' | 'High';
  security: 'Low' | 'Medium' | 'High';
}

const infrastructures: InfrastructurePricing[] = [
  {
    name: "N8N Cloud",
    logo: "⚡",
    color: "rgb(0, 212, 170)",
    monthlyBase: 20,
    executionCost: 0.002, // $2 per 1000 executions
    storageCost: 0.5, // $0.50 per GB
    dataTransferCost: 0.1, // $0.10 per GB
    concurrencyCost: 10, // $10 per concurrent workflow
    userCost: 15, // $15 per user
    pros: [
      "Fully managed service with zero maintenance",
      "Built-in monitoring and analytics",
      "Automatic updates and security patches",
      "Easy setup in minutes",
      "24/7 support and documentation",
      "Pre-built integrations and templates",
      "Auto-scaling capabilities"
    ],
    cons: [
      "Higher cost per execution at scale",
      "Limited customization options",
      "Vendor lock-in concerns",
      "Less control over infrastructure",
      "Data stored on third-party servers"
    ],
    bestFor: [
      "Small to medium businesses",
      "Teams without DevOps expertise",
      "Rapid prototyping and testing",
      "Non-technical users",
      "Quick time-to-market projects"
    ],
    setupComplexity: 'Low',
    maintenance: 'Low',
    scalability: 'High',
    security: 'High'
  },
  {
    name: "AWS",
    logo: "🟧",
    color: "rgb(255, 153, 0)",
    monthlyBase: 0,
    executionCost: 0.001, // $1 per 1000 executions (Lambda)
    storageCost: 0.023, // $0.023 per GB (S3)
    dataTransferCost: 0.09, // $0.09 per GB
    concurrencyCost: 5, // ECS/Lambda concurrency costs
    userCost: 0, // No per-user cost, but IAM complexity
    pros: [
      "Most cost-effective at high scale",
      "Extensive service ecosystem",
      "Pay-as-you-use pricing model",
      "Global infrastructure and CDN",
      "Advanced security and compliance",
      "Custom integrations with AWS services",
      "Massive scalability potential"
    ],
    cons: [
      "Complex setup and configuration",
      "Requires AWS expertise",
      "High maintenance overhead",
      "Steep learning curve",
      "Hidden costs can accumulate",
      "Time-consuming initial setup",
      "Need dedicated DevOps resources"
    ],
    bestFor: [
      "Large enterprises with high volume",
      "Teams with AWS expertise",
      "Complex integration requirements",
      "Cost-sensitive high-scale deployments",
      "Custom workflow requirements"
    ],
    setupComplexity: 'High',
    maintenance: 'High',
    scalability: 'High',
    security: 'High'
  },
  {
    name: "Azure",
    logo: "🔷",
    color: "rgb(0, 120, 212)",
    monthlyBase: 0,
    executionCost: 0.0012, // $1.20 per 1000 executions (Azure Functions)
    storageCost: 0.025, // $0.025 per GB (Blob Storage)
    dataTransferCost: 0.087, // $0.087 per GB
    concurrencyCost: 6, // Container instances
    userCost: 0, // Active Directory integration
    pros: [
      "Excellent Microsoft ecosystem integration",
      "Strong enterprise features",
      "Competitive pricing for Microsoft shops",
      "Built-in Active Directory integration",
      "Good compliance and governance tools",
      "Hybrid cloud capabilities",
      "Enterprise-grade security"
    ],
    cons: [
      "Complex pricing structure",
      "Requires Azure knowledge",
      "Less mature than AWS in some areas",
      "Vendor lock-in with Microsoft stack",
      "Setup complexity for non-Microsoft environments",
      "Limited third-party integrations",
      "Regional availability varies"
    ],
    bestFor: [
      "Microsoft-centric organizations",
      "Enterprises with Office 365",
      "Teams familiar with Azure",
      "Hybrid cloud deployments",
      "Compliance-heavy industries"
    ],
    setupComplexity: 'High',
    maintenance: 'High',
    scalability: 'High',
    security: 'High'
  }
];

export function PricingCalculator() {
  const [params, setParams] = useState<PricingParams>({
    executions: 10000,
    dataTransfer: 50,
    storage: 10,
    concurrentWorkflows: 2,
    users: 3
  });

  const [selectedInfra, setSelectedInfra] = useState<string>('N8N Cloud');

  const calculations = useMemo(() => {
    return infrastructures.map(infra => {
      const executionCost = (params.executions / 1000) * infra.executionCost;
      const storageCost = params.storage * infra.storageCost;
      const dataTransferCost = params.dataTransfer * infra.dataTransferCost;
      const concurrencyCost = params.concurrentWorkflows * infra.concurrencyCost;
      const userCost = params.users * infra.userCost;
      
      const monthlyTotal = infra.monthlyBase + executionCost + storageCost + 
                          dataTransferCost + concurrencyCost + userCost;
      
      return {
        ...infra,
        costs: {
          base: infra.monthlyBase,
          executions: executionCost,
          storage: storageCost,
          dataTransfer: dataTransferCost,
          concurrency: concurrencyCost,
          users: userCost,
          total: monthlyTotal
        }
      };
    });
  }, [params]);

  const chartData = calculations.map(calc => ({
    name: calc.name,
    'Monthly Cost': Math.round(calc.costs.total * 100) / 100,
    'Base Cost': calc.costs.base,
    'Execution Cost': Math.round(calc.costs.executions * 100) / 100,
    'Storage Cost': Math.round(calc.costs.storage * 100) / 100,
    'Other Costs': Math.round((calc.costs.dataTransfer + calc.costs.concurrency + calc.costs.users) * 100) / 100
  }));

  const updateParam = (key: keyof PricingParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const selectedInfraData = calculations.find(calc => calc.name === selectedInfra);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium">Infrastructure Pricing Calculator</h1>
            <p className="text-sm text-muted-foreground">Compare costs across AWS, Azure, and N8N Cloud</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Adjust your usage parameters
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Executions */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Monthly Executions
                  </span>
                  <span className="text-sm font-medium">{params.executions.toLocaleString()}</span>
                </Label>
                <Slider
                  value={[params.executions]}
                  onValueChange={([value]) => updateParam('executions', value)}
                  max={1000000}
                  min={1000}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1K</span>
                  <span>1M</span>
                </div>
              </div>

              {/* Data Transfer */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Data Transfer (GB/month)
                  </span>
                  <span className="text-sm font-medium">{params.dataTransfer}</span>
                </Label>
                <Slider
                  value={[params.dataTransfer]}
                  onValueChange={([value]) => updateParam('dataTransfer', value)}
                  max={1000}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Storage */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Storage (GB)
                  </span>
                  <span className="text-sm font-medium">{params.storage}</span>
                </Label>
                <Slider
                  value={[params.storage]}
                  onValueChange={([value]) => updateParam('storage', value)}
                  max={1000}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Concurrent Workflows */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Concurrent Workflows
                  </span>
                  <span className="text-sm font-medium">{params.concurrentWorkflows}</span>
                </Label>
                <Slider
                  value={[params.concurrentWorkflows]}
                  onValueChange={([value]) => updateParam('concurrentWorkflows', value)}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Users */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </span>
                  <span className="text-sm font-medium">{params.users}</span>
                </Label>
                <Slider
                  value={[params.users]}
                  onValueChange={([value]) => updateParam('users', value)}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cost Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Cost Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [`$${value}`, name]}
                      labelFormatter={(label) => `${label} Infrastructure`}
                    />
                    <Legend />
                    <Bar dataKey="Monthly Cost" fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {calculations.map((calc) => (
              <Card 
                key={calc.name} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedInfra === calc.name ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedInfra(calc.name)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{calc.logo}</span>
                      <h3 className="font-medium">{calc.name}</h3>
                    </div>
                    {calc.costs.total === Math.min(...calculations.map(c => c.costs.total)) && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Cheapest
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-medium" style={{ color: calc.color }}>
                      ${Math.round(calc.costs.total * 100) / 100}
                    </div>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    {calc.costs.base > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base:</span>
                        <span>${calc.costs.base}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Executions:</span>
                      <span>${Math.round(calc.costs.executions * 100) / 100}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage:</span>
                      <span>${Math.round(calc.costs.storage * 100) / 100}</span>
                    </div>
                    {calc.costs.users > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Users:</span>
                        <span>${calc.costs.users}</span>
                      </div>
                    )}
                  </div>

                  {/* Complexity Indicators */}
                  <div className="flex flex-wrap gap-1 pt-2">
                    <Badge variant="outline" className={`text-xs ${getComplexityColor(calc.setupComplexity)}`}>
                      Setup: {calc.setupComplexity}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getComplexityColor(calc.maintenance)}`}>
                      Maintenance: {calc.maintenance}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Comparison */}
          {selectedInfraData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{selectedInfraData.logo}</span>
                  {selectedInfraData.name} - Detailed Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pros-cons">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pros-cons">Pros & Cons</TabsTrigger>
                    <TabsTrigger value="best-for">Best For</TabsTrigger>
                    <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pros-cons" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Pros
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {selectedInfraData.pros.map((pro, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Cons
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {selectedInfraData.cons.map((con, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="best-for" className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Best For
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedInfraData.bestFor.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${getComplexityColor(selectedInfraData.setupComplexity)}`}>
                          Setup: {selectedInfraData.setupComplexity}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${getComplexityColor(selectedInfraData.maintenance)}`}>
                          Maintenance: {selectedInfraData.maintenance}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${getComplexityColor(selectedInfraData.scalability)}`}>
                          Scalability: {selectedInfraData.scalability}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${getComplexityColor(selectedInfraData.security)}`}>
                          Security: {selectedInfraData.security}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="breakdown" className="space-y-4">
                    <div className="space-y-3">
                      {selectedInfraData.costs.base > 0 && (
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Base Monthly Fee</span>
                          <span className="font-medium">${selectedInfraData.costs.base}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-3 bg-muted/50 rounded">
                        <span>Executions ({params.executions.toLocaleString()}/month)</span>
                        <span className="font-medium">${Math.round(selectedInfraData.costs.executions * 100) / 100}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-muted/50 rounded">
                        <span>Storage ({params.storage} GB)</span>
                        <span className="font-medium">${Math.round(selectedInfraData.costs.storage * 100) / 100}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-muted/50 rounded">
                        <span>Data Transfer ({params.dataTransfer} GB)</span>
                        <span className="font-medium">${Math.round(selectedInfraData.costs.dataTransfer * 100) / 100}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-muted/50 rounded">
                        <span>Concurrency ({params.concurrentWorkflows} workflows)</span>
                        <span className="font-medium">${selectedInfraData.costs.concurrency}</span>
                      </div>
                      {selectedInfraData.costs.users > 0 && (
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Team Members ({params.users} users)</span>
                          <span className="font-medium">${selectedInfraData.costs.users}</span>
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="flex justify-between p-3 bg-primary/10 rounded font-medium">
                        <span>Total Monthly Cost</span>
                        <span className="text-primary">${Math.round(selectedInfraData.costs.total * 100) / 100}</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">💡 Recommendation</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Start with N8N Cloud</strong> for quick setup and testing, then consider self-hosting on AWS/Azure 
                if you need more control or have high execution volumes ({'>'}50K/month) where cost savings become significant.
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}