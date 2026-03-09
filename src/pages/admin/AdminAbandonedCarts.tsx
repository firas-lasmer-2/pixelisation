import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Clock, Phone, Mail, AlertTriangle, Send, Copy, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { getKitDisplayLabel } from "@/lib/kitCatalog";

interface AbandonedCart {
  id: string;
  session_id: string;
  category: string | null;
  dream_job: string | null;
  kit_size: string | null;
  art_style: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_first_name: string | null;
  step_reached: number;
  photo_uploaded: boolean;
  recovered: boolean;
  recovered_order_ref: string | null;
  last_recovery_sent_at: string | null;
  last_recovery_status: string | null;
  recovery_attempts: number;
  created_at: string;
  updated_at: string;
}

const STEP_NAMES = ["", "Catégorie", "Kit", "Photo", "IA / Recadrage", "Style", "Confirmation", "Commande"];

const CATEGORY_LABELS: Record<string, string> = {
  classic: "Classique",
  family: "Famille",
  kids_dream: "Rêve d'enfant",
  pet: "Portrait royal",
};

const AdminAbandonedCarts = () => {
  const { toast } = useToast();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(150);
      setCarts((data as AbandonedCart[]) || []);
      setLoading(false);
    };
    void fetch();
  }, []);

  const openCarts = carts.filter((cart) => !cart.recovered);
  const withContact = openCarts.filter((cart) => cart.contact_phone || cart.contact_email);
  const highIntent = openCarts.filter((cart) => cart.step_reached >= 4);
  const recoveredCount = carts.filter((cart) => cart.recovered).length;

  const handleSendRecovery = async (cart: AbandonedCart) => {
    if (!cart.contact_email) {
      toast({
        title: "Email manquant",
        description: "Ce panier ne contient pas d'email exploitable.",
        variant: "destructive",
      });
      return;
    }

    setSendingId(cart.id);
    const { data, error } = await supabase.functions.invoke("send-cart-recovery", {
      body: {
        sessionId: cart.session_id,
      },
    });

    if (error || data?.error) {
      toast({
        title: "Relance échouée",
        description: data?.error || error?.message || "Impossible d'envoyer l'email de reprise.",
        variant: "destructive",
      });
      setSendingId(null);
      return;
    }

    setCarts((current) => current.map((entry) => (
      entry.id === cart.id
        ? {
            ...entry,
            last_recovery_sent_at: new Date().toISOString(),
            last_recovery_status: "sent",
            recovery_attempts: entry.recovery_attempts + 1,
          }
        : entry
    )));

    toast({
      title: "Relance envoyée",
      description: `Email de reprise envoyé à ${cart.contact_email}.`,
    });
    setSendingId(null);
  };

  const handleCopyResumeLink = async (sessionId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/studio?resume=${sessionId}`);
    toast({
      title: "Lien copié",
      description: "Le lien de reprise a été copié.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paniers abandonnés</h1>
        <p className="text-sm text-muted-foreground">{openCarts.length} sessions encore à récupérer</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{openCarts.length}</p>
            <p className="text-xs text-muted-foreground">Ouverts</p>
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
            <p className="text-xs text-muted-foreground">Intention élevée</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{recoveredCount}</p>
            <p className="text-xs text-muted-foreground">Déjà récupérés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Parcours</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Relance</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openCarts.map((cart) => (
              <TableRow key={cart.id}>
                <TableCell className="font-mono text-xs">{cart.session_id.slice(0, 12)}…</TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABELS[cart.category || "classic"] || (cart.category || "Non défini")}
                      </Badge>
                      {cart.kit_size && (
                        <Badge variant="secondary" className="text-[10px]">
                          {getKitDisplayLabel(cart.kit_size)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5, 6].map((currentStep) => (
                          <div
                            key={currentStep}
                            className={`h-2 w-4 rounded-sm ${currentStep <= cart.step_reached ? "bg-primary" : "bg-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{STEP_NAMES[cart.step_reached] || `Étape ${cart.step_reached}`}</span>
                      {cart.step_reached >= 4 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </div>
                    {cart.dream_job && (
                      <p className="text-xs text-muted-foreground">Rêve: {cart.dream_job}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {cart.contact_first_name && <p className="text-xs font-medium">{cart.contact_first_name}</p>}
                    {cart.contact_phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {cart.contact_phone}
                      </p>
                    )}
                    {cart.contact_email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {cart.contact_email}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={cart.last_recovery_status === "sent" ? "secondary" : "outline"} className="text-[10px]">
                      {cart.last_recovery_status || "Jamais relancé"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{cart.recovery_attempts} envoi(x)</p>
                    {cart.last_recovery_sent_at && (
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(cart.last_recovery_sent_at), { addSuffix: true, locale: fr })}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(cart.updated_at), { addSuffix: true, locale: fr })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyResumeLink(cart.session_id)}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Lien
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendRecovery(cart)}
                      disabled={!cart.contact_email || sendingId === cart.id}
                      className="gap-1"
                    >
                      {sendingId === cart.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Relancer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {openCarts.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Aucun panier abandonné ouvert
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
