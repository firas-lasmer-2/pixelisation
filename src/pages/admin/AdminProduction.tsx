import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, MessageCircle, Factory } from "lucide-react";
import { getKitDisplayLabel } from "@/lib/kitCatalog";
import { BRAND } from "@/lib/brand";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

function buildWhatsAppLink(phone: string, orderRef: string, kitSize: string, artStyle: string): string {
  const digits = phone.replace(/\D/g, "");
  const fullPhone = digits.startsWith("216") ? digits : `216${digits}`;
  const msg = [
    `Bonjour ! 👋`,
    `Votre commande ${BRAND.name} *${orderRef}* est en cours de préparation.`,
    `📦 Kit : ${getKitDisplayLabel(kitSize)} — Style : ${artStyle}`,
    `Nous vous contacterons pour la livraison. Merci de votre confiance ! 🎨`,
  ].join("\n");
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
}

function groupOrders(orders: Order[]): Record<string, Order[]> {
  return orders.reduce<Record<string, Order[]>>((acc, o) => {
    const key = `${getKitDisplayLabel(o.kit_size)} / ${o.art_style}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});
}

export default function AdminProduction() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const toggleSelect = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.order_ref)));
    }
  };

  const markAsProcessing = async () => {
    if (selected.size === 0) return;
    setUpdating(true);
    await supabase
      .from("orders")
      .update({ status: "processing" })
      .in("order_ref", Array.from(selected));
    setSelected(new Set());
    await fetchOrders();
    setUpdating(false);
  };

  const groups = groupOrders(orders);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            File de production
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} commande{orders.length !== 1 ? "s" : ""} confirmée{orders.length !== 1 ? "s" : ""} en attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          {selected.size > 0 && (
            <Button
              size="sm"
              onClick={markAsProcessing}
              disabled={updating}
              className="btn-premium text-primary-foreground border-0 gap-2"
            >
              <Factory className="h-4 w-4" />
              Mettre en production ({selected.size})
            </Button>
          )}
        </div>
      </div>

      {/* Groups */}
      {Object.keys(groups).length > 0 ? (
        Object.entries(groups).map(([groupKey, groupOrders]) => (
          <div key={groupKey} className="rounded-xl border overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">{groupKey}</h2>
              <Badge variant="secondary">{groupOrders.length} cmd{groupOrders.length > 1 ? "s" : ""}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={groupOrders.every((o) => selected.has(o.order_ref))}
                      onCheckedChange={() => {
                        const allSelected = groupOrders.every((o) => selected.has(o.order_ref));
                        setSelected((prev) => {
                          const next = new Set(prev);
                          groupOrders.forEach((o) => allSelected ? next.delete(o.order_ref) : next.add(o.order_ref));
                          return next;
                        });
                      }}
                    />
                  </TableHead>
                  <TableHead>Réf.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Gouvernorat</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupOrders.map((o) => (
                  <TableRow key={o.order_ref} className={selected.has(o.order_ref) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(o.order_ref)}
                        onCheckedChange={() => toggleSelect(o.order_ref)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.order_ref}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{o.contact_first_name} {o.contact_last_name}</span>
                      {o.is_gift && (
                        <Badge variant="outline" className="ml-2 text-[10px]">🎁 Cadeau</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.contact_phone}</TableCell>
                    <TableCell className="text-sm">{o.shipping_governorate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("fr-TN", { day: "numeric", month: "short" })}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{o.total_price} DT</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-1 h-8 text-xs"
                        onClick={() =>
                          window.open(buildWhatsAppLink(o.contact_phone, o.order_ref, o.kit_size, o.art_style), "_blank")
                        }
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      ) : (
        !loading && (
          <div className="text-center py-20 text-muted-foreground">
            <Factory className="h-14 w-14 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Aucune commande en attente de production.</p>
            <p className="text-xs mt-1">Les commandes confirmées apparaîtront ici.</p>
          </div>
        )
      )}

      {loading && (
        <div className="text-center py-20 text-muted-foreground">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
          <p className="text-sm">Chargement...</p>
        </div>
      )}
    </div>
  );
}
