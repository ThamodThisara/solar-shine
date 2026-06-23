import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Rocket, CheckCircle, DollarSign,
  Clock, ArrowUpRight, Plus, GitBranch, FileBarChart,
  Activity, Zap, FileCheck, X, CheckCircle2, Send, MapPin, Calendar, Clock3, Receipt
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { leads } from "../data/leads";
import { projects } from "../data/projects";
import { invoices } from "../data/finance";
import { formatCurrency } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import { DemoWorkflowBanner } from "../components/DemoWorkflowBanner";
import type { Role } from "../types";

const leadsMonthlyData = [
  { month: "Oct", leads: 8, qualified: 5 },
  { month: "Nov", leads: 12, qualified: 8 },
  { month: "Dec", leads: 10, qualified: 6 },
  { month: "Jan", leads: 16, qualified: 11 },
  { month: "Feb", leads: 14, qualified: 9 },
  { month: "Mar", leads: 18, qualified: 13 },
  { month: "Apr", leads: 20, qualified: 14 },
];

const revenueData = [
  { month: "Oct", revenue: 150000, target: 180000 },
  { month: "Nov", revenue: 280000, target: 250000 },
  { month: "Dec", revenue: 320000, target: 300000 },
  { month: "Jan", revenue: 410000, target: 380000 },
  { month: "Feb", revenue: 380000, target: 400000 },
  { month: "Mar", revenue: 520000, target: 480000 },
  { month: "Apr", revenue: 490000, target: 500000 },
];

const projectStatusData = [
  { name: "Active", value: 7, color: "#059669" },
  { name: "Planning", value: 5, color: "#2563eb" },
  { name: "Completed", value: 3, color: "#7c3aed" },
  { name: "On Hold", value: 1, color: "#d97706" },
  { name: "Cancelled", value: 1, color: "#ef4444" },
];

const workloadData = [
  { dept: "Marketing", tasks: 12, capacity: 15 },
  { dept: "Sales", tasks: 18, capacity: 20 },
  { dept: "Engineering", tasks: 24, capacity: 25 },
  { dept: "Finance", tasks: 9, capacity: 12 },
  { dept: "HR & Admin", tasks: 6, capacity: 8 },
];

const allActivities = [
  { id: 1, type: "lead", roles: ["marketing_manager", "sales_manager", "ceo", "admin"], icon: Users, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30", title: "New Lead Generated", desc: "Aqeel Pharmaceuticals — 65kW System", time: "5 min ago" },
  { id: 2, type: "quotation", roles: ["sales_manager", "ceo", "admin"], icon: FileBarChart, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", title: "Quotation Delivered", desc: "Dosari Hotel 80kW System — SAR 345,000", time: "2h ago" },
  { id: 3, type: "payment", roles: ["finance_executive", "ceo", "admin"], icon: DollarSign, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", title: "Payment Received", desc: "Ghamdi Food Processing — Advance SAR 155,400", time: "4h ago" },
  { id: 4, type: "project", roles: ["planning_engineer", "project_engineer", "ceo", "admin"], icon: Rocket, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", title: "Milestone Completed", desc: "Al-Rashidi Industries — Procurement Done", time: "1d ago" },
  { id: 5, type: "quality", roles: ["planning_engineer", "project_engineer", "ceo", "admin"], icon: CheckCircle, color: "text-green-600 bg-green-50 dark:bg-green-950/30", title: "Quality Check Passed", desc: "Sulami Healthcare Clinic — All Tests OK", time: "2d ago" },
  { id: 6, type: "contract", roles: ["sales_manager", "ceo", "admin"], icon: TrendingUp, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30", title: "Contract Signed", desc: "Juhani Plastics Factory — SAR 302,000", time: "3d ago" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="capitalize">
          {p.name}: {p.name.toLowerCase().includes("revenue") || p.name.toLowerCase().includes("target")
            ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const roleKpiKeys: Record<Role, string[]> = {
  ceo: ["Total Leads", "Qualified Leads", "Active Projects", "Completed", "Revenue Collected", "Pending Payments"],
  admin: ["Total Leads", "Qualified Leads", "Active Projects", "Completed", "Revenue Collected", "Pending Payments"],
  marketing_manager: ["Total Leads", "Qualified Leads"],
  sales_manager: ["Total Leads", "Qualified Leads", "Revenue Collected"],
  planning_engineer: ["Active Projects", "Completed"],
  project_engineer: ["Active Projects", "Completed"],
  finance_executive: ["Revenue Collected", "Pending Payments"],
};

const roleQuickActions: Record<Role, { label: string; icon: any; color: string; path: string }[]> = {
  ceo: [
    { label: "New Lead", icon: Plus, color: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40", path: "/leads" },
    { label: "Start Project", icon: Rocket, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40", path: "/projects" },
    { label: "Generate Report", icon: FileBarChart, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/reports" },
    { label: "View Workflow", icon: GitBranch, color: "bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30", path: "/workflow" },
  ],
  admin: [
    { label: "New Lead", icon: Plus, color: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40", path: "/leads" },
    { label: "Start Project", icon: Rocket, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40", path: "/projects" },
    { label: "Generate Report", icon: FileBarChart, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/reports" },
    { label: "View Workflow", icon: GitBranch, color: "bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30", path: "/workflow" },
  ],
  marketing_manager: [
    { label: "New Lead", icon: Plus, color: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40", path: "/leads" },
    { label: "View Workflow", icon: GitBranch, color: "bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30", path: "/workflow" },
    { label: "Reports", icon: FileBarChart, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/reports" },
  ],
  sales_manager: [
    { label: "Sales Pipeline", icon: TrendingUp, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/sales" },
    { label: "Leads", icon: Users, color: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40", path: "/leads" },
    { label: "Reports", icon: FileBarChart, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40", path: "/reports" },
    { label: "View Workflow", icon: GitBranch, color: "bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30", path: "/workflow" },
  ],
  planning_engineer: [
    { label: "Engineering Ops", icon: Zap, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40", path: "/engineering" },
    { label: "Projects", icon: Rocket, color: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40", path: "/projects" },
    { label: "Documents", icon: FileBarChart, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/documents" },
    { label: "View Workflow", icon: GitBranch, color: "bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30", path: "/workflow" },
  ],
  project_engineer: [
    { label: "Engineering Ops", icon: Zap, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40", path: "/engineering" },
    { label: "Projects", icon: Rocket, color: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40", path: "/projects" },
    { label: "Documents", icon: FileBarChart, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/documents" },
  ],
  finance_executive: [
    { label: "Finance Center", icon: DollarSign, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40", path: "/finance" },
    { label: "Reports", icon: FileBarChart, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40", path: "/reports" },
    { label: "Documents", icon: FileBarChart, color: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40", path: "/documents" },
  ],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useRole();
  const { demoStep, demoLead, demoLeadDetails, demoSiteVisit, demoSiteVisitReceipts, setDemoStep, addNotification } = useWorkflowDemo();

  const [showDocApprovalModal, setShowDocApprovalModal] = useState(false);
  const [showQuoteApprovalModal, setShowQuoteApprovalModal] = useState(false);

  const isManagement = role === "ceo" || role === "admin";

  const handleApproveDocuments = () => {
    setDemoStep(5);
    addNotification({
      title: `Documents approved: ${demoLead?.company} — prepare quotation`,
      type: "sales",
      targetRoles: ["sales_manager"],
      actionLink: "/sales",
    });
    addNotification({
      title: `Engineering documents approved by management: ${demoLead?.company}`,
      type: "project",
      targetRoles: ["ceo", "admin"],
    });
    setShowDocApprovalModal(false);
  };

  const handleApproveQuotation = () => {
    setDemoStep(7);
    addNotification({
      title: `Quotation approved — advance payment required: ${demoLead?.company}`,
      type: "finance",
      targetRoles: ["finance_executive", "ceo", "admin"],
      actionLink: "/finance",
    });
    setShowQuoteApprovalModal(false);
  };

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === "qualified" || l.status === "converted").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
  const pendingPayments = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0);

  const allKpis = [
    { title: "Total Leads", value: totalLeads, change: "+22%", icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", trend: "up" },
    { title: "Qualified Leads", value: qualifiedLeads, change: "+15%", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", trend: "up" },
    { title: "Active Projects", value: activeProjects, change: "+3", icon: Rocket, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", trend: "up" },
    { title: "Completed", value: completedProjects, change: "+2 this month", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", trend: "up" },
    { title: "Revenue Collected", value: formatCurrency(totalRevenue), change: "+18%", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", trend: "up" },
    { title: "Pending Payments", value: formatCurrency(pendingPayments), change: "-5%", icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", trend: "down" },
  ];

  const allowedKpiTitles = roleKpiKeys[role];
  const kpis = allKpis.filter((k) => allowedKpiTitles.includes(k.title));

  const showLeadsChart = ["ceo", "admin", "marketing_manager", "sales_manager"].includes(role);
  const showRevenueChart = ["ceo", "admin", "finance_executive", "sales_manager"].includes(role);
  const showProjectStatus = ["ceo", "admin", "planning_engineer", "project_engineer"].includes(role);
  const showWorkload = ["ceo", "admin"].includes(role);
  const showActiveProjects = ["ceo", "admin", "planning_engineer", "project_engineer"].includes(role);

  const activities = allActivities.filter((a) =>
    role === "ceo" || role === "admin" || a.roles.includes(role)
  );

  const quickActions = roleQuickActions[role] || roleQuickActions["ceo"];

  const gridCols = kpis.length <= 2
    ? "grid-cols-2"
    : kpis.length === 3
    ? "grid-cols-2 sm:grid-cols-3"
    : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* CEO/Admin document approval banner (step 4→5) */}
      {isManagement && (
        <DemoWorkflowBanner
          page="dashboard_doc_review"
          requiredStep={4}
          requiredRoles={["ceo", "admin"]}
          title="Step 5 of 8 — Review and approve engineering documents"
          description="Engineering has uploaded site documents. Review them and approve to notify Sales for quotation preparation."
          actionLabel="Review & Approve Documents"
          onAction={() => setShowDocApprovalModal(true)}
        />
      )}

      {/* CEO/Admin quotation approval banner (step 6→7) */}
      {isManagement && (
        <DemoWorkflowBanner
          page="dashboard_quote_review"
          requiredStep={6}
          requiredRoles={["ceo", "admin"]}
          title="Step 7 of 8 — Review and approve the sales quotation"
          description="Sales has submitted the quotation. Approve it to forward the project to Finance for payment processing."
          actionLabel="Review & Approve Quotation"
          onAction={() => setShowQuoteApprovalModal(true)}
        />
      )}

      {/* KPIs */}
      <div className={`grid gap-3 ${gridCols}`}>
        {kpis.map((kpi) => (
          <motion.div key={kpi.title} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${kpi.trend === "up" ? "text-emerald-600" : "text-orange-600"}`}>
                    <ArrowUpRight className={`h-3 w-3 ${kpi.trend === "down" && "rotate-180"}`} />
                    {kpi.change}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      {(showLeadsChart || showProjectStatus) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {showLeadsChart && (
            <motion.div variants={item} className={showProjectStatus ? "lg:col-span-2" : "lg:col-span-3"}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Monthly Leads Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={leadsMonthlyData}>
                      <defs>
                        <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#41034F" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#41034F" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="qualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="leads" stroke="#41034F" strokeWidth={2} fill="url(#leadsGrad)" name="Total Leads" />
                      <Area type="monotone" dataKey="qualified" stroke="#2563eb" strokeWidth={2} fill="url(#qualGrad)" name="Qualified" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {showProjectStatus && (
            <motion.div variants={item}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Project Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {projectStatusData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {projectStatusData.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-muted-foreground">{s.name}</span>
                        </div>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Revenue + Active Projects */}
      {(showRevenueChart || showActiveProjects) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {showRevenueChart && (
            <motion.div variants={item} className={showActiveProjects ? "lg:col-span-2" : "lg:col-span-3"}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Revenue Overview</CardTitle>
                    <Badge variant="success">+8.5% vs target</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="revenue" fill="#41034F" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="target" fill="#d1d5db" radius={[4, 4, 0, 0]} name="Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {showActiveProjects && (
            <motion.div variants={item}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Active Projects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projects.filter((p) => p.status === "active").slice(0, 5).map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium truncate max-w-[160px]">{p.name.split(" ").slice(0, 3).join(" ")}</p>
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Workload + Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showWorkload && (
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Department Workload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workloadData.map((d) => (
                  <div key={d.dept} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{d.dept}</span>
                      <span className="font-medium">{d.tasks}/{d.capacity}</span>
                    </div>
                    <Progress
                      value={(d.tasks / d.capacity) * 100}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity */}
        {activities.length > 0 && (
          <motion.div variants={item} className={showWorkload ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Recent Activity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${a.color} flex-shrink-0`}>
                        <a.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 ${quickActions.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:scale-105 ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ───── Document Approval Modal ───── */}
      {showDocApprovalModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowDocApprovalModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold">Review Site Visit & Engineering Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{demoLead.company} — {demoLead.systemSize} kW</p>
              </div>
              <button onClick={() => setShowDocApprovalModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">

              {/* Site Visit Details */}
              {demoSiteVisit && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site Visit Details</p>
                  </div>
                  <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-blue-500" />
                        <span className="text-muted-foreground">Engineer:</span>
                        <span className="font-medium ml-0.5">{demoSiteVisit.engineerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-blue-500" />
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium ml-0.5">{demoSiteVisit.visitDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3 text-blue-500" />
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium ml-0.5">{demoSiteVisit.visitTime}</span>
                      </div>
                    </div>
                    {demoSiteVisit.purpose && (
                      <p className="text-xs"><span className="text-muted-foreground">Purpose:</span> <span className="font-medium">{demoSiteVisit.purpose}</span></p>
                    )}
                    {demoSiteVisit.notes && (
                      <p className="text-xs text-muted-foreground italic">"{demoSiteVisit.notes}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* Lead Documents */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30">
                    <FileCheck className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded Documents</p>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Site Inspection Sheet", code: "D1" },
                    { name: "Engineering Design Report", code: "D2" },
                    { name: "Pre-Costing Sheet", code: "D3" },
                  ].map((doc) => (
                    <div key={doc.code} className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                      <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.code} — Uploaded by Engineering</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense Receipts */}
              {demoSiteVisitReceipts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                      <Receipt className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expense Receipts</p>
                  </div>
                  <div className="space-y-2">
                    {demoSiteVisitReceipts.map((receipt) => (
                      <div key={receipt.id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                        <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40">
                          <Receipt className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{receipt.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{receipt.type} expense</p>
                        </div>
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-shrink-0">SAR {receipt.amount}</span>
                      </div>
                    ))}
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium text-right">
                      Total: SAR {demoSiteVisitReceipts.reduce((s, r) => s + r.amount, 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Client Details */}
              {demoLeadDetails && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <p className="text-xs font-medium">Client Details</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-muted-foreground">Roof:</span> <span className="font-medium ml-1">{demoLeadDetails.roofType}</span></div>
                    <div><span className="text-muted-foreground">Grid:</span> <span className="font-medium ml-1">{demoLeadDetails.gridType}</span></div>
                    <div><span className="text-muted-foreground">Size:</span> <span className="font-medium ml-1">{demoLeadDetails.confirmedSystemSize} kW</span></div>
                    <div><span className="text-muted-foreground">Bill/mo:</span> <span className="font-medium ml-1">SAR {demoLeadDetails.monthlyBill}</span></div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                Approving will notify the Sales team to prepare and submit a quotation for this project.
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDocApprovalModal(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleApproveDocuments}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Approve Documents
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ───── Quotation Approval Modal ───── */}
      {showQuoteApprovalModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowQuoteApprovalModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Review Sales Quotation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{demoLead.company} — {demoLead.systemSize} kW</p>
              </div>
              <button onClick={() => setShowQuoteApprovalModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-medium text-primary">Quotation Details</p>
                {[
                  { label: "Client", value: demoLead.company },
                  { label: "System Size", value: `${demoLeadDetails?.confirmedSystemSize ?? demoLead.systemSize} kW` },
                  { label: "Roof Type", value: demoLeadDetails?.roofType ?? "—" },
                  { label: "Grid Connection", value: demoLeadDetails?.gridType ?? "—" },
                  { label: "Contract Value", value: `SAR ${demoLead.estimatedValue.toLocaleString()}` },
                  { label: "Advance (30%)", value: `SAR ${Math.round(demoLead.estimatedValue * 0.3).toLocaleString()}` },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{f.label}</span>
                    <span className={`font-medium text-xs ${f.label === "Contract Value" ? "text-primary" : ""}`}>{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
                Approving this quotation will notify the Finance team to process the advance payment and begin project execution.
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowQuoteApprovalModal(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleApproveQuotation}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Approve Quotation
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
