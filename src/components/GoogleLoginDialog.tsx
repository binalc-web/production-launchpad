import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Chrome, Loader2 } from "lucide-react";

interface GoogleLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { email: string; name: string; picture?: string }) => void;
}

export function GoogleLoginDialog({ isOpen, onClose, onLogin }: GoogleLoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Simulate Google OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful Google login response
      const mockGoogleUser = {
        email: "user@gmail.com",
        name: "John Doe",
        picture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
      };
      
      onLogin(mockGoogleUser);
      onClose();
    } catch (error) {
      console.error('Google login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Welcome to N8N Bazar</DialogTitle>
          <DialogDescription className="text-base">
            Sign in with Google to access thousands of workflow templates and start automating your tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Google Login Button */}
          <Button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 gap-3 transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Chrome className="h-5 w-5" />
            )}
            <span className="text-base font-medium">
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </Button>

          {/* Benefits */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
              </div>
              <span className="text-muted-foreground">Access to 1000+ workflow templates</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-xs">✓</span>
              </div>
              <span className="text-muted-foreground">One-click template deployment</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 text-xs">✓</span>
              </div>
              <span className="text-muted-foreground">Save and organize your workflows</span>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}