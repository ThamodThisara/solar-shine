import { motion } from "framer-motion";
import { Star, MessageSquare, ThumbsUp, TrendingUp, CheckCircle } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { feedbackData, satisfactionMetrics } from "../data/feedback";
import { formatDate } from "../lib/utils";
import { cn } from "../lib/utils";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn("h-3.5 w-3.5", star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

const sentimentConfig = {
  positive: { variant: "success" as any, label: "Positive" },
  neutral: { variant: "warning" as any, label: "Neutral" },
  negative: { variant: "destructive" as any, label: "Negative" },
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CustomerFeedback() {
  const avgRating = satisfactionMetrics.averageRating;
  const positiveCount = feedbackData.filter(f => f.sentiment === "positive").length;
  const negativeCount = feedbackData.filter(f => f.sentiment === "negative").length;
  const unrespondedCount = feedbackData.filter(f => !f.responded).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Avg Rating", value: `${avgRating}/5`, icon: Star, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { label: "NPS Score", value: satisfactionMetrics.nps, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Positive Reviews", value: `${positiveCount}/${feedbackData.length}`, icon: ThumbsUp, color: "text-primary bg-primary/10" },
          { label: "Pending Response", value: unrespondedCount, icon: MessageSquare, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
        ].map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.color} mb-3`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Satisfaction Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={satisfactionMetrics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="score" stroke="#41034F" strokeWidth={2.5} dot={{ r: 4, fill: "#41034F" }} name="Avg Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Category Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={satisfactionMetrics.categories} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="score" fill="#41034F" radius={[0, 4, 4, 0]} name="Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Feedback</h3>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {feedbackData.map((fb) => (
            <motion.div key={fb.id} variants={item}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {fb.client.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{fb.client}</p>
                          <Badge variant={sentimentConfig[fb.sentiment].variant} className="text-[10px]">
                            {sentimentConfig[fb.sentiment].label}
                          </Badge>
                          {fb.responded && (
                            <Badge variant="secondary" className="text-[10px]">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Responded
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fb.projectName}</p>
                        <StarRating rating={fb.rating} />
                        <p className="text-sm mt-2 leading-relaxed">{fb.comment}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{fb.category}</span>
                          <span>•</span>
                          <span>{formatDate(fb.date)}</span>
                        </div>
                      </div>
                    </div>
                    {!fb.responded && (
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        Reply
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
