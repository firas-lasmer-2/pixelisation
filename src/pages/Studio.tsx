import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Area } from "react-easy-crop";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { useOrder, getPhoto, PRICING, ORIGINAL_PRICING, SIZE_LABELS, TUNISIAN_GOVERNORATES, CATEGORY_META, DREAM_JOBS, type KitSize, type ArtStyle, type ContactInfo, type ShippingInfo, type OrderCategory } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { UploadZone } from "@/components/UploadZone";
import { CategorySelector } from "@/components/studio/CategorySelector";
import { DreamJobPicker } from "@/components/studio/DreamJobPicker";
import { MultiUploadZone } from "@/components/studio/MultiUploadZone";
import { SaveProgressModal } from "@/components/shared/SaveProgressModal";
import { CropScreen } from "@/components/CropScreen";
import { ProcessingScreen } from "@/components/ProcessingScreen";
import { processImage, ProcessingResult, type KitSize as ImgKitSize } from "@/lib/imageProcessing";
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
  Clock, Layers, Star, Gift, Edit3,
  Paintbrush, BookOpen, Grid3X3, Crown, Leaf, Award, Upload, Tag, X, Wand2, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { STORAGE_KEYS } from "@/lib/brand";
import { trackFunnelEvent } from "@/lib/funnel";

/* ─── Kit size → image processing key mapping ─── */
const STORE_TO_IMG: Record<KitSize, ImgKitSize> = {
  stamp_kit_40x50: "40x50",
  stamp_kit_30x40: "30x40",
  stamp_kit_A4: "A4",
};

/* ─── 6 Steps (added Category as step 0) ─── */
const getStepMeta = (category: OrderCategory) => {
  const base = [
    { icon: Sparkles, label: "Catégorie" },
    { icon: Package, label: "Kit" },
    { icon: Upload, label: "Photo" },
    { icon: Camera, label: "Recadrage" },
    { icon: Palette, label: "Style" },
    { icon: CheckCircle, label: "Confirmation" },
  ];
  // For AI categories, insert AI step before style
  if (category !== "classic") {
    base.splice(4, 0, { icon: Wand2, label: "IA Magie" });
  }
  return base;
};

/* ─── Premium Step Indicator ─── */
function StepIndicator({ currentStep, totalSteps, stepMeta, onStepClick }: { currentStep: number; totalSteps: number; stepMeta: { icon: any; label: string }[]; onStepClick?: (step: number) => void }) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-[6%] right-[6%] h-px bg-border z-0" />
        <div
          className="absolute top-5 left-[6%] h-px bg-primary z-0 transition-all duration-700 ease-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 88}%` }}
        />

        {stepMeta.map((meta, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          const isClickable = isDone && onStepClick;

          return (
            <div
              key={i}
              onClick={() => isClickable && onStepClick(stepNum)}
              className={`relative z-10 flex flex-col items-center gap-2 ${isClickable ? "cursor-pointer" : ""}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 ${
                  isDone
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "border-primary bg-background text-primary step-gold-pulse"
                    : "border-muted bg-background text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold transition-colors text-center hidden sm:block ${
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                }`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Size card config ─── */
const SIZE_CARDS: {
  key: KitSize;
  accent: string;
  accentClass: string;
  icon: typeof Crown;
  badge?: { label: string; icon: typeof Star; className: string };
  savings: number;
}[] = [
  {
    key: "stamp_kit_A4",
    accent: "card-accent-green",
    accentClass: "text-green-600",
    icon: Leaf,
    badge: { label: "Débutant", icon: Sparkles, className: "bg-green-50 text-green-700 border-green-200" },
    savings: Math.round((1 - PRICING.stamp_kit_A4 / ORIGINAL_PRICING.stamp_kit_A4) * 100),
  },
  {
    key: "stamp_kit_30x40",
    accent: "card-accent-gold",
    accentClass: "text-primary",
    icon: Award,
    savings: Math.round((1 - PRICING.stamp_kit_30x40 / ORIGINAL_PRICING.stamp_kit_30x40) * 100),
  },
  {
    key: "stamp_kit_40x50",
    accent: "card-accent-burgundy",
    accentClass: "text-accent",
    icon: Crown,
    badge: { label: "Populaire", icon: Star, className: "bg-accent/10 text-accent border-accent/20" },
    savings: Math.round((1 - PRICING.stamp_kit_40x50 / ORIGINAL_PRICING.stamp_kit_40x50) * 100),
  },
];

const SIZE_DETAILS: Record<KitSize, { colors: string; hours: string; cells: string; difficulty: number; diffLabel: string }> = {
  stamp_kit_A4: { colors: "8", hours: "4-8", cells: "~10 000", difficulty: 1, diffLabel: "Débutant" },
  stamp_kit_30x40: { colors: "12-15", hours: "8-20", cells: "19 200", difficulty: 2, diffLabel: "Intermédiaire" },
  stamp_kit_40x50: { colors: "12-15", hours: "15-30", cells: "32 000", difficulty: 3, diffLabel: "Avancé" },
};

const KIT_INCLUDES = [
  { icon: Paintbrush, label: "Toile pré-imprimée" },
  { icon: Palette, label: "Pots de peinture acrylique" },
  { icon: Layers, label: "Pinceaux (3 tailles)" },
  { icon: BookOpen, label: "Guide numérique PDF" },
];

const DIFFICULTY_COLORS = ["bg-green-500", "bg-amber-500", "bg-red-500"];

/* ─── Canvas scale illustration ─── */
function CanvasScale({ size }: { size: KitSize }) {
  const scales: Record<KitSize, { w: number; h: number }> = {
    stamp_kit_A4: { w: 32, h: 44 },
    stamp_kit_30x40: { w: 42, h: 56 },
    stamp_kit_40x50: { w: 52, h: 64 },
  };
  const s = scales[size];
  return (
    <div className="flex items-end justify-center h-16 mb-2">
      <div
        className="border-2 border-foreground/15 rounded-sm bg-muted/30 transition-all duration-300"
        style={{ width: s.w, height: s.h }}
      />
    </div>
  );
}

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

/* ═══════════════════════════════════════════════════════
   Main Studio Component
   ═══════════════════════════════════════════════════════ */
const Studio = () => {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("resume")?.trim() || null;
  const { order, setCategory, setPhoto, removePhoto, setCroppedArea, setStyle, setSize, setContact, setShipping, setGift, setDedicationText, setDreamJob, setAiGeneratedUrl, confirmOrder } = useOrder();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [previews, setPreviews] = useState<{ style: ArtStyle; results: ProcessingResult[]; previewUrl: string }[]>([]);
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

  // URL-based category
  useEffect(() => {
    if (resumeSessionId) return;
    const cat = searchParams.get("category");
    if (cat && ["classic", "family", "kids_dream", "pet"].includes(cat)) {
      setCategory(cat as OrderCategory);
      setStep(2); // Skip category selection
    }
  }, [resumeSessionId, searchParams, setCategory]);

  // Compute step meta based on category
  const stepMeta = getStepMeta(order.category);
  const totalSteps = stepMeta.length;
  const isAICategory = order.category !== "classic";

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

      if (cart.selectedSize && ["stamp_kit_40x50", "stamp_kit_30x40", "stamp_kit_A4"].includes(cart.selectedSize)) {
        setSize(cart.selectedSize as KitSize);
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
      setDedicationText(cart.dedicationText || "");

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
  }, [resumeSessionId, sessionId, setCategory, setContact, setDedicationText, setDreamJob, setSize]);

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
  }, [step, order.selectedSize, order.selectedStyle, order.photos, order.category, order.dreamJob, order.dedicationText, contactForm.phone, contactForm.email, contactForm.firstName, sessionId]);

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

  const getFinalPrice = () => {
    if (!order.selectedSize) return 0;
    return PRICING[order.selectedSize] - getDiscount();
  };

  const goToStep = (newStep: number) => {
    setSlideDir(newStep > step ? "right" : "left");
    setAnimKey((k) => k + 1);
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Step 3: image selected → go to step 4 (crop) */
  const handleImageSelected = useCallback((dataUrl: string) => {
    setPhoto(dataUrl, 0);
    goToStep(4);
  }, [setPhoto]);

  /* Step 4: crop complete → process → go to next step */
  const handleCropComplete = useCallback(async (croppedArea: Area) => {
    if (!order.selectedSize) return;
    setCroppedArea(croppedArea);
    setProcessing(true);

    const photo = order.aiGeneratedUrl || getPhoto(order);
    const imgKitSize = STORE_TO_IMG[order.selectedSize];

    try {
      const results = await processImage(photo, croppedArea, imgKitSize);
      const styleMap: Record<string, ArtStyle> = { original: "original", vintage: "vintage", popart: "pop_art" };
      const allPreviews: typeof previews = [];

      for (const result of results) {
        const artStyle = styleMap[result.styleKey];
        if (artStyle) {
          allPreviews.push({ style: artStyle, results: [result], previewUrl: result.dataUrl });
        }
      }

      setPreviews(allPreviews);
      setProcessing(false);
      void trackFunnelEvent({
        sessionId,
        eventName: "crop_completed",
        category: order.category,
        step: getCropStep(),
        metadata: {
          selectedSize: order.selectedSize,
          fromAi: Boolean(order.aiGeneratedUrl),
        },
      });
      // For AI categories, the style step is one more
      goToStep(isAICategory ? 6 : 5);
    } catch (err) {
      console.error("Processing failed:", err);
      setProcessing(false);
    }
  }, [order.photos, order.aiGeneratedUrl, order.selectedSize, order.category, setCroppedArea]);

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
      // Move to crop step (step 4 for AI categories after AI step 5)
      // Actually AI step is step 5, then we go back to crop at step 4
      // Wait - let me re-think the flow
      // For AI: 1=Cat, 2=Kit, 3=Upload, 4=AI Magic, 5=Crop, 6=Style, 7=Confirm
      // That makes more sense - AI before crop
      goToStep(5); // Go to crop after AI
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
        message === "Missing valid contact details" ? "Vérifiez votre prénom, nom et numéro de téléphone." :
        message === "Missing shipping details" ? "Ajoutez l'adresse, la ville et le gouvernorat de livraison." :
        message === "Missing selected size or style" ? "Choisissez une taille et un style avant de confirmer." :
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

  const isConfirmValid = contactForm.firstName && contactForm.lastName &&
    contactForm.phone.replace(/\D/g, "").length === 8 &&
    shippingForm.address && shippingForm.city && shippingForm.governorate;

  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const slideClass = slideDir === "right"
    ? "animate-[slide-in-right_0.35s_ease-out]"
    : "animate-[slide-in-left_0.35s_ease-out]";

  const showHero = !processing && step !== 4 && step !== 5;

  // Determine which step number maps to which content
  // Classic: 1=Cat, 2=Kit, 3=Upload, 4=Crop, 5=Style, 6=Confirm
  // AI:      1=Cat, 2=Kit, 3=Upload, 4=AI, 5=Crop, 6=Style, 7=Confirm
  const getConfirmStep = () => isAICategory ? 7 : 6;
  const getStyleStep = () => isAICategory ? 6 : 5;
  const getCropStep = () => isAICategory ? 5 : 4;
  const getAIStep = () => 4; // Only for AI categories
  const getUploadStep = () => 3;
  const getKitStep = () => 2;

  const photo = getPhoto(order);
  const photoForProcessing = order.aiGeneratedUrl || photo;

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
                <div>
                  <SectionHeading
                    title="Choisissez votre expérience"
                    subtitle="Sélectionnez le type de création qui vous inspire."
                  />

                  <CategorySelector selected={order.category} onSelect={(cat) => setCategory(cat)} />

                  <div className="flex justify-end mt-8">
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
                <div>
                  <SectionHeading
                    title="Choisissez votre kit"
                    subtitle="Sélectionnez la taille de votre toile pour commencer."
                  />

                  <div className="grid gap-4 sm:gap-5 sm:grid-cols-3 mb-8">
                    {SIZE_CARDS.map((card, idx) => {
                      const isSelected = order.selectedSize === card.key;
                      const details = SIZE_DETAILS[card.key];
                      const CardIcon = card.icon;

                      return (
                        <div
                          key={card.key}
                          className={`relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.accent} ${
                            isSelected ? "gold-glow scale-[1.02]" : "hover:shadow-lg"
                          }`}
                          onClick={() => setSize(card.key)}
                          style={{ animationDelay: `${idx * 80}ms` }}
                        >
                          {card.badge && (
                            <div className="absolute top-3 right-3 z-10">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${card.badge.className}`}>
                                <card.badge.icon className="h-3 w-3" />
                                {card.badge.label}
                              </span>
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                          )}

                          <div className="p-5 pt-6">
                            <CanvasScale size={card.key} />

                            <div className="flex items-center gap-2 mb-1">
                              <CardIcon className={`h-4 w-4 ${card.accentClass}`} />
                              <p className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                                {SIZE_LABELS[card.key]}
                              </p>
                            </div>

                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-bold text-foreground">{PRICING[card.key]}</span>
                              <span className="text-sm text-muted-foreground">DT</span>
                              <span className="text-xs text-muted-foreground line-through ml-1">{ORIGINAL_PRICING[card.key]} DT</span>
                              {card.savings > 0 && (
                                <span className="savings-badge text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
                                  -{card.savings}%
                                </span>
                              )}
                            </div>

                            <div className="mt-4 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Grid3X3 className="h-3.5 w-3.5 shrink-0" />
                                <span>{details.cells} cellules</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Palette className="h-3.5 w-3.5 shrink-0" />
                                <span>{details.colors} couleurs</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>{details.hours}h de peinture</span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[0, 1, 2].map((d) => (
                                  <div
                                    key={d}
                                    className={`h-1.5 w-5 rounded-full transition-colors ${
                                      d < details.difficulty ? DIFFICULTY_COLORS[details.difficulty - 1] : "bg-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground">{details.diffLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Kit includes */}
                  <div className="rounded-xl border-l-4 border-l-primary bg-primary/[0.03] border border-border p-5 mb-8">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-4">
                      Chaque kit contient
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {KIT_INCLUDES.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <item.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-foreground leading-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
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
                  STEP 3: Upload Photo(s)
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
                    <Button variant="outline" onClick={() => goToStep(2)} className="gap-2">
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
                    <Button variant="outline" onClick={() => goToStep(3)} className="gap-2">
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
                  kitSize={STORE_TO_IMG[order.selectedSize]}
                  onCropComplete={handleCropComplete}
                  onBack={() => goToStep(isAICategory ? getAIStep() : getUploadStep())}
                />
              )}

              {processing && <ProcessingScreen />}

              {/* ═══════════════════════════════════════════
                  STYLE Step
                 ═══════════════════════════════════════════ */}
              {step === getStyleStep() && (
                <div>
                  <SectionHeading
                    title={t.studio.step2.title}
                    subtitle={t.studio.step2.subtitle}
                  />

                  <div className="grid gap-5 sm:grid-cols-3">
                    {previews.map((p, i) => {
                      const isSelected = order.selectedStyle === p.style;
                      const styleName = p.style === "original" ? t.styles.original.name :
                        p.style === "vintage" ? t.styles.vintage.name : t.styles.popArt.name;
                      const styleDesc = p.style === "original" ? t.styles.original.description :
                        p.style === "vintage" ? t.styles.vintage.description : t.styles.popArt.description;
                      return (
                        <div
                          key={p.style}
                          className={`group cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                            isSelected ? "gold-glow scale-[1.02]" : "hover:shadow-lg"
                          }`}
                          onClick={() => setStyle(p.style, p.previewUrl)}
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          {p.style === "original" && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                                <Star className="h-3 w-3" />
                                Populaire
                              </span>
                            </div>
                          )}
                          <div className="aspect-[3/4] overflow-hidden relative">
                            <img src={p.previewUrl} alt={styleName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          <div className="p-4">
                            <p className="font-semibold text-center" style={{ fontFamily: "'Playfair Display', serif" }}>{styleName}</p>
                            <p className="text-xs text-muted-foreground mt-1 text-center line-clamp-2">{styleDesc}</p>
                            <div className="flex justify-center gap-1.5 mt-3">
                              {(p.results[0]?.palette?.colors || []).map((color, ci) => (
                                <div key={ci} className="w-5 h-5 rounded-full border-2 border-background shadow-sm transition-transform hover:scale-125" style={{ backgroundColor: color.hex }} title={color.name} />
                              ))}
                            </div>
                            {isSelected && (
                              <div className="mt-3 flex justify-center">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary animate-scale-in">
                                  <Check className="h-3.5 w-3.5" /> Sélectionné
                                </span>
                              </div>
                            )}
                          </div>
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
                            onChange={(e) => setDedicationText(e.target.value.slice(0, 36))}
                            placeholder="I love you • 14.02.2026"
                            rows={2}
                          />
                          <p className="text-xs text-muted-foreground">
                            {order.dedicationText.length}/36 characters. Best for names, dates, or a short message.
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
                              <span className="text-muted-foreground">Style</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {order.selectedStyle === "original" ? t.styles.original.name :
                                   order.selectedStyle === "vintage" ? t.styles.vintage.name :
                                   t.styles.popArt.name}
                                </span>
                                <button onClick={() => goToStep(getStyleStep())} className="text-primary hover:text-primary/70 transition-colors"><Edit3 className="h-3 w-3" /></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Taille</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{order.selectedSize && SIZE_LABELS[order.selectedSize]}</span>
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
