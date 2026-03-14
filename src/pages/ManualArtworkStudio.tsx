import { useCallback, useEffect, useMemo, useState } from "react";
import type { Area } from "react-easy-crop";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/landing/Footer";
import { CropScreen } from "@/components/CropScreen";
import { Navbar } from "@/components/shared/Navbar";
import { ProductTypePicker } from "@/components/studio/ProductTypePicker";
import { UploadZone } from "@/components/UploadZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { STORAGE_KEYS } from "@/lib/brand";
import {
  MANUAL_ARTWORK_PRODUCTS,
  PRICING,
  PRODUCT_TYPE_META,
  TUNISIAN_GOVERNORATES,
  getPhoto,
  isManualArtworkProduct,
  type ContactInfo,
  type ProductType,
  type ShippingInfo,
  useOrder,
} from "@/lib/store";
import {
  DEFAULT_PUBLIC_KIT,
  getKitConfig,
  getKitDisplayLabel,
  getPublicKitConfigs,
  isKitSize,
  resolveProcessingKitSize,
} from "@/lib/kitCatalog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Crop,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
  Sparkles,
  Type,
  Upload,
  User,
} from "lucide-react";

const PUBLIC_STUDIO_KITS = getPublicKitConfigs();
const MANUAL_FLOW_STEPS = [
  { label: "Photo", icon: Upload },
  { label: "Recadrage", icon: Crop },
  { label: "Produit", icon: Sparkles },
  { label: "Format", icon: Package },
  { label: "Dedicace", icon: Type },
  { label: "Coordonnees", icon: User },
  { label: "Confirmation", icon: CreditCard },
];

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1
        className="text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="rounded-[26px] border border-border/80 bg-card/85 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Parcours manuel</p>
        <p className="text-xs text-muted-foreground">
          Etape {currentStep} / {MANUAL_FLOW_STEPS.length}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-7">
        {MANUAL_FLOW_STEPS.map((item, index) => {
          const stepNumber = index + 1;
          const Icon = item.icon;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isClickable = stepNumber <= currentStep;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => isClickable && onStepClick(stepNumber)}
              disabled={!isClickable}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                isActive
                  ? "border-primary/40 bg-primary/[0.08] text-foreground gold-glow"
                  : isCompleted
                  ? "border-border bg-background/80 text-foreground hover:border-primary/25 hover:bg-primary/[0.04]"
                  : "border-border/70 bg-background/50 text-muted-foreground opacity-75"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  isActive
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : isCompleted
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Etape {stepNumber}</p>
                <p className="text-sm font-medium">{item.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

async function buildCropPreview(imageSrc: string, crop: Area) {
  return await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(crop.width));
        canvas.height = Math.max(1, Math.round(crop.height));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        ctx.drawImage(
          img,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Image could not be loaded"));
    img.src = imageSrc;
  });
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export default function ManualArtworkStudio() {
  const { dir } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("resume")?.trim() || null;
  const requestedProduct = searchParams.get("product")?.trim() || null;
  const requestedManualProduct =
    requestedProduct === "stencil_paint" || requestedProduct === "glitter_reveal"
      ? (requestedProduct as ProductType)
      : null;

  const {
    order,
    setCategory,
    setProductType,
    setPhoto,
    removePhoto,
    setCroppedArea,
    setSize,
    setContact,
    setShipping,
    setDedicationText,
    confirmOrder,
  } = useOrder();

  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState(0);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [recoveringCart, setRecoveringCart] = useState(Boolean(resumeSessionId));
  const [cropPreviewUrl, setCropPreviewUrl] = useState("");
  const [contactForm, setContactForm] = useState<ContactInfo>(order.contact);
  const [shippingForm, setShippingForm] = useState<ShippingInfo>(order.shipping);
  const [phoneError, setPhoneError] = useState("");
  const [sessionId] = useState(() => {
    const requestedSessionId = resumeSessionId || sessionStorage.getItem(STORAGE_KEYS.session);
    const resolvedSessionId = requestedSessionId || crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEYS.session, resolvedSessionId);
    return resolvedSessionId;
  });

  const productType = isManualArtworkProduct(order.productType)
    ? order.productType
    : (requestedManualProduct || "stencil_paint");
  const photo = getPhoto(order);
  const estimatedDelivery = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString("fr-TN", { day: "numeric", month: "long" });
  }, []);
  const totalPrice = order.selectedSize ? PRICING[order.selectedSize] : 0;
  const selectedKit = order.selectedSize ? getKitConfig(order.selectedSize) : null;
  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const slideClass =
    slideDir === "right"
      ? "animate-[slide-in-right_0.35s_ease-out]"
      : "animate-[slide-in-left_0.35s_ease-out]";

  useEffect(() => {
    setCategory("classic");
    setProductType(requestedManualProduct || "stencil_paint");
  }, [requestedManualProduct, setCategory, setProductType]);

  useEffect(() => {
    if (!order.selectedSize) {
      setSize(DEFAULT_PUBLIC_KIT);
    }
  }, [order.selectedSize, setSize]);

  useEffect(() => {
    if (!resumeSessionId) {
      setRecoveringCart(false);
      return;
    }

    let active = true;
    const restoreCart = async () => {
      setRecoveringCart(true);
      const { data, error } = await supabase.functions.invoke("recover-cart", {
        body: { sessionId: resumeSessionId },
      });

      if (!active) return;

      if (error || data?.error) {
        toast({
          title: "Reprise impossible",
          description: "Nous n'avons pas pu restaurer cette commande.",
          variant: "destructive",
        });
        setRecoveringCart(false);
        return;
      }

      if (data?.alreadyRecovered && data?.recoveredOrderRef) {
        toast({
          title: "Commande deja finalisee",
          description: `Cette session a deja ete convertie en commande ${data.recoveredOrderRef}.`,
        });
        setRecoveringCart(false);
        return;
      }

      const cart = data?.cart;
      if (!cart) {
        setRecoveringCart(false);
        return;
      }

      if (cart.productType === "paint_by_numbers") {
        navigate(`/studio?resume=${encodeURIComponent(resumeSessionId)}`, { replace: true });
        return;
      }

      if (cart.productType && isManualArtworkProduct(cart.productType as ProductType)) {
        setProductType(cart.productType as ProductType);
      }

      if (isKitSize(cart.selectedSize)) {
        setSize(cart.selectedSize);
      }

      setDedicationText(cart.dedicationText || "");

      const restoredContact: ContactInfo = {
        firstName: cart.contact?.firstName || "",
        lastName: "",
        phone: cart.contact?.phone || "",
        email: cart.contact?.email || "",
      };
      setContact(restoredContact);
      setContactForm(restoredContact);

      if (cart.photoUploaded) {
        setStep(1);
        toast({
          title: "Commande restauree",
          description: "Vos choix sont revenus. Rechargez la photo pour continuer.",
        });
      } else if (cart.selectedSize) {
        setStep(4);
      } else {
        setStep(1);
      }

      setRecoveringCart(false);
    };

    void restoreCart();

    return () => {
      active = false;
    };
  }, [navigate, resumeSessionId, setContact, setDedicationText, setProductType, setSize]);

  useEffect(() => {
    const save = async () => {
      await supabase.functions.invoke("save-abandoned-cart", {
        body: {
          session_id: sessionId,
          step_reached: step,
          category: "classic",
          product_type: productType,
          kit_size: order.selectedSize || null,
          photo_uploaded: Boolean(photo),
          dedication_text: order.dedicationText || null,
          crop_data: order.croppedArea
            ? {
                x: Math.round(order.croppedArea.x),
                y: Math.round(order.croppedArea.y),
                width: Math.round(order.croppedArea.width),
                height: Math.round(order.croppedArea.height),
              }
            : null,
          contact_phone: normalizePhone(contactForm.phone).length === 8 ? contactForm.phone : null,
          contact_email: contactForm.email || null,
          contact_first_name: contactForm.firstName || null,
        },
      });
    };

    const timer = setTimeout(() => {
      void save();
    }, 1200);

    return () => clearTimeout(timer);
  }, [contactForm.email, contactForm.firstName, contactForm.phone, order.croppedArea, order.dedicationText, order.selectedSize, photo, productType, sessionId, step]);

  const goToStep = useCallback((nextStep: number) => {
    setSlideDir(nextStep > step ? "right" : "left");
    setAnimKey((value) => value + 1);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const handleImageSelected = useCallback((dataUrl: string) => {
    setPhoto(dataUrl, 0);
    setCropPreviewUrl("");
    goToStep(2);
  }, [goToStep, setPhoto]);

  const handleCropComplete = useCallback(async (croppedArea: Area) => {
    setCroppedArea(croppedArea);

    try {
      const previewUrl = await buildCropPreview(getPhoto(order), croppedArea);
      setCropPreviewUrl(previewUrl);
    } catch {
      setCropPreviewUrl(getPhoto(order));
    }

    goToStep(3);
  }, [goToStep, order, setCroppedArea]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 8) return;

    const formatted =
      digits.length <= 2
        ? digits
        : digits.length <= 5
        ? `${digits.slice(0, 2)} ${digits.slice(2)}`
        : `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;

    setContactForm((current) => ({ ...current, phone: formatted }));
    setPhoneError(digits.length > 0 && digits.length < 8 ? "Numero invalide (8 chiffres)" : "");
  };

  const isDetailsValid = Boolean(
    contactForm.firstName &&
    contactForm.lastName &&
    normalizePhone(contactForm.phone).length === 8 &&
    shippingForm.address &&
    shippingForm.city &&
    shippingForm.governorate,
  );

  const handleConfirm = async () => {
    if (!order.selectedSize || !order.croppedArea) return;

    setSubmittingOrder(true);
    try {
      setContact(contactForm);
      setShipping(shippingForm);

      await confirmOrder({
        contact: contactForm,
        shipping: shippingForm,
        isGift: false,
        giftMessage: "",
        dedicationText: order.dedicationText || null,
        couponCode: null,
        sessionId,
      });

      navigate("/confirmation");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de confirmer la commande.";
      const friendly =
        message === "Missing valid contact details" ? "Verifiez le prenom, le nom et le numero de telephone." :
        message === "Missing shipping details" ? "Ajoutez l'adresse, la ville et le gouvernorat." :
        message === "Missing crop data" || message === "Order is missing crop" ? "Recadrez la photo avant de confirmer." :
        message === "Missing selected size" || message === "Order is missing size" ? "Choisissez un format avant de confirmer." :
        message;

      toast({
        title: "Erreur",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (recoveringCart) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="space-y-3 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Restauration de votre commande...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="flex-1 studio-bg">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container relative mx-auto px-4 pb-6 pt-10">
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Studio manuel</p>
              <h1
                className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Commande simple, creation manuelle
              </h1>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
                Importez une photo, enregistrez le recadrage, choisissez le produit et le format, puis notre equipe preparera le pochoir ou le design paillettes manuellement en dehors de l'application.
              </p>
            </div>
            <StepIndicator currentStep={step} onStepClick={goToStep} />
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <div key={animKey} className={slideClass}>
              {step === 1 && (
                <div className="space-y-8">
                  <SectionHeading
                    title="Importez votre photo"
                    subtitle="Nous enregistrons uniquement la photo originale et le recadrage exact pour la production manuelle."
                  />

                  {photo ? (
                    <div className="space-y-6">
                      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-primary/15 bg-card p-3 shadow-lg">
                        <img src={photo} alt="Photo importee" className="w-full rounded-2xl object-contain" />
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPhoto("", 0);
                            removePhoto(0);
                            setCropPreviewUrl("");
                          }}
                          className="gap-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                          Changer la photo
                        </Button>
                        <Button onClick={() => goToStep(2)} className="gap-2 btn-premium border-0 text-primary-foreground">
                          Continuer <NextIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-2xl">
                      <UploadZone onImageSelected={handleImageSelected} />
                    </div>
                  )}
                </div>
              )}

              {step === 2 && photo && order.selectedSize && (
                <CropScreen
                  imageSrc={photo}
                  kitSize={resolveProcessingKitSize(order.selectedSize)}
                  onCropComplete={handleCropComplete}
                  onBack={() => goToStep(1)}
                  submitLabel="Continuer"
                  freeCrop
                  hideKitBadge
                />
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <SectionHeading
                    title="Choisissez le produit"
                    subtitle="Rien ne sera genere automatiquement. Ce choix sert uniquement a la preparation manuelle."
                  />

                  <ProductTypePicker
                    selected={productType}
                    onSelect={(nextProductType) => setProductType(nextProductType)}
                    products={MANUAL_ARTWORK_PRODUCTS}
                  />

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(2)} className="gap-2">
                      <BackIcon className="h-4 w-4" />
                      Retour
                    </Button>
                    <Button onClick={() => goToStep(4)} className="gap-2 btn-premium border-0 text-primary-foreground">
                      Continuer
                      <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <SectionHeading
                    title="Choisissez le format"
                    subtitle="Selectionnez simplement la taille que nous devons produire pour la commande."
                  />

                  <div className="grid gap-4 lg:grid-cols-3">
                    {PUBLIC_STUDIO_KITS.map((kit) => {
                      const isSelected = order.selectedSize === kit.id;
                      return (
                        <button
                          key={kit.id}
                          type="button"
                          onClick={() => setSize(kit.id)}
                          className={`rounded-3xl border-2 p-5 text-left transition-all duration-300 hover:shadow-lg ${
                            isSelected
                              ? "border-primary bg-primary/[0.03] shadow-lg"
                              : "border-border/60 bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-2xl font-bold text-foreground">{kit.shortLabel}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{kit.dimensionsLabel}</p>
                            </div>
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                                isSelected ? "border-primary bg-primary" : "border-border"
                              }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <div>
                              <p className="text-3xl font-bold text-foreground">{kit.price} DT</p>
                              <p className="text-xs text-muted-foreground line-through">{kit.originalPrice} DT</p>
                            </div>
                            {kit.recommended && (
                              <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.12em]">
                                Recommande
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(3)} className="gap-2">
                      <BackIcon className="h-4 w-4" />
                      Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(5)}
                      disabled={!order.selectedSize}
                      className="gap-2 btn-premium border-0 text-primary-foreground"
                    >
                      Continuer
                      <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                  <SectionHeading
                    title="Ajoutez une dedicace"
                    subtitle="Optionnel. Nous l'enregistrons avec la commande pour la preparation manuelle."
                  />

                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-2">
                        <Label htmlFor="dedication" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Dedicace
                        </Label>
                        <Textarea
                          id="dedication"
                          value={order.dedicationText}
                          onChange={(event) => setDedicationText(event.target.value.slice(0, 22))}
                          rows={3}
                          maxLength={22}
                          placeholder="Pour maman, Avec amour..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum 22 caracteres. Laissez vide si vous n'en voulez pas.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(4)} className="gap-2">
                      <BackIcon className="h-4 w-4" />
                      Retour
                    </Button>
                    <Button onClick={() => goToStep(6)} className="gap-2 btn-premium border-0 text-primary-foreground">
                      Continuer
                      <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-6">
                  <SectionHeading
                    title="Coordonnees et livraison"
                    subtitle="Ces informations sont enregistrees avec la commande et utilisees pour la livraison."
                  />

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Contact</h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Prenom</Label>
                            <Input
                              value={contactForm.firstName}
                              onChange={(event) => setContactForm((current) => ({ ...current, firstName: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                              value={contactForm.lastName}
                              onChange={(event) => setContactForm((current) => ({ ...current, lastName: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Telephone</Label>
                            <div className="flex gap-2">
                              <div className="flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                                +216
                              </div>
                              <Input
                                value={contactForm.phone}
                                onChange={(event) => handlePhoneChange(event.target.value)}
                                placeholder="XX XXX XXX"
                                className={phoneError ? "border-destructive" : ""}
                              />
                            </div>
                            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label>Email (optionnel)</Label>
                            <Input
                              value={contactForm.email}
                              onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Livraison</h2>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Adresse</Label>
                            <Input
                              value={shippingForm.address}
                              onChange={(event) => setShippingForm((current) => ({ ...current, address: event.target.value }))}
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Ville</Label>
                              <Input
                                value={shippingForm.city}
                                onChange={(event) => setShippingForm((current) => ({ ...current, city: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Gouvernorat</Label>
                              <Select
                                value={shippingForm.governorate}
                                onValueChange={(value) => setShippingForm((current) => ({ ...current, governorate: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Gouvernorat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TUNISIAN_GOVERNORATES.map((governorate) => (
                                    <SelectItem key={governorate} value={governorate}>
                                      {governorate}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Code postal</Label>
                              <Input
                                value={shippingForm.postalCode}
                                onChange={(event) => setShippingForm((current) => ({ ...current, postalCode: event.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(5)} className="gap-2">
                      <BackIcon className="h-4 w-4" />
                      Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(7)}
                      disabled={!isDetailsValid}
                      className="gap-2 btn-premium border-0 text-primary-foreground"
                    >
                      Verifier la commande
                      <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-6">
                  <SectionHeading
                    title="Confirmez la commande"
                    subtitle="Aucun masque de pochoir, design paillettes, fichier SVG ou artwork automatique ne sera genere pour ce parcours."
                  />

                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card className="border-border/70 shadow-sm">
                      <CardContent className="space-y-5 p-6">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recapitulatif</p>
                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Produit</p>
                              <p className="font-medium">{PRODUCT_TYPE_META[productType].label}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Format</p>
                              <p className="font-medium">{getKitDisplayLabel(order.selectedSize)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Dedicace</p>
                              <p className="font-medium">{order.dedicationText || "Aucune"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Livraison estimee</p>
                              <p className="font-medium">{estimatedDelivery}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-2xl border bg-muted/30 p-4 text-sm">
                          <p className="font-semibold text-foreground">Ce que l'application enregistre</p>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>Photo originale importee</li>
                            <li>Coordonnees de recadrage</li>
                            <li>Produit et format choisis</li>
                            <li>Dedicace optionnelle</li>
                            <li>Informations client et livraison</li>
                          </ul>
                        </div>

                        <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
                          <p className="font-semibold text-foreground">Contact</p>
                          <p>{contactForm.firstName} {contactForm.lastName}</p>
                          <p>{contactForm.phone}</p>
                          <p>{contactForm.email || "Pas d'email"}</p>
                        </div>

                        <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
                          <p className="font-semibold text-foreground">Livraison</p>
                          <p>{shippingForm.address}</p>
                          <p>{shippingForm.city}, {shippingForm.governorate} {shippingForm.postalCode}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4 lg:sticky lg:top-24">
                      <Card className="overflow-hidden border-border/70 shadow-sm">
                        <CardContent className="space-y-4 p-5">
                          {(cropPreviewUrl || photo) && (
                            <div className="overflow-hidden rounded-2xl border bg-muted">
                              <img
                                src={cropPreviewUrl || photo}
                                alt="Apercu recadre"
                                className="w-full object-contain"
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Produit</span>
                              <span className="font-medium">{PRODUCT_TYPE_META[productType].label}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Format</span>
                              <span className="font-medium">{selectedKit?.displayLabel || "-"}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Paiement</span>
                              <span className="font-medium">A la livraison</span>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-primary/5 p-4">
                            <p className="text-sm font-medium text-muted-foreground">Total</p>
                            <p
                              className="text-3xl font-bold text-primary"
                              style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                              {totalPrice} DT
                            </p>
                          </div>

                          <Button
                            onClick={handleConfirm}
                            disabled={!isDetailsValid || !order.selectedSize || !order.croppedArea || submittingOrder}
                            className="w-full gap-2 btn-premium border-0 text-primary-foreground"
                            size="lg"
                          >
                            {submittingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                            {submittingOrder ? "Confirmation..." : "Confirmer la commande"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <Button variant="outline" onClick={() => goToStep(6)} className="gap-2">
                      <BackIcon className="h-4 w-4" />
                      Retour
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
