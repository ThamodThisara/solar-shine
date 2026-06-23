import React, { createContext, useContext, useState, useCallback } from "react";
import type { Role, SiteVisitDetails, SiteVisitReceipt } from "../types";

export interface DemoNotification {
  id: string;
  title: string;
  type: "lead" | "sales" | "engineering" | "finance" | "project" | "quality" | "contract";
  targetRoles: Role[];
  time: string;
  unread: boolean;
  actionLink?: string;
}

// 0 = initial
// 1 = Marketing created lead → Sales notified
// 2 = Sales contacted & qualified lead (info gathered, details updated)
// 3 = Sales signed contract → Engineering notified
// 4 = Engineering uploaded documents → CEO/Admin notified for review
// 5 = CEO/Admin approved documents → Sales notified for quotation
// 6 = Sales submitted quotation → CEO/Admin notified for approval
// 7 = CEO/Admin approved quotation → Finance notified
// 8 = Finance collected payment → Complete
export type DemoStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface DemoLead {
  id: string;
  name: string;
  company: string;
  systemSize: number;
  estimatedValue: number;
  location: string;
}

export interface DemoLeadDetails {
  contactMethod: string;
  confirmedSystemSize: number;
  monthlyBill: string;
  roofType: string;
  gridType: string;
  siteAddress: string;
  notes: string;
  decisionTimeline: string;
}

const INITIAL_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "init-1",
    title: "New inquiry from Al-Farsi Textiles",
    type: "lead",
    targetRoles: ["marketing_manager", "ceo", "admin"],
    time: "5m ago",
    unread: true,
  },
  {
    id: "init-2",
    title: "Monthly lead report ready",
    type: "lead",
    targetRoles: ["marketing_manager", "ceo", "admin"],
    time: "2h ago",
    unread: false,
  },
  {
    id: "init-3",
    title: "Contract signed: Juhani Plastics Factory",
    type: "contract",
    targetRoles: ["sales_manager", "ceo", "admin"],
    time: "1h ago",
    unread: true,
  },
  {
    id: "init-4",
    title: "Follow-up due: Hassan Medical Center",
    type: "sales",
    targetRoles: ["sales_manager", "ceo", "admin"],
    time: "3h ago",
    unread: true,
  },
  {
    id: "init-5",
    title: "P001 procurement milestone completed",
    type: "project",
    targetRoles: ["planning_engineer", "project_engineer", "ceo", "admin"],
    time: "3h ago",
    unread: true,
  },
  {
    id: "init-6",
    title: "Site visit scheduled: Dosari Hotel",
    type: "engineering",
    targetRoles: ["planning_engineer", "project_engineer", "ceo", "admin"],
    time: "1d ago",
    unread: false,
  },
  {
    id: "init-7",
    title: "Invoice INV-013 overdue",
    type: "finance",
    targetRoles: ["finance_executive", "ceo", "admin"],
    time: "1h ago",
    unread: true,
  },
  {
    id: "init-8",
    title: "Advance payment received: P005",
    type: "finance",
    targetRoles: ["finance_executive", "ceo", "admin"],
    time: "4h ago",
    unread: false,
  },
  {
    id: "init-9",
    title: "Quality check passed: Sulami Healthcare",
    type: "quality",
    targetRoles: ["planning_engineer", "project_engineer", "ceo", "admin"],
    time: "1d ago",
    unread: false,
  },
];

interface WorkflowDemoContextType {
  notifications: DemoNotification[];
  demoStep: DemoStep;
  demoLead: DemoLead | null;
  demoLeadDetails: DemoLeadDetails | null;
  demoSiteVisit: SiteVisitDetails | null;
  demoSiteVisitReceipts: SiteVisitReceipt[];
  addNotification: (notif: Omit<DemoNotification, "id" | "time" | "unread">) => void;
  markNotificationRead: (id: string) => void;
  markAllReadForRole: (role: Role) => void;
  getNotificationsForRole: (role: Role) => DemoNotification[];
  getUnreadCountForRole: (role: Role) => number;
  setDemoStep: (step: DemoStep) => void;
  setDemoLead: (lead: DemoLead | null) => void;
  setDemoLeadDetails: (details: DemoLeadDetails | null) => void;
  setDemoSiteVisit: (visit: SiteVisitDetails | null) => void;
  setDemoSiteVisitReceipts: (receipts: SiteVisitReceipt[]) => void;
  resetDemo: () => void;
}

const WorkflowDemoContext = createContext<WorkflowDemoContextType | undefined>(undefined);

export function WorkflowDemoProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<DemoNotification[]>(INITIAL_NOTIFICATIONS);
  const [demoStep, setDemoStepState] = useState<DemoStep>(0);
  const [demoLead, setDemoLeadState] = useState<DemoLead | null>(null);
  const [demoLeadDetails, setDemoLeadDetailsState] = useState<DemoLeadDetails | null>(null);
  const [demoSiteVisit, setDemoSiteVisitState] = useState<SiteVisitDetails | null>(null);
  const [demoSiteVisitReceipts, setDemoSiteVisitReceiptsState] = useState<SiteVisitReceipt[]>([]);

  const addNotification = useCallback((notif: Omit<DemoNotification, "id" | "time" | "unread">) => {
    const id = `notif-${Date.now()}`;
    setNotifications((prev) => [{ ...notif, id, time: "Just now", unread: true }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }, []);

  const markAllReadForRole = useCallback((role: Role) => {
    setNotifications((prev) =>
      prev.map((n) =>
        role === "admin" || role === "ceo" || n.targetRoles.includes(role)
          ? { ...n, unread: false }
          : n
      )
    );
  }, []);

  const getNotificationsForRole = useCallback(
    (role: Role) => {
      if (role === "admin" || role === "ceo") return notifications;
      return notifications.filter((n) => n.targetRoles.includes(role));
    },
    [notifications]
  );

  const getUnreadCountForRole = useCallback(
    (role: Role) => {
      if (role === "admin" || role === "ceo") return notifications.filter((n) => n.unread).length;
      return notifications.filter((n) => n.targetRoles.includes(role) && n.unread).length;
    },
    [notifications]
  );

  const setDemoStep = useCallback((step: DemoStep) => setDemoStepState(step), []);
  const setDemoLead = useCallback((lead: DemoLead | null) => setDemoLeadState(lead), []);
  const setDemoLeadDetails = useCallback((details: DemoLeadDetails | null) => setDemoLeadDetailsState(details), []);
  const setDemoSiteVisit = useCallback((visit: SiteVisitDetails | null) => setDemoSiteVisitState(visit), []);
  const setDemoSiteVisitReceipts = useCallback((receipts: SiteVisitReceipt[]) => setDemoSiteVisitReceiptsState(receipts), []);

  const resetDemo = useCallback(() => {
    setDemoStepState(0);
    setDemoLeadState(null);
    setDemoLeadDetailsState(null);
    setDemoSiteVisitState(null);
    setDemoSiteVisitReceiptsState([]);
    setNotifications(INITIAL_NOTIFICATIONS);
  }, []);

  return (
    <WorkflowDemoContext.Provider
      value={{
        notifications,
        demoStep,
        demoLead,
        demoLeadDetails,
        demoSiteVisit,
        demoSiteVisitReceipts,
        addNotification,
        markNotificationRead,
        markAllReadForRole,
        getNotificationsForRole,
        getUnreadCountForRole,
        setDemoStep,
        setDemoLead,
        setDemoLeadDetails,
        setDemoSiteVisit,
        setDemoSiteVisitReceipts,
        resetDemo,
      }}
    >
      {children}
    </WorkflowDemoContext.Provider>
  );
}

export function useWorkflowDemo() {
  const ctx = useContext(WorkflowDemoContext);
  if (!ctx) throw new Error("useWorkflowDemo must be used within WorkflowDemoProvider");
  return ctx;
}
