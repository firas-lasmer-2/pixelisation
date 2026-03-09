import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface KitSizeChartProps {
  data: { size: string; count: number; revenue: number }[];
}

export function KitSizeChart({ data }: KitSizeChartProps) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-4">Popular Kit Sizes</h3>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis
                  dataKey="size"
                  type="category"
                  width={100}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    name === "count" ? `${value} orders` : `${value} DT`,
                    name === "count" ? "Orders" : "Revenue",
                  ]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
