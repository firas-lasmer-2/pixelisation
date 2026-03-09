import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Area } from "react-easy-crop";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrderCategory = "classic" | "family" | "kids_dream" | "pet";
export type KitSize = "stamp_kit_40x50" | "stamp_kit_30x40" | "stamp_kit_A4";
export type ArtStyle = "original" | "vintage" | "pop_art";

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
  photos: string[];
  croppedArea: Area | null;
  selectedStyle: ArtStyle | null;
  stylePreviewUrl: string;
  selectedSize: KitSize | null;
  contact: ContactInfo;
  shipping: ShippingInfo;
  orderRef: string;
  instructionCode: string;
  isGift: boolean;
  giftMessage: string;
  dedicationText: string;
  dreamJob: string;
  aiGeneratedUrl: string;
  aiGenerationRunId: string;
}

/** Backward compat: first photo */
export function getPhoto(order: OrderState): string {
  return order.photos[0] || "";
}

const defaultContact: ContactInfo = { firstName: "", lastName: "", phone: "", email: "" };
const defaultShipping: ShippingInfo = { address: "", city: "", governorate: "", postalCode: "" };

const initialState: OrderState = {
  category: "classic",
  photos: [],
  croppedArea: null,
  selectedStyle: null,
  stylePreviewUrl: "",
  selectedSize: null,
  contact: { ...defaultContact },
  shipping: { ...defaultShipping },
  orderRef: "",
  instructionCode: "",
  isGift: false,
  giftMessage: "",
  dedicationText: "",
  dreamJob: "",
  aiGeneratedUrl: "",
  aiGenerationRunId: "",
};

interface OrderContextType {
  order: OrderState;
  setCategory: (category: OrderCategory) => void;
  setPhoto: (photo: string, index?: number) => void;
  removePhoto: (index: number) => void;
  setCroppedArea: (area: Area) => void;
  setStyle: (style: ArtStyle, previewUrl: string) => void;
  setSize: (size: KitSize) => void;
  setContact: (contact: ContactInfo) => void;
  setShipping: (shipping: ShippingInfo) => void;
  setGift: (isGift: boolean, message: string) => void;
  setDedicationText: (dedicationText: string) => void;
  setDreamJob: (job: string) => void;
  setAiGeneratedUrl: (url: string, generationRunId?: string) => void;
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

  const setCategory = useCallback((category: OrderCategory) => setOrder((o) => ({
    ...o,
    category,
    photos: [],
    croppedArea: null,
    selectedStyle: null,
    stylePreviewUrl: "",
    dreamJob: "",
    aiGeneratedUrl: "",
    aiGenerationRunId: "",
  })), []);
  const setPhoto = useCallback((photo: string, index = 0) => setOrder((o) => {
    const photos = [...o.photos];
    photos[index] = photo;
    return { ...o, photos };
  }), []);
  const removePhoto = useCallback((index: number) => setOrder((o) => {
    const photos = o.photos.filter((_, i) => i !== index);
    return { ...o, photos };
  }), []);
  const setCroppedArea = useCallback((croppedArea: Area) => setOrder((o) => ({ ...o, croppedArea })), []);
  const setStyle = useCallback((selectedStyle: ArtStyle, stylePreviewUrl: string) => setOrder((o) => ({ ...o, selectedStyle, stylePreviewUrl })), []);
  const setSize = useCallback((selectedSize: KitSize) => setOrder((o) => ({ ...o, selectedSize })), []);
  const setContact = useCallback((contact: ContactInfo) => setOrder((o) => ({ ...o, contact })), []);
  const setShipping = useCallback((shipping: ShippingInfo) => setOrder((o) => ({ ...o, shipping })), []);
  const setGift = useCallback((isGift: boolean, giftMessage: string) => setOrder((o) => ({ ...o, isGift, giftMessage })), []);
  const setDedicationText = useCallback((dedicationText: string) => setOrder((o) => ({ ...o, dedicationText })), []);
  const setDreamJob = useCallback((dreamJob: string) => setOrder((o) => ({ ...o, dreamJob })), []);
  const setAiGeneratedUrl = useCallback((aiGeneratedUrl: string, aiGenerationRunId = "") => setOrder((o) => ({ ...o, aiGeneratedUrl, aiGenerationRunId })), []);

  const confirmOrder = useCallback(async (input: {
    contact: ContactInfo;
    shipping: ShippingInfo;
    isGift: boolean;
    giftMessage: string;
    dedicationText?: string | null;
    couponCode?: string | null;
    sessionId?: string | null;
  }) => {
    const snapshot = {
      ...order,
      contact: input.contact,
      shipping: input.shipping,
      isGift: input.isGift,
      giftMessage: input.giftMessage,
      dedicationText: input.dedicationText ?? order.dedicationText,
    };

    if (!snapshot.selectedSize || !snapshot.selectedStyle) {
      throw new Error("Order is missing size or style");
    }

    const { data, error } = await supabase.functions.invoke("create-order", {
      body: {
        category: snapshot.category,
        photos: snapshot.photos,
        aiGeneratedUrl: snapshot.aiGeneratedUrl || undefined,
        generationRunId: snapshot.aiGenerationRunId || undefined,
        selectedStyle: snapshot.selectedStyle,
        selectedSize: snapshot.selectedSize,
        contact: snapshot.contact,
        shipping: snapshot.shipping,
        isGift: snapshot.isGift,
        giftMessage: snapshot.giftMessage,
        dedicationText: snapshot.dedicationText || null,
        dreamJob: snapshot.dreamJob || undefined,
        couponCode: input.couponCode || null,
        sessionId: input.sessionId || null,
      },
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
  }, [order]);

  const resetOrder = useCallback(() => setOrder(initialState), []);

  return React.createElement(
    OrderContext.Provider,
    { value: { order, setCategory, setPhoto, removePhoto, setCroppedArea, setStyle, setSize, setContact, setShipping, setGift, setDedicationText, setDreamJob, setAiGeneratedUrl, confirmOrder, resetOrder } },
    children
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}

export const PRICING: Record<KitSize, number> = {
  stamp_kit_40x50: 449,
  stamp_kit_30x40: 349,
  stamp_kit_A4: 249,
};

export const ORIGINAL_PRICING: Record<KitSize, number> = {
  stamp_kit_40x50: 549,
  stamp_kit_30x40: 429,
  stamp_kit_A4: 329,
};

export const BUNDLE_PRICE = 749;
export const BUNDLE_ORIGINAL = 898;

export const SIZE_LABELS: Record<KitSize, string> = {
  stamp_kit_40x50: "40 × 50 cm",
  stamp_kit_30x40: "30 × 40 cm",
  stamp_kit_A4: "A4 (21 × 30 cm)",
};

export const CATEGORY_META: Record<OrderCategory, { label: string; description: string; photosNeeded: number; icon: string }> = {
  classic: { label: "Portrait Classique", description: "Votre photo transformée en peinture par numéros", photosNeeded: 1, icon: "🎨" },
  family: { label: "Famille & Duo", description: "Réunissez 2 photos en une scène unique grâce à l'IA", photosNeeded: 2, icon: "👨‍👩‍👧" },
  kids_dream: { label: "Rêve d'Enfant", description: "Votre enfant dans le métier de ses rêves", photosNeeded: 1, icon: "🚀" },
  pet: { label: "Portrait Royal", description: "Votre animal en portrait royal renaissance", photosNeeded: 1, icon: "👑" },
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
