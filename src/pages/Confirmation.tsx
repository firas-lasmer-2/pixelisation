import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { useOrder } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Home, Copy, FileText, Truck, Package, MapPin, Share2, Check, Gift, Users } from "lucide-react";
import { RegenerationRequestForm } from "@/components/shared/RegenerationRequestForm";
import { BRAND, buildTrackUrl } from "@/lib/brand";

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const left = Math.random() * 100;
  const size = 6 + Math.random() * 6;
  const duration = 1.5 + Math.random() * 1;

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${left}%`,
        top: "-10px",
        width: size,
        height: size,
        backgroundColor: color,
        animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
        opacity: 0,
      }}
    />
  );
}

function AnimatedCheckmark() {
  return (
    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 relative">
      <svg className="h-14 w-14 text-primary" viewBox="0 0 52 52">
        <circle
          cx="26" cy="26" r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="animate-[draw-circle_0.6s_ease-out_forwards]"
          strokeDasharray="150"
          strokeDashoffset="150"
        />
        <path
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-[draw-check_0.4s_ease-out_0.5s_forwards]"
          strokeDasharray="40"
          strokeDashoffset="40"
        />
      </svg>
    </div>
  );
}

const CONFETTI_COLORS = [
  "hsl(40,64%,55%)", "hsl(354,42%,32%)", "hsl(210,80%,60%)",
  "hsl(140,60%,45%)", "hsl(280,60%,60%)", "hsl(30,90%,60%)",
];

const Confirmation = () => {
  const { t } = useTranslation();
  const { order } = useOrder();
  const [copied, setCopied] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareWhatsApp = () => {
    const msg = `${t.confirmation.title} 🎨\n${t.confirmation.orderRef}: ${order.orderRef}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const timeline = [
    { icon: CheckCircle, label: t.confirmation.timeline.confirmed, active: true },
    { icon: Package, label: t.confirmation.timeline.processing, active: false },
    { icon: Truck, label: t.confirmation.timeline.shipped, active: false },
    { icon: MapPin, label: t.confirmation.timeline.delivered, active: false },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-lg text-center relative overflow-hidden">
            {/* Confetti */}
            {showConfetti && (
              <div className="absolute inset-x-0 top-0 h-60 pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={i * 0.1}
                    color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
                  />
                ))}
              </div>
            )}

            <AnimatedCheckmark />

            <h1 className="mb-3 text-3xl font-bold">{t.confirmation.title}</h1>
            <p className="mb-8 text-muted-foreground">{t.confirmation.subtitle}</p>

            {/* Order codes */}
            <Card className="mb-6 text-start">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.confirmation.orderRef}</span>
                  <Badge variant="secondary" className="gap-1 font-mono text-sm">
                    {order.orderRef || "HL-XXXXXX"}
                    <button onClick={() => copyCode(order.orderRef, "ref")} className="hover:text-primary transition-colors">
                      {copied === "ref" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.confirmation.instructionCode}</span>
                  <Badge variant="secondary" className="gap-1 font-mono text-sm">
                    {order.instructionCode || "XXXXXX"}
                    <button onClick={() => copyCode(order.instructionCode, "code")} className="hover:text-primary transition-colors">
                      {copied === "code" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="mb-6 text-start">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {timeline.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 relative flex-1">
                        {i > 0 && (
                          <div className={`absolute top-4 -start-1/2 w-full h-0.5 ${step.active ? "bg-primary" : "bg-border"}`} />
                        )}
                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          step.active
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : "bg-muted text-muted-foreground/40"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={`text-[10px] text-center leading-tight ${step.active ? "font-semibold text-primary" : "text-muted-foreground/50"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* What's next */}
            <Card className="mb-8 text-start">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">{t.confirmation.whatNext}</h3>
                <ol className="space-y-3">
                  {t.confirmation.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Referral Program */}
            <Card className="mb-8 text-center border-primary/20">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Parrainez un ami</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Partagez votre code et obtenez <span className="font-bold text-primary">30 DT de réduction</span> sur votre prochaine commande !
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="gap-1.5 font-mono text-base px-4 py-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    REF-{order.instructionCode || "XXXXXX"}
                    <button
                      onClick={() => copyCode(`REF-${order.instructionCode}`, "referral")}
                      className="hover:text-primary transition-colors"
                    >
                      {copied === "referral" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const msg = `🎨 Utilise mon code REF-${order.instructionCode} pour obtenir 30 DT de réduction sur ta première commande ${BRAND.name} !\n${window.location.origin}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Partager via WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Regeneration request for AI categories */}
            {order.category && ["family", "kids_dream", "pet"].includes(order.category) && (
              <RegenerationRequestForm orderRef={order.orderRef} instructionCode={order.instructionCode} className="mb-8 text-start" />
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="rounded-full">
                <Link to="/download">
                  <FileText className="me-2 h-4 w-4" />
                  {t.download.downloadBtn}
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to={buildTrackUrl(order.orderRef, order.instructionCode, window.location.origin).replace(window.location.origin, "")}>
                  <Truck className="me-2 h-4 w-4" />
                  {t.confirmation.trackOrder}
                </Link>
              </Button>
            </div>

            {/* Share buttons */}
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="ghost" size="sm" onClick={shareWhatsApp} className="text-xs gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                {t.confirmation.shareWhatsApp}
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5">
                <Link to="/">
                  <Home className="h-3.5 w-3.5" />
                  {t.confirmation.backHome}
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

export default Confirmation;
