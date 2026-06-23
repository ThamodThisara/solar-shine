import { motion } from "framer-motion";
import { FileText, Download, Search, ExternalLink } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { documents } from "../data/documents";
import { formatDate } from "../lib/utils";
import { useState } from "react";

const deptColors: Record<string, string> = {
  Marketing: "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
  Sales: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  Engineering: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  Finance: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function DocumentCenter() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const filtered = documents.filter((doc) => {
    const q = search.toLowerCase();
    const matchSearch = !q || doc.name.toLowerCase().includes(q) || doc.code.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || doc.department === deptFilter;
    return matchSearch && matchDept;
  });

  const departments = ["all", ...Array.from(new Set(documents.map(d => d.department)))];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${deptFilter === dept ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent text-muted-foreground"}`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <motion.div key={doc.id} variants={item}>
            <Card className="hover:shadow-lg transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary">{doc.code}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${deptColors[doc.department] || "text-muted-foreground bg-muted"}`}>
                        {doc.department}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mt-1">{doc.name}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{doc.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Format</span>
                    <Badge variant="secondary">{doc.format}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{formatDate(doc.lastUpdated)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Used in</span>
                    <span className="font-medium">{doc.relatedStages.length} workflow stages</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview
                  </Button>
                  <Button size="sm" className="flex-1 text-xs">
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No documents found</p>
        </div>
      )}
    </div>
  );
}
