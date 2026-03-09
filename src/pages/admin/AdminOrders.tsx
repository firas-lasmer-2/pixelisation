import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderDetailSheet } from "@/components/admin/OrderDetailSheet";
import { Search, RefreshCw, Download, Printer, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getKitDisplayLabel } from "@/lib/kitCatalog";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
];

const STATUS_COLORS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "secondary",
  processing: "default",
  shipped: "outline",
  delivered: "secondary",
};

function exportCSV(orders: Order[]) {
  const headers = ["Ref", "Category", "First Name", "Last Name", "Phone", "Email", "Kit Size", "Art Style", "Price (DT)", "Status", "Governorate", "City", "Address", "Postal Code", "Gift", "Gift Message", "Created", "Updated"];
  const rows = orders.map((o) => [
    o.order_ref, (o as any).category || "classic", o.contact_first_name, o.contact_last_name, o.contact_phone, o.contact_email,
    getKitDisplayLabel(o.kit_size), o.art_style, o.total_price, o.status, o.shipping_governorate, o.shipping_city,
    o.shipping_address, o.shipping_postal_code || "", o.is_gift ? "Yes" : "No", o.gift_message || "",
    new Date(o.created_at).toLocaleString(), new Date(o.updated_at).toLocaleString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printShippingLabels(orders: Order[]) {
  const labelHtml = orders.map((o) => `
    <div style="page-break-after:always;padding:24px;font-family:Arial,sans-serif;border:2px solid #333;margin:12px;width:380px;height:260px;box-sizing:border-box;">
      <div style="font-size:10px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Helma — Shipping Label</div>
      <div style="font-size:18px;font-weight:bold;margin-bottom:12px;font-family:monospace;">${o.order_ref}</div>
      <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">${o.contact_first_name} ${o.contact_last_name}</div>
      <div style="font-size:13px;margin-bottom:2px;">${o.shipping_address}</div>
      <div style="font-size:13px;margin-bottom:2px;">${o.shipping_city}, ${o.shipping_governorate} ${o.shipping_postal_code || ""}</div>
      <div style="font-size:13px;margin-top:8px;">📞 ${o.contact_phone}</div>
      <div style="font-size:11px;color:#666;margin-top:12px;">Kit: ${getKitDisplayLabel(o.kit_size)} · ${o.art_style}</div>
    </div>
  `).join("");

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(`<html><head><title>Shipping Labels</title><style>@media print{body{margin:0}div{page-break-inside:avoid}}</style></head><body style="display:flex;flex-wrap:wrap;justify-content:center;">${labelHtml}</body></html>`);
    win.document.close();
    win.print();
  }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [govFilter, setGovFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const governorates = useMemo(() => {
    const set = new Set(orders.map((o) => o.shipping_governorate));
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (govFilter !== "all" && o.shipping_governorate !== govFilter) return false;
    if (dateFrom && new Date(o.created_at) < dateFrom) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(o.created_at) > end) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return (
        o.order_ref.toLowerCase().includes(s) ||
        o.contact_first_name.toLowerCase().includes(s) ||
        o.contact_last_name.toLowerCase().includes(s) ||
        o.contact_phone.includes(s)
      );
    }
    return true;
  }), [orders, statusFilter, govFilter, dateFrom, dateTo, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  const selectedOrders = filtered.filter((o) => selectedIds.has(o.id));
  const hasActiveFilters = govFilter !== "all" || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setGovFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Orders</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {orders.length} orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => printShippingLabels(selectedOrders)}>
              <Printer className="h-3.5 w-3.5" />
              Print Labels ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCSV(filtered)}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search + Status Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ref, name, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={govFilter} onValueChange={setGovFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Governorate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Governorates</SelectItem>
            {governorates.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2 text-xs h-8", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2 text-xs h-8", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-8" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Governorate</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => { setSelectedOrder(o); setSheetOpen(true); }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(o.id)}
                        onCheckedChange={() => toggleSelect(o.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">{o.order_ref}</TableCell>
                    <TableCell className="text-sm">{o.contact_first_name} {o.contact_last_name}</TableCell>
                    <TableCell className="text-sm font-mono">{o.contact_phone}</TableCell>
                    <TableCell className="text-xs">{o.shipping_governorate}</TableCell>
                    <TableCell className="text-xs">{getKitDisplayLabel(o.kit_size)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{(o as any).category || "classic"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{o.total_price} DT</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[o.status]} className="text-xs">{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusUpdated={fetchOrders}
      />
    </div>
  );
}
