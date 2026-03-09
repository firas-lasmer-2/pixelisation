import { Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Sparkles } from "lucide-react";

const Gallery = () => {
  const { t } = useTranslation();
  const comingSoonTitle = t.lang === "ar" ? "معرض العملاء الحقيقي قريباً" : "La galerie clients arrive bientôt";
  const comingSoonBody = t.lang === "ar"
    ? "سننشر فقط الأعمال الحقيقية التي يوافق أصحابها على مشاركتها. حتى ذلك الحين، يمكنك إنشاء طلبك مباشرة من الاستوديو."
    : "Nous publierons uniquement de vraies créations clients avec leur accord. En attendant, lancez votre commande directement depuis le studio.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-3">{t.gallery.title}</h1>
            <p className="text-lg text-muted-foreground">{comingSoonBody}</p>
          </div>

          <Card className="mx-auto max-w-3xl border-primary/20">
            <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{comingSoonTitle}</h2>
                <p className="text-sm text-muted-foreground max-w-xl">{comingSoonBody}</p>
              </div>
              <img
                src="/images/step-result.jpg"
                alt="Helma preview"
                className="w-full max-w-md rounded-2xl border border-border object-cover shadow-lg"
              />
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center mt-16">
            <Button asChild size="lg" className="rounded-full px-8 shadow-md shadow-primary/20">
              <Link to="/studio">
                <Sparkles className="me-2 h-4 w-4" />
                {t.gallery.cta}
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Gallery;
