import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useRole } from "../../context/RoleContext";

export function AccessDenied() {
  const navigate = useNavigate();
  const { roleConfig } = useRole();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 p-8">
      <div className="p-4 rounded-full bg-destructive/10">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          <span className="font-medium" style={{ color: roleConfig.color }}>{roleConfig.label}</span> does not
          have permission to view this section. Switch to an appropriate role or contact your administrator.
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate("/")}>
        Return to Dashboard
      </Button>
    </div>
  );
}
