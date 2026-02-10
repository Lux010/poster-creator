import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import PosterEditor from "./pages/poster-editor";
import PosterCreator from "./pages/poster-creator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PosterCreator} />
      <Route path="/creator" component={PosterCreator} />
      <Route path="/editor" component={PosterEditor} />
      <Route path="/editor/:projectId" component={PosterEditor} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
