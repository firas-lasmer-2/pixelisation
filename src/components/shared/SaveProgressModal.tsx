import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Phone, Copy, Check } from "lucide-react";

interface SaveProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
}

export function SaveProgressModal({ open, onOpenChange, step }: SaveProgressModalProps) {
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const recoveryUrl = `${window.location.origin}/studio?recover=true`;

  const handleSave = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 8) {
      localStorage.setItem("flink-recovery", JSON.stringify({
        phone: digits,
        step,
        timestamp: Date.now(),
        url: recoveryUrl,
      }));
      setSaved(true);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(recoveryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Sauvegarder ma commande</DialogTitle>
          <DialogDescription className="text-center">
            Vous pourrez reprendre exactement où vous en étiez.
          </DialogDescription>
        </DialogHeader>

        {!saved ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Votre numéro de téléphone
              </Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground shrink-0">
                  +216
                </div>
                <Input
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length <= 8) setPhone(formatPhone(e.target.value));
                  }}
                  placeholder="XX XXX XXX"
                  className="flex-1"
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={phone.replace(/\D/g, "").length !== 8}
              className="w-full gap-2"
            >
              <Bookmark className="h-4 w-4" />
              Sauvegarder
            </Button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Lien copié !" : "Ou copier le lien de reprise"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-3 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold">Commande sauvegardée !</p>
            <p className="text-sm text-muted-foreground">
              Vous recevrez un rappel WhatsApp pour reprendre votre commande.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Continuer ma commande
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
