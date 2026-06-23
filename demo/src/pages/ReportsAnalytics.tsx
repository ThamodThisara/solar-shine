import { motion } from "framer-motion";
import { Download, FileBarChart, TrendingUp, Users, CheckCircle } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const conversionData = [
  { month: "Oct", leads: 8, qualified: 5, contracted: 2 },
  { month: "Nov", leads: 12, qualified: 8, contracted: 4 },
  { month: "Dec", leads: 10, qualified: 6, contracted: 3 },
  { month: "Jan", leads: 16, qualified: 11, contracted: 6 },
  { month: "Feb", leads: 14, qualified: 9, contracted: 5 },
  { month: "Mar", leads: 18, qualified: 13, contracted: 7 },
  { month: "Apr", leads: 20, qualified: 14, contracted: 8 },
];

const completionData = [
  { month: "Oct", completed: 1, target: 2 },
  { month: "Nov", completed: 2, target: 2 },
  { month: "Dec", completed: 2, target: 3 },
  { month: "Jan", completed: 3, target: 3 },
  { month: "Feb", completed: 2, target: 3 },
  { month: "Mar", completed: 3, target: 4 },
  { month: "Apr", completed: 4, target: 4 },
];

const revenueGrowthData = [
  { month: "Oct", revenue: 150000, prev: 110000 },
  { month: "Nov", revenue: 280000, prev: 210000 },
  { month: "Dec", revenue: 320000, prev: 260000 },
  { month: "Jan", revenue: 410000, prev: 320000 },
  { month: "Feb", revenue: 380000, prev: 300000 },
  { month: "Mar", revenue: 520000, prev: 410000 },
  { month: "Apr", revenue: 490000, prev: 380000 },
];

const satisfactionData = [
  { category: "Communication", score: 3.8 },
  { category: "Quality", score: 4.3 },
  { category: "Timeline", score: 3.5 },
  { category: "Value", score: 4.0 },
  { category: "Safety", score: 4.5 },
  { category: "Support", score: 3.6 },
];

const systemSizeData = [
  { name: "<30 kW", value: 4, color: "#94a3b8" },
  { name: "30–75 kW", value: 7, color: "#7c3aed" },
  { name: "75–150 kW", value: 5, color: "#41034F" },
  { name: ">150 kW", value: 4, color: "#2563eb" },
];

const summaryKPIs = [
  { label: "Lead Conversion Rate", value: "35%", change: "+5%", trend: "up", color: "text-violet-600" },
  { label: "Project Completion Rate", value: "94%", change: "+2%", trend: "up", color: "text-emerald-600" },
  { label: "Revenue Growth YoY", value: "+28%", change: "+8%", trend: "up", color: "text-primary" },
  { label: "Customer Satisfaction", value: "3.9/5", change: "+0.2", trend: "up", color: "text-amber-600" },
  { label: "Avg Project Duration", value: "74 days", change: "-6d", trend: "down", color: "text-blue-600" },
  { label: "On-Time Delivery", value: "82%", change: "+4%", trend: "up", color: "text-green-600" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? `$${(p.value / 1000).toFixed(0)}k` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ReportsAnalytics() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Executive overview — Apr 2024</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1.5" /> Export PDF
          </Button>
          <Button size="sm" variant="outline">
            <FileBarChart className="h-4 w-4 mr-1.5" /> Schedule Report
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {summaryKPIs.map((kpi) => (
          <motion.div key={kpi.label} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{kpi.label}</p>
                <Badge variant={kpi.trend === "up" ? "success" : "warning"} className="mt-2 text-[10px]">
                  {kpi.change}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Lead Conversion Funnel
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="leads" stroke="#94a3b8" strokeWidth={2} dot={false} name="Total Leads" />
                <Line type="monotone" dataKey="qualified" stroke="#7c3aed" strokeWidth={2} dot={false} name="Qualified" />
                <Line type="monotone" dataKey="contracted" stroke="#41034F" strokeWidth={2} dot={{ r: 4 }} name="Contracted" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Revenue Growth
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueGrowthData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#41034F" radius={[3, 3, 0, 0]} name="This Year" />
                <Bar dataKey="prev" fill="#d1d5db" radius={[3, 3, 0, 0]} name="Last Year" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Completed" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={satisfactionData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Score" dataKey="score" stroke="#41034F" fill="#41034F" fillOpacity={0.2} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">System Size Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={systemSizeData} cx="50%" cy="50%" outerRadius={50} dataKey="value">
                  {systemSizeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {systemSizeData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-medium">{s.value} projects</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: "Monthly Executive Report", desc: "KPIs, revenue, projects", icon: FileBarChart, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
              { title: "Lead Conversion Report", desc: "Funnel analysis", icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
              { title: "Project Status Report", desc: "All active projects", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
              { title: "Financial Summary", desc: "Revenue & collections", icon: TrendingUp, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
            ].map((r) => (
              <div key={r.title} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className={`p-2 rounded-lg ${r.color}`}>
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
