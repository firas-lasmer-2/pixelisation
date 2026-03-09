import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Clock, Phone, Mail, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AbandonedCart {
  id: string;
  session_id: string;
  kit_size: string | null;
  art_style: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_first_name: string | null;
  step_reached: number;
  photo_uploaded: boolean;
  recovered: boolean;
  created_at: string;
  updated_at: string;
}

const STEP_NAMES = ["", "Kit", "Photo", "Recadrage", "Style", "Checkout"];

const AdminAbandonedCarts = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("abandoned_carts")
        .select("*")
        .eq("recovered", false)
        .order("updated_at", { ascending: false })
        .limit(100);
      setCarts((data as AbandonedCart[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const withContact = carts.filter(c => c.contact_phone || c.contact_email);
  const highIntent = carts.filter(c => c.step_reached >= 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paniers abandonnés</h1>
        <p className="text-sm text-muted-foreground">{carts.length} sessions non converties</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{carts.length}</p>
            <p className="text-xs text-muted-foreground">Total abandonnés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{withContact.length}</p>
            <p className="text-xs text-muted-foreground">Avec contact</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">{highIntent.length}</p>
            <p className="text-xs text-muted-foreground">Intention élevée (≥ étape 4)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Étape atteinte</TableHead>
              <TableHead>Kit / Style</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Dernière activité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carts.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.session_id.slice(0, 12)}…</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <div
                          key={s}
                          className={`h-2 w-4 rounded-sm ${s <= c.step_reached ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{STEP_NAMES[c.step_reached] || `Étape ${c.step_reached}`}</span>
                    {c.step_reached >= 4 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    {c.kit_size && <Badge variant="outline" className="text-[10px]">{c.kit_size.replace("stamp_kit_", "")}</Badge>}
                    {c.art_style && <Badge variant="secondary" className="text-[10px]">{c.art_style}</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {c.contact_first_name && <p className="text-xs font-medium">{c.contact_first_name}</p>}
                    {c.contact_phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.contact_phone}
                      </p>
                    )}
                    {c.contact_email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {c.contact_email}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: fr })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {carts.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Aucun panier abandonné
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminAbandonedCarts;
