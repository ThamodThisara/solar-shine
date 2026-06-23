import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, Plus, Eye, Mail, Phone, MapPin,
  TrendingUp, X, User, Building, Calendar, CheckCircle2,
  ClipboardList, ChevronDown, Clock, Receipt
} from "lucide-react";
import { leads as staticLeads } from "../data/leads";
import type { Lead, LeadStatus } from "../types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { formatCurrency, formatDate } from "../lib/utils";
import { cn } from "../lib/utils";
import { useRole } from "../context/RoleContext";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import { DemoWorkflowBanner } from "../components/DemoWorkflowBanner";
import type { DemoLeadDetails } from "../context/WorkflowDemoContext";

const statusConfig: Record<LeadStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary" | "outline" }> = {
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "warning" },
  qualified: { label: "Qualified", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  converted: { label: "Converted", variant: "default" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-slate-500" },
  medium: { label: "Medium", color: "text-blue-600" },
  high: { label: "High", color: "text-amber-600" },
  critical: { label: "Critical", color: "text-red-600" },
};

const DEMO_LEAD_BASE: Lead = {
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
  notes: "Large commercial complex requiring 150kW rooftop solar installation. High-priority client with strong ROI potential.",
  priority: "high",
};

const DEFAULT_CONTACT_DETAILS: DemoLeadDetails = {
  contactMethod: "Phone Call",
  confirmedSystemSize: 150,
  monthlyBill: "42,000",
  roofType: "Flat Concrete",
  gridType: "On-Grid",
  siteAddress: "King Fahd Road, Riyadh, Saudi Arabia",
  notes: "Client confirmed interest in 150kW system. Monthly bill is ~SAR 42,000. Roof is flat concrete, suitable for installation. Wants fast ROI within 5 years. Decision expected within 1 month.",
  decisionTimeline: "< 1 month",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function LeadsManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "value" | "name">("date");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactDetails, setContactDetails] = useState<DemoLeadDetails>(DEFAULT_CONTACT_DETAILS);

  const { role } = useRole();
  const { demoStep, demoLead, demoSiteVisit, demoSiteVisitReceipts, setDemoLead, setDemoStep, setDemoLeadDetails, addNotification } = useWorkflowDemo();

  // Determine the live status of the demo lead based on workflow step
  const demoLeadStatus: LeadStatus =
    demoStep >= 2 ? "qualified" :
    demoStep >= 1 ? "new" :
    "new";

  const demoLeadForDisplay: Lead | null = demoStep >= 1 && demoLead ? {
    ...DEMO_LEAD_BASE,
    status: demoLeadStatus,
    systemSize: demoStep >= 2 ? contactDetails.confirmedSystemSize : DEMO_LEAD_BASE.systemSize,
    notes: demoStep >= 2 ? contactDetails.notes : DEMO_LEAD_BASE.notes,
  } : null;

  const leads = demoLeadForDisplay
    ? [demoLeadForDisplay, ...staticLeads]
    : staticLeads;

  const filtered = leads
    .filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "value") return b.estimatedValue - a.estimatedValue;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  const handleCreateDemoLead = () => {
    setDemoLead({
      id: DEMO_LEAD_BASE.id,
      name: DEMO_LEAD_BASE.name,
      company: DEMO_LEAD_BASE.company,
      systemSize: DEMO_LEAD_BASE.systemSize,
      estimatedValue: DEMO_LEAD_BASE.estimatedValue,
      location: DEMO_LEAD_BASE.location,
    });
    setDemoStep(1);
    addNotification({
      title: `New lead assigned: ${DEMO_LEAD_BASE.company} (${DEMO_LEAD_BASE.systemSize} kW)`,
      type: "lead",
      targetRoles: ["sales_manager", "ceo", "admin"],
      actionLink: "/leads",
    });
    setShowCreateModal(false);
  };

  const handleContactLead = () => {
    setDemoLeadDetails(contactDetails);
    setDemoStep(2);
    addNotification({
      title: `Lead qualified: ${demoLead?.company} — Site details confirmed`,
      type: "lead",
      targetRoles: ["ceo", "admin"],
    });
    setShowContactModal(false);
  };

  const isReadOnly = role !== "marketing_manager" && role !== "sales_manager" && role !== "ceo" && role !== "admin";

  return (
    <div className="space-y-5">
      {/* Step 1 banner: Marketing creates the lead */}
      {role === "marketing_manager" && (
        <DemoWorkflowBanner
          page="leads_marketing"
          requiredStep={0}
          requiredRoles={["marketing_manager"]}
          title="Step 1 of 5 — Create a new lead to start the workflow"
          description="As Marketing Manager, log a new client inquiry to kick off the solar project lifecycle."
          actionLabel="Create Demo Lead"
          onAction={() => setShowCreateModal(true)}
        />
      )}

      {/* Step 2 banner: Sales contacts & qualifies the lead */}
      {role === "sales_manager" && (
        <DemoWorkflowBanner
          page="leads_sales"
          requiredStep={1}
          requiredRoles={["sales_manager"]}
          title="Step 2 of 5 — Contact the lead and gather requirements"
          description="Call or visit the client, record site details, confirm system requirements, and qualify the lead."
          actionLabel="Contact Lead & Update Details"
          onAction={() => setShowContactModal(true)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: stats.total, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
          { label: "New", value: stats.new, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
          { label: "Qualified", value: stats.qualified, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Converted", value: stats.converted, color: "text-primary bg-primary/10" },
        ].map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold ${s.color}`}>
                {s.value}
              </div>
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">leads</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, company, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "new", "contacted", "qualified", "rejected", "converted"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent text-muted-foreground"
              )}
            >
              {s}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-md text-xs border border-input bg-background text-foreground"
          >
            <option value="date">Sort: Date</option>
            <option value="value">Sort: Value</option>
            <option value="name">Sort: Name</option>
          </select>
          {role === "marketing_manager" && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Lead</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Location</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden lg:table-cell">System Size</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Est. Value</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Priority</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden xl:table-cell">Assigned To</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {filtered.map((lead) => (
                <motion.tr
                  key={lead.id}
                  variants={item}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer",
                    lead.id === "DEMO-001" && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        lead.id === "DEMO-001" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {lead.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                        {lead.id === "DEMO-001" && (
                          <span className="text-[10px] text-primary font-medium">Demo Lead</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs">{lead.location.split(",")[0]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell">
                    <span className="font-medium">{lead.systemSize} kW</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold">{formatCurrency(lead.estimatedValue)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusConfig[lead.status].variant}>{statusConfig[lead.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-medium capitalize ${priorityConfig[lead.priority].color}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">{lead.assignedTo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {/* Sales Manager can contact the demo lead (step 1) */}
                      {role === "sales_manager" && lead.id === "DEMO-001" && demoStep === 1 && (
                        <button
                          className="p-1.5 rounded hover:bg-accent text-primary"
                          title="Contact Lead"
                          onClick={(e) => { e.stopPropagation(); setShowContactModal(true); }}
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!isReadOnly && lead.id !== "DEMO-001" && (
                        <button className="p-1.5 rounded hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No leads found</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Showing {filtered.length} of {leads.length} leads
          {isReadOnly && <span className="ml-2 text-amber-600 font-medium">(View-only)</span>}
        </div>
      </Card>

      {/* ───── Lead Detail Modal ───── */}
      {selectedLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedLead(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                  {selectedLead.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedLead.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLead.company}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusConfig[selectedLead.status].variant}>{statusConfig[selectedLead.status].label}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Priority</p>
                <p className={`text-sm font-medium capitalize ${priorityConfig[selectedLead.priority].color}`}>{selectedLead.priority}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">System Size</p>
                <p className="text-sm font-semibold">{selectedLead.systemSize} kW</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Estimated Value</p>
                <p className="text-sm font-semibold text-primary">{formatCurrency(selectedLead.estimatedValue)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                <p className="text-sm">{selectedLead.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                <p className="text-sm">{selectedLead.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                <p className="text-sm">{selectedLead.location}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="text-sm">{selectedLead.source}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm">{selectedLead.assignedTo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</p>
                <p className="text-sm">{formatDate(selectedLead.createdAt)}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground p-2.5 rounded-lg bg-muted/50">{selectedLead.notes}</p>
              </div>
              {/* Show gathered details if step >= 2 for the demo lead */}
              {selectedLead.id === "DEMO-001" && demoStep >= 2 && (
                <div className="col-span-2 space-y-2 pt-1 border-t border-border">
                  <p className="text-xs font-semibold text-primary">Qualified Details (gathered by Sales)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Contact Method:</span> <span className="font-medium ml-1">{contactDetails.contactMethod}</span></div>
                    <div><span className="text-muted-foreground">Decision Timeline:</span> <span className="font-medium ml-1">{contactDetails.decisionTimeline}</span></div>
                    <div><span className="text-muted-foreground">Roof Type:</span> <span className="font-medium ml-1">{contactDetails.roofType}</span></div>
                    <div><span className="text-muted-foreground">Grid Type:</span> <span className="font-medium ml-1">{contactDetails.gridType}</span></div>
                    <div><span className="text-muted-foreground">Monthly Bill:</span> <span className="font-medium ml-1">SAR {contactDetails.monthlyBill}</span></div>
                    <div><span className="text-muted-foreground">Site Address:</span> <span className="font-medium ml-1">{contactDetails.siteAddress}</span></div>
                  </div>
                </div>
              )}

              {/* Site visit details — visible once engineering has submitted (step >= 4) */}
              {selectedLead.id === "DEMO-001" && demoStep >= 4 && demoSiteVisit && (
                <div className="col-span-2 space-y-2 pt-1 border-t border-border">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Site Visit Record
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Engineer:</span>
                      <span className="font-medium ml-1">{demoSiteVisit.engineerName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium ml-1">{demoSiteVisit.visitDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium ml-1">{demoSiteVisit.visitTime}</span>
                    </div>
                  </div>
                  {demoSiteVisit.purpose && (
                    <p className="text-xs"><span className="text-muted-foreground">Purpose:</span> <span className="font-medium ml-1">{demoSiteVisit.purpose}</span></p>
                  )}
                  {demoSiteVisit.notes && (
                    <p className="text-xs text-muted-foreground italic p-2 rounded bg-muted/40">"{demoSiteVisit.notes}"</p>
                  )}
                  {demoSiteVisitReceipts.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                        <Receipt className="h-3.5 w-3.5" /> Expense Receipts
                      </p>
                      <div className="space-y-1">
                        {demoSiteVisitReceipts.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{r.name}</span>
                            <span className="font-medium">SAR {r.amount}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs border-t border-border pt-1 font-semibold">
                          <span>Total Expenses</span>
                          <span className="text-amber-600">SAR {demoSiteVisitReceipts.reduce((s, r) => s + r.amount, 0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              {role === "sales_manager" && selectedLead.id === "DEMO-001" && demoStep === 1 && (
                <Button size="sm" className="flex-1" onClick={() => { setSelectedLead(null); setShowContactModal(true); }}>
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Contact Lead & Gather Info
                </Button>
              )}
              {role === "sales_manager" && selectedLead.id !== "DEMO-001" && (
                <Button size="sm" className="flex-1">Contact Lead</Button>
              )}
              {(role === "ceo" || role === "admin") && (
                <Button size="sm" variant="outline" className="flex-1">Convert to Project</Button>
              )}
              {isReadOnly && <p className="text-xs text-muted-foreground self-center">View-only access</p>}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ───── Create Demo Lead Modal (Marketing) ───── */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Create New Lead</h3>
                <p className="text-xs text-muted-foreground mt-0.5">A notification will be sent to the Sales team</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-medium text-primary">New Lead Details</p>
                {[
                  { label: "Client Name", value: DEMO_LEAD_BASE.name, icon: User },
                  { label: "Company", value: DEMO_LEAD_BASE.company, icon: Building },
                  { label: "Location", value: DEMO_LEAD_BASE.location, icon: MapPin },
                  { label: "System Size", value: `${DEMO_LEAD_BASE.systemSize} kW`, icon: TrendingUp },
                  { label: "Est. Value", value: formatCurrency(DEMO_LEAD_BASE.estimatedValue), icon: TrendingUp },
                  { label: "Source", value: DEMO_LEAD_BASE.source, icon: Filter },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{f.label}</span>
                    <span className="font-medium text-xs">{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                Once created, the Sales Manager will be notified to contact the lead and gather requirements.
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleCreateDemoLead}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Create Lead & Notify Sales
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ───── Contact Lead Modal (Sales) ───── */}
      {showContactModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowContactModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold">Contact Lead & Gather Requirements</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{demoLead.company} — {demoLead.systemSize} kW</p>
              </div>
              <button onClick={() => setShowContactModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Contact Details */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact Method</label>
                    <select
                      value={contactDetails.contactMethod}
                      onChange={(e) => setContactDetails(p => ({ ...p, contactMethod: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {["Phone Call", "Email", "Site Visit", "Video Call"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Decision Timeline</label>
                    <select
                      value={contactDetails.decisionTimeline}
                      onChange={(e) => setContactDetails(p => ({ ...p, decisionTimeline: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {["< 1 month", "1–3 months", "3–6 months", "> 6 months"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Requirements */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Customer Requirements</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Confirmed System Size (kW)</label>
                    <input
                      type="number"
                      value={contactDetails.confirmedSystemSize}
                      onChange={(e) => setContactDetails(p => ({ ...p, confirmedSystemSize: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Monthly Bill (SAR)</label>
                    <input
                      type="text"
                      value={contactDetails.monthlyBill}
                      onChange={(e) => setContactDetails(p => ({ ...p, monthlyBill: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Roof Type</label>
                    <select
                      value={contactDetails.roofType}
                      onChange={(e) => setContactDetails(p => ({ ...p, roofType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {["Flat Concrete", "Sloped Tiles", "Ground Mount", "Carport"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Grid Connection</label>
                    <select
                      value={contactDetails.gridType}
                      onChange={(e) => setContactDetails(p => ({ ...p, gridType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {["On-Grid", "Hybrid", "Off-Grid"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Site Address</label>
                    <input
                      type="text"
                      value={contactDetails.siteAddress}
                      onChange={(e) => setContactDetails(p => ({ ...p, siteAddress: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Discussion Notes</p>
                <textarea
                  rows={3}
                  value={contactDetails.notes}
                  onChange={(e) => setContactDetails(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Key points discussed, client concerns, special requirements..."
                />
              </div>

              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-400">
                After saving, the lead will be marked as <strong>Qualified</strong>. You can then go to the Sales Pipeline to prepare the quotation and sign the contract.
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowContactModal(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleContactLead}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Save Details & Qualify Lead
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
