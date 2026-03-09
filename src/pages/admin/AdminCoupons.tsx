import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Check, Ticket, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "FK-";
    for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
    setCode(result);
  };

  const handleCreate = async () => {
    if (!code || !discountValue) { toast.error("Code et valeur requis"); return; }
    const { error } = await supabase.from("coupons").insert({
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: parseInt(discountValue),
      min_order: minOrder ? parseInt(minOrder) : 0,
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Coupon créé !");
    setDialogOpen(false);
    resetForm();
    fetchCoupons();
  };

  const resetForm = () => {
    setCode(""); setDiscountType("percentage"); setDiscountValue("");
    setMinOrder(""); setMaxUses(""); setExpiresAt("");
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: active }).eq("id", id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon supprimé");
    fetchCoupons();
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopied(c);
    setTimeout(() => setCopied(null), 1500);
  };

  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUsed = coupons.reduce((s, c) => s + c.used_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coupons & Promos</h1>
          <p className="text-sm text-muted-foreground">{coupons.length} coupons • {activeCoupons} actifs • {totalUsed} utilisations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nouveau coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un coupon</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="FK-XXXXXX" className="font-mono" />
                  <Button variant="outline" size="sm" onClick={generateCode}>Auto</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={discountType} onValueChange={(v: "percentage" | "fixed") => setDiscountType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (DT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valeur</Label>
                  <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === "percentage" ? "10" : "50"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commande min. (DT)</Label>
                  <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Utilisations max.</Label>
                  <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Illimité" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date d'expiration</Label>
                <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full">Créer le coupon</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{coupons.length}</p><p className="text-xs text-muted-foreground">Total coupons</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{activeCoupons}</p><p className="text-xs text-muted-foreground">Actifs</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{totalUsed}</p><p className="text-xs text-muted-foreground">Utilisations</p></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Réduction</TableHead>
              <TableHead>Min. commande</TableHead>
              <TableHead>Utilisations</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="font-mono font-bold">{c.code}</span>
                    <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground">
                      {copied === c.code ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1">
                    {c.discount_type === "percentage" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                    {c.discount_value}{c.discount_type === "percentage" ? "%" : " DT"}
                  </Badge>
                </TableCell>
                <TableCell>{c.min_order > 0 ? `${c.min_order} DT` : "—"}</TableCell>
                <TableCell>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr") : "—"}</TableCell>
                <TableCell>
                  <Switch checked={c.is_active} onCheckedChange={v => toggleActive(c.id, v)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCoupon(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {coupons.length === 0 && !loading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun coupon créé</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminCoupons;
