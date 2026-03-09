import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORY_LABELS: Record<string, string> = {
  classic: "Portrait Classique",
  family: "Famille & Duo",
  kids_dream: "Rêve d'Enfant",
  pet: "Portrait Royal",
};

const COLORS = ["hsl(40,64%,55%)", "hsl(354,42%,32%)", "hsl(210,80%,55%)", "hsl(35,90%,55%)"];

interface CategoryChartProps {
  data: { category: string; count: number; revenue: number }[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = data.map((d) => ({
    name: CATEGORY_LABELS[d.category] || d.category,
    value: d.count,
    revenue: d.revenue,
  }));

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-4">Orders by Category</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} orders · ${props.payload.revenue} DT`,
                  name,
                ]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(33,15%,85%)", fontSize: 12 }}
              />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: "hsl(33,4%,53%)" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
