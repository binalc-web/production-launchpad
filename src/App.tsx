import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { HeroSection } from "./components/HeroSection";
import { MainDashboard } from "./components/MainDashboard";
import { SearchResults } from "./components/SearchResults";
import { TemplateDetailView } from "./components/TemplateDetailView";
import { BuildYourOwnNode } from "./components/BuildYourOwnNode";
import { ImportJSON } from "./components/ImportJSON";
import { PricingCalculator } from "./components/PricingCalculator";
import { BuyTokensPage } from "./components/BuyTokensPage";
import { AIWorkflowGeneration } from "./components/AIWorkflowGeneration";
import { MyTemplates } from "./components/MyTemplates";
import { WorkflowHistory } from "./components/WorkflowHistory";
import { CreateWorkflow } from "./components/CreateWorkflow";
import { TemplateLibrary } from "./components/TemplateLibrary";
import { TemplateExplorer } from "./components/TemplateExplorer";
import { NodeSearch } from "./components/NodeSearch";
import { NodeDetail } from "./components/NodeDetail";
import { GoogleLoginDialog } from "./components/GoogleLoginDialog";
import { FeaturesSection } from "./components/FeaturesSection";
import { StatsSection } from "./components/StatsSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { Footer } from "./components/Footer";
import { LogoDesigner } from "./components/LogoDesigner";
import { LogoOptions } from "./components/LogoOptions";
import { LogoExporter } from "./components/LogoExporter";
import { PricingPage } from "./components/PricingPage";
import { ProductTour } from "./components/ProductTour";
import { EmailTemplatePreview } from "./components/EmailTemplatePreview";
import { mockTemplates, WorkflowTemplate } from "./data/mockTemplates";
import { N8NNode } from "./data/mockNodes";
import { Toaster } from "./components/ui/sonner";
import { NodeLibrary } from "./components/NodeLibrary";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
  searchUsage?: {
    aiSearches: number;
    simpleSearches: number;
    maxAiSearches: number;
    maxSimpleSearches: number;
  };
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WorkflowTemplate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<"ai" | "simple">("ai");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [pendingSearch, setPendingSearch] = useState<{query: string, mode: "ai" | "simple"} | null>(null);
  const [recentSearches, setRecentSearches] = useState<Array<{
    query: string;
    timestamp: Date;
    results: WorkflowTemplate[];
    mode: "ai" | "simple";
  }>>([]);
  
  // Pricing and authentication flow state
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [hasSeenPricing, setHasSeenPricing] = useState(false);
  
  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('search');

  // Product tour state
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  // Check if user is authenticated on component mount
  useEffect(() => {
    // In a real app, you would check for stored auth tokens or session
    const storedUser = localStorage.getItem('user');
    const storedHasSeenPricing = localStorage.getItem('hasSeenPricing');
    const storedHasCompletedTour = localStorage.getItem('hasCompletedTour');
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // Ensure search usage is initialized
      if (!userData.searchUsage) {
        userData.searchUsage = {
          aiSearches: 0,
          simpleSearches: 0,
          maxAiSearches: 5,
          maxSimpleSearches: 3
        };
      }
      setUser(userData);
    }
    
    if (storedHasSeenPricing) {
      setHasSeenPricing(JSON.parse(storedHasSeenPricing));
    }

    if (storedHasCompletedTour) {
      setHasCompletedTour(JSON.parse(storedHasCompletedTour));
    }
    
    // Load recent searches from localStorage
    const storedSearches = localStorage.getItem('recentSearches');
    if (storedSearches) {
      const parsed = JSON.parse(storedSearches);
      // Convert timestamp strings back to Date objects
      const searchesWithDates = parsed.map((search: any) => ({
        ...search,
        timestamp: new Date(search.timestamp),
        mode: search.mode || 'ai' // Default to 'ai' for backward compatibility
      }));
      setRecentSearches(searchesWithDates);
    }
  }, []);

  // Auto-start tour for new authenticated users
  useEffect(() => {
    if (user && !hasCompletedTour && !isTourOpen) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, hasCompletedTour, isTourOpen]);

  const handleSearch = (query: string, mode: "ai" | "simple" = "ai") => {
    setSearchQuery(query.toLowerCase());
    setSearchMode(mode);
    setHasSearched(true);
    setSelectedTemplate(null);
    setActiveSection('search-results'); // Change to search results view

    // Check if user is logged in
    if (!user) {
      // Store the search query and mode for after login
      setPendingSearch({ query, mode });
      // Show pricing if user hasn't seen it, otherwise show login
      if (!hasSeenPricing) {
        setShowPricing(true);
      } else {
        setIsLoginDialogOpen(true);
      }
      return;
    }

    // Execute search immediately if user is logged in
    executeSearch(query, mode);
  };

  const executeSearch = (query: string, mode: "ai" | "simple") => {
    if (!user) return;

    // Check if user has remaining free searches
    const hasRemainingSearches = mode === "ai" 
      ? (user.searchUsage?.aiSearches || 0) < (user.searchUsage?.maxAiSearches || 5)
      : (user.searchUsage?.simpleSearches || 0) < (user.searchUsage?.maxSimpleSearches || 3);

    // For paid plans, allow unlimited searches
    const isPaidPlan = user.plan && user.plan !== 'free';
    
    if (query.trim() === "") {
      setSearchResults(mockTemplates);
      return;
    }

    // Filter templates based on search query
    const filtered = mockTemplates.filter(template => 
      template.name.toLowerCase().includes(query.toLowerCase()) ||
      template.description.toLowerCase().includes(query.toLowerCase()) ||
      template.category.toLowerCase().includes(query.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
      template.author.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);

    // Update search usage if it's a free plan and user has remaining searches
    if (!isPaidPlan && hasRemainingSearches) {
      const updatedUser = {
        ...user,
        searchUsage: {
          ...user.searchUsage,
          aiSearches: mode === "ai" ? (user.searchUsage?.aiSearches || 0) + 1 : (user.searchUsage?.aiSearches || 0),
          simpleSearches: mode === "simple" ? (user.searchUsage?.simpleSearches || 0) + 1 : (user.searchUsage?.simpleSearches || 0),
          maxAiSearches: user.searchUsage?.maxAiSearches || 5,
          maxSimpleSearches: user.searchUsage?.maxSimpleSearches || 3
        }
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    // Add to recent searches if query is not empty and user is logged in
    if (query.trim() && user) {
      const newSearch = {
        query: query.trim(),
        timestamp: new Date(),
        results: filtered.slice(0, 6), // Store up to 6 results for preview
        mode: mode
      };

      setRecentSearches(prev => {
        // Remove duplicate searches and limit to 5 recent searches
        const filtered = prev.filter(search => 
          search.query.toLowerCase() !== query.toLowerCase() || search.mode !== mode
        );
        const updated = [newSearch, ...filtered].slice(0, 5);
        
        // Store in localStorage
        localStorage.setItem('recentSearches', JSON.stringify(updated));
        
        return updated;
      });
    }
  };

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    // Check if user is logged in before showing template details
    if (!user) {
      if (!hasSeenPricing) {
        setShowPricing(true);
      } else {
        setIsLoginDialogOpen(true);
      }
      return;
    }
    setSelectedTemplate(template);
  };

  const handleBackToResults = () => {
    setSelectedTemplate(null);
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    setShowPricing(false);
    setHasSeenPricing(true);
    localStorage.setItem('hasSeenPricing', JSON.stringify(true));
    
    // Show login dialog after plan selection
    setIsLoginDialogOpen(true);
  };

  const handleSkipPricing = () => {
    setSelectedPlan('free');
    setShowPricing(false);
    setHasSeenPricing(true);
    localStorage.setItem('hasSeenPricing', JSON.stringify(true));
    
    // Show login dialog after skipping
    setIsLoginDialogOpen(true);
  };

  const handleLogin = (userData: User) => {
    // Add plan and token information based on selected plan
    const planDetails = getPlanDetails(selectedPlan || 'free');
    const userWithPlan = {
      ...userData,
      plan: selectedPlan || 'free',
      tokens: planDetails.tokens,
      searchUsage: {
        aiSearches: 0,
        simpleSearches: 0,
        maxAiSearches: 5,
        maxSimpleSearches: 3
      }
    };
    
    setUser(userWithPlan);
    setIsLoginDialogOpen(false);
    
    // Store user data in localStorage (in a real app, you'd use proper auth tokens)
    localStorage.setItem('user', JSON.stringify(userWithPlan));
    
    // If there was a pending search, execute it now
    if (pendingSearch) {
      executeSearch(pendingSearch.query, pendingSearch.mode);
      setPendingSearch(null);
    }
  };

  const getPlanDetails = (planId: string) => {
    switch (planId) {
      case 'starter':
        return { tokens: 2000, name: 'Starter' };
      case 'professional':
        return { tokens: 5418, name: 'Professional' };
      case 'enterprise':
        return { tokens: 10942, name: 'Enterprise' };
      case 'free':
      default:
        return { tokens: 100, name: 'Free' };
    }
  };

  const handleLogout = () => {
    setUser(null);
    setHasSearched(false);
    setSearchResults([]);
    setSearchQuery("");
    setSelectedTemplate(null);
    setPendingSearch(null);
    setActiveSection('search');
    setRecentSearches([]);
    setSelectedPlan(null);
    setHasSeenPricing(false);
    setHasCompletedTour(false);
    
    // Clear stored user data
    localStorage.removeItem('user');
    localStorage.removeItem('recentSearches');
    localStorage.removeItem('hasSeenPricing');
    localStorage.removeItem('hasCompletedTour');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const openLoginDialog = () => {
    if (!hasSeenPricing) {
      setShowPricing(true);
    } else {
      setIsLoginDialogOpen(true);
    }
  };

  const closeLoginDialog = () => {
    setIsLoginDialogOpen(false);
    setPendingSearch(null);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSelectedTemplate(null);
    
    // Reset search state when switching sections
    if (section !== 'search' && section !== 'search-results') {
      setHasSearched(false);
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleBuyTokensFromAI = () => {
    setActiveSection('buy-tokens');
  };

  const handleBrowseTemplatesFromAI = () => {
    setActiveSection('search');
  };

  const startTour = () => {
    setIsTourOpen(true);
  };

  const closeTour = () => {
    setIsTourOpen(false);
    setHasCompletedTour(true);
  };

  // Check if user can perform searches
  const canSearch = (mode: "ai" | "simple") => {
    if (!user) return false;
    if (user.plan && user.plan !== 'free') return true; // Paid plans have unlimited searches
    
    return mode === "ai" 
      ? (user.searchUsage?.aiSearches || 0) < (user.searchUsage?.maxAiSearches || 5)
      : (user.searchUsage?.simpleSearches || 0) < (user.searchUsage?.maxSimpleSearches || 3);
  };

  // Show pricing page
  if (showPricing) {
    return (
      <div className={`${isDarkMode ? 'dark' : ''}`}>
        <PricingPage 
          onSelectPlan={handlePlanSelection}
          onSkipPricing={handleSkipPricing}
        />
      </div>
    );
  }

  // Show template detail view
  if (selectedTemplate) {
    return (
      <div className={`min-h-screen flex flex-col bg-background text-foreground ${isDarkMode ? 'dark' : ''}`}>
        <TemplateDetailView 
          template={selectedTemplate} 
          onBack={handleBackToResults}
        />
      </div>
    );
  }

  // Render main content based on active section
  const renderMainContent = () => {
    if (!user) {
      // Show landing page for non-authenticated users
      return (
        <>
          <HeroSection onSearch={(query) => handleSearch(query, "ai")} hasSearched={hasSearched} />
          {hasSearched ? (
            <section className="py-16 px-6">
              <div className="max-w-2xl mx-auto text-center">
                <p className="text-muted-foreground">Please sign in to view search results.</p>
              </div>
            </section>
          ) : (
            <>
              <FeaturesSection />
              <StatsSection />
              <TestimonialsSection />
            </>
          )}
        </>
      );
    }

    // Authenticated user content
    switch (activeSection) {
      case 'search':
        return (
          <MainDashboard 
            user={user} 
            onTemplateSelect={handleTemplateSelect} 
            onSearch={handleSearch}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
          />
        );
      
      case 'search-results':
        return (
          <div className="flex-1 p-6">
            <SearchResults 
              results={searchResults}
              searchQuery={searchQuery}
              searchMode={searchMode}
              user={user}
              canSearch={canSearch}
              onTemplateSelect={handleTemplateSelect}
              onBackToSearch={() => setActiveSection('search')}
              onUpgrade={() => setActiveSection('buy-tokens')}
              recentSearches={recentSearches}
              onRecentSearchSelect={(query, mode) => handleSearch(query, mode || "ai")}
            />
          </div>
        );
      
      case 'ai-generation':
        return (
          <AIWorkflowGeneration 
            user={user} 
            onBuyTokens={handleBuyTokensFromAI}
            onBrowseTemplates={handleBrowseTemplatesFromAI}
          />
        );
      
      case 'node-library':
        return <NodeLibrary />;
      
      case 'my-templates':
        return <MyTemplates user={user} />;
      
      case 'favorites':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center mt-20">
              <h2 className="text-2xl font-medium mb-4">Favorites</h2>
              <p className="text-muted-foreground">Your favorited templates will appear here.</p>
            </div>
          </div>
        );
      
      case 'recent':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center mt-20">
              <h2 className="text-2xl font-medium mb-4">Recent</h2>
              <p className="text-muted-foreground">Your recently viewed templates will appear here.</p>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center mt-20">
              <h2 className="text-2xl font-medium mb-4">Settings</h2>
              <p className="text-muted-foreground">Configure your account preferences.</p>
            </div>
          </div>
        );
      
      case 'buy-tokens':
        return user ? <BuyTokensPage user={user} /> : <PricingCalculator />;
      
      case 'logo-options':
        return <LogoOptions />;
      
      case 'logo-exporter':
        return <LogoExporter />;
      
      case 'email-templates':
        return <EmailTemplatePreview />;
      
      case 'request-custom':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center mt-20">
              <h2 className="text-2xl font-medium mb-4">Request Custom Build</h2>
              <p className="text-muted-foreground">Request a custom workflow built by our experts.</p>
            </div>
          </div>
        );
      
      case 'report-issue':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center mt-20">
              <h2 className="text-2xl font-medium mb-4">Report an Issue</h2>
              <p className="text-muted-foreground">Report bugs or suggest improvements.</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center mt-20">
              <h2 className="text-2xl font-medium mb-4">Feature Coming Soon</h2>
              <p className="text-muted-foreground">This feature is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${isDarkMode ? 'dark' : ''}`}>
      <Header 
        isDarkMode={isDarkMode} 
        onToggleTheme={toggleTheme}
        user={user}
        onLogin={openLoginDialog}
        onLogout={handleLogout}
        onStartTour={startTour}
      />
      
      <div className="flex flex-1">
        {/* Left Sidebar - Only show when user is logged in */}
        {user && (
          <LeftSidebar 
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            className="flex-shrink-0"
          />
        )}
        
        {/* Main Content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${user ? 'min-w-0' : ''}`}>
          {renderMainContent()}
          
          {/* Footer - Only show for landing page */}
          {!user && <Footer />}
        </div>
      </div>
      
      <GoogleLoginDialog 
        isOpen={isLoginDialogOpen}
        onClose={closeLoginDialog}
        onLogin={handleLogin}
      />

      {/* Product Tour */}
      <ProductTour
        isOpen={isTourOpen}
        onClose={closeTour}
        user={user}
        onSectionChange={handleSectionChange}
        currentSection={activeSection}
      />
      
      <Toaster />
    </div>
  );
}