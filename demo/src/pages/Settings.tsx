import { motion } from "framer-motion";
import { Moon, Sun, Bell, Shield, Globe, Palette, User, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useTheme } from "../context/ThemeContext";
import { useRole, roleConfigs } from "../context/RoleContext";
import type { Role } from "../types";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 mt-0.5 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { role, roleConfig, setRole } = useRole();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-3xl">
      {/* Appearance */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Toggle checked={theme === "dark"} onChange={toggleTheme} />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Color Theme</p>
                <p className="text-xs text-muted-foreground">Primary brand color</p>
              </div>
              <div className="flex items-center gap-2">
                {["#41034F", "#1d4ed8", "#059669", "#dc2626"].map(color => (
                  <button key={color} className={`h-6 w-6 rounded-full border-2 transition-all ${color === "#41034F" ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Role */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Demo Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Switch your viewing role to see role-specific dashboards and data visibility.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {roleConfigs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id as Role)}
                  className={`flex items-center gap-2.5 rounded-lg p-3 border-2 transition-all text-left ${role === r.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-accent"}`}
                >
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: r.color }}>
                    {r.avatar}
                  </div>
                  <span className="text-xs font-medium">{r.label}</span>
                  {role === r.id && <Badge variant="default" className="ml-auto text-[10px] px-1.5">Active</Badge>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "New Lead Alerts", desc: "Notify when a new lead is created", checked: true },
              { label: "Payment Due Reminders", desc: "Alert before invoice due dates", checked: true },
              { label: "Project Milestone Updates", desc: "Notify on milestone completion", checked: true },
              { label: "Quality Check Results", desc: "Alert on QC pass/fail", checked: false },
              { label: "Weekly Summary Report", desc: "Email summary every Monday", checked: true },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Toggle checked={n.checked} onChange={() => {}} />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Company */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" /> Company Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Company Name", value: "Solar Maps Energy Solutions" },
              { label: "License Number", value: "SM-2024-0142" },
              { label: "Primary Email", value: "info@solarmaps.com" },
              { label: "Support Contact", value: "+966 11 234 5678" },
            ].map((field) => (
              <div key={field.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{field.label}</span>
                <span className="text-sm font-medium">{field.value}</span>
              </div>
            ))}
            <Button size="sm" variant="outline" className="mt-2">Edit Company Info</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Platform */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Platform Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Platform", value: "Solar Maps v2.4.1" },
              { label: "Environment", value: "Demo / Client Showcase" },
              { label: "Data Status", value: "Mock Data — Not Production" },
              { label: "Last Updated", value: "April 2024" },
            ].map((field) => (
              <div key={field.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{field.label}</span>
                <Badge variant="secondary">{field.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
