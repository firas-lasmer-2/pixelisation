import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, Truck, Home, Search, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RegenerationRequestForm } from "@/components/shared/RegenerationRequestForm";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type TrackHistoryEvent = Pick<
  Database["public"]["Tables"]["order_status_events"]["Row"],
  "status" | "tracking_number" | "courier_name" | "note" | "source" | "created_at"
>;
type TrackOrderResult = {
  status: OrderStatus;
  category: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  fulfillmentNote: string | null;
  history: TrackHistoryEvent[];
};

const TIMELINE_ICONS = [CheckCircle, Package, Truck, MapPin];
const STATUS_ORDER: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

const Track = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [ref, setRef] = useState(searchParams.get("ref")?.toUpperCase() || "");
  const [instructionCode, setInstructionCode] = useState(searchParams.get("code")?.toUpperCase() || "");
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackOrderResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (nextRef = ref, nextInstructionCode = instructionCode) => {
    setSearched(true);
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("track-order", {
      body: {
        orderRef: nextRef.toUpperCase(),
        instructionCode: nextInstructionCode.toUpperCase(),
      },
    });

    if (!error && data && !data.error) {
      setFound(true);
      setTrackResult(data as TrackOrderResult);
    } else {
      setFound(false);
      setTrackResult(null);
    }
    setLoading(false);
  }, [instructionCode, ref]);

  useEffect(() => {
    if (ref && instructionCode && !searched) {
      handleSearch(ref, instructionCode);
    }
  }, [ref, instructionCode, searched, handleSearch]);

  const statuses = STATUS_ORDER.map((key, i) => ({
    key,
    icon: TIMELINE_ICONS[i],
    active: STATUS_ORDER.indexOf(trackResult?.status || "confirmed") >= i,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-lg">
            <div className="text-center mb-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">{t.track.title}</h1>
              <p className="text-muted-foreground">{(t.track as any).subtitleSecure || t.track.subtitle}</p>
            </div>

            {/* Search form */}
            <div className="grid gap-3 mb-8 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                placeholder={t.track.placeholder}
                className="font-mono text-lg"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Input
                value={instructionCode}
                onChange={(e) => setInstructionCode(e.target.value.toUpperCase())}
                placeholder={(t.track as any).instructionPlaceholder || "Code de suivi"}
                className="font-mono text-lg"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={() => handleSearch()} className="shrink-0 gap-2" disabled={!ref || !instructionCode || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t.track.searchBtn}
              </Button>
            </div>

            {searched && !found && (
              <Card className="border-destructive/30 animate-fade-in">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  {t.track.notFound}
                </CardContent>
              </Card>
            )}

            {searched && found && (
              <Card className="animate-fade-in overflow-hidden">
                <div className="bg-primary/5 px-6 py-4 border-b border-border">
                  <h2 className="font-semibold">{t.track.statusTitle}</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{ref.toUpperCase()} · {instructionCode.toUpperCase()}</p>
                </div>
                <CardContent className="p-6">
                  <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Transporteur</p>
                      <p className="mt-1 text-sm font-medium">{trackResult?.courierName || "En attente"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">N° suivi</p>
                      <p className="mt-1 text-sm font-medium font-mono">{trackResult?.trackingNumber || "Pas encore attribué"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Dernière note</p>
                      <p className="mt-1 text-sm font-medium">{trackResult?.fulfillmentNote || "Aucune note logistique"}</p>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

                    <div className="space-y-8">
                      {statuses.map((s, i) => {
                        const Icon = s.icon;
                        const statusData = t.track.statuses[s.key];
                        return (
                          <div key={s.key} className="relative flex gap-4" style={{ animationDelay: `${i * 150}ms` }}>
                            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              s.active
                                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                                : "border-border bg-background text-muted-foreground/40"
                            }`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className={`pt-1.5 ${!s.active ? "opacity-40" : ""}`}>
                              <p className={`font-semibold text-sm ${s.active ? "text-foreground" : ""}`}>
                                {statusData}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.track.statuses[`${s.key}Desc` as keyof typeof t.track.statuses]}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {trackResult?.history?.length ? (
                    <div className="mt-8 space-y-3">
                      <h3 className="text-sm font-semibold">Historique détaillé</h3>
                      {trackResult.history.map((entry, index) => (
                        <div key={`${entry.created_at}-${index}`} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">{t.track.statuses[entry.status]}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                          </div>
                          {(entry.courier_name || entry.tracking_number || entry.note) && (
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {entry.courier_name && <p>Transporteur: {entry.courier_name}</p>}
                              {entry.tracking_number && <p>Suivi: {entry.tracking_number}</p>}
                              {entry.note && <p>Note: {entry.note}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Regeneration request for AI categories */}
            {searched && found && trackResult?.category && ["family", "kids_dream", "pet"].includes(trackResult.category) && (
              <RegenerationRequestForm orderRef={ref.toUpperCase()} instructionCode={instructionCode.toUpperCase()} className="mt-6" />
            )}

            <div className="mt-8 text-center">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/">
                  <Home className="me-2 h-4 w-4" />
                  {t.track.backHome}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Track;
