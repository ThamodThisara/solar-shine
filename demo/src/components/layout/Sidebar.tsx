import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, GitBranch, Users, TrendingUp, Wrench,
  DollarSign, Rocket, BarChart3, MessageSquare, Settings,
  Sun, ChevronLeft, ChevronRight, FileText, X, Kanban
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useRole, rolePermissions } from "../../context/RoleContext";

const allNavItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/workflow", icon: GitBranch, label: "Workflow Explorer" },
  { path: "/pipeline", icon: Kanban, label: "Kanban Pipeline" },
  { path: "/leads", icon: Users, label: "Leads Management" },
  { path: "/sales", icon: TrendingUp, label: "Sales Pipeline" },
  { path: "/engineering", icon: Wrench, label: "Engineering Ops" },
  { path: "/finance", icon: DollarSign, label: "Finance Center" },
  { path: "/projects", icon: Rocket, label: "Project Execution" },
  { path: "/reports", icon: BarChart3, label: "Reports & Analytics" },
  { path: "/feedback", icon: MessageSquare, label: "Customer Feedback" },
  { path: "/documents", icon: FileText, label: "Document Center" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { role } = useRole();
  const allowed = rolePermissions[role];
  const navItems = allNavItems.filter((item) => allowed.includes(item.path));

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-border",
        collapsed ? "justify-center px-2" : ""
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm flex-shrink-0">
          <Sun className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="font-bold text-base gradient-text whitespace-nowrap">Solar Maps</span>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Project Lifecycle</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                      : "text-muted-foreground border-l-2 border-transparent",
                    collapsed ? "justify-center px-2" : ""
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse button */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className="hidden lg:flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-border bg-card overflow-hidden z-30"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-card border-r border-border shadow-xl"
            >
              <div className="absolute top-3 right-3">
                <button onClick={onMobileClose} className="p-1.5 rounded-md hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
