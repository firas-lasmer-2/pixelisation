import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orderRef?: string;
  className?: string;
}

export function RegenerationRequestForm({ orderRef: initialRef, className }: Props) {
  const [orderRef, setOrderRef] = useState(initialRef || "");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!orderRef || reason.trim().length < 5) return;
    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("regeneration-request", {
        body: { order_ref: orderRef, reason },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        setStatus("error");
        setMessage(data.error);
        if (data.remaining !== undefined) setRemaining(data.remaining);
        return;
      }

      setStatus("success");
      setMessage("Votre demande a été envoyée ! Notre équipe va régénérer votre photo et vous notifier.");
      if (data?.remaining !== undefined) setRemaining(data.remaining);
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message || "Une erreur est survenue.");
    }
  };

  if (status === "success") {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
          <p className="text-sm font-medium">{message}</p>
          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              Demandes restantes aujourd'hui : {remaining}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/20 ${className || ""}`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Pas satisfait de votre photo AI ?</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Décrivez ce qui ne vous plaît pas et notre équipe régénérera une nouvelle version pour vous. 
          (Max 3 demandes par 24h)
        </p>

        {!initialRef && (
          <Input
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="Référence de commande (FK-XXXXXX)"
            className="font-mono"
          />
        )}

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Décrivez ce que vous aimeriez changer..."
          rows={3}
          maxLength={500}
        />

        {status === "error" && (
          <div className="flex items-start gap-2 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={status === "loading" || reason.trim().length < 5 || !orderRef}
          className="w-full"
          size="sm"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer la demande"
          )}
        </Button>

        {remaining !== null && (
          <p className="text-xs text-center text-muted-foreground">
            Demandes restantes : {remaining}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
