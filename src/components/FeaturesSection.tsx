import { Card, CardContent } from "./ui/card";
import { Sparkles, Upload, Bot, Globe, Puzzle, MessageSquare } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Sparkles,
      title: "Magically Fast",
      description: "Build complex workflows quickly with our optimized templates and one-click magical installation."
    },
    {
      icon: Upload,
      title: "Upload & Share Your Magic",
      description: "Upload your own templates, edit them, and share them to the marketplace for the community to discover."
    },
    {
      icon: Bot,
      title: "AI Customized Workflows",
      description: "Let our AI magically customize workflows to your exact needs. Describe what you want, and watch the magic happen."
    },
    {
      icon: MessageSquare,
      title: "Request Nodes on Demand",
      description: "Need a specific node that doesn't exist? Request it from our magical development team and we'll create it for you."
    },
    {
      icon: Globe,
      title: "Global Integrations",
      description: "Connect with 500+ services and applications. From social media to enterprise tools, magically."
    },
    {
      icon: Puzzle,
      title: "Easy to Customize",
      description: "Modify any workflow to fit your exact needs. No coding experience required - just magic!"
    }
  ];

  return (
    <section className="w-full px-6 py-20 bg-gradient-to-b from-white to-cyan-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-cyan-400 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl mb-4 bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
            Why Choose N8N Bazar?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The most comprehensive magical marketplace for N8N workflow templates. 
            Built by developers, for developers, with a touch of magic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/15 to-cyan-400/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-medium">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}