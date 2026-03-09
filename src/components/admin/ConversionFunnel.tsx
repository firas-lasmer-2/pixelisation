import { Card, CardContent } from "@/components/ui/card";

interface ConversionFunnelProps {
  visits: number;
  uploads: number;
  cropped: number;
  checkouts: number;
  confirmed: number;
}

function FunnelStep({ label, value, maxValue, color, isLast }: { label: string; value: number; maxValue: number; color: string; isLast?: boolean }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const barWidth = maxValue > 0 ? Math.max(20, (value / maxValue) * 100) : 20;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold">{value}</span>
          {!isLast && <span className="text-[10px] text-muted-foreground">({pct}%)</span>}
        </div>
      </div>
      <div className="h-5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${barWidth}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function ConversionFunnel({ visits, uploads, cropped, checkouts, confirmed }: ConversionFunnelProps) {
  const steps = [
    { label: "Abandoned Carts (Sessions)", value: visits, color: "hsl(33,8%,70%)" },
    { label: "Photo Uploaded", value: uploads, color: "hsl(40,64%,65%)" },
    { label: "Reached Checkout", value: checkouts, color: "hsl(40,64%,55%)" },
    { label: "Orders Confirmed", value: confirmed, color: "hsl(142,60%,45%)" },
  ];

  const overallRate = visits > 0 ? ((confirmed / visits) * 100).toFixed(1) : "0";

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">Conversion Funnel</h3>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {overallRate}% conversion
          </span>
        </div>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <FunnelStep
              key={step.label}
              label={step.label}
              value={step.value}
              maxValue={steps[0].value}
              color={step.color}
              isLast={i === 0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
