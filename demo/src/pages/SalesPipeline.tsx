import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, DollarSign, User, ArrowRight, CheckCircle2, X, FileText, Send } from "lucide-react";
import { leads as staticLeads } from "../data/leads";
import type { Lead } from "../types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { formatCurrency } from "../lib/utils";
import { cn } from "../lib/utils";
import { useRole } from "../context/RoleContext";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import { DemoWorkflowBanner } from "../components/DemoWorkflowBanner";

type Column = {
  id: string;
  title: string;
  color: string;
  bg: string;
  leadStatuses: string[];
};

const columns: Column[] = [
  { id: "new", title: "New Leads", color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/20", leadStatuses: ["new"] },
  { id: "contacted", title: "Contacted", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", leadStatuses: ["contacted"] },
  { id: "qualified", title: "Qualified", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20", leadStatuses: ["qualified"] },
  { id: "quotation", title: "Quotation Sent", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", leadStatuses: [] },
  { id: "awaiting", title: "Awaiting Approval", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20", leadStatuses: [] },
  { id: "contract", title: "Contract Signed", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", leadStatuses: ["converted"] },
];

const sampleQuotation = ["L002", "L006", "L010", "L013", "L018"];
const sampleAwaiting = ["L003", "L015", "L019"];

const DEMO_LEAD_STATIC: Lead = {
  id: "DEMO-001",
  name: "Abdullah Al-Tamimi",
  company: "Tamimi Commercial Complex",
  email: "abdullah@tamimi-complex.com",
  phone: "+966 50 888 7777",
  location: "Riyadh, Saudi Arabia",
  source: "Direct Inquiry",
  status: "new",
  systemSize: 150,
  estimatedValue: 675000,
  assignedTo: "Sara Al-Mahmoud",
  createdAt: new Date().toISOString().split("T")[0],
  updatedAt: new Date().toISOString().split("T")[0],
  notes: "Large commercial complex requiring 150kW rooftop solar installation.",
  priority: "high",
};

function getColumnLeads(col: Column, leads: Lead[], demoStep: number): Lead[] {
  let result: Lead[];
  if (col.id === "quotation") result = leads.filter((l) => sampleQuotation.includes(l.id));
  else if (col.id === "awaiting") result = leads.filter((l) => sampleAwaiting.includes(l.id));
  else result = leads.filter((l) => col.leadStatuses.includes(l.status));

  const demoLead = leads.find((l) => l.id === "DEMO-001");
  if (demoLead) {
    // Step 1: show in New; Step 2: show in Qualified; Step 3+: show in Contract Signed
    if (col.id === "new" && demoStep === 1) result = [demoLead, ...result];
    if (col.id === "qualified" && demoStep === 2) result = [demoLead, ...result];
    if (col.id === "contract" && demoStep >= 3) result = [demoLead, ...result];
  }
  return result;
}

function LeadCard({ lead, isDemo }: { lead: Lead; isDemo?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-background rounded-lg border p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing",
        isDemo ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
            isDemo ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}>
            {lead.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{lead.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{lead.company}</p>
            {isDemo && <p className="text-[9px] text-primary font-medium">Demo Lead</p>}
          </div>
        </div>
        <Badge variant={lead.priority === "critical" ? "destructive" : lead.priority === "high" ? "warning" : "secondary"}
          className="text-[10px] flex-shrink-0">{lead.priority}</Badge>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span className="font-medium text-foreground">{formatCurrency(lead.estimatedValue)}</span>
        </div>
        <span className="text-muted-foreground">{lead.systemSize} kW</span>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <User className="h-3 w-3" />
        <span>{lead.assignedTo}</span>
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground truncate">{lead.location}</div>
    </motion.div>
  );
}

export default function SalesPipeline() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const { role } = useRole();
  const { demoStep, demoLead, demoLeadDetails, setDemoStep, addNotification } = useWorkflowDemo();

  const demoContractSigned = demoStep >= 3;
  const leads = demoStep >= 1 && demoLead ? [DEMO_LEAD_STATIC, ...staticLeads] : staticLeads;

  const totalPipeline = leads.reduce((sum, l) => sum + l.estimatedValue, 0);
  const convertedValue = leads.filter(l => l.status === "converted" || (l.id === "DEMO-001" && demoContractSigned)).reduce((sum, l) => sum + l.estimatedValue, 0);
  const conversionRate = ((leads.filter(l => l.status === "converted").length / leads.length) * 100).toFixed(0);

  const handleDemoContractSign = () => {
    setDemoStep(3);
    addNotification({
      title: `New project assigned: ${demoLead?.company} — ${demoLead?.systemSize} kW Solar`,
      type: "project",
      targetRoles: ["planning_engineer", "project_engineer", "ceo", "admin"],
      actionLink: "/engineering",
    });
    addNotification({
      title: `Contract signed: ${demoLead?.company} — SAR ${demoLead?.estimatedValue.toLocaleString()}`,
      type: "contract",
      targetRoles: ["ceo", "admin"],
    });
    setShowConfirmModal(false);
  };

  const handleSubmitQuotation = () => {
    setDemoStep(6);
    addNotification({
      title: `Quotation ready for approval: ${demoLead?.company} — ${demoLead?.systemSize} kW`,
      type: "sales",
      targetRoles: ["ceo", "admin"],
      actionLink: "/",
    });
    setShowQuoteModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Contract signing banner (step 2→3) */}
      {role === "sales_manager" && (
        <DemoWorkflowBanner
          page="sales"
          requiredStep={2}
          requiredRoles={["sales_manager"]}
          title="Step 3 of 8 — Prepare and sign the contract"
          description="Lead is qualified. Review gathered info and sign the contract to hand off to Engineering."
          actionLabel="Sign Contract & Notify Engineering"
          onAction={() => setShowConfirmModal(true)}
        />
      )}
      {/* Quotation banner (step 5→6) — appears after CEO/Admin approves docs */}
      {role === "sales_manager" && (
        <DemoWorkflowBanner
          page="sales_quotation"
          requiredStep={5}
          requiredRoles={["sales_manager"]}
          title="Step 6 of 8 — Prepare and submit the quotation"
          description="Engineering documents have been approved. Prepare the project quotation and submit for management approval."
          actionLabel="Submit Quotation for Approval"
          onAction={() => setShowQuoteModal(true)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Pipeline</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalPipeline)}</p>
          <p className="text-xs text-muted-foreground mt-1">{leads.length} leads</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Contracted Value</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(convertedValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{leads.filter(l => l.status === "converted").length} deals</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Conversion Rate</p>
          <p className="text-xl font-bold mt-1 text-primary">{conversionRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">lead to contract</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg Deal Size</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalPipeline / leads.length)}</p>
          <p className="text-xs text-muted-foreground mt-1">per lead</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Kanban Pipeline <span className="text-muted-foreground font-normal">— drag cards to update stage</span></h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Lead</Button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {columns.map((col) => {
            const colLeads = getColumnLeads(col, leads, demoStep);
            const colValue = colLeads.reduce((sum, l) => sum + l.estimatedValue, 0);

            return (
              <div
                key={col.id}
                className={cn("w-56 rounded-xl border border-border flex flex-col", col.bg)}
              >
                {/* Column header */}
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", {
                        "bg-slate-400": col.id === "new",
                        "bg-blue-500": col.id === "contacted",
                        "bg-violet-500": col.id === "qualified",
                        "bg-amber-500": col.id === "quotation",
                        "bg-orange-500": col.id === "awaiting",
                        "bg-emerald-500": col.id === "contract",
                      })} />
                      <span className={`text-xs font-semibold ${col.color}`}>{col.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-background rounded-full px-1.5 py-0.5">{colLeads.length}</span>
                  </div>
                  {colValue > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(colValue)}</p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-420px)] overflow-y-auto">
                  {colLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} isDemo={lead.id === "DEMO-001"} />
                  ))}
                  {colLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 text-xs text-muted-foreground text-center px-2">
                      <p>Drop here</p>
                    </div>
                  )}
                </div>

                {/* Add button */}
                <div className="p-2 border-t border-border/50">
                  <button className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs ${col.color} hover:bg-background/60 transition-colors`}>
                    <Plus className="h-3 w-3" /> Add Card
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold mb-3 text-muted-foreground">Pipeline Flow</p>
        <div className="flex items-center gap-1 flex-wrap">
          {columns.map((col, idx) => {
            const count = getColumnLeads(col, leads, demoStep).length;
            return (
              <div key={col.id} className="flex items-center gap-1">
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", col.bg, col.color)}>
                  <span>{count}</span>
                  <span className="hidden sm:inline">{col.title}</span>
                </div>
                {idx < columns.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quotation Submission Modal */}
      {showQuoteModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowQuoteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Submit Quotation for Approval</h3>
                <p className="text-xs text-muted-foreground mt-0.5">CEO/Admin will be notified to review</p>
              </div>
              <button onClick={() => setShowQuoteModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-medium text-primary">Quotation Summary</p>
                {[
                  { label: "Client", value: demoLead.company },
                  { label: "System Size", value: `${demoLeadDetails?.confirmedSystemSize ?? demoLead.systemSize} kW` },
                  { label: "Roof Type", value: demoLeadDetails?.roofType ?? "—" },
                  { label: "Grid Connection", value: demoLeadDetails?.gridType ?? "—" },
                  { label: "Monthly Savings Est.", value: `SAR ${demoLeadDetails?.monthlyBill ?? "—"}/mo` },
                  { label: "Proposed Contract Value", value: `SAR ${demoLead.estimatedValue.toLocaleString()}` },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{f.label}</span>
                    <span className="font-medium text-xs">{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                Submitting this quotation will notify the CEO/Admin for final approval before the project is forwarded to Finance.
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowQuoteModal(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleSubmitQuotation}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Submit Quotation
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Contract Signing Modal */}
      {showConfirmModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowConfirmModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Sign Contract</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Demo: Engineering team will be notified</p>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Contract Details</p>
                {[
                  { label: "Client", value: demoLead.company },
                  { label: "System Size", value: `${demoLead.systemSize} kW` },
                  { label: "Contract Value", value: formatCurrency(demoLead.estimatedValue) },
                  { label: "Location", value: demoLead.location },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{f.label}</span>
                    <span className="font-medium text-xs">{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                Signing this contract will notify the Engineering team (Planning Engineer & Project Engineer) to begin site assessment and project planning.
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleDemoContractSign}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Sign Contract & Notify Engineering
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
