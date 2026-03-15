import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Area } from "react-easy-crop";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { useOrder, getPhoto, isManualArtworkProduct, PRICING, TUNISIAN_GOVERNORATES, CATEGORY_META, CATEGORY_THEMES, DREAM_JOBS, ADD_ONS, getAvailableAddOns, PRODUCT_TYPE_META, STENCIL_DETAIL_META, type KitSize, type ArtStyle, type ContactInfo, type ShippingInfo, type OrderCategory, type ProductType, type StencilDetailLevel, type GlitterPalette } from "@/lib/store";
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
import { CategoryThemePicker } from "@/components/studio/CategoryThemePicker";
import { ProductTypePicker } from "@/components/studio/ProductTypePicker";
import { StencilDetailPicker } from "@/components/studio/StencilDetailPicker";
import { GlitterPalettePicker } from "@/components/studio/GlitterPalettePicker";
import { DreamJobPicker } from "@/components/studio/DreamJobPicker";
import { MultiUploadZone } from "@/components/studio/MultiUploadZone";
import { AIGenerationLoadingPanel } from "@/components/studio/AIGenerationLoadingPanel";
import { AiPhotoCropDialog } from "@/components/studio/AiPhotoCropDialog";
import { StylePreviewCard } from "@/components/studio/StylePreviewCard";
import { SaveProgressModal } from "@/components/shared/SaveProgressModal";
import { CropScreen } from "@/components/CropScreen";
import { ProcessingScreen } from "@/components/ProcessingScreen";
import { getFriendlyAIGenerationError } from "@/lib/aiGeneration";
import { buildAiInputImages, getPendingPhotoEditIndices, getPhotoPreviewSource, type ImageAdjustments } from "@/lib/aiPhotoEdits";
import { processImage, ProcessingResult } from "@/lib/imageProcessing";
import { processStencilImage, convertUploadedStencil, type StencilResult } from "@/lib/stencilProcessing";
import { getStyleDefinition, getStyleDescription, getStyleLabel, orderStyleResults } from "@/lib/styles";
import { GLITTER_PALETTES } from "@/lib/glitterPalettes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Truck, CreditCard, Package,
  Camera, Palette, User, MapPin, ShieldCheck, Sparkles, CheckCircle, Crop,
  Layers, Star, Gift, Edit3, Crown, Upload, Tag, X, Wand2, Loader2, ShoppingBag,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { STORAGE_KEYS } from "@/lib/brand";
import { trackFunnelEvent } from "@/lib/funnel";
/* ─── Kit visuals ─── */
const PUBLIC_STUDIO_KITS = getPublicKitConfigs();
const BADGE_ICON_COMPONENTS: Record<KitBadgeIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  star: Star,
  crown: Crown,
};
const ALL_ORDER_CATEGORIES: OrderCategory[] = ["classic", "family", "kids_dream", "pet", "superhero", "couple", "historical", "scifi", "anime"];

function getUploadLabel(category: OrderCategory) {
  return CATEGORY_META[category].photosNeeded > 1 ? "Photos" : "Photo";
}

function getPhotoLabels(category: OrderCategory) {
  if (category === "family" || category === "couple") {
    return ["Personne 1", "Personne 2"];
  }

  if (category === "kids_dream") {
    return ["Photo de l'enfant"];
  }

  if (category === "pet") {
    return ["Photo de votre animal"];
  }

  return ["Photo principale"];
}

function getUploadCopy(category: OrderCategory, productType: ProductType) {
  if (category === "classic" && productType === "stencil_paint") {
    return {
      title: "Importez votre photo",
      subtitle: "Choisissez la photo que nous transformerons en pochoir a peindre et reveler.",
    };
  }

  if (category === "classic" && productType === "glitter_reveal") {
    return {
      title: "Importez votre photo",
      subtitle: "Choisissez la photo que nous preparerons pour votre experience glitter reveal.",
    };
  }

  switch (category) {
    case "family":
      return {
        title: "Importez vos 2 photos",
        subtitle: "Ajoutez les deux photos que l'IA va réunir en une scène unique.",
      };
    case "couple":
      return {
        title: "Importez vos 2 photos",
        subtitle: "Ajoutez les deux photos que l'IA transformera en portrait de couple harmonieux.",
      };
    case "kids_dream":
      return {
        title: "Importez votre photo",
        subtitle: "Ajoutez la photo de votre enfant et choisissez son rêve.",
      };
    case "pet":
      return {
        title: "Importez votre photo",
        subtitle: "Ajoutez la photo de votre animal pour son portrait premium.",
      };
    default:
      return {
        title: "Importez votre photo",
        subtitle: "Choisissez la photo que vous souhaitez transformer en peinture par numéros.",
      };
  }
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

type StepMetaItem = {
  label: string;
  icon: typeof Sparkles;
};

export type StudioStepId = "experience" | "subject" | "theme" | "format" | "upload" | "crop" | "ai" | "style" | "confirm";

const STYLE_STEP_LABEL: Record<ProductType, StepMetaItem> = {
  paint_by_numbers: { label: "Style", icon: Palette },
  stencil_paint:    { label: "Détail", icon: Layers },
  glitter_reveal:   { label: "Palette", icon: Sparkles },
};

export function getWorkflowStepIds(category: OrderCategory, productType: ProductType = "paint_by_numbers"): StudioStepId[] {
  const steps: StudioStepId[] = ["experience"];

  if (!isManualArtworkProduct(productType)) {
    steps.push("subject");
    // Theme is selected inline in the subject step — no separate step
  }

  steps.push("format", "upload");
  // "crop" is now a dialog overlay triggered on upload, not a separate step

  if (category !== "classic" && !isManualArtworkProduct(productType)) {
    steps.push("ai");
  }

  steps.push("style", "confirm");
  return steps;
}

export function getStepNumberForFlow(
  category: OrderCategory,
  productType: ProductType,
  stepId: StudioStepId,
) {
  return getWorkflowStepIds(category, productType).indexOf(stepId) + 1;
}

function getStepMeta(category: OrderCategory, productType: ProductType = "paint_by_numbers"): StepMetaItem[] {
  const styleStep = STYLE_STEP_LABEL[productType];
  const aiLabel =
    category === "family"     ? "Fusion"   :
    category === "kids_dream" ? "Magie"    :
    "Portrait";
  const uploadLabel = getUploadLabel(category);
  const stepConfig: Record<StudioStepId, StepMetaItem> = {
    experience: { label: "Expérience", icon: Sparkles },
    subject: { label: "Sujet", icon: User },
    theme: { label: "Thème", icon: Star },
    format: { label: "Format", icon: Package },
    upload: { label: uploadLabel, icon: Upload },
    crop: { label: "Recadrage", icon: Camera },
    ai: { label: aiLabel, icon: Wand2 },
    style: styleStep,
    confirm: { label: "Commande", icon: CreditCard },
  };

  return getWorkflowStepIds(category, productType).map((stepId) => stepConfig[stepId]);
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
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Progression</p>
        <p className="text-[10px] font-medium text-muted-foreground">Étape {Math.min(currentStep, totalSteps)} sur {totalSteps}</p>
      </div>

      <div className="relative h-1 w-full bg-black/[0.03] rounded-full overflow-hidden flex">
        {stepMeta.map((item, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isClickable = stepNumber <= currentStep;
          
          let segmentClass = "flex-1 h-full transition-all duration-500 border-r border-white/50 last:border-0 hover:bg-black/10 cursor-pointer ";
          if (isActive) segmentClass += "bg-primary";
          else if (isCompleted) segmentClass += "bg-primary/40";
          else segmentClass += "bg-transparent";

          return (
            <div
              key={item.label}
              onClick={() => isClickable && onStepClick(stepNumber)}
              className={segmentClass}
              title={item.label}
            />
          );
        })}
      </div>
      
      {/* Current step label */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{stepMeta[currentStep - 1]?.label}</span>
      </div>
    </div>
  );
}

/* Crops an image to a data URL using canvas */
const cropImageToDataUrl = (imageUrl: string, crop: Area, adjustments: ImageAdjustments = { brightness: 100, contrast: 100 }): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`;
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      ctx.filter = "none";
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });

const getImageFullCrop = (imageUrl: string): Promise<Area> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({
      x: 0,
      y: 0,
      width: img.naturalWidth || img.width || 2048,
      height: img.naturalHeight || img.height || 2048,
    });
    img.onerror = () => resolve({ x: 0, y: 0, width: 2048, height: 2048 });
    img.src = imageUrl;
  });

/* ═══════════════════════════════════════════════════════
   Main Studio Component
   ═══════════════════════════════════════════════════════ */
const Studio = () => {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("resume")?.trim() || null;
  const {
    order,
    setCategory,
    setProductType,
    setPhoto,
    removePhoto,
    setPhotoEdit,
    setCroppedArea,
    setStyle,
    setStylePreviewUrl,
    setSize,
    setAddOns,
    setStencilDetailLevel,
    setCustomStencilDataUrl,
    setGlitterPalette,
    setContact,
    setShipping,
    setGift,
    setDreamJob,
    setCategoryTheme,
    setAiGeneratedUrl,
    setImageAdjustments,
    confirmOrder,
  } = useOrder();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [previews, setPreviews] = useState<{ style: ArtStyle; results: ProcessingResult[]; previewUrl: string }[]>([]);
  const [stencilPreviews, setStencilPreviews] = useState<Partial<Record<StencilDetailLevel, string>>>({});
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [aiCropDialogOpen, setAiCropDialogOpen] = useState(false);
  const [classicCropDialogOpen, setClassicCropDialogOpen] = useState(false);
  const [aiCropQueue, setAiCropQueue] = useState<number[]>([]);
  const [activeAiCropIndex, setActiveAiCropIndex] = useState<number | null>(null);
  const [aiCropReturnStep, setAiCropReturnStep] = useState(4);
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
    let nextProductType: ProductType = "paint_by_numbers";

    if (product && ["paint_by_numbers", "stencil_paint", "glitter_reveal"].includes(product)) {
      nextProductType = product as ProductType;
      setProductType(nextProductType);
      // Manual artwork products are classic-only
      if (product === "stencil_paint" || product === "glitter_reveal") {
        setCategory("classic");
      }
    }
    if (cat && ALL_ORDER_CATEGORIES.includes(cat as OrderCategory)) {
      const nextCategory = isManualArtworkProduct(nextProductType) ? "classic" : (cat as OrderCategory);
      setCategory(nextCategory);
      const nextThemes = CATEGORY_THEMES[nextCategory];
      if (nextThemes?.length) {
        setCategoryTheme(nextThemes[0].key);
      }
      setStep(getStepNumberForFlow(nextCategory, nextProductType, "format"));
    }
  }, [navigate, resumeSessionId, searchParams, setCategory, setCategoryTheme, setProductType]);

  // Compute step meta based on category and product type
  const workflowSteps = getWorkflowStepIds(order.category, order.productType);
  const stepMeta = getStepMeta(order.category, order.productType);
  const totalSteps = stepMeta.length;
  const isAICategory = order.category !== "classic";
  const isStencilProduct = order.productType === "stencil_paint" || order.productType === "glitter_reveal";
  const hasThemeStep = workflowSteps.includes("theme");
  const currentStepId = workflowSteps[Math.max(0, step - 1)] || "experience";
  const selectedProductMeta = PRODUCT_TYPE_META[order.productType];
  const selectedCategoryMeta = CATEGORY_META[order.category];
  const selectedThemeMeta = CATEGORY_THEMES[order.category]?.find((theme) => theme.key === order.categoryTheme) || null;
  const studioHeaderTitle =
    currentStepId === "experience"
      ? selectedProductMeta.label
      : currentStepId === "subject"
      ? "Choix du sujet"
      : currentStepId === "theme"
      ? "Direction artistique"
      : CATEGORY_META[order.category]?.label || "Studio";

  // Map logical steps to what we show
  // Dynamic flow:
  // Experience -> Subject? -> Theme? -> Format -> Upload -> Crop -> AI? -> Style -> Confirm

  useEffect(() => {
    if (step > totalSteps) {
      setStep(totalSteps);
    }
  }, [step, totalSteps]);

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
      const nextProductType = cart.productType && ["paint_by_numbers", "stencil_paint", "glitter_reveal"].includes(cart.productType)
        ? (cart.productType as ProductType)
        : "paint_by_numbers";
      const resolvedCategory = nextProductType !== "paint_by_numbers"
        ? "classic"
        : nextCategory && ALL_ORDER_CATEGORIES.includes(nextCategory as OrderCategory)
        ? (nextCategory as OrderCategory)
        : "classic";

      if (resolvedCategory && ALL_ORDER_CATEGORIES.includes(resolvedCategory as OrderCategory)) {
        const restoredCategory = resolvedCategory as OrderCategory;
        setCategory(restoredCategory);
        const restoredThemes = CATEGORY_THEMES[restoredCategory];
        if (restoredThemes?.length) {
          setCategoryTheme(restoredThemes[0].key);
        }
      }

      setProductType(nextProductType);

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

      const shouldRestartFromUpload = Boolean(cart.photoUploaded) || Number(cart.stepReached || 0) >= 3;
      const uploadStep = getStepNumberForFlow(resolvedCategory, nextProductType, "upload");
      const formatStep = getStepNumberForFlow(resolvedCategory, nextProductType, "format");
      const themeStep = getStepNumberForFlow(resolvedCategory, nextProductType, "theme");
      const restoredStep = shouldRestartFromUpload
        ? uploadStep
        : cart.selectedSize
        ? uploadStep
        : (CATEGORY_THEMES[resolvedCategory]?.length || 0) > 0
        ? themeStep
        : formatStep;

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
        category: resolvedCategory,
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
  }, [navigate, resumeSessionId, sessionId, setCategory, setCategoryTheme, setProductType, setStencilDetailLevel, setGlitterPalette, setContact, setDreamJob, setSize]);

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
          contact_phone: contactForm.phone.replace(/\D/g, "").length === 8 ? contactForm.phone : null,
          contact_email: contactForm.email || null,
          contact_first_name: contactForm.firstName || null,
        },
      });
    };
    const timer = setTimeout(save, 2000);
    return () => clearTimeout(timer);
  }, [step, order.selectedSize, order.selectedStyle, order.photos, order.category, order.productType, order.stencilDetailLevel, order.glitterPalette, order.dreamJob, contactForm.phone, contactForm.email, contactForm.firstName, sessionId]);

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

  const requiredPhotoCount = CATEGORY_META[order.category].photosNeeded;
  const aiPreviewImages = order.photos.map((_, index) => getPhotoPreviewSource(order.photos, order.photoEdits, index)).filter(Boolean);

  const openAiCropFlow = useCallback((indices: number[], returnStep: number) => {
    if (!order.selectedSize) return;

    const validIndices = indices.filter((index) => Boolean(order.photos[index]));
    if (validIndices.length === 0) {
      goToStep(getAIStep());
      return;
    }

    setAiCropQueue(validIndices);
    setActiveAiCropIndex(validIndices[0]);
    setAiCropReturnStep(returnStep);
    // Stay on current step — crop dialog opens as an overlay
    setAiCropDialogOpen(true);
  }, [order.photos, order.selectedSize]);

  const handleCloseAiCropDialog = useCallback(() => {
    setAiCropDialogOpen(false);
    setAiCropQueue([]);
    setActiveAiCropIndex(null);
    if (aiCropReturnStep !== step) {
      goToStep(aiCropReturnStep);
    }
  }, [aiCropReturnStep, step]);

  const handleStartAiCropFlow = useCallback(() => {
    const pending = getPendingPhotoEditIndices(order.photos, requiredPhotoCount, order.photoEdits);
    openAiCropFlow(
      pending.length > 0 ? pending : Array.from({ length: requiredPhotoCount }, (_, index) => index),
      getUploadStep(),
    );
  }, [openAiCropFlow, order.photoEdits, order.photos, requiredPhotoCount]);

  const handleEditAiPhoto = useCallback((index: number, returnStep = getUploadStep()) => {
    openAiCropFlow([index], returnStep);
  }, [openAiCropFlow]);

  /* Upload: image selected → open crop dialog */
  const handleImageSelected = useCallback((dataUrl: string) => {
    setPhoto(dataUrl, 0);
    setClassicCropDialogOpen(true);
  }, [setPhoto]);

  const handleAiCropComplete = useCallback(async (croppedArea: Area, adjustments: ImageAdjustments) => {
    if (activeAiCropIndex == null) return;

    const sourcePhoto = order.photos[activeAiCropIndex];
    if (!sourcePhoto) return;

    try {
      const croppedDataUrl = await cropImageToDataUrl(sourcePhoto, croppedArea, adjustments);
      setPhotoEdit(activeAiCropIndex, {
        crop: croppedArea,
        adjustments,
        croppedDataUrl,
      });
    } catch {
      setPhotoEdit(activeAiCropIndex, {
        crop: croppedArea,
        adjustments,
        croppedDataUrl: sourcePhoto,
      });
    }

    const remainingQueue = aiCropQueue.filter((index) => index !== activeAiCropIndex);
    if (remainingQueue.length > 0) {
      setAiCropQueue(remainingQueue);
      setActiveAiCropIndex(remainingQueue[0]);
      setAiCropDialogOpen(true);
      return;
    }

    setAiCropDialogOpen(false);
    setAiCropQueue([]);
    setActiveAiCropIndex(null);

    void trackFunnelEvent({
      sessionId,
      eventName: "crop_completed",
      category: order.category,
      step: getUploadStep(),
      metadata: {
        selectedSize: order.selectedSize,
        fromAi: true,
        productType: order.productType,
        photoCount: requiredPhotoCount,
      },
    });

    goToStep(getAIStep());
  }, [activeAiCropIndex, aiCropQueue, order.category, order.photos, order.productType, order.selectedSize, requiredPhotoCount, sessionId, setPhotoEdit]);

  /* Crop complete → close dialog, process image, go to style step */
  const handleCropComplete = useCallback(async (croppedArea: Area, adjustments: ImageAdjustments) => {
    setClassicCropDialogOpen(false);
    if (!order.selectedSize) return;
    setCroppedArea(croppedArea);
    setImageAdjustments(adjustments);

    // Classic/stencil: process image directly after crop
    setProcessing(true);
    const photo = getPhoto(order);
    const imgKitSize = resolveProcessingKitSize(order.selectedSize);

    try {
      if (isStencilProduct) {
        const detailLevels: StencilDetailLevel[] = ["bold", "medium", "fine"];
        const results = await Promise.all(
          detailLevels.map((level) => processStencilImage(photo, croppedArea, imgKitSize, level, adjustments))
        );
        const previewMap: Partial<Record<StencilDetailLevel, string>> = {};
        results.forEach((r) => { previewMap[r.detailLevel] = r.dataUrl; });
        setStencilPreviews(previewMap);
        const activeDetailLevel = order.stencilDetailLevel || "medium";
        if (!order.stencilDetailLevel) setStencilDetailLevel(activeDetailLevel);
        setStylePreviewUrl(previewMap[activeDetailLevel] || results[0]?.dataUrl || "");
      } else {
        const results = await processImage(photo, croppedArea, imgKitSize, adjustments);
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
        metadata: { selectedSize: order.selectedSize, fromAi: false, productType: order.productType },
      });
      goToStep(getStyleStep());
    } catch (err) {
      console.error("Processing failed:", err);
      setProcessing(false);
    }
  }, [order.photos, order.selectedSize, order.category, order.productType, order.stencilDetailLevel, isStencilProduct, setCroppedArea, setImageAdjustments, setStencilDetailLevel, setStylePreviewUrl]);

  /* Custom stencil upload handler */
  const handleCustomStencilUpload = useCallback(async (file: File) => {
    if (!order.selectedSize) return;
    setProcessing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const kitSize = resolveProcessingKitSize(order.selectedSize);
      const result = await convertUploadedStencil(dataUrl, kitSize);
      setCustomStencilDataUrl(dataUrl);
      setStencilDetailLevel("medium");
      setStencilPreviews({ medium: result.dataUrl });
      setStylePreviewUrl(result.dataUrl);
      setProcessing(false);
    } catch (err) {
      console.error("Custom stencil upload failed:", err);
      setProcessing(false);
    }
  }, [order.selectedSize, setCustomStencilDataUrl, setStencilDetailLevel, setStylePreviewUrl]);

  /* AI Generation — uses cropped photo, then auto-processes result */
  const handleAIGenerate = async () => {
    if (!order.selectedSize) return;
    const images = buildAiInputImages(order.photos, order.photoEdits);
    if (images.length < requiredPhotoCount) {
      toast({
        title: "Recadrage requis",
        description: "Recadrez chaque photo avant de lancer la génération IA.",
        variant: "destructive",
      });
      return;
    }

    setAiGenerating(true);
    try {
      void trackFunnelEvent({
        sessionId,
        eventName: "ai_generation_requested",
        category: order.category,
        step: getAIStep(),
        metadata: { imageCount: images.length },
      });

      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          category: order.category,
          images,
          dreamJob: order.dreamJob,
          categoryTheme: order.categoryTheme || null,
          sessionId,
          requestedBy: "studio",
        },
      });

      if (error) {
        // Extract the actual error message from the edge function response body
        try {
          const body = await (error as { context?: { json?: () => Promise<unknown> } }).context?.json?.();
          if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
            throw new Error(body.error);
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== error.message) throw parseErr;
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      const imageUrl = data.imageUrl;
      setAiGeneratedUrl(imageUrl, data.generationRunId);

      void trackFunnelEvent({
        sessionId,
        eventName: "ai_generation_succeeded",
        category: order.category,
        step: getAIStep(),
        metadata: { generationRunId: data.generationRunId || null },
      });

      // Auto-process the AI result so style cards are ready.
      const fullCrop = await getImageFullCrop(imageUrl);
      setCroppedArea(fullCrop);
      setImageAdjustments({ brightness: 100, contrast: 100 });
      setAiGenerating(false);
      setProcessing(true);
      const imgKitSize = resolveProcessingKitSize(order.selectedSize);

      if (isStencilProduct) {
        const detailLevels: StencilDetailLevel[] = ["bold", "medium", "fine"];
        const results = await Promise.all(
          detailLevels.map((level) => processStencilImage(imageUrl, fullCrop, imgKitSize, level, { brightness: 100, contrast: 100 }))
        );
        const previewMap: Partial<Record<StencilDetailLevel, string>> = {};
        results.forEach((r) => { previewMap[r.detailLevel] = r.dataUrl; });
        setStencilPreviews(previewMap);
        const activeLevel = order.stencilDetailLevel || "medium";
        if (!order.stencilDetailLevel) setStencilDetailLevel(activeLevel);
        setStylePreviewUrl(previewMap[activeLevel] || results[0]?.dataUrl || "");
      } else {
        const results = await processImage(imageUrl, fullCrop, imgKitSize, { brightness: 100, contrast: 100 });
        const allPreviews: typeof previews = orderStyleResults(results).map((result) => ({
          style: result.styleKey,
          results: [result],
          previewUrl: result.dataUrl,
        }));
        setPreviews(allPreviews);
      }

      setProcessing(false);
      toast({ title: "Image IA générée ✨", description: "Choisissez votre style artistique." });
      goToStep(getStyleStep());
    } catch (err) {
      const errorMsg = getFriendlyAIGenerationError(err instanceof Error ? err.message : "unknown_error");
      console.error("AI generation failed:", err);
      setAiGenerating(false);
      setProcessing(false);
      void trackFunnelEvent({
        sessionId,
        eventName: "ai_generation_failed",
        category: order.category,
        step: getAIStep(),
        metadata: { message: errorMsg },
      });
      toast({
        title: "Erreur",
        description: errorMsg === "unknown_error"
          ? "La génération IA a échoué. Réessayez."
          : errorMsg,
        variant: "destructive",
      });
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
        message === "Missing crop data" || message === "Order is missing crop" ? "Recadrez votre photo avant de confirmer." :
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

  const getExperienceStep = () => getStepNumberForFlow(order.category, order.productType, "experience");
  const getSubjectStep = () => getStepNumberForFlow(order.category, order.productType, "subject");
  const getThemeStep = () => getStepNumberForFlow(order.category, order.productType, "theme");
  const getFormatStep = () => getStepNumberForFlow(order.category, order.productType, "format");
  const getUploadStep = () => getStepNumberForFlow(order.category, order.productType, "upload");
  const getCropStep = () => getStepNumberForFlow(order.category, order.productType, "crop");
  const getAIStep = () => getStepNumberForFlow(order.category, order.productType, "ai");
  const getStyleStep = () => getStepNumberForFlow(order.category, order.productType, "style");
  const getConfirmStep = () => getStepNumberForFlow(order.category, order.productType, "confirm");


  const photo = getPhoto(order);
  const photoForProcessing = order.aiGeneratedUrl || photo;
  const uploadCopy = getUploadCopy(order.category, order.productType);
  const activeAiCropImage = activeAiCropIndex != null ? order.photos[activeAiCropIndex] || "" : "";
  const activeAiCropEdit = activeAiCropIndex != null ? order.photoEdits[activeAiCropIndex] || null : null;
  const aiCropPendingCount = getPendingPhotoEditIndices(order.photos, requiredPhotoCount, order.photoEdits).length;
  const allAiPhotosCropped = aiCropPendingCount === 0 && order.photos.filter(Boolean).length >= requiredPhotoCount;
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
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden font-sans text-foreground">
      <Navbar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-black/[0.04]">
          <div className="max-w-4xl mx-auto px-6 py-5 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">Studio Helma</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{studioHeaderTitle}</h1>
              </div>
              {isAICategory && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-50/50 text-blue-600 border border-blue-100/50">
                  <Sparkles className="h-3.5 w-3.5" /> Intelligence Artificielle
                </span>
              )}
            </div>
            {/* Step tracker */}
            <div className="flex items-center gap-1 flex-wrap">
              {stepMeta.map((item, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === step;
                const isPast = stepNum < step;
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => stepNum <= step && goToStep(stepNum)}
                    disabled={stepNum > step}
                    title={item.label}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : isPast
                        ? "text-primary/40 hover:text-primary/60 cursor-pointer hover:bg-primary/5"
                        : "text-black/20 cursor-default"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className={isActive ? "" : "hidden sm:inline"}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-32 pt-8">
            <div key={animKey} className={slideClass}>

              {/* ═══════════════════════════════════════════
                  STEP 1: Technique
                 ═══════════════════════════════════════════ */}
              {step === getExperienceStep() && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-[34px] border border-black/[0.06] bg-[linear-gradient(135deg,rgba(248,244,235,0.92),rgba(255,255,255,0.98))] px-5 py-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.2)] sm:px-7 sm:py-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-xl">
                        <span className="inline-flex items-center rounded-full border border-primary/15 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                          Étape 1
                        </span>
                        <h2
                          className="mt-4 text-[30px] font-bold leading-tight text-foreground sm:text-[38px]"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          Choisissez l'expérience Helma
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                          Commencez par le type de création que vous voulez vivre. Nous vous guiderons ensuite vers le bon sujet, le bon thème et le bon format.
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:w-[340px]">
                        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Technique
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {selectedProductMeta.label}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Parcours
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {isManualArtworkProduct(order.productType) ? "Rapide et direct" : "Sujet puis ambiance"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-black/[0.06] bg-white p-5 shadow-[0_16px_45px_-32px_rgba(0,0,0,0.3)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <SectionHeading
                        title="Choisissez votre technique"
                        subtitle="Trois expériences différentes, avec une même qualité Helma."
                      />
                      <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs">
                        {selectedProductMeta.shortDescription}
                      </Badge>
                    </div>
                    <ProductTypePicker selected={order.productType} onSelect={(type) => {
                      setProductType(type);
                      if (isManualArtworkProduct(type)) {
                        setCategory("classic");
                      }
                    }} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      "Parcours guidé pas à pas",
                      "Qualité premium sur chaque support",
                      isManualArtworkProduct(order.productType) ? "Portrait classique directement optimisé" : "Sujet et ambiance personnalisables",
                    ].map((point) => (
                      <div key={point} className="rounded-2xl border border-black/[0.05] bg-[#FCFCFB] px-4 py-3 text-sm text-foreground/80">
                        {point}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => goToStep(isManualArtworkProduct(order.productType) ? getFormatStep() : getSubjectStep())}
                      className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                      size="lg"
                    >
                      Continuer <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!isManualArtworkProduct(order.productType) && step === getSubjectStep() && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-[34px] border border-black/[0.06] bg-[linear-gradient(135deg,rgba(255,248,240,0.95),rgba(255,255,255,0.98))] px-5 py-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.2)] sm:px-7 sm:py-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-xl">
                        <span className="inline-flex items-center rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                          Étape 2
                        </span>
                        <h2
                          className="mt-4 text-[30px] font-bold leading-tight text-foreground sm:text-[38px]"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          Choisissez le sujet de votre œuvre
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                          Sélectionnez le type de portrait à créer. Cette étape définit la composition, le nombre de photos et l'esprit général de la scène.
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-sm lg:w-[320px]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Sélection actuelle
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {selectedCategoryMeta.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {selectedCategoryMeta.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                            {selectedCategoryMeta.photosNeeded > 1 ? "2 photos requises" : "1 photo requise"}
                          </span>
                          {selectedThemeMeta && (
                            <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-semibold text-foreground/70">
                              {selectedThemeMeta.icon} {selectedThemeMeta.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-black/[0.06] bg-white p-5 shadow-[0_16px_45px_-32px_rgba(0,0,0,0.3)] sm:p-6">
                    <SectionHeading
                      title="Quel portrait voulez-vous créer ?"
                      subtitle="Choisissez le sujet — vous pourrez personnaliser l'ambiance juste en dessous."
                    />
                    <CategorySelector
                      selected={order.category}
                      onSelect={(cat) => {
                        setCategory(cat);
                        const themes = CATEGORY_THEMES[cat];
                        setCategoryTheme(themes?.[0]?.key || "");
                      }}
                    />

                    {/* Inline theme chips */}
                    {(CATEGORY_THEMES[order.category]?.length || 0) > 0 && (
                      <div className="mt-5 pt-5 border-t border-black/[0.05] animate-fade-in">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
                          Personnaliser l'ambiance
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORY_THEMES[order.category]!.map((theme) => {
                            const isActive = order.categoryTheme === theme.key;
                            return (
                              <button
                                key={theme.key}
                                type="button"
                                onClick={() => setCategoryTheme(theme.key)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                                  isActive
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-black/[0.07] bg-white text-foreground/70 hover:border-black/12 hover:text-foreground hover:bg-gray-50"
                                }`}
                              >
                                <span>{theme.icon}</span>
                                <span>{theme.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => goToStep(getExperienceStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(getFormatStep())}
                      className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                      size="lg"
                    >
                      Continuer <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {hasThemeStep && step === getThemeStep() && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-[34px] border border-black/[0.06] bg-[linear-gradient(135deg,rgba(247,243,255,0.92),rgba(255,255,255,0.98))] px-5 py-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.2)] sm:px-7 sm:py-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-xl">
                        <span className="inline-flex items-center rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                          Étape 3
                        </span>
                        <h2
                          className="mt-4 text-[30px] font-bold leading-tight text-foreground sm:text-[38px]"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          Définissez l'ambiance visuelle
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                          Le thème influence l'arrière-plan, la lumière et l'univers du portrait. Choisissez une direction claire avant de passer au format.
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-sm lg:w-[320px]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Sujet retenu
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {selectedCategoryMeta.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {selectedThemeMeta ? `${selectedThemeMeta.icon} ${selectedThemeMeta.label}` : "Choisissez un thème pour continuer."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                            Portrait optimisé pour la génération IA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-black/[0.06] bg-white p-5 shadow-[0_16px_45px_-32px_rgba(0,0,0,0.3)] sm:p-6">
                    <SectionHeading
                      title="Personnalisez votre thème"
                      subtitle="Une ambiance forte fonctionne mieux quand elle reste lisible, élégante et centrée sur le sujet."
                    />
                    <CategoryThemePicker
                      category={order.category}
                      selected={order.categoryTheme}
                      onSelect={setCategoryTheme}
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => goToStep(getSubjectStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(getFormatStep())}
                      className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                      size="lg"
                    >
                      Continuer <NextIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  Format
                 ═══════════════════════════════════════════ */}
              {step === getFormatStep() && (
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
                          className={`group relative overflow-hidden rounded-[32px] border p-6 text-left transition-all duration-400 ease-out hover:-translate-y-1 ${
                            isSelected
                              ? "border-primary bg-primary/[0.02] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] ring-1 ring-primary/20"
                              : "border-black/[0.04] bg-[#FAFAFA] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] hover:bg-white"
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
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                              isSelected ? "border-primary bg-primary shadow-sm scale-110" : "border-black/10 bg-white"
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
                    {(isStencilProduct
                      ? ["Toile avec pochoir", "Préparation artisanale", "Livraison offerte"]
                      : ["Toile numérotée", "Peintures assorties", "PDF premium", "Viewer interactif", "Livraison offerte"]
                    ).map((perk) => (
                      <span key={perk} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        {perk}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => goToStep(!isManualArtworkProduct(order.productType) ? getSubjectStep() : getExperienceStep())}
                      className="gap-2"
                    >
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    <Button
                      onClick={() => goToStep(getUploadStep())}
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
                  STEP 4: Upload Photo(s)
                 ═══════════════════════════════════════════ */}
              {step === getUploadStep() && !processing && (
                <div>
                  <SectionHeading
                    title={uploadCopy.title}
                    subtitle={uploadCopy.subtitle}
                  />

                  {order.category === "classic" ? (
                    /* Classic: single upload */
                    <>
                      {photo ? (
                        <div className="space-y-6">
                          <div className="overflow-hidden rounded-3xl border border-black/[0.04] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] bg-white p-2 max-w-sm mx-auto">
                            <div className="rounded-2xl overflow-hidden bg-[#FAFAFA] relative">
                              <img src={photo} alt="Uploaded" className="w-full max-h-72 object-contain animate-scale-in" />
                              {order.croppedArea && (
                                <span className="absolute top-3 left-3 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                                  Recadrée ✓
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="outline" onClick={() => { setPhoto("", 0); removePhoto(0); setPreviews([]); }} className="gap-2">
                              <Camera className="h-4 w-4" />
                              Changer la photo
                            </Button>
                            <Button variant="outline" onClick={() => setClassicCropDialogOpen(true)} className="gap-2">
                              <Crop className="h-4 w-4" />
                              {order.croppedArea ? "Modifier le recadrage" : "Recadrer la photo"}
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
                        maxPhotos={requiredPhotoCount}
                        onPhotoAdded={(dataUrl, idx) => {
                          setPhoto(dataUrl, idx);
                          // Auto-open crop dialog immediately after photo is added
                          setTimeout(() => openAiCropFlow([idx], getUploadStep()), 80);
                        }}
                        onPhotoRemoved={(idx) => removePhoto(idx)}
                        labels={getPhotoLabels(order.category)}
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
                    <Button variant="outline" onClick={() => goToStep(getFormatStep())} className="gap-2">
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                    {order.category !== "classic" && (
                      <Button
                        onClick={() => {
                          if (allAiPhotosCropped) {
                            goToStep(getAIStep());
                          } else {
                            handleStartAiCropFlow();
                          }
                        }}
                        disabled={
                          order.photos.filter(Boolean).length < requiredPhotoCount ||
                          (order.category === "kids_dream" && !order.dreamJob)
                        }
                        className="gap-2 btn-premium text-primary-foreground border-0 px-8"
                        size="lg"
                      >
                        {allAiPhotosCropped ? <>Continuer <NextIcon className="h-4 w-4" /></> : <>Recadrer les photos <Camera className="h-4 w-4" /></>}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  STEP 5 (AI categories): AI Generation
                 ═══════════════════════════════════════════ */}
              {isAICategory && step === getAIStep() && !processing && (
                <div className="space-y-8">
                  <SectionHeading
                    title={
                      order.category === "family"     ? "Fusionner vos photos" :
                      order.category === "kids_dream" ? "Créer la magie" :
                      "Créer votre portrait"
                    }
                    subtitle="L'IA Helma va transformer votre photo recadrée en une œuvre d'art unique."
                  />

                  {aiPreviewImages.length > 0 && (
                    <div className={`grid gap-4 ${aiPreviewImages.length > 1 ? "sm:grid-cols-2" : "max-w-sm mx-auto"}`}>
                      {aiPreviewImages.map((imageSrc, index) => (
                        <div key={`${imageSrc}-${index}`} className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm">
                          <div className="relative overflow-hidden rounded-xl border border-primary/15">
                            <img src={imageSrc} alt={getPhotoLabels(order.category)[index] || `Photo ${index + 1}`} className="aspect-square w-full object-cover" />
                            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                              Recadree
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{getPhotoLabels(order.category)[index] || `Photo ${index + 1}`}</p>
                              <p className="text-xs text-muted-foreground">Cadre optimise pour un meilleur rendu final.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleEditAiPhoto(index)}>
                              Modifier
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiGenerating ? (
                    <AIGenerationLoadingPanel
                      photoUrls={aiPreviewImages}
                      categoryLabel={CATEGORY_META[order.category]?.label || "portrait"}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Button
                        onClick={handleAIGenerate}
                        disabled={!allAiPhotosCropped}
                        className="gap-2 btn-premium text-primary-foreground border-0 px-10 h-14 text-base font-semibold shadow-lg"
                        size="lg"
                      >
                        <Wand2 className="h-5 w-5" />
                        Générer avec l'IA
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Cela peut prendre 30-120 secondes selon la charge du fournisseur.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-start">
                    <Button variant="outline" onClick={() => goToStep(getCropStep())} className="gap-2" disabled={aiGenerating}>
                      <BackIcon className="h-4 w-4" /> Retour
                    </Button>
                  </div>

                  {!aiGenerating && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                      Si la generation depasse environ 2 minutes, c'est souvent le fournisseur IA qui est lent ou une ancienne version de la fonction edge qui est encore deployee. Dans ce cas, relancez apres verification du deploiement.
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  CROP Step
                 ═══════════════════════════════════════════ */}
              {/* AI crop is now a dialog — no inline step */}

              {/* Classic crop is now a dialog — no inline step */}

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
                        selected={order.customStencilDataUrl ? null : order.stencilDetailLevel}
                        onSelect={(level) => { setCustomStencilDataUrl(""); setStencilDetailLevel(level); setStylePreviewUrl(stencilPreviews[level] || ""); }}
                        previewDataUrls={stencilPreviews}
                      />

                      <div className="mt-6 rounded-xl border-2 border-dashed border-border p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Ou importez votre propre pochoir (PNG noir & blanc)
                        </p>
                        <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors">
                          <Upload className="h-4 w-4" />
                          {order.customStencilDataUrl ? "Remplacer le pochoir" : "Importer un pochoir"}
                          <input
                            type="file"
                            accept="image/png,image/svg+xml,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCustomStencilUpload(file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {order.customStencilDataUrl && (
                          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600">
                            <Check className="h-4 w-4" />
                            Pochoir personnalisé importé
                          </div>
                        )}
                      </div>

                      <div className="mt-8 flex gap-3">
                        <Button variant="outline" onClick={() => goToStep(getCropStep())} className="gap-2">
                          <BackIcon className="h-4 w-4" /> {t.studio.back}
                        </Button>
                        <Button onClick={() => goToStep(getConfirmStep())} disabled={!order.stencilDetailLevel && !order.customStencilDataUrl} className="flex-1 gap-2 btn-premium text-primary-foreground border-0">
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

                      {/* Source image preview (Mobile Only) */}
                      {(order.aiGeneratedUrl || photo) && (
                        <div className="mb-8 flex justify-center lg:hidden">
                          <div className="relative rounded-[32px] overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] max-h-64 max-w-sm w-full bg-white p-2">
                             <div className="rounded-[24px] overflow-hidden bg-[#FAFAFA] h-full w-full">
                                <img
                                  src={order.aiGeneratedUrl || photo}
                                  className="w-full max-h-64 object-contain"
                                  alt="Votre photo"
                                />
                             </div>
                          </div>
                        </div>
                      )}

                      {/* Style cards — 3 columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

                      {/* Selected style result preview (Mobile Only) */}
                      {order.stylePreviewUrl && (
                        <div className="mt-8 flex justify-center lg:hidden">
                          <div className="relative rounded-[32px] overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] ring-1 ring-primary/20 max-h-72 max-w-sm w-full bg-white p-2">
                            <div className="rounded-[24px] overflow-hidden bg-[#FAFAFA] h-full w-full relative">
                              <img
                                src={order.stylePreviewUrl}
                                className="w-full max-h-72 object-contain animate-fade-in"
                                alt="Aperçu du style sélectionné"
                              />
                              <div className="absolute top-3 left-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 text-primary px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md">
                                  <Check className="h-3.5 w-3.5" /> Aperçu
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

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
                      <div className="rounded-[24px] border border-black/[0.04] bg-[#FAFAFA] p-6 shadow-sm">
                        <div className="mb-6 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground/80">Contact</h3>
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
                      <div className="rounded-[24px] border border-black/[0.04] bg-[#FAFAFA] p-6 shadow-sm">
                        <div className="mb-6 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground/80">Livraison</h3>
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
                      <div className="rounded-[24px] border border-black/[0.04] bg-[#FAFAFA] p-6 shadow-sm">
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
                    </div>

                    {/* Right: Premium Order Summary */}
                    <div className="lg:sticky lg:top-24 space-y-4">
                      <div className="rounded-[24px] border border-black/[0.04] overflow-hidden bg-white shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)]">
                        <div className="bg-[#FAFAFA] px-6 py-4 border-b border-black/[0.04]">
                          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                            Votre commande
                          </h3>
                        </div>
                        <div className="p-6 space-y-5">
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
                                <button onClick={() => goToStep(getFormatStep())} className="text-primary hover:text-primary/70 transition-colors"><Edit3 className="h-3 w-3" /></button>
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
      {order.selectedSize && activeAiCropIndex != null && activeAiCropImage && (
        <AiPhotoCropDialog
          open={aiCropDialogOpen}
          imageSrc={activeAiCropImage}
          kitSize={resolveProcessingKitSize(order.selectedSize)}
          photoIndex={activeAiCropIndex}
          totalPhotos={requiredPhotoCount}
          label={getPhotoLabels(order.category)[activeAiCropIndex] || `Photo ${activeAiCropIndex + 1}`}
          initialAdjustments={activeAiCropEdit?.adjustments}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseAiCropDialog();
            }
          }}
          onBack={handleCloseAiCropDialog}
          onCropComplete={handleAiCropComplete}
        />
      )}
      {/* Classic / stencil crop dialog */}
      {photo && order.selectedSize && (
        <Dialog open={classicCropDialogOpen} onOpenChange={(open) => {
          setClassicCropDialogOpen(open);
        }}>
          <DialogContent
            className="max-w-[min(100vw-1.5rem,900px)] p-0 overflow-hidden gap-0 rounded-[24px] border-black/[0.08]"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Camera className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Recadrage</p>
                <p className="text-[15px] font-bold text-foreground leading-tight">Ajustez votre photo</p>
              </div>
            </div>
            <CropScreen
              imageSrc={photo}
              kitSize={resolveProcessingKitSize(order.selectedSize)}
              onCropComplete={handleCropComplete}
              onBack={() => setClassicCropDialogOpen(false)}
              hideKitBadge
            />
          </DialogContent>
        </Dialog>
      )}
      <SaveProgressModal open={showSaveModal} onOpenChange={setShowSaveModal} step={step} />
    </div>
  );
};

export default Studio;






















