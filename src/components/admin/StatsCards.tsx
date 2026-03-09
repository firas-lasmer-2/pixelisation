import { ShoppingCart, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  pendingOrders: number;
}

const stats = [
  { key: "totalOrders" as const, label: "Total Orders", icon: ShoppingCart, color: "text-primary" },
  { key: "totalRevenue" as const, label: "Revenue (DT)", icon: DollarSign, color: "text-accent" },
  { key: "todayOrders" as const, label: "Today", icon: TrendingUp, color: "text-primary" },
  { key: "pendingOrders" as const, label: "Pending", icon: Clock, color: "text-accent" },
];

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.key} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {s.key === "totalRevenue" ? `${props[s.key].toLocaleString()} DT` : props[s.key]}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
