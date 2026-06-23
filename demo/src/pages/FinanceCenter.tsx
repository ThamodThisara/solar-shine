import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Download, X, CheckCircle2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { invoices, budgetData, paymentTrendData } from "../data/finance";
import { formatCurrency, formatDate } from "../lib/utils";
import { cn } from "../lib/utils";
import { useRole } from "../context/RoleContext";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import { DemoWorkflowBanner } from "../components/DemoWorkflowBanner";

const statusConfig: Record<string, { variant: any; label: string }> = {
  paid: { variant: "success", label: "Paid" },
  pending: { variant: "warning", label: "Pending" },
  overdue: { variant: "destructive", label: "Overdue" },
  partial: { variant: "info", label: "Partial" },
};

const typeConfig: Record<string, string> = {
  advance: "Advance",
  progress: "Progress",
  final: "Final",
};

const DEMO_ADVANCE_RATE = 0.3;

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function FinanceCenter() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { role } = useRole();
  const { demoStep, demoLead, setDemoStep, addNotification } = useWorkflowDemo();

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);

  const demoAdvanceAmount = demoLead ? Math.round(demoLead.estimatedValue * DEMO_ADVANCE_RATE) : 0;

  const handleCollectPayment = () => {
    setDemoStep(8);
    addNotification({
      title: `Advance payment collected: ${demoLead?.company} — ${formatCurrency(demoAdvanceAmount)}`,
      type: "finance",
      targetRoles: ["ceo", "admin", "planning_engineer", "project_engineer"],
    });
    setShowPaymentModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Demo Banner */}
      {role === "finance_executive" && (
        <DemoWorkflowBanner
          page="finance"
          requiredStep={7}
          requiredRoles={["finance_executive"]}
          title="Step 8 of 8 — Process advance payment to complete the workflow"
          description="Quotation approved by management. Process the advance payment to finalize project kickoff."
          actionLabel="Collect Advance Payment"
          onAction={() => setShowPaymentModal(true)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Revenue Collected", value: formatCurrency(totalRevenue + (demoStep >= 8 ? demoAdvanceAmount : 0)), icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", sub: `${invoices.filter(i => i.status === "paid").length + (demoStep >= 8 ? 1 : 0)} invoices` },
          { label: "Pending", value: formatCurrency(pendingAmount), icon: DollarSign, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", sub: `${invoices.filter(i => i.status === "pending").length} invoices` },
          { label: "Overdue", value: formatCurrency(overdueAmount), icon: AlertCircle, color: "text-red-600 bg-red-50 dark:bg-red-950/30", sub: `${invoices.filter(i => i.status === "overdue").length} invoices` },
          { label: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: TrendingUp, color: "text-primary bg-primary/10", sub: `${invoices.length} total` },
        ].map((k) => (
          <Card key={k.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${k.color} mb-3`}>
                <k.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payment Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={paymentTrendData}>
                <defs>
                  <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#41034F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#41034F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outstandingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="collected" stroke="#41034F" strokeWidth={2} fill="url(#collectedGrad)" name="Collected" />
                <Area type="monotone" dataKey="outstanding" stroke="#ef4444" strokeWidth={2} fill="url(#outstandingGrad)" name="Outstanding" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#41034F" radius={[3, 3, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#94a3b8" radius={[3, 3, 0, 0]} name="Expenses" />
                <Bar dataKey="profit" fill="#10b981" radius={[3, 3, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Invoice Register</CardTitle>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Invoice</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Project</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Due Date</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden lg:table-cell">Client</th>
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {demoStep >= 8 && demoLead && (
                <motion.tr variants={item} className="border-b border-border/50 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <td className="px-4 py-3 text-sm font-medium">
                    INV-DEMO
                    <span className="ml-1 text-[10px] text-primary font-medium">(Demo)</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[160px]">
                    <p className="truncate">{demoLead.company}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400">
                      Advance
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(demoAdvanceAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Paid</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {new Date().toISOString().split("T")[0]}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{demoLead.name}</td>
                </motion.tr>
              )}
              {invoices.map((inv) => (
                <motion.tr key={inv.id} variants={item} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{inv.id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[160px]">
                    <p className="truncate">{inv.projectName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", {
                      "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400": inv.type === "advance",
                      "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400": inv.type === "progress",
                      "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400": inv.type === "final",
                    })}>
                      {typeConfig[inv.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusConfig[inv.status].variant}>{statusConfig[inv.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    <span className={cn(inv.status === "overdue" && "text-red-600 font-medium")}>
                      {formatDate(inv.dueDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{inv.client}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {invoices.length + (demoStep >= 8 ? 1 : 0)} invoices — Total: {formatCurrency(totalInvoiced + (demoStep >= 8 ? demoAdvanceAmount : 0))}
        </div>
      </Card>

      {/* Payment Collection Modal */}
      {showPaymentModal && demoLead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPaymentModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Collect Advance Payment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Demo: Final step of the workflow</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs font-medium text-primary">Payment Details</p>
                {[
                  { label: "Client", value: demoLead.company },
                  { label: "Project", value: `${demoLead.systemSize} kW Solar Installation` },
                  { label: "Contract Value", value: formatCurrency(demoLead.estimatedValue) },
                  { label: "Advance Rate", value: `${(DEMO_ADVANCE_RATE * 100).toFixed(0)}%` },
                  { label: "Advance Amount", value: formatCurrency(demoAdvanceAmount) },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">{f.label}</span>
                    <span className={cn("font-medium text-xs", f.label === "Advance Amount" && "text-emerald-600 text-sm")}>{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
                Collecting this payment completes the full demo workflow: Lead → Qualified → Contracted → Docs Reviewed → Quoted → Approved → Finance.
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleCollectPayment}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Confirm Payment Received
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
