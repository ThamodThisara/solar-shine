import { motion } from "framer-motion";
import { Play, CheckCircle2, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import { useRole } from "../context/RoleContext";
import { cn } from "../lib/utils";

// Each entry represents what step number is achieved after this action
const STEPS = [
  { label: "Lead Created", achievedAt: 1 },
  { label: "Qualified", achievedAt: 2 },
  { label: "Contracted", achievedAt: 3 },
  { label: "Docs Up", achievedAt: 4 },
  { label: "Docs OK", achievedAt: 5 },
  { label: "Quoted", achievedAt: 6 },
  { label: "Quote OK", achievedAt: 7 },
  { label: "Finance", achievedAt: 8 },
];

interface DemoWorkflowBannerProps {
  page: "leads_marketing" | "leads_sales" | "sales" | "sales_quotation" | "engineering" | "dashboard_doc_review" | "dashboard_quote_review" | "finance";
  onAction: () => void;
  actionLabel: string;
  title: string;
  description: string;
  /** The demoStep value that must currently be active for this banner's action button to appear */
  requiredStep: number;
  requiredRoles: string[];
}

export function DemoWorkflowBanner({
  page,
  onAction,
  actionLabel,
  title,
  description,
  requiredStep,
  requiredRoles,
}: DemoWorkflowBannerProps) {
  const { demoStep, demoLead, resetDemo } = useWorkflowDemo();
  const { role } = useRole();

  const isRightRole = requiredRoles.includes(role);
  const isRightStep = demoStep === requiredStep;
  const isComplete = demoStep === 8;
  const isPast = demoStep > requiredStep;

  // Only render for the correct role
  if (!isRightRole) return null;
  // Hide once this action is in the past (except finance which shows complete)
  if (isPast && page !== "finance") return null;
  // Don't show before it becomes relevant (more than 1 step early)
  if (demoStep < requiredStep - 1) return null;

  if (isComplete && page === "finance") {
    return (
      <motion.div
        key="complete"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Demo Workflow Complete!
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Lead Created → Qualified → Contracted → Docs Reviewed → Quoted → Approved → Finance
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            onClick={resetDemo}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Demo
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`banner-step-${requiredStep}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 w-full">
            {/* 5-step progress indicator */}
            <div className="flex items-center gap-1 mb-2.5 flex-wrap">
              {STEPS.map((s, i) => {
                const isDone = demoStep >= s.achievedAt;
                const isCurrent = s.achievedAt === requiredStep + 1;
                return (
                  <div key={s.achievedAt} className="flex items-center gap-1">
                    <div
                      className={cn(
                        "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all",
                        isDone
                          ? "bg-primary/20 text-primary"
                          : isCurrent
                          ? "bg-primary/10 text-primary border border-primary/40 ring-1 ring-primary/20"
                          : "bg-muted/60 text-muted-foreground"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <span className="h-3.5 w-3.5 flex items-center justify-center rounded-full border text-[9px] border-current flex-shrink-0">
                          {s.achievedAt}
                        </span>
                      )}
                      <span className="hidden sm:inline">{s.label}</span>
                      <span className="sm:hidden">{s.achievedAt}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {demoLead ? (
                <>
                  Client:{" "}
                  <span className="font-medium text-foreground">{demoLead.company}</span>
                  {" — "}
                  {demoLead.systemSize} kW
                  {", "}
                  {demoLead.estimatedValue.toLocaleString("en-SA", {
                    style: "currency",
                    currency: "SAR",
                    maximumFractionDigits: 0,
                  })}
                </>
              ) : (
                description
              )}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 self-center">
          {isRightStep ? (
            <Button size="sm" onClick={onAction}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {actionLabel}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Waiting for previous step…
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
