import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

type FilterStyle = "all" | "original" | "vintage" | "pop_art";

// Placeholder gallery items using existing images
const GALLERY_ITEMS = [
  { id: 1, image: "/images/style-original.jpg", style: "original" as const, size: "40 × 50 cm" },
  { id: 2, image: "/images/style-vintage.jpg", style: "vintage" as const, size: "30 × 40 cm" },
  { id: 3, image: "/images/style-popart.jpg", style: "pop_art" as const, size: "40 × 50 cm" },
  { id: 4, image: "/images/hero-kit.jpg", style: "original" as const, size: "30 × 40 cm" },
  { id: 5, image: "/images/kit-flatlay.jpg", style: "vintage" as const, size: "40 × 50 cm" },
  { id: 6, image: "/images/step-result.jpg", style: "pop_art" as const, size: "30 × 40 cm" },
];

const Gallery = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterStyle>("all");

  const filtered = filter === "all"
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.style === filter);

  const getStyleName = (style: string) => {
    if (style === "original") return t.styles.original.name;
    if (style === "vintage") return t.styles.vintage.name;
    return t.styles.popArt.name;
  };

  const filters: { key: FilterStyle; label: string }[] = [
    { key: "all", label: t.gallery.filterAll },
    { key: "original", label: t.gallery.filterOriginal },
    { key: "vintage", label: t.gallery.filterVintage },
    { key: "pop_art", label: t.gallery.filterPopArt },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-3">{t.gallery.title}</h1>
            <p className="text-lg text-muted-foreground">{t.gallery.subtitle}</p>
          </div>

          {/* Filter tabs */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {filters.map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                className="rounded-full px-5"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Gallery grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {filtered.map((item, i) => (
              <Card
                key={item.id}
                className="group overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={`Gallery ${item.id}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/70 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-foreground text-xs">
                        {getStyleName(item.style)}
                      </Badge>
                      <span className="text-xs text-primary-foreground/80">{item.size}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

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
