import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Layers3, Download } from "lucide-react";

export function LogoExporter() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadSVG = (svgElement: SVGElement, filename: string) => {
    setDownloading(filename);
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = filename;
    downloadLink.click();
    URL.revokeObjectURL(svgUrl);
    setTimeout(() => setDownloading(null), 1000);
  };

  const downloadPNG = (svgElement: SVGElement, filename: string, width = 200, height = 200) => {
    setDownloading(filename);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = filename;
          downloadLink.click();
          URL.revokeObjectURL(pngUrl);
        }
      }, "image/png");
      
      URL.revokeObjectURL(svgUrl);
      setTimeout(() => setDownloading(null), 1000);
    };
    img.src = svgUrl;
  };

  const handleDownload = (type: "svg" | "png", variant: string) => {
    const svgElement = document.getElementById(`logo-${variant}`) as SVGElement;
    if (!svgElement) return;

    const filename = `n8n-bazar-logo-${variant}.${type}`;
    
    if (type === "svg") {
      downloadSVG(svgElement, filename);
    } else {
      downloadPNG(svgElement, filename);
    }
  };

  const LogoVariant = ({ 
    id, 
    title, 
    description, 
    children 
  }: { 
    id: string; 
    title: string; 
    description: string; 
    children: React.ReactNode;
  }) => (
    <Card className="border-primary/20 hover:border-primary/40 transition-colors">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Preview */}
        <div className="flex justify-center p-8 bg-muted/30 rounded-lg">
          {children}
        </div>
        
        {/* Download Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("svg", id)}
            disabled={downloading === `n8n-bazar-logo-${id}.svg`}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading === `n8n-bazar-logo-${id}.svg` ? "Downloading..." : "SVG"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("png", id)}
            disabled={downloading === `n8n-bazar-logo-${id}.png`}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading === `n8n-bazar-logo-${id}.png` ? "Downloading..." : "PNG"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
          N8N Bazar Logo Assets
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Download your brand assets in different formats. Available in both SVG (vector) and PNG (raster) formats 
          for all your branding needs.
        </p>
      </div>

      {/* Logo Variants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Blue Box Only */}
        <LogoVariant
          id="box"
          title="Brand Box"
          description="Gradient box element only"
        >
          <svg
            id="logo-box"
            width="80"
            height="80"
            viewBox="0 0 80 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D4AA" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <rect
              width="80"
              height="80"
              rx="16"
              ry="16"
              fill="url(#brandGradient)"
            />
          </svg>
        </LogoVariant>

        {/* Stack Icon Only */}
        <LogoVariant
          id="icon"
          title="Stack Icon"
          description="Layers icon element only"
        >
          <svg
            id="logo-icon"
            width="80"
            height="80"
            viewBox="0 0 80 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <Layers3 
              width="80" 
              height="80" 
              className="text-primary"
              style={{ color: '#00D4AA' }}
            />
          </svg>
        </LogoVariant>

        {/* Box with Text Only */}
        <LogoVariant
          id="box-text"
          title="Box with Text"
          description="Gradient box with text outside"
        >
          <svg
            id="logo-box-text"
            width="200"
            height="80"
            viewBox="0 0 200 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="boxTextGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D4AA" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            
            {/* Background gradient box - same as complete logo */}
            <rect
              x="4"
              y="4"
              width="72"
              height="72"
              rx="16"
              ry="16"
              fill="url(#boxTextGradient)"
            />
            
            {/* Text positioned outside the box - same positioning as complete logo */}
            <text
              x="90"
              y="35"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="24"
              fontWeight="bold"
              fill="currentColor"
            >
              N8N
            </text>
            <text
              x="90"
              y="60"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="24"
              fontWeight="bold"
              fill="#00D4AA"
            >
              Bazar
            </text>
          </svg>
        </LogoVariant>

        {/* Complete Logo */}
        <LogoVariant
          id="complete"
          title="Complete Logo"
          description="Full logo with text"
        >
          <svg
            id="logo-complete"
            width="200"
            height="80"
            viewBox="0 0 200 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="completeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D4AA" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            
            {/* Background gradient box */}
            <rect
              x="4"
              y="4"
              width="72"
              height="72"
              rx="16"
              ry="16"
              fill="url(#completeGradient)"
            />
            
            {/* Inner white circle */}
            <rect
              x="8"
              y="8"
              width="64"
              height="64"
              rx="12"
              ry="12"
              fill="white"
            />
            
            {/* Layers icon */}
            <g transform="translate(20, 20)">
              <path
                d="M2 12L7 17L12 12M2 7L7 12L12 7M2 2L7 7L12 2"
                stroke="#00D4AA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                transform="scale(1.6)"
              />
            </g>
            
            {/* Text */}
            <text
              x="90"
              y="35"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="24"
              fontWeight="bold"
              fill="currentColor"
            >
              N8N
            </text>
            <text
              x="90"
              y="60"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="24"
              fontWeight="bold"
              fill="#00D4AA"
            >
              Bazar
            </text>
          </svg>
        </LogoVariant>
      </div>

      {/* Usage Guidelines */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2 text-primary">Brand Box</h3>
              <p className="text-muted-foreground">
                Use as a standalone brand element, favicon, or when space is limited. 
                Maintains brand recognition through the signature gradient.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-primary">Stack Icon</h3>
              <p className="text-muted-foreground">
                Perfect for technical documentation, developer tools, or when you need 
                a clean icon representation of the platform.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-primary">Box with Text</h3>
              <p className="text-muted-foreground">
                Ideal for banners, buttons, and headers where you need the brand name 
                prominently displayed within the gradient box.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-primary">Complete Logo</h3>
              <p className="text-muted-foreground">
                Use for headers, marketing materials, and official documents. 
                Provides full brand identity with name recognition.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <h3 className="font-medium mb-2">Color Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Primary Brand Color:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00D4AA' }}></div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">#00D4AA</code>
                </div>
              </div>
              <div>
                <span className="font-medium">Gradient End:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22d3ee' }}></div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">#22d3ee</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}