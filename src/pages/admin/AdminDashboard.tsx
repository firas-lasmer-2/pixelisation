import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatsCards } from "@/components/admin/StatsCards";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { GovernorateChart } from "@/components/admin/GovernorateChart";
import { KitSizeChart } from "@/components/admin/KitSizeChart";
import { ConversionMetrics } from "@/components/admin/ConversionMetrics";
import { CategoryChart } from "@/components/admin/CategoryChart";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

const SIZE_LABELS: Record<string, string> = {
  stamp_kit_40x50: "40×50 cm",
  stamp_kit_30x40: "30×40 cm",
  stamp_kit_A4: "A4",
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [abandonedCount, setAbandonedCount] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [checkoutCount, setCheckoutCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: ordersData }, { data: cartData }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("abandoned_carts").select("session_id, step_reached, photo_uploaded, recovered"),
      ]);
      setOrders(ordersData || []);

      const carts = cartData || [];
      setAbandonedCount(carts.length);
      setUploadedCount(carts.filter(c => c.photo_uploaded).length);
      setCheckoutCount(carts.filter(c => c.step_reached >= 5).length);
      setLoading(false);
    };
    fetchData();
  }, []);

  const today = new Date().toDateString();
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today).length;
  const pendingOrders = orders.filter((o) => o.status === "confirmed" || o.status === "processing").length;

  // Revenue chart: last 7 days
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const dayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === d.toDateString());
    return {
      date: dateStr,
      revenue: dayOrders.reduce((s, o) => s + o.total_price, 0),
      orders: dayOrders.length,
    };
  });

  // Governorate data
  const govCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.shipping_governorate] = (acc[o.shipping_governorate] || 0) + 1;
    return acc;
  }, {});
  const govData = Object.entries(govCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Kit size data
  const sizeCounts = orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
    if (!acc[o.kit_size]) acc[o.kit_size] = { count: 0, revenue: 0 };
    acc[o.kit_size].count++;
    acc[o.kit_size].revenue += o.total_price;
    return acc;
  }, {});
  const sizeData = Object.entries(sizeCounts)
    .map(([key, v]) => ({ size: SIZE_LABELS[key] || key, count: v.count, revenue: v.revenue }))
    .sort((a, b) => b.count - a.count);

  // Category data
  const catCounts = orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
    const cat = (o as any).category || "classic";
    if (!acc[cat]) acc[cat] = { count: 0, revenue: 0 };
    acc[cat].count++;
    acc[cat].revenue += o.total_price;
    return acc;
  }, {});
  const catData = Object.entries(catCounts)
    .map(([category, v]) => ({ category, count: v.count, revenue: v.revenue }))
    .sort((a, b) => b.count - a.count);

  // Conversion metrics
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const shippedOrders = orders.filter((o) => o.status === "shipped").length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const giftOrders = orders.filter((o) => o.is_gift).length;

  const deliveredList = orders.filter((o) => o.status === "delivered");
  const avgFulfillmentDays = deliveredList.length > 0
    ? Math.round(
        deliveredList.reduce((sum, o) => {
          const diff = new Date(o.updated_at).getTime() - new Date(o.created_at).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / deliveredList.length
      )
    : null;

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store</p>
      </div>

      <StatsCards
        totalOrders={totalOrders}
        totalRevenue={totalRevenue}
        todayOrders={todayOrders}
        pendingOrders={pendingOrders}
      />

      {/* Row 1: Revenue + Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData} />
        <ConversionFunnel
          visits={abandonedCount}
          uploads={uploadedCount}
          cropped={uploadedCount}
          checkouts={checkoutCount}
          confirmed={totalOrders}
        />
      </div>

      {/* Row 2: Category + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={catData} />

        <Card className="border-border">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-mono font-medium">{o.order_ref}</p>
                      <p className="text-xs text-muted-foreground">{o.contact_first_name} {o.contact_last_name}</p>
                    </div>
                    <div className="text-end">
                      <Badge variant="secondary" className="text-xs">{o.status}</Badge>
                      <p className="text-xs font-medium mt-1">{o.total_price} DT</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Governorate + Kit Sizes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GovernorateChart data={govData} />
        <KitSizeChart data={sizeData} />
      </div>

      {/* Row 4: Conversion Metrics */}
      <ConversionMetrics
        totalOrders={totalOrders}
        deliveredOrders={deliveredOrders}
        shippedOrders={shippedOrders}
        avgOrderValue={avgOrderValue}
        giftOrders={giftOrders}
        avgFulfillmentDays={avgFulfillmentDays}
      />
    </div>
  );
}
