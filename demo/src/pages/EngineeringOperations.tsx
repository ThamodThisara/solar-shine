import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { projects } from "../data/projects";
import { engineers } from "../data/engineers";
import { formatDate, formatCurrency } from "../lib/utils";
import { MapPin, User, Wrench, Calendar, CheckCircle, Clock, AlertCircle, X, Upload, FileText, CheckCircle2, Zap, Receipt, Clock3 } from "lucide-react";
import { cn } from "../lib/utils";
import { useRole } from "../context/RoleContext";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import { DemoWorkflowBanner } from "../components/DemoWorkflowBanner";
import type { SiteVisitDetails, SiteVisitReceipt } from "../types";

const statusColors: Record<string, string> = {
  active: "success",
  planning: "info",
  completed: "default",
  on_hold: "warning",
  cancelled: "destructive",
};

const milestoneStatusIcon = {
  completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  in_progress: <Clock className="h-4 w-4 text-amber-500" />,
  pending: <div className="h-4 w-4 rounded-full border-2 border-border" />,
};

const DEMO_DOCS = [
  { id: "D1", name: "Site Inspection Sheet", code: "D1" },
  { id: "D2", name: "Engineering Design Report", code: "D2" },
  { id: "D3", name: "Pre-Costing Sheet", code: "D3" },
];

const DEMO_RECEIPT_OPTIONS: SiteVisitReceipt[] = [
  { id: "R1", name: "Vehicle Fuel", type: "fuel", amount: 180 },
  { id: "R2", name: "Team Lunch", type: "food", amount: 95 },
  { id: "R3", name: "Taxi to Site", type: "transportation", amount: 55 },
];

const DEFAULT_SITE_VISIT: SiteVisitDetails = {
  engineerName: "Ahmed Al-Rashidi",
  visitDate: new Date().toISOString().split("T")[0],
  visitTime: "09:30",
  purpose: "Initial site assessment for rooftop solar installation",
  notes: "Roof structure assessed. Electrical panel located on the east side. Access via main entrance. Suitable for 150 kW installation.",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function EngineeringOperations() {
  const siteVisits = projects.filter((p) => p.status !== "cancelled").slice(0, 8);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [siteVisitForm, setSiteVisitForm] = useState<SiteVisitDetails>(DEFAULT_SITE_VISIT);
  const { role } = useRole();
  const { demoStep, demoLead, demoLeadDetails, demoSiteVisit, setDemoStep, addNotification, setDemoSiteVisit, setDemoSiteVisitReceipts } = useWorkflowDemo();

  const isEngineer = role === "planning_engineer" || role === "project_engineer";

  const handleToggleDoc = (docId: string) => {
    setUploadedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const handleToggleReceipt = (receiptId: string) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptId) ? prev.filter((r) => r !== receiptId) : [...prev, receiptId]
    );
  };

  const isSiteVisitValid = siteVisitForm.engineerName.trim() && siteVisitForm.visitDate && siteVisitForm.visitTime;

  const handleDocSubmit = () => {
    setDemoSiteVisit(siteVisitForm);
    setDemoSiteVisitReceipts(DEMO_RECEIPT_OPTIONS.filter(r => selectedReceipts.includes(r.id)));
    setDemoStep(4);
    addNotification({
      title: `Site visit logged & documents ready for review: ${demoLead?.company}`,
      type: "engineering",
      targetRoles: ["ceo", "admin"],
      actionLink: "/",
    });
    setShowDocModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Demo Banner */}
      {isEngineer && (
        <DemoWorkflowBanner
          page="engineering"
          requiredStep={3}
          requiredRoles={["planning_engineer", "project_engineer"]}
          title="Step 4 of 8 — Log site visit, upload documents & expense receipts"
          description="Contract signed. Record your site visit details, upload the required documents, and attach any expense receipts."
          actionLabel="Log Site Visit & Upload Documents"
          onAction={() => setShowDocModal(true)}
        />
      )}

      {/* Demo Project Card (shows when step >= 3) */}
      {demoStep >= 3 && demoLead && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{demoLead.company}</p>
                      <Badge variant="info" className="text-[10px]">Demo Project</Badge>
                      {demoStep >= 4 && <Badge variant="success" className="text-[10px]">Site Visit Logged & Docs Submitted</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{demoLead.systemSize} kW — {demoLead.location} — {formatCurrency(demoLead.estimatedValue)}</p>
                    {demoLeadDetails && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {[
                          { label: "Roof", value: demoLeadDetails.roofType },
                          { label: "Grid", value: demoLeadDetails.gridType },
                          { label: "Bill/mo", value: `SAR ${demoLeadDetails.monthlyBill}` },
                          { label: "Timeline", value: demoLeadDetails.decisionTimeline },
                        ].map(f => (
                          <span key={f.label} className="text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground">{f.label}:</span> {f.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {demoStep === 3 && isEngineer && (
                  <Button size="sm" variant="outline" onClick={() => setShowDocModal(true)}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Documents
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Projects", value: projects.filter(p => p.status === "active").length + (demoStep >= 3 ? 1 : 0), color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Planning", value: projects.filter(p => p.status === "planning").length, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
          { label: "Available Engineers", value: engineers.filter(e => e.availability === "available").length, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
          { label: "Total kW Installed", value: `${projects.filter(p => p.status === "completed").reduce((s, p) => s + p.systemSize, 0)} kW`, color: "text-primary bg-primary/10" },
        ].map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold ${s.color}`}>
                {s.value}
              </div>
              <p className="text-sm font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="assignments">
        <TabsList className="h-auto flex-wrap gap-1 p-1.5">
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="sitevisits">Site Visits</TabsTrigger>
          <TabsTrigger value="scope">Scope Verification</TabsTrigger>
          <TabsTrigger value="costing">Costing</TabsTrigger>
          <TabsTrigger value="plans">Project Plans</TabsTrigger>
        </TabsList>

        {/* Assignments */}
        <TabsContent value="assignments">
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {engineers.map((eng) => (
              <motion.div key={eng.id} variants={item}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {eng.name.split(" ").slice(1).map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{eng.name}</p>
                          <Badge variant={eng.availability === "available" ? "success" : eng.availability === "busy" ? "warning" : "secondary"} className="text-[10px] flex-shrink-0">
                            {eng.availability === "on_leave" ? "On Leave" : eng.availability}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{eng.role}</p>
                        <p className="text-xs text-primary/70 mt-1">{eng.specialization}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-lg font-bold text-amber-600">{eng.activeProjects}</p>
                        <p className="text-[10px] text-muted-foreground">Active</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-lg font-bold text-emerald-600">{eng.completedProjects}</p>
                        <p className="text-[10px] text-muted-foreground">Completed</p>
                      </div>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Workload</span>
                        <span>{Math.round((eng.activeProjects / (eng.activeProjects + 2)) * 100)}%</span>
                      </div>
                      <Progress
                        value={(eng.activeProjects / (eng.activeProjects + 2)) * 100}
                        className="h-1.5"
                        indicatorClassName={eng.activeProjects > 2 ? "bg-amber-500" : "bg-emerald-500"}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* Site Visits */}
        <TabsContent value="sitevisits">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">

            {/* Demo lead site visit card */}
            {demoStep >= 4 && demoLead && demoSiteVisit && (
              <motion.div variants={item}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{demoLead.company}</p>
                            <Badge variant="info" className="text-[10px]">Demo Lead</Badge>
                            <Badge variant="success" className="text-[10px]">Visit Completed</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{demoLead.location} — {demoLead.systemSize} kW</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="text-[10px] text-muted-foreground">
                              <span className="font-medium text-foreground">Purpose:</span> {demoSiteVisit.purpose}
                            </span>
                          </div>
                          {demoSiteVisit.notes && (
                            <p className="text-[10px] text-muted-foreground mt-1 italic">"{demoSiteVisit.notes}"</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground flex-shrink-0 space-y-1">
                        <div className="flex items-center gap-1 justify-end">
                          <User className="h-3 w-3" />
                          <span className="font-medium text-foreground">{demoSiteVisit.engineerName}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Calendar className="h-3 w-3" />
                          <span>{demoSiteVisit.visitDate}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock3 className="h-3 w-3" />
                          <span>{demoSiteVisit.visitTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {siteVisits.map((project) => {
              const survey = project.milestones.find(m => m.name === "Site Survey");
              return (
                <motion.div key={project.id} variants={item}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", {
                            "bg-emerald-50 dark:bg-emerald-950/30": survey?.status === "completed",
                            "bg-amber-50 dark:bg-amber-950/30": survey?.status === "in_progress",
                            "bg-muted": survey?.status === "pending",
                          })}>
                            <MapPin className={cn("h-4 w-4", {
                              "text-emerald-600": survey?.status === "completed",
                              "text-amber-600": survey?.status === "in_progress",
                              "text-muted-foreground": survey?.status === "pending",
                            })} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{project.name}</p>
                            <p className="text-xs text-muted-foreground">{project.client} — {project.location}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={statusColors[project.status] as any} className="text-[10px]">{project.status}</Badge>
                              <span className="text-xs text-muted-foreground">{project.systemSize} kW</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 justify-end">
                            <User className="h-3 w-3" /> {project.engineer}
                          </div>
                          <p className="mt-1">{survey ? (
                            <span className={cn("font-medium", {
                              "text-emerald-600": survey.status === "completed",
                              "text-amber-600": survey.status === "in_progress",
                            })}>
                              Survey: {survey.status.replace("_", " ")}
                            </span>
                          ) : "Not scheduled"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </TabsContent>

        {/* Scope Verification */}
        <TabsContent value="scope">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {projects.filter(p => p.status === "active" || p.status === "planning").map((project) => (
              <motion.div key={project.id} variants={item}>
                <Card>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant={statusColors[project.status] as any} className="text-[10px]">{project.status}</Badge>
                        <span className="text-xs text-muted-foreground">{project.systemSize} kW</span>
                        <span className="text-xs text-muted-foreground">Stage: {project.currentStage}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-lg font-bold">{project.progress}%</p>
                      </div>
                      <div className="w-20">
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* Costing */}
        <TabsContent value="costing">
          <motion.div variants={container} initial="hidden" animate="show" className="overflow-x-auto">
            <Card>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Project</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Size</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Contract Value</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Engineer</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden lg:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <motion.tr key={project.id} variants={item} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.client}</p>
                      </td>
                      <td className="px-4 py-3 text-sm hidden sm:table-cell">{project.systemSize} kW</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(project.contractValue)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{project.engineer}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={statusColors[project.status] as any} className="text-[10px]">{project.status}</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Project Plans */}
        <TabsContent value="plans">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {projects.filter(p => p.status === "active" || p.status === "planning").slice(0, 6).map((project) => (
              <motion.div key={project.id} variants={item}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-sm">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{project.client} • {project.engineer}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColors[project.status] as any}>{project.status}</Badge>
                        <span className="text-sm font-bold">{project.progress}%</span>
                      </div>
                    </div>
                    <Progress value={project.progress} className="h-2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {project.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-3">
                          {milestoneStatusIcon[milestone.status]}
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={cn("font-medium", {
                                "text-emerald-600": milestone.status === "completed",
                                "text-amber-600": milestone.status === "in_progress",
                                "text-muted-foreground": milestone.status === "pending",
                              })}>{milestone.name}</span>
                              <span className="text-muted-foreground">{formatDate(milestone.startDate)}</span>
                            </div>
                            {milestone.status === "in_progress" && (
                              <Progress value={milestone.progress} className="h-1 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Document Upload Modal — includes site visit details + expense receipts */}
      {showDocModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowDocModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold">Site Visit & Document Submission</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{demoLead.company} — {demoLead.systemSize} kW</p>
              </div>
              <button onClick={() => setShowDocModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto flex-1">

              {/* ── Section 1: Site Visit Details ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site Visit Details</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Engineer Who Conducted Visit <span className="text-red-500">*</span></label>
                    <select
                      value={siteVisitForm.engineerName}
                      onChange={(e) => setSiteVisitForm(p => ({ ...p, engineerName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {["Ahmed Al-Rashidi", "Khalid Al-Otaibi", "Tariq Al-Ghamdi", "Nasser Al-Qahtani", "Faisal Al-Dosari"].map(n => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date of Visit <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={siteVisitForm.visitDate}
                      onChange={(e) => setSiteVisitForm(p => ({ ...p, visitDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Time of Visit <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      value={siteVisitForm.visitTime}
                      onChange={(e) => setSiteVisitForm(p => ({ ...p, visitTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Purpose of Visit</label>
                    <input
                      type="text"
                      value={siteVisitForm.purpose}
                      onChange={(e) => setSiteVisitForm(p => ({ ...p, purpose: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="e.g. Initial site assessment for rooftop installation"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Site Visit Notes</label>
                    <textarea
                      rows={2}
                      value={siteVisitForm.notes}
                      onChange={(e) => setSiteVisitForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      placeholder="Observations, access notes, site conditions..."
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 2: Lead Documents ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30">
                    <FileText className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead Documents</p>
                </div>
                <div className="space-y-2">
                  {DEMO_DOCS.map((doc) => {
                    const isUploaded = uploadedDocs.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleToggleDoc(doc.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                          isUploaded
                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                            : "border-border hover:border-primary/40 hover:bg-accent/30"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-md flex-shrink-0", isUploaded ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted")}>
                          {isUploaded ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", isUploaded && "text-emerald-700 dark:text-emerald-400")}>{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.code}</p>
                        </div>
                        {isUploaded && <span className="text-xs text-emerald-600 font-medium flex-shrink-0">Uploaded</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Section 3: Expense Receipts ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <Receipt className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expense Receipts <span className="font-normal normal-case text-muted-foreground">(optional)</span></p>
                </div>
                <div className="space-y-2">
                  {DEMO_RECEIPT_OPTIONS.map((receipt) => {
                    const isSelected = selectedReceipts.includes(receipt.id);
                    return (
                      <button
                        key={receipt.id}
                        onClick={() => handleToggleReceipt(receipt.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
                            : "border-border hover:border-amber-400/40 hover:bg-accent/30"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-md flex-shrink-0", isSelected ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted")}>
                          {isSelected ? <CheckCircle2 className="h-4 w-4 text-amber-600" /> : <Receipt className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", isSelected && "text-amber-700 dark:text-amber-400")}>{receipt.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{receipt.type}</p>
                        </div>
                        <span className={cn("text-xs font-semibold flex-shrink-0", isSelected ? "text-amber-600" : "text-muted-foreground")}>
                          SAR {receipt.amount}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedReceipts.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium">
                    Total expenses: SAR {DEMO_RECEIPT_OPTIONS.filter(r => selectedReceipts.includes(r.id)).reduce((s, r) => s + r.amount, 0)}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                Submitting will notify the CEO/Admin to review and approve the site visit details, documents, and any expense receipts before the quotation is prepared.
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDocModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!isSiteVisitValid || uploadedDocs.length === 0}
                onClick={handleDocSubmit}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Submit for Review
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
