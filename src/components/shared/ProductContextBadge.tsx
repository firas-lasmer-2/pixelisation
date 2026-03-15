import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

export function ProductContextBadge() {
  return (
    <Badge
      variant="secondary"
      className="mb-4 gap-1.5 border-primary/20 bg-primary/5 text-xs uppercase tracking-widest text-primary"
    >
      <Layers className="h-3 w-3" />
      Pour Peinture par Numéros
    </Badge>
  );
}
