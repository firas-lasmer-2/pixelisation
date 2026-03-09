import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, Truck, Home, Search, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RegenerationRequestForm } from "@/components/shared/RegenerationRequestForm";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const TIMELINE_ICONS = [CheckCircle, Package, Truck, MapPin];
const STATUS_ORDER: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

const Track = () => {
  const { t } = useTranslation();
  const [ref, setRef] = useState("");
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("confirmed");
  const [orderCategory, setOrderCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setSearched(true);
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("status, category")
      .eq("order_ref", ref.toUpperCase())
      .maybeSingle();
    
    if (data) {
      setFound(true);
      setOrderStatus(data.status);
      setOrderCategory(data.category);
    } else {
      setFound(false);
    }
    setLoading(false);
  };

  const statuses = STATUS_ORDER.map((key, i) => ({
    key,
    icon: TIMELINE_ICONS[i],
    active: STATUS_ORDER.indexOf(orderStatus) >= i,
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
              <p className="text-muted-foreground">{t.track.subtitle}</p>
            </div>

            {/* Search form */}
            <div className="flex gap-3 mb-8">
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder={t.track.placeholder}
                className="font-mono text-lg"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} className="shrink-0 gap-2">
                <Search className="h-4 w-4" />
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
                  <p className="text-xs text-muted-foreground font-mono mt-1">{ref.toUpperCase()}</p>
                </div>
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
            )}

            {/* Regeneration request for AI categories */}
            {searched && found && orderCategory && ["family", "kids_dream", "pet"].includes(orderCategory) && (
              <RegenerationRequestForm orderRef={ref.toUpperCase()} className="mt-6" />
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
