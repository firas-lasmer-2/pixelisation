import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface GovernorateChartProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  "hsl(40, 64%, 55%)",   // primary gold
  "hsl(354, 42%, 32%)",  // accent burgundy
  "hsl(210, 80%, 60%)",  // blue
  "hsl(140, 60%, 45%)",  // green
  "hsl(280, 60%, 60%)",  // purple
  "hsl(30, 90%, 60%)",   // orange
  "hsl(180, 50%, 45%)",  // teal
  "hsl(0, 70%, 55%)",    // red
];

export function GovernorateChart({ data }: GovernorateChartProps) {
  const top = data.slice(0, 8);

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-4">Orders by Governorate</h3>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={top}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {top.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} orders`, ""]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
