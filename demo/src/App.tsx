import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { RoleProvider } from "./context/RoleContext";
import { WorkflowDemoProvider } from "./context/WorkflowDemoContext";
import { Layout } from "./components/layout/Layout";
import { AccessDenied } from "./components/layout/AccessDenied";
import Dashboard from "./pages/Dashboard";
import WorkflowExplorer from "./pages/WorkflowExplorer";
import KanbanPipeline from "./pages/KanbanPipeline";
import LeadsManagement from "./pages/LeadsManagement";
import SalesPipeline from "./pages/SalesPipeline";
import EngineeringOperations from "./pages/EngineeringOperations";
import FinanceCenter from "./pages/FinanceCenter";
import ProjectExecution from "./pages/ProjectExecution";
import ReportsAnalytics from "./pages/ReportsAnalytics";
import CustomerFeedback from "./pages/CustomerFeedback";
import DocumentCenter from "./pages/DocumentCenter";
import Settings from "./pages/Settings";
import { useRole, rolePermissions } from "./context/RoleContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const location = useLocation();
  const allowed = rolePermissions[role];
  if (allowed.includes(location.pathname)) {
    return <>{children}</>;
  }
  return <AccessDenied />;
}

export default function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <WorkflowDemoProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/workflow" element={<ProtectedRoute><WorkflowExplorer /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute><KanbanPipeline /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><LeadsManagement /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><SalesPipeline /></ProtectedRoute>} />
                <Route path="/engineering" element={<ProtectedRoute><EngineeringOperations /></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute><FinanceCenter /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><ProjectExecution /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsAnalytics /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><CustomerFeedback /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><DocumentCenter /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WorkflowDemoProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}
