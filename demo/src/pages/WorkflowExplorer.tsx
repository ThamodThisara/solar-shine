import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, FileText, User, Layers,
  ArrowRight, Play, Pause, ZoomIn, ZoomOut, RotateCcw,
  Target, Phone, CheckCircle, Tags, Send, PenLine,
  UserPlus, MapPin, Calculator, TrendingUp, Calendar,
  Wrench, BarChart3, Flag, Shield, Star, DollarSign,
  FileCheck, Users, Archive, ClipboardCheck, FileSpreadsheet,
  CheckSquare, PieChart
} from "lucide-react";
import { workflowStages, departmentColors } from "../data/workflow";
import type { WorkflowStage } from "../types";
import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

const iconMap: Record<string, React.ElementType> = {
  Target, Phone, CheckCircle, Tags, FileText, Stamp: CheckSquare,
  Send, ThumbsUp: CheckCircle, PenLine, UserPlus, MapPin,
  ClipboardCheck, Calculator, TrendingUp, Calendar, FileSpreadsheet,
  CheckSquare, Wrench, BarChart3, Flag, Shield, HandshakeIcon: CheckCircle,
  FileCheck, Star, DollarSign, PieChart, Users, Archive,
};

const departments = ["Marketing", "Sales", "Engineering", "Finance", "HR & Admin"] as const;

const deptStages: Record<string, string[]> = {
  Marketing: ["WF01", "WF02"],
  Sales: ["WF03", "WF04", "WF05", "WF06", "WF07", "WF08", "WF09", "WF10"],
  Engineering: ["WF11", "WF12", "WF13", "WF14", "WF15", "WF16", "WF17", "WF18", "WF19", "WF20", "WF21", "WF22", "WF23", "WF24", "WF25"],
  Finance: ["WF26", "WF27", "WF28", "WF29"],
  "HR & Admin": ["WF30"],
};

const simulationSteps = [
  { stageId: "WF01", dept: "Marketing", person: "Marketing Manager", progress: 5 },
  { stageId: "WF03", dept: "Sales", person: "Sales Executive", progress: 15 },
  { stageId: "WF04", dept: "Sales", person: "Sales Manager", progress: 22 },
  { stageId: "WF05", dept: "Sales", person: "Sales Manager", progress: 28 },
  { stageId: "WF06", dept: "Sales", person: "Planning Engineer", progress: 35 },
  { stageId: "WF07", dept: "Sales", person: "General Manager", progress: 42 },
  { stageId: "WF08", dept: "Sales", person: "Sales Executive", progress: 48 },
  { stageId: "WF09", dept: "Sales", person: "Sales Manager", progress: 55 },
  { stageId: "WF10", dept: "Sales", person: "Sales Manager", progress: 62 },
  { stageId: "WF11", dept: "Engineering", person: "Engineering Manager", progress: 67 },
  { stageId: "WF12", dept: "Engineering", person: "Planning Engineer", progress: 70 },
  { stageId: "WF19", dept: "Engineering", person: "Project Engineer", progress: 80 },
  { stageId: "WF22", dept: "Engineering", person: "Quality Engineer", progress: 90 },
  { stageId: "WF23", dept: "Engineering", person: "Project Manager", progress: 95 },
  { stageId: "WF25", dept: "Engineering", person: "Sales Manager", progress: 100 },
];

export default function WorkflowExplorer() {
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(-1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSim = simStep >= 0 ? simulationSteps[simStep] : null;

  const startSimulation = () => {
    setSimRunning(true);
    setSimStep(0);
    let step = 0;
    simRef.current = setInterval(() => {
      step++;
      if (step >= simulationSteps.length) {
        clearInterval(simRef.current!);
        setSimRunning(false);
        setSimStep(simulationSteps.length - 1);
      } else {
        setSimStep(step);
      }
    }, 1200);
  };

  const stopSimulation = () => {
    if (simRef.current) clearInterval(simRef.current);
    setSimRunning(false);
    setSimStep(-1);
  };

  const isSimActive = (stageId: string) => {
    if (simStep < 0) return false;
    return simulationSteps.slice(0, simStep + 1).some((s) => s.stageId === stageId);
  };

  const isCurrentSim = (stageId: string) => currentSim?.stageId === stageId;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Workflow Explorer</h2>
          <p className="text-sm text-muted-foreground">Interactive solar project lifecycle visualization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(1)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          {simRunning ? (
            <Button size="sm" variant="destructive" onClick={stopSimulation}>
              <Pause className="h-4 w-4 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={startSimulation}>
              <Play className="h-4 w-4 mr-1" /> Run Simulation
            </Button>
          )}
        </div>
      </div>

      {/* Simulation Status */}
      <AnimatePresence>
        {currentSim && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold">Live Simulation</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span><span className="text-muted-foreground">Department:</span> <strong>{currentSim.dept}</strong></span>
                <span><span className="text-muted-foreground">Stage:</span> <strong>{workflowStages.find(s => s.id === currentSim.stageId)?.name}</strong></span>
                <span><span className="text-muted-foreground">Responsible:</span> <strong>{currentSim.person}</strong></span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${currentSim.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-sm font-bold">{currentSim.progress}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workflow Canvas */}
      <div className="overflow-auto rounded-xl border border-border bg-card" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s ease", minWidth: 900 }}>
          <div className="p-4 space-y-0">
            {departments.map((dept) => {
              const stages = deptStages[dept]
                .map((id) => workflowStages.find((s) => s.id === id))
                .filter(Boolean) as WorkflowStage[];
              const color = departmentColors[dept];

              return (
                <div key={dept} className="flex gap-0">
                  {/* Lane label */}
                  <div
                    className="flex-shrink-0 w-24 flex items-center justify-center rounded-l-lg"
                    style={{ backgroundColor: `${color}15`, borderLeft: `4px solid ${color}` }}
                  >
                    <span
                      className="text-xs font-bold rotate-[-90deg] whitespace-nowrap"
                      style={{ color }}
                    >
                      {dept}
                    </span>
                  </div>

                  {/* Stages */}
                  <div className="flex-1 flex flex-wrap gap-2 p-3 border-b border-border/50 bg-muted/20">
                    {stages.map((stage, idx) => {
                      const Icon = iconMap[stage.icon] || FileText;
                      const active = isSimActive(stage.id);
                      const current = isCurrentSim(stage.id);

                      return (
                        <div key={stage.id} className="flex items-center gap-1">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                            onMouseEnter={() => setHoveredId(stage.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={cn(
                              "relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-all w-28 text-center",
                              current
                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                                : active
                                ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                                : selectedStage?.id === stage.id
                                ? "border-primary bg-primary/5"
                                : "border-border/60 bg-background hover:border-primary/40 hover:bg-accent/50"
                            )}
                          >
                            {current && (
                              <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary animate-ping" />
                            )}
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: `${stage.color}20`,
                                color: stage.color,
                              }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[10px] font-semibold leading-tight text-center">{stage.name}</span>
                            <span className="text-[9px] text-muted-foreground">{stage.code}</span>
                            {active && !current && (
                              <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
                            )}
                          </motion.button>
                          {idx < stages.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(departmentColors).map(([dept, color]) => (
          <div key={dept} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{dept}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-primary animate-ping" />
          <span className="text-muted-foreground">Active (Simulation)</span>
        </div>
      </div>

      {/* Stage Detail Drawer */}
      <AnimatePresence>
        {selectedStage && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[380px] bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${selectedStage.color}20`, color: selectedStage.color }}
                  >
                    {(() => { const I = iconMap[selectedStage.icon] || FileText; return <I className="h-3.5 w-3.5" />; })()}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{selectedStage.code}</span>
                </div>
                <h3 className="font-semibold mt-1">{selectedStage.name}</h3>
              </div>
              <button onClick={() => setSelectedStage(null)} className="p-1.5 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Department */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${selectedStage.color}20`, color: selectedStage.color }}>
                  <Layers className="h-3 w-3" /> {selectedStage.department}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-foreground leading-relaxed">{selectedStage.description}</p>
              </div>

              {/* Responsible */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Responsible
                </h4>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {selectedStage.responsible.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium">{selectedStage.responsible}</span>
                </div>
              </div>

              {/* Inputs */}
              {selectedStage.inputs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inputs</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStage.inputs.map((input) => (
                      <Badge key={input} variant="secondary" className="text-xs">{input}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Outputs */}
              {selectedStage.outputs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Outputs</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStage.outputs.map((output) => (
                      <Badge key={output} variant="outline" className="text-xs">{output}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedStage.documents.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Documents Required
                  </h4>
                  <div className="space-y-1.5">
                    {selectedStage.documents.map((doc) => (
                      <div key={doc} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                        <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions */}
              {selectedStage.decisions && selectedStage.decisions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Decision Points</h4>
                  <div className="space-y-1.5">
                    {selectedStage.decisions.map((d) => (
                      <div key={d} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-700 dark:text-amber-400">
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Stages */}
              {selectedStage.nextStages.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Leads To</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStage.nextStages.map((id) => {
                      const next = workflowStages.find((s) => s.id === id);
                      return next ? (
                        <button key={id} onClick={() => setSelectedStage(next)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs hover:bg-accent transition-colors">
                          <ArrowRight className="h-3 w-3" /> {next.name}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
