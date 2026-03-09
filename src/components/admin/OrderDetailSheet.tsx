import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Package, Truck, MapPin, User, Mail, Phone, MapPinned } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof CheckCircle; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmed", icon: CheckCircle, variant: "secondary" },
  processing: { label: "Processing", icon: Package, variant: "default" },
  shipped: { label: "Shipped", icon: Truck, variant: "outline" },
  delivered: { label: "Delivered", icon: MapPin, variant: "secondary" },
};

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
}

export function OrderDetailSheet({ order, open, onOpenChange, onStatusUpdated }: OrderDetailSheetProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  if (!order) return null;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdating(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated", description: `Order ${order.order_ref} → ${newStatus}` });
      onStatusUpdated();

      // Send email notification
      if (order.contact_email) {
        supabase.functions.invoke("send-order-email", {
          body: {
            email: order.contact_email,
            name: order.contact_first_name,
            orderRef: order.order_ref,
            status: newStatus,
            kitSize: order.kit_size,
            artStyle: order.art_style,
            totalPrice: order.total_price,
            category: (order as any).category || "classic",
          },
        }).then(({ error: emailErr }) => {
          if (emailErr) {
            console.error("Email notification failed:", emailErr);
            toast({ title: "Email failed", description: "Status updated but email notification failed", variant: "destructive" });
          } else {
            toast({ title: "Email sent", description: `Notification sent to ${order.contact_email}` });
          }
        });
      }
    }
    setUpdating(false);
  };

  const config = STATUS_CONFIG[order.status];
  const StatusIcon = config.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-mono text-lg">{order.order_ref}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
            <div className="flex items-center gap-3">
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              <Select value={order.status} onValueChange={(v) => handleStatusChange(v as OrderStatus)} disabled={updating}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photo preview */}
          {order.photo_url && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photo</p>
              <img src={order.photo_url} alt="Order" className="rounded-lg border border-border w-full max-h-48 object-contain bg-muted" />
            </div>
          )}

          {/* Kit details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kit Details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{order.kit_size}</span></div>
              <div><span className="text-muted-foreground">Style:</span> <span className="font-medium">{order.art_style}</span></div>
              <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">{order.total_price} DT</span></div>
              <div><span className="text-muted-foreground">Gift:</span> <span className="font-medium">{order.is_gift ? "Yes" : "No"}</span></div>
            </div>
            {order.gift_message && (
              <p className="text-xs italic text-muted-foreground bg-muted p-2 rounded">"{order.gift_message}"</p>
            )}
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> {order.contact_first_name} {order.contact_last_name}</div>
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {order.contact_phone}</div>
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {order.contact_email || "—"}</div>
            </div>
          </div>

          {/* Shipping */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipping</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-muted-foreground" /> {order.shipping_address}</div>
              <div className="flex items-center gap-2 text-muted-foreground">{order.shipping_city}, {order.shipping_governorate} {order.shipping_postal_code}</div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Created: {new Date(order.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(order.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
