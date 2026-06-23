import { Bell, Moon, Sun, Search, Menu, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useRole, roleConfigs } from "../../context/RoleContext";
import { useWorkflowDemo } from "../../context/WorkflowDemoContext";
import type { Role } from "../../types";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/workflow": "Workflow Explorer",
  "/leads": "Leads Management",
  "/sales": "Sales Pipeline",
  "/engineering": "Engineering Operations",
  "/finance": "Finance Center",
  "/projects": "Project Execution",
  "/reports": "Reports & Analytics",
  "/feedback": "Customer Feedback",
  "/documents": "Document Center",
  "/settings": "Settings",
};

const notifTypeColors: Record<string, string> = {
  lead: "bg-violet-100 dark:bg-violet-950/40 text-violet-600",
  sales: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
  contract: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
  engineering: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
  finance: "bg-orange-100 dark:bg-orange-950/40 text-orange-600",
  project: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600",
  quality: "bg-green-100 dark:bg-green-950/40 text-green-600",
};

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { role, roleConfig, setRole } = useRole();
  const { getNotificationsForRole, getUnreadCountForRole, markNotificationRead, markAllReadForRole } = useWorkflowDemo();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();

  const pageTitle = routeTitles[location.pathname] || "Solar Maps";
  const roleNotifications = getNotificationsForRole(role);
  const unreadCount = getUnreadCountForRole(role);

  const handleNotifClick = (id: string) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    markAllReadForRole(role);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold truncate">{pageTitle}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block">Solar Maps Platform</p>
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <AnimatePresence>
          {showSearch ? (
            <motion.div
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              className="relative"
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                onBlur={() => setShowSearch(false)}
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </motion.div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </AnimatePresence>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
          className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-lg z-50"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary">{unreadCount} new</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {roleNotifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  roleNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n.id)}
                      className={cn(
                        "px-3 py-2.5 hover:bg-accent cursor-pointer border-b border-border/50 last:border-0 transition-colors",
                        n.unread && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {n.unread && (
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <div className={cn(!n.unread && "pl-3.5")}>
                          <p className="text-sm font-medium">{n.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", notifTypeColors[n.type] || "bg-muted text-muted-foreground")}>
                              {n.type}
                            </span>
                            <p className="text-xs text-muted-foreground">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role / Profile */}
      <div className="relative">
        <button
          onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-colors"
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: roleConfig.color }}
          >
            {roleConfig.avatar}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium leading-none">{roleConfig.label}</p>
            <p className="text-[10px] text-muted-foreground">Solar Maps</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>

        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-popover shadow-lg z-50"
            >
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold">Switch Role (Demo)</p>
                <p className="text-xs text-muted-foreground">Viewing as: {roleConfig.label}</p>
              </div>
              <div className="p-1">
                {roleConfigs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setRole(r.id as Role); setShowProfile(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors",
                      role === r.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: r.color }}
                    >
                      {r.avatar}
                    </div>
                    <span>{r.label}</span>
                    {role === r.id && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-border p-1">
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent text-muted-foreground">
                  <User className="h-4 w-4" /> Profile
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent text-muted-foreground">
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent text-destructive">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside handler */}
      {(showNotifications || showProfile) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowProfile(false); }}
        />
      )}
    </header>
  );
}
