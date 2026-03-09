import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getKitDisplayLabel } from "@/lib/kitCatalog";
import { CheckCircle, Package, Truck, MapPin, User, Mail, Phone, MapPinned, Loader2, History, ImageIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type OrderAsset = Database["public"]["Tables"]["order_assets"]["Row"];
type OrderStatusEvent = Database["public"]["Tables"]["order_status_events"]["Row"];

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof CheckCircle; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmed", icon: CheckCircle, variant: "secondary" },
  processing: { label: "Processing", icon: Package, variant: "default" },
  shipped: { label: "Shipped", icon: Truck, variant: "outline" },
  delivered: { label: "Delivered", icon: MapPin, variant: "secondary" },
};

const ASSET_LABELS: Record<string, string> = {
  source: "Source",
  ai_result: "AI Result",
  order_main: "Main",
  regenerated: "Regenerated",
};

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
}

export function OrderDetailSheet({ order, open, onOpenChange, onStatusUpdated }: OrderDetailSheetProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<OrderStatus>("confirmed");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [fulfillmentNote, setFulfillmentNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [history, setHistory] = useState<OrderStatusEvent[]>([]);
  const [assets, setAssets] = useState<OrderAsset[]>([]);

  useEffect(() => {
    if (!order || !open) return;

    setStatus(order.status);
    setCourierName(order.courier_name || "");
    setTrackingNumber(order.tracking_number || "");
    setFulfillmentNote(order.fulfillment_note || "");

    let active = true;
    const fetchRelated = async () => {
      setLoadingRelated(true);
      const [{ data: historyData }, { data: assetData }] = await Promise.all([
        supabase
          .from("order_status_events")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("order_assets")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      setHistory((historyData as OrderStatusEvent[]) || []);
      setAssets((assetData as OrderAsset[]) || []);
      setLoadingRelated(false);
    };

    void fetchRelated();

    return () => {
      active = false;
    };
  }, [open, order]);

  if (!order) return null;

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const handleSaveOperations = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        courier_name: courierName || null,
        tracking_number: trackingNumber || null,
        fulfillment_note: fulfillmentNote || null,
      })
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const shouldNotifyCustomer =
      status !== order.status ||
      courierName !== (order.courier_name || "") ||
      trackingNumber !== (order.tracking_number || "");

    if (shouldNotifyCustomer && order.contact_email) {
      supabase.functions.invoke("send-order-email", {
        body: {
          email: order.contact_email,
          name: order.contact_first_name,
          orderRef: order.order_ref,
          instructionCode: order.instruction_code,
          status,
          kitSize: order.kit_size,
          artStyle: order.art_style,
          totalPrice: order.total_price,
          category: order.category || "classic",
          trackingNumber: trackingNumber || null,
          courierName: courierName || null,
          fulfillmentNote: fulfillmentNote || null,
        },
      }).then(({ error: emailErr }) => {
        if (emailErr) {
          console.error("Email notification failed:", emailErr);
          toast({
            title: "Email failed",
            description: "Fulfillment updated but the customer email failed.",
            variant: "destructive",
          });
        }
      });
    }

    toast({
      title: "Order updated",
      description: `Order ${order.order_ref} fulfillment details saved.`,
    });

    onStatusUpdated();

    const [{ data: historyData }, { data: assetData }] = await Promise.all([
      supabase.from("order_status_events").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
      supabase.from("order_assets").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    ]);

    setHistory((historyData as OrderStatusEvent[]) || []);
    setAssets((assetData as OrderAsset[]) || []);
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-mono text-lg">{order.order_ref}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
            <div className="flex items-center gap-3">
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)} disabled={saving}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((currentStatus) => (
                    <SelectItem key={currentStatus} value={currentStatus}>
                      {STATUS_CONFIG[currentStatus].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fulfillment</p>
                <p className="text-sm text-muted-foreground mt-1">Save courier and tracking details before the order leaves the workshop.</p>
              </div>
              <Button onClick={handleSaveOperations} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                Save
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Courier</p>
                <Input value={courierName} onChange={(event) => setCourierName(event.target.value)} placeholder="Aramex, Rapid Post..." />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Tracking Number</p>
                <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Tracking number" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Fulfillment Note</p>
              <Textarea
                value={fulfillmentNote}
                onChange={(event) => setFulfillmentNote(event.target.value)}
                rows={3}
                placeholder="Packing notes, delivery constraints, handoff details..."
              />
            </div>
          </div>

          {order.photo_url && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Main Photo</p>
              <img src={order.photo_url} alt="Order" className="rounded-lg border border-border w-full max-h-56 object-contain bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kit Details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{getKitDisplayLabel(order.kit_size)}</span></div>
              <div><span className="text-muted-foreground">Style:</span> <span className="font-medium">{order.art_style}</span></div>
              <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">{order.total_price} DT</span></div>
              <div><span className="text-muted-foreground">Gift:</span> <span className="font-medium">{order.is_gift ? "Yes" : "No"}</span></div>
            </div>
            {order.dedication_text && (
              <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/15 p-2 rounded">
                Dedication: <span className="font-medium text-foreground">{order.dedication_text}</span>
              </p>
            )}
            {order.gift_message && (
              <p className="text-xs italic text-muted-foreground bg-muted p-2 rounded">"{order.gift_message}"</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> {order.contact_first_name} {order.contact_last_name}</div>
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {order.contact_phone}</div>
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {order.contact_email || "—"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipping</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-muted-foreground" /> {order.shipping_address}</div>
              <div className="flex items-center gap-2 text-muted-foreground">{order.shipping_city}, {order.shipping_governorate} {order.shipping_postal_code}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status History</p>
            </div>
            {loadingRelated ? (
              <div className="text-sm text-muted-foreground">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No fulfillment events yet.</div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={STATUS_CONFIG[entry.status].variant}>{STATUS_CONFIG[entry.status].label}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    {(entry.courier_name || entry.tracking_number || entry.note) && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {entry.courier_name && <p>Courier: {entry.courier_name}</p>}
                        {entry.tracking_number && <p>Tracking: {entry.tracking_number}</p>}
                        {entry.note && <p>Note: {entry.note}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset History</p>
            </div>
            {loadingRelated ? (
              <div className="text-sm text-muted-foreground">Loading assets…</div>
            ) : assets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No stored assets yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {assets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border overflow-hidden hover:border-primary transition-colors"
                  >
                    <div className="aspect-square bg-muted">
                      <img src={asset.url} alt={asset.label || asset.asset_kind} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{asset.label || ASSET_LABELS[asset.asset_kind] || asset.asset_kind}</p>
                        <Badge variant="outline" className="text-[10px]">{ASSET_LABELS[asset.asset_kind] || asset.asset_kind}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(asset.created_at).toLocaleString()}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Created: {new Date(order.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(order.updated_at).toLocaleString()}</p>
            {order.shipped_at && <p>Shipped: {new Date(order.shipped_at).toLocaleString()}</p>}
            {order.delivered_at && <p>Delivered: {new Date(order.delivered_at).toLocaleString()}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
