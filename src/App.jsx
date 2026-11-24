import { AuthProvider } from "./context/AuthProvider";
import { PlatformDeployModeProvider } from "./context/PlatformDeployModeProvider";
import { Toaster } from "@/components/ui/sonner";
import { Routes } from "./Routes/Routes";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { FindInPageProvider } from "@/features/find-in-page";

const App = () => {
  return (
    <AppErrorBoundary>
      <FindInPageProvider>
        <AuthProvider>
          <PlatformDeployModeProvider>
            <Routes />
            <Toaster />
          </PlatformDeployModeProvider>
        </AuthProvider>
      </FindInPageProvider>
    </AppErrorBoundary>
  );
};

export default App;
