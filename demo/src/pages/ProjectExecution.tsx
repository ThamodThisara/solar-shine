import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Play, MapPin, User, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { projects } from "../data/projects";
import type { Project } from "../types";
import { formatDate, formatCurrency } from "../lib/utils";
import { cn } from "../lib/utils";

const statusColors: Record<string, any> = {
  active: "success",
  planning: "info",
  completed: "default",
  on_hold: "warning",
  cancelled: "destructive",
};

const milestoneIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />,
  in_progress: <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />,
  pending: <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />,
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function ProjectCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);

  const completedMilestones = project.milestones.filter(m => m.status === "completed").length;
  const totalMilestones = project.milestones.length;
  const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);

  return (
    <motion.div variants={item}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm">{project.name}</CardTitle>
                <Badge variant={statusColors[project.status]}>{project.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {project.client}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.location}</span>
                <span>{project.systemSize} kW</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <p className="text-muted-foreground">Contract</p>
                <p className="font-semibold text-sm">{formatCurrency(project.contractValue)}</p>
              </div>
              {project.status !== "completed" && project.status !== "cancelled" && (
                <div className="text-right text-xs">
                  <p className="text-muted-foreground">Days Left</p>
                  <p className={cn("font-bold text-sm", daysLeft < 30 ? "text-red-600" : daysLeft < 60 ? "text-amber-600" : "text-foreground")}>
                    {daysLeft > 0 ? daysLeft : "Overdue"}
                  </p>
                </div>
              )}
              {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{project.progress}% ({completedMilestones}/{totalMilestones} milestones)</span>
            </div>
            <Progress value={project.progress} className="h-2"
              indicatorClassName={project.status === "completed" ? "bg-emerald-500" : project.status === "on_hold" ? "bg-amber-500" : undefined} />
          </div>
        </CardHeader>

        {expanded && (
          <CardContent>
            <div className="space-y-2 mb-4">
              {project.milestones.map((milestone, idx) => (
                <div key={milestone.id} className="flex items-center gap-3">
                  {milestoneIcon[milestone.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className={cn("font-medium truncate", {
                        "text-emerald-600": milestone.status === "completed",
                        "text-amber-600": milestone.status === "in_progress",
                        "text-muted-foreground": milestone.status === "pending",
                      })}>{milestone.name}</span>
                      <div className="flex items-center gap-3 text-muted-foreground flex-shrink-0">
                        <span>{formatDate(milestone.startDate)} – {formatDate(milestone.endDate)}</span>
                        {milestone.status === "in_progress" && <span className="text-amber-600 font-medium">{milestone.progress}%</span>}
                      </div>
                    </div>
                    {milestone.status === "in_progress" && (
                      <Progress value={milestone.progress} className="h-1 mt-1" indicatorClassName="bg-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Engineer</p>
                <p className="text-xs font-medium mt-0.5">{project.engineer}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sales Manager</p>
                <p className="text-xs font-medium mt-0.5">{project.salesManager}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-xs font-medium mt-0.5">{formatDate(project.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="text-xs font-medium mt-0.5">{formatDate(project.endDate)}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

export default function ProjectExecution() {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? projects : projects.filter(p => p.status === filter);

  const stats = {
    active: projects.filter(p => p.status === "active").length,
    planning: projects.filter(p => p.status === "planning").length,
    completed: projects.filter(p => p.status === "completed").length,
    onHold: projects.filter(p => p.status === "on_hold").length,
    totalKw: projects.reduce((s, p) => s + p.systemSize, 0),
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Active", value: stats.active, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Planning", value: stats.planning, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
          { label: "Completed", value: stats.completed, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
          { label: "On Hold", value: stats.onHold, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { label: "Total kW", value: `${stats.totalKw} kW`, color: "text-primary bg-primary/10" },
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

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "active", "planning", "completed", "on_hold", "cancelled"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent text-muted-foreground"
            )}
          >
            {f.replace("_", " ")} {f === "all" ? `(${projects.length})` : `(${projects.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Projects */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </motion.div>
    </div>
  );
}
