import React, { createContext, useContext, useState } from "react";
import type { Role, RoleConfig } from "../types";

export const rolePermissions: Record<Role, string[]> = {
  admin: ["/", "/workflow", "/pipeline", "/leads", "/sales", "/engineering", "/finance", "/projects", "/reports", "/feedback", "/documents", "/settings"],
  ceo: ["/", "/workflow", "/pipeline", "/leads", "/sales", "/engineering", "/finance", "/projects", "/reports", "/feedback", "/documents", "/settings"],
  marketing_manager: ["/", "/workflow", "/pipeline", "/leads", "/reports"],
  sales_manager: ["/", "/workflow", "/pipeline", "/leads", "/sales", "/reports"],
  planning_engineer: ["/", "/workflow", "/pipeline", "/engineering", "/projects", "/documents"],
  project_engineer: ["/", "/pipeline", "/engineering", "/projects", "/documents"],
  finance_executive: ["/", "/pipeline", "/finance", "/reports", "/documents"],
};

export const roleConfigs: RoleConfig[] = [
  { id: "ceo", label: "CEO", color: "#41034F", avatar: "CE" },
  { id: "marketing_manager", label: "Marketing Manager", color: "#7c3aed", avatar: "MM" },
  { id: "sales_manager", label: "Sales Manager", color: "#2563eb", avatar: "SM" },
  { id: "planning_engineer", label: "Planning Engineer", color: "#059669", avatar: "PE" },
  { id: "project_engineer", label: "Project Engineer", color: "#10b981", avatar: "PE" },
  { id: "finance_executive", label: "Finance Executive", color: "#d97706", avatar: "FE" },
  { id: "admin", label: "Admin", color: "#64748b", avatar: "AD" },
];

interface RoleContextType {
  role: Role;
  roleConfig: RoleConfig;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("ceo");
  const roleConfig = roleConfigs.find((r) => r.id === role) || roleConfigs[0];

  return (
    <RoleContext.Provider value={{ role, roleConfig, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
