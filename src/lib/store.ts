import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { Area } from "react-easy-crop";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { KitSize as CatalogKitSize } from "@/lib/kitCatalog";
import type { ImageAdjustments, PhotoEdit } from "@/lib/aiPhotoEdits";
import { isCreateOrderPayloadTooLarge, optimizeOrderImageSource } from "@/lib/orderImage";

export type OrderCategory = "classic" | "family" | "kids_dream" | "pet" | "superhero" | "couple" | "historical" | "scifi" | "anime";
export type KitSize = CatalogKitSize;
export type ArtStyle = "original" | "vintage" | "grayscale";
export type ProductType = "paint_by_numbers" | "stencil_paint" | "glitter_reveal";
export type StencilDetailLevel = "bold" | "medium" | "fine";
export type GlitterPalette = "mercury" | "mars" | "neptune" | "jupiter";
export type AddOnId = "extra_paint" | "gift_wrap" | "frame" | "extra_glitter";

export const MANUAL_ARTWORK_PRODUCTS: ProductType[] = ["stencil_paint", "glitter_reveal"];

export function isManualArtworkProduct(productType: ProductType) {
  return MANUAL_ARTWORK_PRODUCTS.includes(productType);
}

export const ADD_ONS = [
  { id: "extra_paint" as AddOnId, label: "Jeu de peintures supplémentaire", description: "Un jeu de rechange pour ne jamais manquer de couleurs.", price: 49, icon: "🎨", productTypes: ["paint_by_numbers"] as ProductType[] },
  { id: "extra_glitter" as AddOnId, label: "Kit de paillettes supplémentaire", description: "Un kit de paillettes supplémentaire pour plus de brillance.", price: 49, icon: "✨", productTypes: ["glitter_reveal"] as ProductType[] },
  { id: "gift_wrap" as AddOnId, label: "Emballage cadeau premium", description: "Boîte élégante avec ruban et carte personnalisée.", price: 29, icon: "🎁", productTypes: ["paint_by_numbers", "stencil_paint", "glitter_reveal"] as ProductType[] },
  { id: "frame" as AddOnId, label: "Cadre en bois", description: "Cadre en bois naturel pour exposer votre chef-d'œuvre.", price: 79, icon: "🖼️", productTypes: ["paint_by_numbers", "stencil_paint", "glitter_reveal"] as ProductType[] },
] as const;

export function getAvailableAddOns(productType: ProductType) {
  return ADD_ONS.filter((a) => (a.productTypes as readonly string[]).includes(productType));
}

export const PRODUCT_TYPE_META: Record<ProductType, { label: string; description: string; shortDescription: string; icon: string; features: string[] }> = {
  paint_by_numbers: {
    label: "Peinture par Numéros",
    description: "Kit classique avec toile numérotée et peintures acryliques",
    shortDescription: "Le classique Helma",
    icon: "🎨",
    features: ["9 catégories", "3 styles", "Génération IA", "PDF + Viewer"],
  },
  stencil_paint: {
    label: "Stencil Paint Reveal",
    description: "Peignez librement sur le pochoir, pelez pour révéler votre portrait en blanc",
    shortDescription: "Peignez, pelez, révélez !",
    icon: "🖌️",
    features: ["3 niveaux de détail", "Préparation artisanale", "Expérience révélable"],
  },
  glitter_reveal: {
    label: "Glitter Reveal",
    description: "Saupoudrez de paillettes, pelez le pochoir, révélez votre portrait scintillant",
    shortDescription: "Paillettes, pochoir, magie !",
    icon: "✨",
    features: ["4 palettes exclusives", "Préparation artisanale", "Expérience scintillante"],
  },
};

export const CATEGORY_THEMES: Partial<Record<OrderCategory, { key: string; label: string; icon: string }[]>> = {
  superhero: [
    { key: "generic",        label: "Héros Épique",        icon: "⚡" },
    { key: "superman",       label: "Superman",             icon: "🦸" },
    { key: "batman",         label: "Batman",               icon: "🦇" },
    { key: "spider-man",     label: "Spider-Man",           icon: "🕷️" },
    { key: "wonder-woman",   label: "Wonder Woman",         icon: "👑" },
    { key: "iron-man",       label: "Iron Man",             icon: "🤖" },
    { key: "captain",        label: "Captain America",      icon: "🛡️" },
    { key: "thor",           label: "Thor",                 icon: "🔨" },
    { key: "black-panther",  label: "Black Panther",        icon: "🐾" },
  ],
  couple: [
    { key: "romantic",  label: "Romantique",        icon: "💕" },
    { key: "paris",     label: "Paris",              icon: "🗼" },
    { key: "beach",     label: "Plage tropicale",    icon: "🏖️" },
    { key: "forest",    label: "Forêt enchantée",    icon: "🌲" },
    { key: "cafe",      label: "Café vintage",       icon: "☕" },
    { key: "tuscany",   label: "Toscane",            icon: "🌅" },
  ],
  historical: [
    { key: "renaissance",  label: "Renaissance",       icon: "🎨" },
    { key: "victorian",    label: "Ère Victorienne",   icon: "🎩" },
    { key: "egypt",        label: "Égypte Antique",    icon: "🏺" },
    { key: "belle-epoque", label: "Belle Époque",      icon: "🌹" },
    { key: "rome",         label: "Rome Antique",      icon: "🏛️" },
  ],
  scifi: [
    { key: "cyberpunk", label: "Cyberpunk",           icon: "🌆" },
    { key: "space",     label: "Explorateur Spatial", icon: "🚀" },
    { key: "dystopia",  label: "Post-Apocalyptique",  icon: "☢️" },
    { key: "starwars",  label: "Jedi / Sith",         icon: "⚔️" },
  ],
  anime: [
    { key: "anime-general", label: "Anime Classique", icon: "🎌" },
    { key: "ghibli",        label: "Studio Ghibli",   icon: "🌿" },
    { key: "action",        label: "Shonen Action",   icon: "💥" },
    { key: "romance",       label: "Shojo Romance",   icon: "🌸" },
    { key: "chibi",         label: "Chibi Kawaii",    icon: "🐱" },
  ],
  pet: [
    { key: "royal",      label: "Portrait Royal",       icon: "👑" },
    { key: "watercolor", label: "Aquarelle Douce",       icon: "🎨" },
    { key: "fantasy",    label: "Chevalier Fantastique", icon: "⚔️" },
    { key: "modern",     label: "Art Moderne",           icon: "🖼️" },
  ],
  family: [
    { key: "warm-studio", label: "Studio Chaleureux", icon: "✨" },
    { key: "outdoor",     label: "En Plein Air",      icon: "🌤️" },
    { key: "formal",      label: "Portrait Élégant",  icon: "🎭" },
  ],
};

export const STENCIL_DETAIL_META: Record<StencilDetailLevel, { label: string; description: string }> = {
  bold: { label: "Audacieux", description: "Silhouette simple et frappante — idéal pour débuter" },
  medium: { label: "Équilibré", description: "Bon mélange de forme et de détail facial" },
  fine: { label: "Détaillé", description: "Contours précis avec cheveux et traits du visage" },
};

export interface ContactInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface ShippingInfo {
  address: string;
  city: string;
  governorate: string;
  postalCode: string;
}

export interface OrderState {
  category: OrderCategory;
  productType: ProductType;
  photos: string[];
  photoEdits: Array<PhotoEdit | null>;
  croppedArea: Area | null;
  selectedStyle: ArtStyle | null;
  stylePreviewUrl: string;
  selectedSize: KitSize | null;
  addOns: AddOnId[];
  stencilDetailLevel: StencilDetailLevel | null;
  customStencilDataUrl: string;
  glitterPalette: GlitterPalette | null;
  contact: ContactInfo;
  shipping: ShippingInfo;
  orderRef: string;
  instructionCode: string;
  isGift: boolean;
  giftMessage: string;
  dedicationText: string; // Deprecated – always empty, kept for backward compat
  dreamJob: string;
  categoryTheme: string;
  aiGeneratedUrl: string;
  aiGenerationRunId: string;
  imageAdjustments: ImageAdjustments;
}

export function getPhoto(order: OrderState): string {
  return order.photos[0] || "";
}

const defaultContact: ContactInfo = { firstName: "", lastName: "", phone: "", email: "" };
const defaultShipping: ShippingInfo = { address: "", city: "", governorate: "", postalCode: "" };

const initialState: OrderState = {
  category: "classic",
  productType: "paint_by_numbers",
  photos: [],
  photoEdits: [],
  croppedArea: null,
  selectedStyle: null,
  stylePreviewUrl: "",
  selectedSize: null,
  addOns: [],
  stencilDetailLevel: null,
  customStencilDataUrl: "",
  glitterPalette: null,
  contact: { ...defaultContact },
  shipping: { ...defaultShipping },
  orderRef: "",
  instructionCode: "",
  isGift: false,
  giftMessage: "",
  dedicationText: "",
  dreamJob: "",
  categoryTheme: "generic",
  aiGeneratedUrl: "",
  aiGenerationRunId: "",
  imageAdjustments: { brightness: 100, contrast: 100 },
};

interface OrderContextType {
  order: OrderState;
  setCategory: (category: OrderCategory) => void;
  setProductType: (productType: ProductType) => void;
  setPhoto: (photo: string, index?: number) => void;
  removePhoto: (index: number) => void;
  setPhotoEdit: (index: number, edit: PhotoEdit | null) => void;
  clearPhotoEdits: () => void;
  setCroppedArea: (area: Area) => void;
  setStyle: (style: ArtStyle, previewUrl: string) => void;
  setStylePreviewUrl: (previewUrl: string) => void;
  setSize: (size: KitSize) => void;
  setAddOns: (addOns: AddOnId[]) => void;
  setStencilDetailLevel: (level: StencilDetailLevel) => void;
  setCustomStencilDataUrl: (url: string) => void;
  setGlitterPalette: (palette: GlitterPalette) => void;
  setContact: (contact: ContactInfo) => void;
  setShipping: (shipping: ShippingInfo) => void;
  setGift: (isGift: boolean, message: string) => void;
  setDedicationText: (dedicationText: string) => void;
  setDreamJob: (job: string) => void;
  setCategoryTheme: (theme: string) => void;
  setAiGeneratedUrl: (url: string, generationRunId?: string) => void;
  setImageAdjustments: (adjustments: ImageAdjustments) => void;
  confirmOrder: (input: {
    contact: ContactInfo;
    shipping: ShippingInfo;
    isGift: boolean;
    giftMessage: string;
    dedicationText?: string | null;
    couponCode?: string | null;
    sessionId?: string | null;
  }) => Promise<{
    orderRef: string;
    instructionCode: string;
    totalPrice: number;
    discountAmount: number;
    emailSent: boolean;
  }>;
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderState>(initialState);
  const orderRef = useRef(order);
  orderRef.current = order;

  const setCategory = useCallback((category: OrderCategory) => setOrder((o) => ({
    ...o,
    category,
    photos: [],
    photoEdits: [],
    croppedArea: null,
    selectedStyle: null,
    stylePreviewUrl: "",
    dreamJob: "",
    aiGeneratedUrl: "",
    aiGenerationRunId: "",
  })), []);
  const setProductType = useCallback((productType: ProductType) => setOrder((o) => ({
    ...o,
    productType,
    selectedStyle: null,
    stylePreviewUrl: "",
    stencilDetailLevel: null,
    customStencilDataUrl: "",
    glitterPalette: null,
    addOns: o.addOns.filter((id) => getAvailableAddOns(productType).some((a) => a.id === id)),
  })), []);
  const setPhoto = useCallback((photo: string, index = 0) => setOrder((o) => {
    const photos = [...o.photos];
    const photoEdits = [...o.photoEdits];
    photos[index] = photo;
    photoEdits[index] = null;
    return {
      ...o,
      photos,
      photoEdits,
      croppedArea: null,
      selectedStyle: null,
      stylePreviewUrl: "",
      aiGeneratedUrl: "",
      aiGenerationRunId: "",
      imageAdjustments: { brightness: 100, contrast: 100 },
    };
  }), []);
  const removePhoto = useCallback((index: number) => setOrder((o) => {
    const photos = o.photos.filter((_, i) => i !== index);
    const photoEdits = o.photoEdits.filter((_, i) => i !== index);
    return {
      ...o,
      photos,
      photoEdits,
      croppedArea: null,
      selectedStyle: null,
      stylePreviewUrl: "",
      aiGeneratedUrl: "",
      aiGenerationRunId: "",
      imageAdjustments: { brightness: 100, contrast: 100 },
    };
  }), []);
  const setPhotoEdit = useCallback((index: number, edit: PhotoEdit | null) => setOrder((o) => {
    const photoEdits = [...o.photoEdits];
    photoEdits[index] = edit;
    return { ...o, photoEdits };
  }), []);
  const clearPhotoEdits = useCallback(() => setOrder((o) => ({ ...o, photoEdits: [] })), []);
  const setCroppedArea = useCallback((croppedArea: Area) => setOrder((o) => ({ ...o, croppedArea })), []);
  const setStyle = useCallback((selectedStyle: ArtStyle, stylePreviewUrl: string) => setOrder((o) => ({ ...o, selectedStyle, stylePreviewUrl })), []);
  const setStylePreviewUrl = useCallback((stylePreviewUrl: string) => setOrder((o) => ({ ...o, stylePreviewUrl })), []);
  const setSize = useCallback((selectedSize: KitSize) => setOrder((o) => ({ ...o, selectedSize })), []);
  const setAddOns = useCallback((addOns: AddOnId[]) => setOrder((o) => ({ ...o, addOns })), []);
  const setContact = useCallback((contact: ContactInfo) => setOrder((o) => ({ ...o, contact })), []);
  const setShipping = useCallback((shipping: ShippingInfo) => setOrder((o) => ({ ...o, shipping })), []);
  const setGift = useCallback((isGift: boolean, giftMessage: string) => setOrder((o) => ({ ...o, isGift, giftMessage })), []);
  const setDedicationText = useCallback((dedicationText: string) => setOrder((o) => ({ ...o, dedicationText })), []);
  const setDreamJob = useCallback((dreamJob: string) => setOrder((o) => ({ ...o, dreamJob })), []);
  const setCategoryTheme = useCallback((categoryTheme: string) => setOrder((o) => ({ ...o, categoryTheme })), []);
  const setAiGeneratedUrl = useCallback((aiGeneratedUrl: string, aiGenerationRunId = "") => setOrder((o) => ({ ...o, aiGeneratedUrl, aiGenerationRunId })), []);
  const setImageAdjustments = useCallback((imageAdjustments: ImageAdjustments) => setOrder((o) => ({ ...o, imageAdjustments })), []);
  const setStencilDetailLevel = useCallback((stencilDetailLevel: StencilDetailLevel) => setOrder((o) => ({ ...o, stencilDetailLevel })), []);
  const setCustomStencilDataUrl = useCallback((customStencilDataUrl: string) => setOrder((o) => ({ ...o, customStencilDataUrl })), []);
  const setGlitterPalette = useCallback((glitterPalette: GlitterPalette) => setOrder((o) => ({ ...o, glitterPalette })), []);

  const confirmOrder = useCallback(async (input: {
    contact: ContactInfo;
    shipping: ShippingInfo;
    isGift: boolean;
    giftMessage: string;
    dedicationText?: string | null;
    couponCode?: string | null;
    sessionId?: string | null;
  }) => {
    const latest = orderRef.current;
    const snapshot = {
      ...latest,
      contact: input.contact,
      shipping: input.shipping,
      isGift: input.isGift,
      giftMessage: input.giftMessage,
      dedicationText: input.dedicationText ?? latest.dedicationText,
    };

    if (!snapshot.selectedSize) {
      throw new Error("Order is missing size");
    }
    if (!snapshot.croppedArea) {
      throw new Error("Order is missing crop");
    }
    if (snapshot.productType === "paint_by_numbers" && !snapshot.selectedStyle) {
      throw new Error("Order is missing style");
    }

    const photos = (await Promise.all(
      snapshot.photos
        .filter(Boolean)
        .map((photo) => optimizeOrderImageSource(photo))
    )).filter(Boolean);
    const aiGeneratedUrl = snapshot.aiGeneratedUrl
      ? await optimizeOrderImageSource(snapshot.aiGeneratedUrl)
      : undefined;

    const requestBody = {
      category: snapshot.category,
      productType: snapshot.productType,
      photos,
      aiGeneratedUrl: aiGeneratedUrl || undefined,
      generationRunId: snapshot.aiGenerationRunId || undefined,
      selectedStyle: snapshot.selectedStyle,
      selectedSize: snapshot.selectedSize,
      croppedArea: snapshot.croppedArea,
      imageAdjustments: snapshot.imageAdjustments,
      stencilDetailLevel: snapshot.stencilDetailLevel || null,
      glitterPalette: snapshot.glitterPalette || null,
      contact: snapshot.contact,
      shipping: snapshot.shipping,
      isGift: snapshot.isGift,
      giftMessage: snapshot.giftMessage,
      dedicationText: snapshot.dedicationText || null,
      dreamJob: snapshot.dreamJob || undefined,
      couponCode: input.couponCode || null,
      sessionId: input.sessionId || null,
    };

    if (isCreateOrderPayloadTooLarge(requestBody)) {
      throw new Error("ORDER_PAYLOAD_TOO_LARGE");
    }

    const { data, error } = await supabase.functions.invoke("create-order", {
      body: requestBody,
    });

    if (error) {
      const response = (error as { context?: Response }).context;
      if (response instanceof Response) {
        const payload = await response.clone().json().catch(() => null) as { error?: string } | null;
        if (payload?.error) {
          throw new Error(payload.error);
        }
      }
      throw error;
    }
    if (data?.error) throw new Error(data.error);

    const result = {
      orderRef: data.orderRef as string,
      instructionCode: data.instructionCode as string,
      totalPrice: data.totalPrice as number,
      discountAmount: data.discountAmount as number,
      emailSent: Boolean(data.emailSent),
    };

    setOrder((current) => ({
      ...current,
      contact: input.contact,
      shipping: input.shipping,
      isGift: input.isGift,
      giftMessage: input.giftMessage,
      dedicationText: input.dedicationText ?? current.dedicationText,
      orderRef: result.orderRef,
      instructionCode: result.instructionCode,
    }));

    return result;
  }, []);

  const resetOrder = useCallback(() => setOrder(initialState), []);

  return React.createElement(
    OrderContext.Provider,
    { value: { order, setCategory, setProductType, setPhoto, removePhoto, setPhotoEdit, clearPhotoEdits, setCroppedArea, setStyle, setStylePreviewUrl, setSize, setAddOns, setStencilDetailLevel, setCustomStencilDataUrl, setGlitterPalette, setContact, setShipping, setGift, setDedicationText, setDreamJob, setCategoryTheme, setAiGeneratedUrl, setImageAdjustments, confirmOrder, resetOrder } },
    children,
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}

export { KIT_LABELS as SIZE_LABELS, KIT_ORIGINAL_PRICING as ORIGINAL_PRICING, KIT_PRICING as PRICING } from "@/lib/kitCatalog";

export const BUNDLE_PRICE = 749;
export const BUNDLE_ORIGINAL = 898;

export const CATEGORY_META: Record<OrderCategory, { label: string; description: string; photosNeeded: number; icon: string }> = {
  classic: { label: "Portrait Classique", description: "Votre photo transformée en peinture par numéros", photosNeeded: 1, icon: "🎨" },
  family: { label: "Famille & Duo", description: "Réunissez 2 photos en une scène unique grâce à l'IA", photosNeeded: 2, icon: "👨‍👩‍👧" },
  kids_dream: { label: "Rêve d'Enfant", description: "Votre enfant dans le métier de ses rêves", photosNeeded: 1, icon: "🚀" },
  pet: { label: "Portrait Royal", description: "Votre animal en portrait royal renaissance", photosNeeded: 1, icon: "👑" },
  superhero: { label: "Héros Épique", description: "Transformez-vous en héros de film d'action", photosNeeded: 1, icon: "🦸" },
  couple: { label: "Romance & Couple", description: "Une scène romantique unique rêvée par l'IA", photosNeeded: 2, icon: "💑" },
  historical: { label: "Époque Vintage", description: "Plongez dans les années 20 ou la Renaissance", photosNeeded: 1, icon: "🎩" },
  scifi: { label: "Cyberpunk 2077", description: "Votre portrait dans un univers futuriste néon", photosNeeded: 1, icon: "🤖" },
  anime: { label: "Manga & Anime", description: "Votre photo illustrée façon animation japonaise", photosNeeded: 1, icon: "🌸" },
};

export const DREAM_JOBS = [
  { key: "astronaut", label: "Astronaute", emoji: "🧑‍🚀" },
  { key: "doctor", label: "Médecin", emoji: "👨‍⚕️" },
  { key: "footballer", label: "Footballeur", emoji: "⚽" },
  { key: "chef", label: "Chef cuisinier", emoji: "👨‍🍳" },
  { key: "pilot", label: "Pilote d'avion", emoji: "✈️" },
  { key: "firefighter", label: "Pompier", emoji: "🧑‍🚒" },
  { key: "scientist", label: "Scientifique", emoji: "🔬" },
  { key: "artist", label: "Artiste peintre", emoji: "🎨" },
  { key: "superhero", label: "Super-héros", emoji: "🦸" },
  { key: "princess", label: "Princesse / Prince", emoji: "👸" },
];

export const TUNISIAN_GOVERNORATES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba",
  "Nabeul", "Zaghouan", "Bizerte", "Béja",
  "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan",
  "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

