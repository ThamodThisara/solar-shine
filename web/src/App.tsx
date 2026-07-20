import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import WhoWeAre from "./pages/WhoWeAre";
import WhatWeDo from "./pages/WhatWeDo";
import Services from "./pages/Services";
import ProjectsPage from "./pages/Projects";
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPostPage";
import Contact from "./pages/Contact";
import LegalPage from "./pages/LegalPage";
import Admin from "./pages/Admin";
import Engineer from "./pages/Engineer";
import Sales from "./pages/Sales";
import Finance from "./pages/Finance";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import ProjectSummary from "./pages/ProjectSummary";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { PANELS, LOGIN_ALLOWED_ROLES } from "./config/roles";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/who-we-are" element={<WhoWeAre />} />
            <Route path="/what-we-do" element={<WhatWeDo />} />
            <Route path="/services" element={<Services />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<LegalPage pageType="privacy_policy" />} />
            <Route path="/terms" element={<LegalPage pageType="terms_of_service" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={PANELS.admin.roles}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/engineer"
              element={
                <ProtectedRoute allowedRoles={PANELS.engineer.roles}>
                  <Engineer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute allowedRoles={PANELS.sales.roles}>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr"
              element={
                <ProtectedRoute allowedRoles={PANELS.hr.roles}>
                  <Engineer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute allowedRoles={PANELS.finance.roles}>
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketing"
              element={
                <ProtectedRoute allowedRoles={PANELS.marketing.roles}>
                  <Engineer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-summary/:projectId"
              element={
                <ProtectedRoute allowedRoles={LOGIN_ALLOWED_ROLES}>
                  <ProjectSummary />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
