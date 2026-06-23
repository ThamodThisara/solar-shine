import { motion } from "framer-motion";
import { Plus, DollarSign, User, Zap, Info } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { cn } from "../lib/utils";
import { useRole } from "../context/RoleContext";
import { useWorkflowDemo } from "../context/WorkflowDemoContext";
import type { Role } from "../types";

// ── Types ──────────────────────────────────────────────────────────────────

type CardData = {
  id: string;
  title: string;      // company
  subtitle?: string;  // contact or description
  value: number;
  size: number;
  priority: "critical" | "high" | "medium" | "low";
  assignee?: string;
  tag?: string;
};

type ColumnDef = {
  id: string;
  title: string;
  color: string;  // text colour class
  bg: string;     // column bg class
  dot: string;    // indicator dot class
  // demoStep values that cause the demo lead to appear here
  demoPlacements: number[];
  cards: CardData[];
};

// ── Static sample data ─────────────────────────────────────────────────────

const SAMPLES = {
  aqeel:    { id: "s1",  title: "Aqeel Pharmaceuticals",  subtitle: "Dr. Khalid Aqeel",    value: 290000,  size: 65,  priority: "medium" as const, assignee: "Reem Al-Zahrani" },
  hassan:   { id: "s2",  title: "Hassan Medical Center",  subtitle: "Hassan Al-Otaibi",    value: 337500,  size: 75,  priority: "high"   as const, assignee: "Sara Al-Mahmoud" },
  dosari:   { id: "s3",  title: "Dosari Hotels Group",    subtitle: "Omar Al-Dosari",      value: 450000,  size: 100, priority: "high"   as const, assignee: "Ali Al-Ghamdi" },
  ghamdi:   { id: "s4",  title: "Ghamdi Food Processing", subtitle: "Fahad Al-Ghamdi",     value: 516750,  size: 115, priority: "medium" as const, assignee: "Nasser Al-Qahtani" },
  sulami:   { id: "s5",  title: "Sulami Healthcare",      subtitle: "Dr. Amal Sulami",     value: 202500,  size: 45,  priority: "medium" as const, assignee: "Reem Al-Zahrani" },
  farsi:    { id: "s6",  title: "Al-Farsi Textiles",      subtitle: "Ibrahim Al-Farsi",    value: 382500,  size: 85,  priority: "high"   as const, assignee: "Sara Al-Mahmoud" },
  nasser:   { id: "s7",  title: "Nasser Trading Co.",     subtitle: "Yousef Nasser",       value: 157500,  size: 35,  priority: "low"    as const, assignee: "Ali Al-Ghamdi" },
  rashidi:  { id: "s8",  title: "Al-Rashidi Industries",  subtitle: "Khalid Al-Rashidi",   value: 562500,  size: 125, priority: "critical" as const, assignee: "Nasser Al-Qahtani" },
  mansouri: { id: "s9",  title: "Al-Mansouri Corp",       subtitle: "Faris Al-Mansouri",   value: 247500,  size: 55,  priority: "medium" as const, assignee: "Reem Al-Zahrani" },
  juhani:   { id: "s10", title: "Juhani Plastics Factory",subtitle: "Samir Juhani",        value: 302000,  size: 67,  priority: "high"   as const, assignee: "Ali Al-Ghamdi" },
  quraishi: { id: "s11", title: "Al-Quraishi Tower",      subtitle: "Mohammed Quraishi",   value: 427500,  size: 95,  priority: "medium" as const, assignee: "Sara Al-Mahmoud" },
  mutairi:  { id: "s12", title: "Al-Mutairi Corp",        subtitle: "Bandar Al-Mutairi",   value: 135000,  size: 30,  priority: "low"    as const, assignee: "Nasser Al-Qahtani" },
};

// ── Role Kanban Configs ────────────────────────────────────────────────────

const ROLE_CONFIGS: Record<Role, { title: string; subtitle: string; columns: ColumnDef[] }> = {

  // ── CEO / Admin ── Full 10-column lifecycle view
  ceo: {
    title: "Full Lifecycle Pipeline",
    subtitle: "Complete view across all departments and stages",
    columns: [
      {
        id: "lead_in",      title: "Lead In",
        color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-900/20",    dot: "bg-slate-400",
        demoPlacements: [1],
        cards: [SAMPLES.aqeel, SAMPLES.mutairi, { ...SAMPLES.hassan, id: "sh1", tag: "Referral" }],
      },
      {
        id: "qualified",    title: "Qualified",
        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",      dot: "bg-blue-500",
        demoPlacements: [2],
        cards: [SAMPLES.dosari, SAMPLES.nasser],
      },
      {
        id: "contracted",   title: "Contracted",
        color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/20",  dot: "bg-indigo-500",
        demoPlacements: [3],
        cards: [SAMPLES.farsi, { ...SAMPLES.sulami, id: "ss1" }],
      },
      {
        id: "docs_review",  title: "Docs Review",
        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/20",    dot: "bg-amber-500",
        demoPlacements: [4],
        cards: [{ ...SAMPLES.ghamdi, id: "sg1" }],
      },
      {
        id: "docs_approved",title: "Docs Approved",
        color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/20",      dot: "bg-teal-500",
        demoPlacements: [5],
        cards: [{ ...SAMPLES.hassan, id: "sh2" }],
      },
      {
        id: "quoted",       title: "Quotation",
        color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/20",  dot: "bg-violet-500",
        demoPlacements: [6],
        cards: [{ ...SAMPLES.aqeel, id: "sa1" }],
      },
      {
        id: "quote_approved",title: "Quote Approved",
        color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/20",  dot: "bg-orange-500",
        demoPlacements: [7],
        cards: [{ ...SAMPLES.sulami, id: "ss2" }],
      },
      {
        id: "finance",      title: "Finance",
        color: "text-pink-600",    bg: "bg-pink-50 dark:bg-pink-950/20",      dot: "bg-pink-500",
        demoPlacements: [8],
        cards: [{ ...SAMPLES.nasser, id: "sn1" }],
      },
      {
        id: "active",       title: "Active Project",
        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",dot: "bg-emerald-500",
        demoPlacements: [],
        cards: [SAMPLES.rashidi, SAMPLES.juhani, SAMPLES.mansouri],
      },
      {
        id: "completed",    title: "Completed",
        color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/20",    dot: "bg-green-500",
        demoPlacements: [],
        cards: [SAMPLES.quraishi, { ...SAMPLES.farsi, id: "sf1" }],
      },
    ],
  },

  // ── Admin — identical to CEO ──
  admin: { title: "", subtitle: "", columns: [] }, // populated below

  // ── Marketing Manager ── Lead acquisition stages
  marketing_manager: {
    title: "Lead Acquisition Pipeline",
    subtitle: "Track leads from first contact through to qualification",
    columns: [
      {
        id: "new",        title: "New",
        color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-900/20",    dot: "bg-slate-400",
        demoPlacements: [1],
        cards: [SAMPLES.aqeel, SAMPLES.mutairi, { ...SAMPLES.hassan, id: "mh1" }],
      },
      {
        id: "contacted",  title: "Contacted",
        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",      dot: "bg-blue-500",
        demoPlacements: [],
        cards: [SAMPLES.dosari, SAMPLES.ghamdi],
      },
      {
        id: "qualified",  title: "Qualified",
        color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/20",  dot: "bg-violet-500",
        demoPlacements: [2, 3, 4, 5, 6, 7, 8],
        cards: [SAMPLES.farsi, SAMPLES.sulami],
      },
      {
        id: "proposal",   title: "Proposal Sent",
        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/20",    dot: "bg-amber-500",
        demoPlacements: [],
        cards: [{ ...SAMPLES.nasser, id: "mn1" }, { ...SAMPLES.rashidi, id: "mr1" }],
      },
      {
        id: "converted",  title: "Converted",
        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",dot: "bg-emerald-500",
        demoPlacements: [],
        cards: [SAMPLES.juhani, SAMPLES.quraishi, SAMPLES.mansouri],
      },
      {
        id: "rejected",   title: "Not Interested",
        color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/20",        dot: "bg-red-400",
        demoPlacements: [],
        cards: [{ ...SAMPLES.mutairi, id: "mm1" }],
      },
    ],
  },

  // ── Sales Manager ── Sales pipeline stages (matches /sales Kanban)
  sales_manager: {
    title: "Sales Pipeline",
    subtitle: "Manage leads from first contact to signed contract and quotation approval",
    columns: [
      {
        id: "new",        title: "New Leads",
        color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-900/20",    dot: "bg-slate-400",
        demoPlacements: [1],
        cards: [SAMPLES.hassan, { ...SAMPLES.mutairi, id: "smm1" }],
      },
      {
        id: "contacted",  title: "Contacted",
        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",      dot: "bg-blue-500",
        demoPlacements: [],
        cards: [SAMPLES.dosari, SAMPLES.ghamdi],
      },
      {
        id: "qualified",  title: "Qualified",
        color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/20",  dot: "bg-violet-500",
        demoPlacements: [2],
        cards: [{ ...SAMPLES.farsi, id: "saf1" }, SAMPLES.sulami],
      },
      {
        id: "contracted", title: "Contract Signed",
        color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/20",  dot: "bg-indigo-500",
        demoPlacements: [3, 4, 5],
        cards: [SAMPLES.juhani, { ...SAMPLES.rashidi, id: "sar1" }],
      },
      {
        id: "quotation",  title: "Quotation",
        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/20",    dot: "bg-amber-500",
        demoPlacements: [6],
        cards: [{ ...SAMPLES.aqeel, id: "saq1" }, { ...SAMPLES.nasser, id: "sn2" }],
      },
      {
        id: "quote_approved", title: "Quote Approved",
        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",dot: "bg-emerald-500",
        demoPlacements: [7, 8],
        cards: [{ ...SAMPLES.mansouri, id: "sm1" }],
      },
    ],
  },

  // ── Planning Engineer ── Engineering project stages
  planning_engineer: {
    title: "Engineering Project Pipeline",
    subtitle: "Track projects from assignment through to commissioning",
    columns: [
      {
        id: "assigned",   title: "Newly Assigned",
        color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-900/20",    dot: "bg-slate-400",
        demoPlacements: [3],
        cards: [{ ...SAMPLES.dosari, id: "ped1" }],
      },
      {
        id: "site_survey",title: "Site Survey",
        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",      dot: "bg-blue-500",
        demoPlacements: [4, 5],
        cards: [SAMPLES.sulami, { ...SAMPLES.ghamdi, id: "peg1" }],
      },
      {
        id: "design",     title: "Design Phase",
        color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/20",  dot: "bg-violet-500",
        demoPlacements: [6, 7],
        cards: [{ ...SAMPLES.farsi, id: "pef1" }, SAMPLES.aqeel],
      },
      {
        id: "procurement",title: "Procurement",
        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/20",    dot: "bg-amber-500",
        demoPlacements: [8],
        cards: [SAMPLES.hassan, { ...SAMPLES.rashidi, id: "per1" }],
      },
      {
        id: "installation",title: "Installation",
        color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/20",  dot: "bg-orange-500",
        demoPlacements: [],
        cards: [SAMPLES.mansouri, { ...SAMPLES.nasser, id: "pen1" }],
      },
      {
        id: "commissioning",title: "Commissioning",
        color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/20",      dot: "bg-teal-500",
        demoPlacements: [],
        cards: [SAMPLES.quraishi],
      },
      {
        id: "completed",  title: "Completed",
        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",dot: "bg-emerald-500",
        demoPlacements: [],
        cards: [SAMPLES.juhani, { ...SAMPLES.farsi, id: "pecf1" }],
      },
    ],
  },

  // ── Project Engineer ── Execution-focused stages
  project_engineer: {
    title: "Project Execution Pipeline",
    subtitle: "Track project execution from site survey through commissioning",
    columns: [
      {
        id: "site_survey",title: "Site Survey",
        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",      dot: "bg-blue-500",
        demoPlacements: [3, 4],
        cards: [{ ...SAMPLES.dosari, id: "ped2" }, SAMPLES.sulami],
      },
      {
        id: "design",     title: "Engineering Design",
        color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/20",  dot: "bg-violet-500",
        demoPlacements: [5, 6],
        cards: [{ ...SAMPLES.ghamdi, id: "peg2" }, SAMPLES.farsi],
      },
      {
        id: "procurement",title: "Procurement",
        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/20",    dot: "bg-amber-500",
        demoPlacements: [7, 8],
        cards: [SAMPLES.hassan, { ...SAMPLES.aqeel, id: "pea1" }],
      },
      {
        id: "installation",title: "Installation",
        color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/20",  dot: "bg-orange-500",
        demoPlacements: [],
        cards: [SAMPLES.rashidi, SAMPLES.mansouri, { ...SAMPLES.nasser, id: "pen2" }],
      },
      {
        id: "testing",    title: "Testing & QC",
        color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/20",      dot: "bg-teal-500",
        demoPlacements: [],
        cards: [SAMPLES.quraishi],
      },
      {
        id: "completed",  title: "Commissioned",
        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",dot: "bg-emerald-500",
        demoPlacements: [],
        cards: [SAMPLES.juhani, { ...SAMPLES.sulami, id: "pes1" }],
      },
    ],
  },

  // ── Finance Executive ── Financial stages
  finance_executive: {
    title: "Finance Pipeline",
    subtitle: "Track invoicing and payment milestones for each project",
    columns: [
      {
        id: "quote_approved",title: "Quote Approved",
        color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-900/20",    dot: "bg-slate-400",
        demoPlacements: [7],
        cards: [{ ...SAMPLES.sulami, id: "fqs1" }],
      },
      {
        id: "advance_invoiced",title: "Advance Invoiced",
        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/20",    dot: "bg-amber-500",
        demoPlacements: [],
        cards: [SAMPLES.ghamdi, SAMPLES.hassan],
      },
      {
        id: "advance_received",title: "Advance Received",
        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",      dot: "bg-blue-500",
        demoPlacements: [8],
        cards: [SAMPLES.rashidi, SAMPLES.juhani, { ...SAMPLES.dosari, id: "fad1" }],
      },
      {
        id: "progress",   title: "Progress Billing",
        color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/20",  dot: "bg-violet-500",
        demoPlacements: [],
        cards: [SAMPLES.mansouri, { ...SAMPLES.farsi, id: "fpf1" }],
      },
      {
        id: "final_invoice",title: "Final Invoice",
        color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/20",  dot: "bg-orange-500",
        demoPlacements: [],
        cards: [{ ...SAMPLES.nasser, id: "ffn1" }, { ...SAMPLES.aqeel, id: "ffa1" }],
      },
      {
        id: "paid",       title: "Fully Paid",
        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",dot: "bg-emerald-500",
        demoPlacements: [],
        cards: [SAMPLES.quraishi, { ...SAMPLES.mutairi, id: "ffm1" }],
      },
    ],
  },
};

// Copy CEO config to admin
ROLE_CONFIGS.admin = { ...ROLE_CONFIGS.ceo, title: "Full Lifecycle Pipeline" };

// ── Priority colours ───────────────────────────────────────────────────────
const priorityColors: Record<string, string> = {
  critical: "text-red-600",
  high:     "text-amber-600",
  medium:   "text-blue-600",
  low:      "text-slate-500",
};

const priorityBadge: Record<string, string> = {
  critical: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
  high:     "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
  medium:   "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
  low:      "bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
};

// ── Card Component ─────────────────────────────────────────────────────────
function KanbanCard({ card, isDemo }: { card: CardData; isDemo?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-background rounded-lg border p-3 hover:shadow-md transition-shadow cursor-default select-none",
        isDemo ? "border-primary/50 ring-1 ring-primary/20 shadow-sm" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
            isDemo ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}>
            {card.title.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{card.title}</p>
            {card.subtitle && <p className="text-[10px] text-muted-foreground truncate">{card.subtitle}</p>}
            {isDemo && <p className="text-[9px] text-primary font-medium">Demo Lead</p>}
          </div>
        </div>
        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize flex-shrink-0", priorityBadge[card.priority])}>
          {card.priority}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="h-3 w-3 flex-shrink-0" />
          <span className="font-semibold text-foreground">{formatCurrency(card.value)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3 w-3 flex-shrink-0" />
          <span>{card.size} kW</span>
        </div>
      </div>

      {card.assignee && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{card.assignee}</span>
        </div>
      )}

      {card.tag && (
        <span className="mt-1.5 inline-block text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
          {card.tag}
        </span>
      )}
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function KanbanPipeline() {
  const { role } = useRole();
  const { demoStep, demoLead, demoLeadDetails } = useWorkflowDemo();

  const config = ROLE_CONFIGS[role];

  // Build the demo card from live context
  const demoCard: CardData | null = demoLead
    ? {
        id:       "DEMO-001",
        title:    demoLead.company,
        subtitle: demoLeadDetails?.siteAddress ?? demoLead.location,
        value:    demoLead.estimatedValue,
        size:     demoLeadDetails?.confirmedSystemSize ?? demoLead.systemSize,
        priority: "high",
        assignee: "Sara Al-Mahmoud",
      }
    : null;

  // Resolve cards for each column, inserting the demo card where appropriate
  const getCards = (col: ColumnDef): { cards: CardData[]; hasDemo: boolean } => {
    const hasDemo = !!demoCard && col.demoPlacements.includes(demoStep);
    const cards = hasDemo ? [demoCard!, ...col.cards] : col.cards;
    return { cards, hasDemo };
  };

  // Pipeline value totals
  const totalCards = config.columns.reduce((sum, col) => {
    const { cards } = getCards(col);
    return sum + cards.length;
  }, 0);

  const totalValue = config.columns.reduce((sum, col) => {
    const { cards } = getCards(col);
    return sum + cards.reduce((s, c) => s + c.value, 0);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="font-semibold">{totalCards}</p>
            <p className="text-xs text-muted-foreground">items</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-right">
            <p className="font-semibold text-primary">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground">pipeline value</p>
          </div>
        </div>
      </div>

      {/* Demo lead position indicator */}
      {demoCard && (
        <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            {demoCard.title.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <span className="text-primary font-medium">{demoCard.title}</span>
          <span className="text-muted-foreground">—</span>
          {(() => {
            const activeCol = config.columns.find(col => col.demoPlacements.includes(demoStep));
            return activeCol
              ? <><span className="text-foreground font-medium">{activeCol.title}</span><span className="text-muted-foreground ml-1">(Step {demoStep} of 8)</span></>
              : <span className="text-muted-foreground italic">not yet visible at current step</span>;
          })()}
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3" style={{ minWidth: `${config.columns.length * 228}px` }}>
          {config.columns.map((col) => {
            const { cards, hasDemo } = getCards(col);
            const colValue = cards.reduce((s, c) => s + c.value, 0);

            return (
              <div
                key={col.id}
                className={cn("flex flex-col rounded-xl border border-border flex-shrink-0 w-56", col.bg)}
              >
                {/* Column header */}
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full flex-shrink-0", col.dot)} />
                      <span className={cn("text-xs font-semibold", col.color)}>{col.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-background rounded-full px-1.5 py-0.5">
                      {cards.length}
                    </span>
                  </div>
                  {colValue > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(colValue)}</p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 min-h-[180px] max-h-[calc(100vh-400px)] overflow-y-auto">
                  {cards.map((card) => (
                    <KanbanCard key={card.id} card={card} isDemo={card.id === "DEMO-001"} />
                  ))}
                  {cards.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 text-xs text-muted-foreground text-center px-2 opacity-50">
                      <p>Empty</p>
                    </div>
                  )}
                </div>

                {/* Add card button */}
                <div className="p-2 border-t border-border/50">
                  <button className={cn(
                    "w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs hover:bg-background/60 transition-colors",
                    col.color
                  )}>
                    <Plus className="h-3 w-3" /> Add Card
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline flow summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Stage Distribution</p>
        <div className="flex flex-wrap gap-2">
          {config.columns.map((col) => {
            const { cards } = getCards(col);
            if (cards.length === 0) return null;
            return (
              <div
                key={col.id}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", col.bg, col.color)}
              >
                <div className={cn("h-1.5 w-1.5 rounded-full", col.dot)} />
                <span>{cards.length}</span>
                <span className="hidden sm:inline">{col.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend (for CEO/admin only, explains the full lifecycle) */}
      {(role === "ceo" || role === "admin") && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Full Lifecycle Legend</p>
              <p className="text-xs text-muted-foreground mt-1">
                Columns represent the complete lead-to-project journey:{" "}
                <span className="font-medium text-foreground">Lead In</span> →{" "}
                <span className="font-medium text-foreground">Qualified</span> →{" "}
                <span className="font-medium text-foreground">Contracted</span> →{" "}
                <span className="font-medium text-foreground">Docs Review / Approved</span> →{" "}
                <span className="font-medium text-foreground">Quotation / Approved</span> →{" "}
                <span className="font-medium text-foreground">Finance</span> →{" "}
                <span className="font-medium text-foreground">Active Project</span> →{" "}
                <span className="font-medium text-foreground">Completed</span>.
                The demo lead moves through these stages as you advance the workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
