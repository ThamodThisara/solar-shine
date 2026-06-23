export type Role =
  | "ceo"
  | "marketing_manager"
  | "sales_manager"
  | "planning_engineer"
  | "project_engineer"
  | "finance_executive"
  | "admin";

export interface RoleConfig {
  id: Role;
  label: string;
  color: string;
  avatar: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "rejected" | "converted";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "overdue" | "partial";
export type Priority = "low" | "medium" | "high" | "critical";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  source: string;
  status: LeadStatus;
  systemSize: number;
  estimatedValue: number;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  priority: Priority;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  leadId: string;
  engineer: string;
  salesManager: string;
  status: ProjectStatus;
  systemSize: number;
  contractValue: number;
  startDate: string;
  endDate: string;
  progress: number;
  location: string;
  milestones: Milestone[];
  currentStage: string;
}

export interface Milestone {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed";
  startDate: string;
  endDate: string;
  progress: number;
}

export interface Invoice {
  id: string;
  projectId: string;
  projectName: string;
  client: string;
  type: "advance" | "progress" | "final";
  amount: number;
  status: PaymentStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
}

export interface Engineer {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  specialization: string;
  activeProjects: number;
  completedProjects: number;
  availability: "available" | "busy" | "on_leave";
}

export interface Feedback {
  id: string;
  projectId: string;
  projectName: string;
  client: string;
  rating: number;
  category: string;
  comment: string;
  date: string;
  sentiment: "positive" | "neutral" | "negative";
  responded: boolean;
}

export interface WorkflowStage {
  id: string;
  code: string;
  name: string;
  department: "Marketing" | "Sales" | "Engineering" | "Finance" | "HR & Admin";
  description: string;
  responsible: string;
  inputs: string[];
  outputs: string[];
  documents: string[];
  decisions?: string[];
  nextStages: string[];
  color: string;
  icon: string;
}

export interface Document {
  id: string;
  code: string;
  name: string;
  department: string;
  description: string;
  format: string;
  relatedStages: string[];
  lastUpdated: string;
}

export interface SiteVisitDetails {
  engineerName: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  notes: string;
}

export interface SiteVisitReceipt {
  id: string;
  name: string;
  type: "fuel" | "food" | "transportation" | "accommodation" | "other";
  amount: number;
}

export interface ActivityItem {
  id: string;
  type: "lead" | "quotation" | "contract" | "project" | "payment" | "quality" | "handover";
  title: string;
  description: string;
  user: string;
  timestamp: string;
  projectId?: string;
  leadId?: string;
}
