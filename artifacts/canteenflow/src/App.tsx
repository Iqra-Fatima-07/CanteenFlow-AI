import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/react";
import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import MenuPage from "@/pages/menu";
import OrdersPage from "@/pages/orders";
import SeatsPage from "@/pages/seats";
import DashboardPage from "@/pages/dashboard";
import SelectRolePage from "@/pages/select-role";
import AuthGatePage from "@/pages/auth-gate";
import ProfilePage from "@/pages/profile";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { FlowieChat } from "@/components/FlowieChat";
import { GamificationOverlay } from "@/components/GamificationOverlay";
import { useLocation } from "wouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AuthTokenSetter() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function NotificationWatcher() {
  useOrderNotifications();
  return null;
}

function FlowieAndGamification() {
  const [location] = useLocation();
  const showFlowie = location !== "/" && location !== "/select-role" && location !== "/auth-gate";
  return (
    <>
      {showFlowie && <FlowieChat />}
      <GamificationOverlay />
    </>
  );
}

function AppRouter() {
  return (
    <>
      <AuthTokenSetter />
      <NotificationWatcher />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/menu" component={MenuPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/seats" component={SeatsPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/select-role" component={SelectRolePage} />
          <Route path="/auth-gate" component={AuthGatePage} />
          <Route component={NotFound} />
        </Switch>
        <FlowieAndGamification />
      </WouterRouter>
    </>
  );
}

function App() {
  if (!PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-bold text-xl mb-2">Missing Clerk Key</h1>
          <p className="text-muted-foreground">Set VITE_CLERK_PUBLISHABLE_KEY in your environment.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
