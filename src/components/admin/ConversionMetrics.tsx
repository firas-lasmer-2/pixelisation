import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CheckCircle, Truck, Clock } from "lucide-react";

interface ConversionMetricsProps {
  totalOrders: number;
  deliveredOrders: number;
  shippedOrders: number;
  avgOrderValue: number;
  giftOrders: number;
  avgFulfillmentDays: number | null;
}

export function ConversionMetrics({
  totalOrders,
  deliveredOrders,
  shippedOrders,
  avgOrderValue,
  giftOrders,
  avgFulfillmentDays,
}: ConversionMetricsProps) {
  const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  const fulfillmentRate = totalOrders > 0 ? Math.round(((deliveredOrders + shippedOrders) / totalOrders) * 100) : 0;
  const giftRate = totalOrders > 0 ? Math.round((giftOrders / totalOrders) * 100) : 0;

  const metrics = [
    {
      label: "Delivery Rate",
      value: `${deliveryRate}%`,
      sub: `${deliveredOrders} delivered`,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Fulfillment Rate",
      value: `${fulfillmentRate}%`,
      sub: `${deliveredOrders + shippedOrders} shipped/delivered`,
      icon: Truck,
      color: "text-primary",
    },
    {
      label: "Avg Order Value",
      value: `${avgOrderValue} DT`,
      sub: `${giftRate}% are gifts`,
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      label: "Avg Fulfillment",
      value: avgFulfillmentDays !== null ? `${avgFulfillmentDays}d` : "—",
      sub: "confirmed → delivered",
      icon: Clock,
      color: "text-muted-foreground",
    },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-4">Conversion Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {m.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{m.sub}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
