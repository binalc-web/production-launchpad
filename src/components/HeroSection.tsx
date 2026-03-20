import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Sparkles } from "lucide-react";
import { Logo } from "./Logo";

interface HeroSectionProps {
  onSearch: (query: string) => void;
  hasSearched: boolean;
}

export function HeroSection({ onSearch, hasSearched }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("prompt");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const filterButtons = [
    { id: "prompt", label: "By Prompt", icon: "✨" },
    { id: "category", label: "By Category", icon: "📁" },
    { id: "keywords", label: "By Keywords", icon: "#" },
  ];

  const quickSearchIdeas = [
    "Automate customer onboarding with CRM integration",
    "Sync data between Google Sheets and Airtable",
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-br from-background via-primary/5 to-cyan-400/10">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,212,170,0.05)_25%,rgba(0,212,170,0.05)_50%,transparent_50%,transparent_75%,rgba(0,212,170,0.05)_75%)] bg-[length:60px_60px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Logo size="md" />
        </div>

        {/* Main Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Discover Usefull</span>
            <br />
            <span className="inline-flex items-center gap-4">
              <span className="text-red-500 inline-flex items-center gap-2">
                <Sparkles className="w-8 h-8 md:w-12 md:h-12" />
                n8n
              </span>
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Workflows
              </span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Find, share, and customize powerful automation workflows. Discover
            templates for your favorite apps and services.
          </p>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            This is testing line
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {filterButtons.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "outline"}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-6 py-3 rounded-full transition-all duration-200 ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "border-primary/30 hover:border-primary hover:bg-primary/5"
              }`}
            >
              <span className="mr-2">{filter.icon}</span>
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-4xl mx-auto">
            <div className="relative flex items-center">
              <div className="relative flex-1">
                <Sparkles className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-primary" />
                <Input
                  type="text"
                  placeholder="Tell me what workflow you're looking for..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-16 pr-4 py-6 text-lg bg-background/90 backdrop-blur border-2 border-primary/20 focus:border-primary shadow-xl rounded-2xl"
                />
              </div>
              <Button
                type="submit"
                className="ml-4 px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-2xl shadow-xl"
                disabled={!searchQuery.trim()}
              >
                Find Workflows
              </Button>
            </div>
          </div>
        </form>

        {/* Quick Search Ideas */}
        <div className="mb-16">
          <p className="text-sm text-muted-foreground mb-4 font-medium">
            Quick search ideas:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {quickSearchIdeas.map((idea, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(idea)}
                className="px-4 py-2 text-sm bg-background/60 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
