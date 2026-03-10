import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Area } from "react-easy-crop";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { useOrder, getPhoto, PRICING, TUNISIAN_GOVERNORATES, CATEGORY_META, DREAM_JOBS, ADD_ONS, getAvailableAddOns, STENCIL_DETAIL_META, type KitSize, type ArtStyle, type ContactInfo, type ShippingInfo, type OrderCategory, type ProductType, type StencilDetailLevel, type GlitterPalette } from "@/lib/store";
import {
  DEFAULT_PUBLIC_KIT,
  KIT_TONE_STYLES,
  getKitConfig,
  getKitDisplayLabel,
  getKitSavings,
  getPublicKitConfigs,
  isKitSize,
  isPublicKit,
  resolveProcessingKitSize,
  type KitBadgeIcon,
} from "@/lib/kitCatalog";
import { supabase } from "@/integrations/supabase/client";
import { UploadZone } from "@/components/UploadZone";
import { CategorySelector } from "@/components/studio/CategorySelector";
import { ProductTypePicker } from "@/components/studio/ProductTypePicker";
import { StencilDetailPicker } from "@/components/studio/StencilDetailPicker";
import { GlitterPalettePicker } from "@/components/studio/GlitterPalettePicker";
import { DreamJobPicker } from "@/components/studio/DreamJobPicker";
import { MultiUploadZone } from "@/components/studio/MultiUploadZone";
import { StylePreviewCard } from "@/components/studio/StylePreviewCard";
import { SaveProgressModal } from "@/components/shared/SaveProgressModal";
import { CropScreen } from "@/components/CropScreen";
import { ProcessingScreen } from "@/components/ProcessingScreen";
import { processImage, ProcessingResult } from "@/lib/imageProcessing";
import { processStencilImage, type StencilResult } from "@/lib/stencilProcessing";
import { getStyleDefinition, getStyleDescription, getStyleLabel, orderStyleResults } from "@/lib/styles";
import { GLITTER_PALETTES } from "@/lib/glitterPalettes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Truck, CreditCard, Package,
  Camera, Palette, User, MapPin, ShieldCheck, Sparkles, CheckCircle,
  Layers, Star, Gift, Edit3, Crown, Upload, Tag, X, Wand2, Loader2, ShoppingBag,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { STORAGE_KEYS } from "@/lib/brand";
import { DEDICATION_MAX_LENGTH, normalizeDedicationDraft } from "@/lib/dedicationOverlay";
import { trackFunnelEvent } from "@/lib/funnel";
/* ─── Kit visuals ─── */
const PUBLIC_STUDIO_KITS = getPublicKitConfigs();
const BADGE_ICON_COMPONENTS: Record<KitBadgeIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  star: Star,
  crown: Crown,
};

/* ─── Section heading helper ─── */
function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xl sm:text-2xl font-bold section-gold-line mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h2>
      <p className="text-sm text-muted-foreground mt-3">{subtitle}</p>
    </div>
  );
}

type StepMetaItem = {
  label: string;
  icon: typeof Sparkles;
};

const STYLE_STEP_LABEL: Record<ProductType, StepMetaItem> = {
  paint_by_numbers: { label: "Style", icon: Palette },
  stencil_paint:    { label: "Détail", icon: Layers },
  glitter_reveal:   { label: "Palette", icon: Sparkles },
};

function getStepMeta(category: OrderCategory, productType: ProductType = "paint_by_numbers"): StepMetaItem[] {
  const styleStep = STYLE_STEP_LABEL[productType];
  const isAI = category !== "classic";
  if (!isAI) {
    return [
      { label: "Expérience", icon: Sparkles },
      { label: "Format", icon: Package },
      { label: "Extras", icon: Gift },
      { label: "Photo", icon: Upload },
      { label: "Recadrage", icon: Camera },
      styleStep,
      { label: "Commande", icon: CreditCard },
    ];
  }
  const aiLabel =
    category === "family"     ? "Fusion"   :
    category === "kids_dream" ? "Magie"    :
    "Portrait";
  const uploadLabel = category === "family" ? "Photos" : "Photo";
  return [
    { label: "Expérience", icon: Sparkles },
    { label: "Format", icon: Package },
    { label: "Extras", icon: Gift },
    { label: uploadLabel, icon: Upload },
    { label: aiLabel, icon: Wand2 },
    { label: "Recadrage", icon: Camera },
    styleStep,
    { label: "Commande", icon: CreditCard },
  ];
}


function StepIndicator({
  currentStep,
  totalSteps,
  stepMeta,
  onStepClick,
}: {
  currentStep: number;
  totalSteps: number;
  stepMeta: StepMetaItem[];
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="rounded-[26px] border border-border/80 bg-card/85 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Parcours studio</p>
        <p className="text-xs text-muted-foreground">Étape {Math.min(currentStep, totalSteps)} / {totalSteps}</p>
      </div>

      <div className={`grid gap-2 sm:grid-cols-4 ${totalSteps <= 7 ? "xl:grid-cols-7" : "xl:grid-cols-8"}`}>
        {stepMeta.map((item, index) => {
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
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                isActive
                  ? "border-primary/30 bg-primary text-primary-foreground"
                  : isCompleted
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Étape {stepNumber}</p>
                <p className="text-sm font-medium">{item.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Studio Component
   ═══════════════════════════════════════════════════════ */
const Studio = () => {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("resume")?.trim() || null;
  const { order, setCategory, setProductType, setPhoto, removePhoto, setCroppedArea, setStyle, setStylePreviewUrl, setSize, setAddOns, setStencilDetailLevel, setGlitterPalette, setContact, setShipping, setGift, setDedicationText, setDreamJob, setAiGeneratedUrl, confirmOrder } = useOrder();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [previews, setPreviews] = useState<{ style: ArtStyle; results: ProcessingResult[]; previewUrl: string }[]>([]);
  const [stencilPreviews, setStencilPreviews] = useState<Partial<Record<StencilDetailLevel, string>>>({});
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [contactForm, setContactForm] = useState<ContactInfo>(order.contact);
  const [shippingForm, setShippingForm] = useState<ShippingInfo>(order.shipping);
  const [phoneError, setPhoneError] = useState("");
  const [isGift, setIsGift] = useState(order.isGift);
  const [giftMessage, setGiftMessage] = useState(order.giftMessage);

  // Coupon state
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [recoveringCart, setRecoveringCart] = useState(Boolean(resumeSessionId));
  const [sessionId] = useState(() => {
    const requestedSessionId = resumeSessionId || sessionStorage.getItem(STORAGE_KEYS.session);
    const resolvedSessionId = requestedSessionId || crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEYS.session, resolvedSessionId);
    return resolvedSessionId;
  });
  const lastTrackedStepRef = useRef<number | null>(null);
  const lastPhotoCountRef = useRef(0);

  // URL-based category / product type
  useEffect(() => {
    if (resumeSessionId) return;
    const cat = searchParams.get("category");
    const product = searchParams.get("product");
    if (cat && ["classic", "family", "kids_dream", "pet"].includes(cat)) {
      setCategory(cat as OrderCategory);
      setStep(2); // Skip category selection
    }
    if (product && ["paint_by_numbers", "stencil_paint", "glitter_reveal"].includes(product)) {
      setProductType(product as ProductType);
    }
  }, [resumeSessionId, searchParams, setCategory, setProductType]);

  // Compute step meta based on category and product type
  const stepMeta = getStepMeta(order.category, order.productType);
  const totalSteps = stepMeta.length;
  const isAICategory = order.category !== "classic";
  const isStencilProduct = order.productType === "stencil_paint" || order.productType === "glitter_reveal";

  // Map logical steps to what we show
  // For classic: 1=Category, 2=Kit, 3=Upload, 4=Crop, 5=Style, 6=Confirm
  // For AI: 1=Category, 2=Kit, 3=Upload, 4=Crop, 5=AI, 6=Style, 7=Confirm

  useEffect(() => {
    void trackFunnelEvent({
      sessionId,
      eventName: "studio_session_started",
      metadata: {
        resumed: Boolean(resumeSessionId),
      },
    });
  }, [resumeSessionId, sessionId]);

  useEffect(() => {
    if (!resumeSessionId) {
      setRecoveringCart(false);
      return;
    }

    let active = true;
    const restoreCart = async () => {
      setRecoveringCart(true);
      const { data, error } = await supabase.functions.invoke("recover-cart", {
        body: {
          sessionId: resumeSessionId,
        },
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
          title: "Commande déjà finalisée",
          description: `Cette session a déjà été convertie en commande ${data.recoveredOrderRef}.`,
        });
        setRecoveringCart(false);
        return;
      }

      const cart = data?.cart;
      if (!cart) {
        setRecoveringCart(false);
        return;
      }

      const nextCategory = cart.category;
      if (nextCategory && ["classic", "family", "kids_dream", "pet"].includes(nextCategory)) {
        setCategory(nextCategory as OrderCategory);
      }

      const nextProductType = cart.productType;
      if (nextProductType && ["paint_by_numbers", "stencil_paint", "glitter_reveal"].includes(nextProductType)) {
        setProductType(nextProductType as ProductType);
      }

      if (isKitSize(cart.selectedSize)) {
        setSize(cart.selectedSize);
      }

      if (cart.stencilDetailLevel && ["bold", "medium", "fine"].includes(cart.stencilDetailLevel)) {
        setStencilDetailLevel(cart.stencilDetailLevel as StencilDetailLevel);
      }

      if (cart.glitterPalette && ["mercury", "mars", "neptune", "jupiter"].includes(cart.glitterPalette)) {
        setGlitterPalette(cart.glitterPalette as GlitterPalette);
      }

      if (cart.dreamJob) {
        setDreamJob(cart.dreamJob);
      }

      const recoveredContact: ContactInfo = {
        firstName: cart.contact?.firstName || "",
        lastName: "",
        phone: cart.contact?.phone || "",
        email: cart.contact?.email || "",
      };
      setContact(recoveredContact);
      setContactForm(recoveredContact);
      setDedicationText(normalizeDedicationDraft(cart.dedicationText || ""));

      const shouldRestartFromUpload = Boolean(cart.photoUploaded) || Number(cart.stepReached || 0) >= 3;
      const restoredStep = shouldRestartFromUpload
        ? 3
        : cart.selectedSize
        ? 3
        : nextCategory
        ? 2
        : 1;

      setStep(restoredStep);

      toast({
        title: "Commande restaurée",
        description: shouldRestartFromUpload
          ? "Vos choix ont été restaurés. Rechargez vos photos pour reprendre."
          : "Votre progression a été restaurée.",
      });

      void trackFunnelEvent({
        sessionId,
        eventName: "cart_recovered",
        category: nextCategory,
        step: restoredStep,
        metadata: {
          source: "resume_link",
          originalStep: cart.stepReached || null,
          photoUploaded: Boolean(cart.photoUploaded),
        },
      });

      setRecoveringCart(false);
    };

    void restoreCart();

    return () => {
      active = false;
    };
  }, [resumeSessionId, sessionId, setCategory, setProductType, setStencilDetailLevel, setGlitterPalette, setContact, setDedicationText, setDreamJob, setSize]);

  useEffect(() => {
    const photo = getPhoto(order);
    const save = async () => {
      await supabase.functions.invoke("save-abandoned-cart", {
        body: {
          session_id: sessionId,
          step_reached: step,
          kit_size: order.selectedSize || null,
          art_style: order.selectedStyle || null,
          photo_uploaded: !!photo,
          category: order.category,
          product_type: order.productType,
          stencil_detail_level: order.stencilDetailLevel || null,
          glitter_palette: order.glitterPalette || null,
          dream_job: order.dreamJob || null,
          dedication_text: order.dedicationText || null,
          contact_phone: contactForm.phone.replace(/\D/g, "").length === 8 ? contactForm.phone : null,
          contact_email: contactForm.email || null,
          contact_first_name: contactForm.firstName || null,
        },
      });
    };
    const timer = setTimeout(save, 2000);
    return () => clearTimeout(timer);
  }, [step, order.selectedSize, order.selectedStyle, order.photos, order.category, order.productType, order.stencilDetailLevel, order.glitterPalette, order.dreamJob, order.dedicationText, contactForm.phone, contactForm.email, contactForm.firstName, sessionId]);

  useEffect(() => {
    if (lastTrackedStepRef.current === step) return;
    lastTrackedStepRef.current = step;

    void trackFunnelEvent({
      sessionId,
      eventName: step === getConfirmStep() ? "checkout_viewed" : "step_viewed",
      category: order.category,
      step,
      metadata: {
        isAiCategory: isAICategory,
      },
    });
  }, [isAICategory, order.category, sessionId, step]);

  useEffect(() => {
    const uploadedCount = order.photos.filter(Boolean).length;
    if (uploadedCount < lastPhotoCountRef.current) {
      lastPhotoCountRef.current = uploadedCount;
      return;
    }
    if (uploadedCount <= 0 || uploadedCount === lastPhotoCountRef.current) return;

    lastPhotoCountRef.current = uploadedCount;
    void trackFunnelEvent({
      sessionId,
      eventName: "photo_uploaded",
      category: order.category,
      step,
      metadata: {
        uploadedCount,
      },
    });
  }, [order.category, order.photos, sessionId, step]);

  const validateCoupon = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", promoCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (!data) { setPromoError("Code invalide"); setPromoLoading(false); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError("Code expiré"); setPromoLoading(false); return; }
    if (data.max_uses && data.used_count >= data.max_uses) { setPromoError("Code épuisé"); setPromoLoading(false); return; }
    const price = order.selectedSize ? PRICING[order.selectedSize] : 0;
    if (data.min_order > price) { setPromoError(`Min. commande: ${data.min_order} DT`); setPromoLoading(false); return; }

    setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
    void trackFunnelEvent({
      sessionId,
      eventName: "coupon_applied",
      category: order.category,
      step,
      metadata: {
        code: data.code,
      },
    });
    setPromoLoading(false);
  };

  const getDiscount = () => {
    if (!appliedCoupon || !order.selectedSize) return 0;
    const price = PRICING[order.selectedSize];
    if (appliedCoupon.discount_type === "percentage") return Math.round(price * appliedCoupon.discount_value / 100);
    return Math.min(appliedCoupon.discount_value, price);
  };

  const getAddOnsTotal = () =>
    order.addOns.reduce((sum, id) => {
      const addon = ADD_ONS.find((a) => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);

  const getFinalPrice = () => {
    if (!order.selectedSize) return 0;
    return PRICING[order.selectedSize] - getDiscount() + getAddOnsTotal();
  };

  const goToStep = (newStep: number) => {
    setSlideDir(newStep > step ? "right" : "left");
    setAnimKey((k) => k + 1);
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Step 4 (upload): image selected → go to step 5 (crop) */
  const handleImageSelected = useCallback((dataUrl: string) => {
    setPhoto(dataUrl, 0);
    goToStep(5);
  }, [setPhoto]);

  /* Step 4: crop complete → process → go to next step */
  const handleCropComplete = useCallback(async (croppedArea: Area) => {
    if (!order.selectedSize) return;
    setCroppedArea(croppedArea);
    setProcessing(true);

    const photo = order.aiGeneratedUrl || getPhoto(order);
    const imgKitSize = resolveProcessingKitSize(order.selectedSize);

    try {
      if (isStencilProduct) {
        // Process all 3 detail levels in parallel for stencil products
        const detailLevels: StencilDetailLevel[] = ["bold", "medium", "fine"];
        const results = await Promise.all(
          detailLevels.map((level) => processStencilImage(photo, croppedArea, imgKitSize, level))
        );
        const previewMap: Partial<Record<StencilDetailLevel, string>> = {};
        results.forEach((r) => { previewMap[r.detailLevel] = r.dataUrl; });
        setStencilPreviews(previewMap);
        const activeDetailLevel = order.stencilDetailLevel || "medium";
        if (!order.stencilDetailLevel) {
          setStencilDetailLevel(activeDetailLevel);
        }
        setStylePreviewUrl(previewMap[activeDetailLevel] || results[0]?.dataUrl || "");
      } else {
        const results = await processImage(photo, croppedArea, imgKitSize);
        const allPreviews: typeof previews = orderStyleResults(results).map((result) => ({
          style: result.styleKey,
          results: [result],
          previewUrl: result.dataUrl,
        }));
        setPreviews(allPreviews);
      }

      setProcessing(false);
      void trackFunnelEvent({
        sessionId,
        eventName: "crop_completed",
        category: order.category,
        step: getCropStep(),
        metadata: {
          selectedSize: order.selectedSize,
          fromAi: Boolean(order.aiGeneratedUrl),
          productType: order.productType,
        },
      });
      goToStep(isAICategory ? 7 : 6);
    } catch (err) {
      console.error("Processing failed:", err);
      setProcessing(false);
    }
  }, [order.photos, order.aiGeneratedUrl, order.selectedSize, order.category, order.productType, order.stencilDetailLevel, isStencilProduct, isAICategory, setCroppedArea, setStencilDetailLevel, setStylePreviewUrl]);

  /* AI Generation */
  const handleAIGenerate = async () => {
    setAiGenerating(true);
    try {
      const images = order.photos.filter(Boolean);
      void trackFunnelEvent({
        sessionId,
        eventName: "ai_generation_requested",
        category: order.category,
        step: getAIStep(),
        metadata: {
          imageCount: images.length,
        },
      });

      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          category: order.category,
          images,
          dreamJob: order.dreamJob,
          sessionId,
          requestedBy: "studio",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const imageUrl = data.imageUrl;
      setAiGeneratedUrl(imageUrl, data.generationRunId);
      void trackFunnelEvent({
        sessionId,
        eventName: "ai_generation_succeeded",
        category: order.category,
        step: getAIStep(),
        metadata: {
          generationRunId: data.generationRunId || null,
        },
      });
      toast({ title: "Image IA générée ✨", description: "Votre création est prête ! Passez au recadrage." });
      // AI: 1=Cat, 2=Kit, 3=Upsell, 4=Upload, 5=AI, 6=Crop, 7=Style, 8=Confirm
      goToStep(6); // Go to crop after AI
    } catch (err: any) {
      console.error("AI generation failed:", err);
      void trackFunnelEvent({
        sessionId,
        eventName: "ai_generation_failed",
        category: order.category,
        step: getAIStep(),
        metadata: {
          message: err?.message || "unknown_error",
        },
      });
      toast({ title: "Erreur", description: err.message || "La génération IA a échoué. Réessayez.", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length > 8) return;
    const formatted = formatPhone(val);
    setContactForm({ ...contactForm, phone: formatted });
    setPhoneError(digits.length > 0 && digits.length < 8 ? (t.studio.step4Phone?.invalid || "Numéro invalide (8 chiffres)") : "");
  };

  const handleConfirm = async () => {
    setSubmittingOrder(true);

    try {
      const result = await confirmOrder({
        contact: contactForm,
        shipping: shippingForm,
        isGift,
        giftMessage,
        dedicationText: order.dedicationText,
        couponCode: appliedCoupon?.code || null,
        sessionId,
      });

      void trackFunnelEvent({
        sessionId,
        eventName: "order_confirmed",
        category: order.category,
        step: getConfirmStep(),
        orderRef: result.orderRef,
        metadata: {
          selectedSize: order.selectedSize,
          selectedStyle: order.selectedStyle,
          usedCoupon: appliedCoupon?.code || null,
          hasAiAsset: Boolean(order.aiGeneratedUrl),
        },
      });

      if (!result.emailSent && contactForm.email) {
        toast({
          title: "Commande confirmée",
          description: "La commande a été enregistrée, mais l'email de confirmation n'a pas pu être envoyé.",
        });
      }

      navigate("/confirmation");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de confirmer la commande.";
      const friendly =
        message === "COUPON_INVALID" ? "Ce code promo n'est plus valide." :
        message === "COUPON_EXPIRED" ? "Ce code promo a expiré." :
        message === "COUPON_EXHAUSTED" ? "Ce code promo n'est plus disponible." :
        message === "COUPON_MIN_ORDER" ? "Le montant minimum pour ce code promo n'est pas atteint." :
        message === "ORDER_PAYLOAD_TOO_LARGE" ? "Les photos sont trop lourdes. Essayez des images de plus petite taille." :
        message === "Invalid JSON body" ? "Les photos envoyées sont invalides. Réessayez avec des images plus légères." :
        message === "Missing valid contact details" ? "Vérifiez votre prénom, nom et numéro de téléphone." :
        message === "Missing shipping details" ? "Ajoutez l'adresse, la ville et le gouvernorat de livraison." :
        message === "ORDER_INVALID_SIZE" || message === "Missing selected size" || message === "Order is missing size" ? "Choisissez une taille avant de confirmer." :
        message === "ORDER_INVALID_STYLE" || message === "Missing selected style for paint by numbers" || message === "Order is missing style" || message === "Missing selected size or style" ? "Choisissez un style avant de confirmer." :
        message;

      setPromoError(message.startsWith("COUPON_") ? friendly : "");
      toast({
        title: "Erreur",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const estimatedDelivery = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString(t.lang === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "long" });
  };

  const selectionSummaryTitle = order.productType === "paint_by_numbers" ? "Style" : order.productType === "stencil_paint" ? "Détail" : "Palette";
  const selectionSummaryValue = order.productType === "paint_by_numbers"
    ? (order.selectedStyle ? getStyleLabel(t, order.selectedStyle) : "-")
    : order.productType === "stencil_paint"
    ? (order.stencilDetailLevel ? STENCIL_DETAIL_META[order.stencilDetailLevel].label : "-")
    : (order.glitterPalette ? GLITTER_PALETTES[order.glitterPalette].name : "-");

  const isConfirmValid = contactForm.firstName && contactForm.lastName &&
    contactForm.phone.replace(/\D/g, "").length === 8 &&
    shippingForm.address && shippingForm.city && shippingForm.governorate;

  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const slideClass = slideDir === "right"
    ? "animate-[slide-in-right_0.35s_ease-out]"
    : "animate-[slide-in-left_0.35s_ease-out]";

  // Classic: 1=Cat, 2=Kit, 3=Upsell, 4=Upload, 5=Crop,  6=Style, 7=Confirm
  // AI:      1=Cat, 2=Kit, 3=Upsell, 4=Upload, 5=AI,   6=Crop,  7=Style, 8=Confirm
  const getKitStep = () => 2;
  const getUpsellStep = () => 3;
  const getUploadStep = () => 4;
  const getAIStep = () => 5; // Only for AI categories
  const getCropStep = () => isAICategory ? 6 : 5;
  const getStyleStep = () => isAICategory ? 7 : 6;
  const getConfirmStep = () => isAICategory ? 8 : 7;

  const showHero = !processing && step !== getCropStep() && step !== getAIStep();

  const photo = getPhoto(order);
  const photoForProcessing = order.aiGeneratedUrl || photo;
  const hasHiddenSelectedKit = Boolean(order.selectedSize && !isPublicKit(order.selectedSize));
  const hiddenSelectedKit = hasHiddenSelectedKit && order.selectedSize
    ? getKitConfig(order.selectedSize)
    : null;

  if (recoveringCart) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Restauration de votre commande...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 studio-bg">
        {/* ─── Hero Banner ─── */}
        {showHero && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
            <div className="container mx-auto px-4 pt-10 pb-6 relative">
              <div className="text-center mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Studio créatif</p>
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Créez votre chef-d'œuvre
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
                  {CATEGORY_META[order.category].description}
                </p>
              </div>
              <StepIndicator currentStep={step} totalSteps={totalSteps} stepMeta={stepMeta} onStepClick={(s) => goToStep(s)} />
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div key={animKey} className={showHero ? slideClass : ""}>

              {/* ═══════════════════════════════════════════
                  STEP 1: Choose Category
                 ═══════════════════════════════════════════ */}
              {step === 1 && (
                <div className="space-y-10">
                  <div>
                    <SectionHeading
                      title="Choisissez votre technique"
                      subtitle="Trois façons uniques de transformer votre photo en œuvre d'art."
                    />
                    <ProductTypePicker selected={order.productType} onSelect={(type) => setProductType(type)} />
                  </div>

                  <div>
                    <SectionHeading
                      title="Choisissez votre sujet"
                      subtitle="Qui sera au cœur de votre création ?"
                    />
                    <CategorySelector selected={order.category} onSelect={(cat) => setCategory(cat)} />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => goToStep(2)}
                      className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                      size="lg"
                    >
                      Continuer <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  STEP 2: Choose Kit Size
                 ═══════════════════════════════════════════ */}
              {step === getKitStep() && (
                <div className="space-y-8">
                  <SectionHeading
                    title="Choisissez votre format"
                    subtitle="Même qualité Helma, seule la taille change."
                  />

                  {hasHiddenSelectedKit && hiddenSelectedKit && (
                    <div className="rounded-2xl border border-green-200 bg-green-50/70 px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-foreground/80">
                          Session restaurée avec <span className="font-semibold">{hiddenSelectedKit.displayLabel}</span>. Vous pouvez basculer vers 30×40, 40×50 ou 40×60.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setSize(DEFAULT_PUBLIC_KIT)} className="rounded-full border-green-300 text-green-700 hover:bg-green-100">
                          Passer en {getKitConfig(DEFAULT_PUBLIC_KIT).shortLabel}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Visual size comparison ── */}
                  <div className="flex items-end justify-center gap-8 pb-2 pt-4">
                    {PUBLIC_STUDIO_KITS.map((kit) => {
                      const isSelected = order.selectedSize === kit.id;
                      const scale = 2.0;
                      const w = Math.round(kit.widthCm * scale);
                      const h = Math.round(kit.heightCm * scale);

                      return (
                        <button
                          key={kit.id}
                          type="button"
                          onClick={() => setSize(kit.id)}
                          className={`group flex flex-col items-center gap-3 transition-all duration-500 ${
                            isSelected ? "scale-105" : "scale-95 opacity-50 hover:opacity-75"
                          }`}
                        >
                          <div
                            className={`rounded-md border-2 transition-all duration-500 ${
                              isSelected
                                ? "border-primary/50 bg-primary/[0.06] shadow-xl shadow-primary/10"
                                : "border-border bg-muted/30 shadow-sm"
                            }`}
                            style={{ width: w, height: h }}
                          >
                            <div className="flex h-full items-center justify-center">
                              <span className={`text-sm font-bold transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                {kit.shortLabel}
                              </span>
                            </div>
                          </div>
                          <span className={`text-xs font-medium transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {kit.dimensionsLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Kit cards ── */}
                  <div className="grid gap-4 lg:grid-cols-3">
                    {PUBLIC_STUDIO_KITS.map((kit) => {
                      const isSelected = order.selectedSize === kit.id;
                      const toneStyles = KIT_TONE_STYLES[kit.tone];
                      const BadgeIcon = kit.badge ? BADGE_ICON_COMPONENTS[kit.badge.icon] : null;
                      const savings = getKitSavings(kit.id);

                      return (
                        <button
                          key={kit.id}
                          type="button"
                          onClick={() => setSize(kit.id)}
                          className={`group relative overflow-hidden rounded-3xl border-2 p-5 text-left transition-all duration-300 hover:shadow-lg sm:p-6 ${
                            isSelected
                              ? "border-primary bg-primary/[0.03] shadow-lg"
                              : "border-border/60 bg-card hover:border-primary/30"
                          }`}
                        >
                          {/* Top row: name + badge + selection indicator */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl font-bold text-foreground">{kit.shortLabel}</span>
                              {BadgeIcon && kit.badge && (
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${toneStyles.badge}`}>
                                  <BadgeIcon className="h-3 w-3" />
                                  {kit.badge.label}
                                </span>
                              )}
                            </div>
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected ? "border-primary bg-primary" : "border-border"
                            }`}>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </div>
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground">{kit.headline}</p>

                          {/* Specs row */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {[
                              { label: kit.hoursLabel, icon: "⏱" },
                              { label: kit.colorsLabel + " couleurs", icon: "🎨" },
                              { label: kit.displayDifficultyLabel, icon: "📐" },
                            ].map((spec) => (
                              <span key={spec.label} className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground/80">
                                {spec.icon} {spec.label}
                              </span>
                            ))}
                          </div>

                          {/* Price */}
                          <div className="mt-5 flex items-end justify-between gap-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-foreground">{kit.price}</span>
                              <span className="text-sm font-medium text-muted-foreground">DT</span>
                              <span className="ml-1 text-sm text-muted-foreground line-through">{kit.originalPrice} DT</span>
                              {savings > 0 && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">-{savings}%</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Included perks ── */}
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {["Toile numérotée", "Peintures assorties", "PDF premium", "Viewer interactif", "Livraison offerte"].map((perk) => (
                      <span key={perk} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        {perk}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(1)} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(3)}
                      disabled={!order.selectedSize}
                      className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                      size="lg"
                    >
                      Continuer <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {/* ═══════════════════════════════════════════
                  STEP 3: Upsell / Extras
                 ═══════════════════════════════════════════ */}
              {step === getUpsellStep() && (
                <div className="space-y-8">
                  <SectionHeading
                    title="Complétez votre kit"
                    subtitle="Optionnel — ajoutez des extras pour une expérience encore plus complète."
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    {getAvailableAddOns(order.productType).map((addon) => {
                      const isSelected = order.addOns.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => {
                            const newAddOns = isSelected
                              ? order.addOns.filter((id) => id !== addon.id)
                              : [...order.addOns, addon.id];
                            setAddOns(newAddOns);
                          }}
                          className={`group relative rounded-3xl border-2 p-5 text-left transition-all duration-300 hover:shadow-lg ${
                            isSelected
                              ? "border-primary bg-primary/[0.03] shadow-lg"
                              : "border-border/60 bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <span className="text-3xl">{addon.icon}</span>
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected ? "border-primary bg-primary" : "border-border"
                            }`}>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </div>
                          </div>
                          <h3 className="font-semibold text-sm text-foreground mb-1">{addon.label}</h3>
                          <p className="text-xs text-muted-foreground mb-4">{addon.description}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-primary">+{addon.price}</span>
                            <span className="text-sm text-muted-foreground">DT</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {order.addOns.length > 0 && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">
                            {order.addOns.length} extra{order.addOns.length > 1 ? "s" : ""} sélectionné{order.addOns.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          +{ADD_ONS.filter((a) => order.addOns.includes(a.id)).reduce((s, a) => s + a.price, 0)} DT
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(getKitStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(getUploadStep())}
                      className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                      size="lg"
                    >
                      {order.addOns.length > 0
                        ? `Continuer avec ${order.addOns.length} extra${order.addOns.length > 1 ? "s" : ""}`
                        : "Continuer sans extras"}{" "}
                      <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  STEP 4: Upload Photo(s)
                 ═══════════════════════════════════════════ */}
              {step === getUploadStep() && !processing && (
                <div>
                  <SectionHeading
                    title={order.category === "family" ? "Importez vos 2 photos" : "Importez votre photo"}
                    subtitle={
                      order.category === "family"
                        ? "Ajoutez les deux photos que l'IA va réunir en une scène unique."
                        : order.category === "kids_dream"
                        ? "Ajoutez la photo de votre enfant et choisissez son rêve."
                        : order.category === "pet"
                        ? "Ajoutez la photo de votre animal pour son portrait royal."
                        : "Choisissez la photo que vous souhaitez transformer en peinture par numéros."
                    }
                  />

                  {order.category === "classic" ? (
                    /* Classic: single upload */
                    <>
                      {photo ? (
                        <div className="space-y-6">
                          <div className="overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg bg-card p-3 max-w-lg mx-auto">
                            <img src={photo} alt="Uploaded" className="w-full max-h-96 object-contain rounded-lg animate-scale-in" />
                          </div>
                          <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => { setPhoto("", 0); removePhoto(0); setPreviews([]); }} className="gap-2">
                              <Camera className="h-4 w-4" />
                              Changer la photo
                            </Button>
                            <Button onClick={() => goToStep(getCropStep())} className="gap-2 btn-premium text-primary-foreground border-0 px-8">
                              Continuer <NextIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-xl mx-auto">
                          <UploadZone onImageSelected={handleImageSelected} />
                        </div>
                      )}
                    </>
                  ) : (
                    /* Multi-photo or AI categories */
                    <div className="space-y-6">
                      <MultiUploadZone
                        photos={order.photos}
                        maxPhotos={CATEGORY_META[order.category].photosNeeded}
                        onPhotoAdded={(dataUrl, idx) => setPhoto(dataUrl, idx)}
                        onPhotoRemoved={(idx) => removePhoto(idx)}
                        labels={
                          order.category === "family"
                            ? ["Personne 1", "Personne 2"]
                            : order.category === "kids_dream"
                            ? ["Photo de l'enfant"]
                            : ["Photo de votre animal"]
                        }
                      />

                      {/* Dream job picker for kids_dream */}
                      {order.category === "kids_dream" && (
                        <div className="mt-6">
                          <SectionHeading
                            title="Choisissez le rêve"
                            subtitle="Quel métier rêve votre enfant ?"
                          />
                          <DreamJobPicker selected={order.dreamJob} onSelect={(job) => setDreamJob(job)} />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 flex justify-between">
                    <Button variant="outline" onClick={() => goToStep(getUpsellStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    {order.category !== "classic" && (
                      <Button
                        onClick={() => goToStep(getAIStep())}
                        disabled={
                          order.photos.filter(Boolean).length < CATEGORY_META[order.category].photosNeeded ||
                          (order.category === "kids_dream" && !order.dreamJob)
                        }
                        className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                        size="lg"
                      >
                        Continuer <NextIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  STEP 4 (AI categories): AI Generation
                 ═══════════════════════════════════════════ */}
              {isAICategory && step === getAIStep() && !processing && (
                <div>
                  <SectionHeading
                    title="Magie de l'IA ✨"
                    subtitle={
                      order.category === "family"
                        ? "L'IA va réunir vos deux photos en une scène unique et émouvante."
                        : order.category === "kids_dream"
                        ? `L'IA va transformer votre enfant en ${DREAM_JOBS.find(j => j.key === order.dreamJob)?.label || "super-héros"}.`
                        : "L'IA va transformer votre animal en portrait royal renaissance."
                    }
                  />

                  <div className="text-center space-y-6">
                    {/* Preview of uploaded photos */}
                    <div className="flex justify-center gap-4">
                      {order.photos.filter(Boolean).map((p, i) => (
                        <div key={i} className="w-32 h-32 rounded-xl overflow-hidden border-2 border-border shadow-md">
                          <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>

                    {order.aiGeneratedUrl ? (
                      <div className="space-y-4">
                        <div className="overflow-hidden rounded-xl border-2 border-primary/30 shadow-xl bg-card p-3 max-w-md mx-auto">
                          <img src={order.aiGeneratedUrl} alt="AI Generated" className="w-full max-h-80 object-contain rounded-lg" />
                        </div>
                        <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Image générée avec succès !
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button variant="outline" onClick={handleAIGenerate} disabled={aiGenerating} className="gap-2">
                            <Wand2 className="h-4 w-4" /> Régénérer
                          </Button>
                          <Button onClick={() => goToStep(getCropStep())} className="gap-2 btn-premium text-primary-foreground border-0 px-8">
                            Continuer au recadrage <NextIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button
                          onClick={handleAIGenerate}
                          disabled={aiGenerating}
                          className="gap-2 btn-premium text-primary-foreground border-0 px-10 h-14 text-base font-semibold shadow-lg"
                          size="lg"
                        >
                          {aiGenerating ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Génération en cours...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-5 w-5" />
                              Générer avec l'IA
                            </>
                          )}
                        </Button>
                        {aiGenerating && (
                          <p className="text-xs text-muted-foreground animate-pulse">
                            Cela peut prendre 15-30 secondes...
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-start">
                    <Button variant="outline" onClick={() => goToStep(getUploadStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  CROP Step
                 ═══════════════════════════════════════════ */}
              {step === getCropStep() && !processing && order.selectedSize && (
                <CropScreen
                  imageSrc={photoForProcessing}
                  kitSize={resolveProcessingKitSize(order.selectedSize)}
                  onCropComplete={handleCropComplete}
                  onBack={() => goToStep(isAICategory ? getAIStep() : getUploadStep())}
                />
              )}

              {processing && <ProcessingScreen />}

              {/* ═══════════════════════════════════════════
                  STYLE / DETAIL / PALETTE Step
                 ═══════════════════════════════════════════ */}
              {step === getStyleStep() && (
                <div>
                  {order.productType === "stencil_paint" && (
                    <>
                      <SectionHeading
                        title="Choisissez le niveau de détail"
                        subtitle="Plus de détail = plus de finesse dans les contours du pochoir."
                      />
                      <StencilDetailPicker
                        selected={order.stencilDetailLevel}
                        onSelect={(level) => { setStencilDetailLevel(level); setStylePreviewUrl(stencilPreviews[level] || ""); }}
                        previewDataUrls={stencilPreviews}
                      />
                      <div className="mt-8 flex gap-3">
                        <Button variant="outline" onClick={() => goToStep(getCropStep())} className="gap-2">
                          <BackIcon className="h-4 w-4" /> {t.studio.back}
                        </Button>
                        <Button onClick={() => goToStep(getConfirmStep())} disabled={!order.stencilDetailLevel} className="flex-1 gap-2 btn-premium text-primary-foreground border-0">
                          {t.studio.next} <NextIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}

                  {order.productType === "glitter_reveal" && (
                    <>
                      <SectionHeading
                        title="Choisissez votre palette de paillettes"
                        subtitle="Quelle ambiance souhaitez-vous pour votre révélation ?"
                      />
                      <GlitterPalettePicker
                        selected={order.glitterPalette}
                        onSelect={(palette) => setGlitterPalette(palette)}
                      />
                      <div className="mt-8 flex gap-3">
                        <Button variant="outline" onClick={() => goToStep(getCropStep())} className="gap-2">
                          <BackIcon className="h-4 w-4" /> {t.studio.back}
                        </Button>
                        <Button onClick={() => goToStep(getConfirmStep())} disabled={!order.glitterPalette} className="flex-1 gap-2 btn-premium text-primary-foreground border-0">
                          {t.studio.next} <NextIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}

                  {order.productType === "paint_by_numbers" && (
                    <>
                      <SectionHeading
                        title={t.studio.step2.title}
                        subtitle={t.studio.step2.subtitle}
                      />
                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                        {previews.map((p, i) => {
                          const isSelected = order.selectedStyle === p.style;
                          const styleName = getStyleLabel(t, p.style);
                          const styleDesc = getStyleDescription(t, p.style);
                          const styleMeta = getStyleDefinition(p.style);
                          const palette = p.results[0]?.palette;
                          if (!palette) return null;

                          return (
                            <div key={p.style} style={{ animationDelay: `${i * 100}ms` }}>
                              <StylePreviewCard
                                badgeLabel={styleMeta.badgeLabel}
                                colorCountLabel={`${palette.colors.length} ${t.viewer.colors}`}
                                isSelected={isSelected}
                                onSelect={() => setStyle(p.style, p.previewUrl)}
                                palette={palette}
                                previewUrl={p.previewUrl}
                                styleDescription={styleDesc}
                                styleName={styleName}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-8 flex gap-3">
                        <Button variant="outline" onClick={() => goToStep(getCropStep())} className="gap-2">
                          <BackIcon className="h-4 w-4" /> {t.studio.back}
                        </Button>
                        <Button onClick={() => goToStep(getConfirmStep())} disabled={!order.selectedStyle} className="flex-1 gap-2 btn-premium text-primary-foreground border-0">
                          {t.studio.next} <NextIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  CONFIRM Step
                 ═══════════════════════════════════════════ */}
              {step === getConfirmStep() && (
                <div>
                  <SectionHeading
                    title="Finalisez votre commande"
                    subtitle="Remplissez vos coordonnées pour recevoir votre kit."
                  />

                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Left: forms */}
                    <div className="space-y-6">
                      {/* Contact */}
                      <div className="rounded-xl border bg-card p-6">
                        <div className="mb-5 flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-bold uppercase tracking-[0.1em] section-gold-line pb-2">Contact</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-semibold">
                              Prénom {contactForm.firstName && <Check className="h-3 w-3 text-primary" />}
                            </Label>
                            <Input value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} className={contactForm.firstName ? "border-primary/30 focus:border-primary" : ""} />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-semibold">
                              Nom {contactForm.lastName && <Check className="h-3 w-3 text-primary" />}
                            </Label>
                            <Input value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} className={contactForm.lastName ? "border-primary/30 focus:border-primary" : ""} />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-semibold">
                              Téléphone {contactForm.phone.replace(/\D/g, "").length === 8 && <Check className="h-3 w-3 text-primary" />}
                            </Label>
                            <div className="flex gap-2">
                              <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground shrink-0">+216</div>
                              <Input value={contactForm.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="XX XXX XXX" className={`flex-1 ${phoneError ? "border-destructive" : contactForm.phone.replace(/\D/g, "").length === 8 ? "border-primary/30" : ""}`} />
                            </div>
                            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Email (optionnel)</Label>
                            <Input value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      {/* Shipping */}
                      <div className="rounded-xl border bg-card p-6">
                        <div className="mb-5 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-bold uppercase tracking-[0.1em] section-gold-line pb-2">Adresse de livraison</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-semibold">
                              Adresse {shippingForm.address && <Check className="h-3 w-3 text-primary" />}
                            </Label>
                            <Input value={shippingForm.address} onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })} className={shippingForm.address ? "border-primary/30" : ""} />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs font-semibold">
                                Ville {shippingForm.city && <Check className="h-3 w-3 text-primary" />}
                              </Label>
                              <Input value={shippingForm.city} onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })} className={shippingForm.city ? "border-primary/30" : ""} />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs font-semibold">
                                Gouvernorat {shippingForm.governorate && <Check className="h-3 w-3 text-primary" />}
                              </Label>
                              <Select value={shippingForm.governorate} onValueChange={(val) => setShippingForm({ ...shippingForm, governorate: val })}>
                                <SelectTrigger><SelectValue placeholder="Gouvernorat" /></SelectTrigger>
                                <SelectContent>
                                  {TUNISIAN_GOVERNORATES.map((gov) => (
                                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold">Code postal</Label>
                              <Input value={shippingForm.postalCode} onChange={(e) => setShippingForm({ ...shippingForm, postalCode: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gift mode */}
                      <div className="rounded-xl border bg-card p-6">
                        <div className="flex items-center gap-3">
                          <Checkbox id="gift-mode" checked={isGift} onCheckedChange={(checked) => setIsGift(checked === true)} />
                          <Label htmlFor="gift-mode" className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                            <Gift className="h-4 w-4 text-primary" /> C'est un cadeau
                          </Label>
                        </div>
                        {isGift && (
                          <div className="mt-4 animate-fade-in">
                            <Label className="text-xs font-semibold">Message cadeau</Label>
                            <Textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Votre message personnalisé..." className="mt-2" rows={3} />
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border bg-card p-6">
                        <div className="mb-4 flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-bold uppercase tracking-[0.1em] section-gold-line pb-2">Dedication</h3>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Short line for the guide or viewer (optional)</Label>
                          <Textarea
                            value={order.dedicationText}
                            onChange={(e) => setDedicationText(normalizeDedicationDraft(e.target.value))}
                            placeholder="I love you • 14.02.2026"
                            rows={2}
                          />
                          <p className="text-xs text-muted-foreground">
                            {order.dedicationText.length}/{DEDICATION_MAX_LENGTH} characters. Best for names, dates, or a short message.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Premium Order Summary */}
                    <div className="lg:sticky lg:top-24 space-y-4">
                      <div className="rounded-xl border overflow-hidden glass-summary shadow-lg">
                        <div className="bg-primary/5 px-5 py-3 border-b border-border">
                          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                            Votre commande
                          </h3>
                        </div>
                        <div className="p-5 space-y-4">
                          {/* Category badge */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{CATEGORY_META[order.category].icon}</span>
                            <span className="text-xs font-semibold text-muted-foreground">{CATEGORY_META[order.category].label}</span>
                          </div>

                          {order.stylePreviewUrl && (
                            <div className="overflow-hidden rounded-lg border-2 border-primary/10 shadow-sm">
                              <img src={order.stylePreviewUrl} alt="Preview" className="w-full object-contain" />
                            </div>
                          )}

                          <div className="space-y-2.5">
                            {order.dedicationText && (
                              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Dedication</p>
                                <p className="mt-1 text-sm font-medium">{order.dedicationText}</p>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{selectionSummaryTitle}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectionSummaryValue}</span>
                                <button onClick={() => goToStep(getStyleStep())} className="text-primary hover:text-primary/70 transition-colors"><Edit3 className="h-3 w-3" /></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Taille</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getKitDisplayLabel(order.selectedSize)}</span>
                                <button onClick={() => goToStep(getKitStep())} className="text-primary hover:text-primary/70 transition-colors"><Edit3 className="h-3 w-3" /></button>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Livraison</span>
                              <span className="font-medium text-primary">Gratuite</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Livraison estimée</span>
                              <span className="font-medium text-xs">{estimatedDelivery()}</span>
                            </div>
                            {order.addOns.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {ADD_ONS.filter((a) => order.addOns.includes(a.id)).map((addon) => (
                                  <div key={addon.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{addon.icon} {addon.label}</span>
                                    <span className="font-medium">+{addon.price} DT</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Promo code */}
                          <div className="space-y-2">
                            {appliedCoupon ? (
                              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-mono font-bold text-primary">{appliedCoupon.code}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} DT`}
                                  </Badge>
                                </div>
                                <button onClick={() => { setAppliedCoupon(null); setPromoCode(""); }} className="text-muted-foreground hover:text-destructive">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  value={promoCode}
                                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                                  placeholder="Code promo"
                                  className="font-mono text-sm h-9"
                                  onKeyDown={e => e.key === "Enter" && validateCoupon()}
                                />
                                <Button variant="outline" size="sm" onClick={validateCoupon} disabled={promoLoading || !promoCode} className="shrink-0 gap-1 h-9">
                                  <Tag className="h-3 w-3" /> Appliquer
                                </Button>
                              </div>
                            )}
                            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                          </div>

                          <hr className="border-border" />

                          {getDiscount() > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Sous-total</span>
                              <span className="font-medium">{order.selectedSize && PRICING[order.selectedSize]} DT</span>
                            </div>
                          )}
                          {getDiscount() > 0 && (
                            <div className="flex justify-between text-sm text-primary">
                              <span>Réduction</span>
                              <span className="font-bold">-{getDiscount()} DT</span>
                            </div>
                          )}

                          <div className="rounded-lg bg-primary/5 p-3 flex justify-between items-baseline">
                            <span className="text-sm font-bold">Total</span>
                            <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                              {getFinalPrice()} <span className="text-sm">DT</span>
                            </span>
                          </div>

                          <div className="space-y-2">
                            {[
                              { icon: CreditCard, label: "Paiement à la livraison" },
                              { icon: Truck, label: "Livraison gratuite" },
                              { icon: ShieldCheck, label: "Satisfaction garantie" },
                            ].map((trust, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <trust.icon className="h-3.5 w-3.5 text-primary/60" />
                                <span>{trust.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleConfirm}
                        disabled={!isConfirmValid || submittingOrder}
                        className="w-full btn-premium text-primary-foreground border-0 gap-2 hidden lg:flex h-12 text-base font-semibold"
                        size="lg"
                      >
                        {submittingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        {submittingOrder ? "Confirmation..." : "Confirmer la commande"}
                      </Button>
                    </div>
                  </div>

                  {/* Mobile: back + confirm */}
                  <div className="mt-8 flex gap-3 lg:hidden">
                    <Button variant="outline" onClick={() => goToStep(getStyleStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> {t.studio.back}
                    </Button>
                    <Button onClick={handleConfirm} disabled={!isConfirmValid || submittingOrder} className="flex-1 btn-premium text-primary-foreground border-0 gap-2 h-12 text-base font-semibold" size="lg">
                      {submittingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                      {submittingOrder ? "Confirmation..." : "Confirmer la commande"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <SaveProgressModal open={showSaveModal} onOpenChange={setShowSaveModal} step={step} />
    </div>
  );
};

export default Studio;






















