import { useState, useEffect } from "react";
import { ShoppingBag, X } from "lucide-react";

const ORDERS = [
  { name: "Amira", city: "Sousse", size: "40×50", style: "Original" },
  { name: "Yassine", city: "Tunis", size: "30×40", style: "Vintage" },
  { name: "Nour", city: "Sfax", size: "40×50", style: "Pop Art" },
  { name: "Salma", city: "Nabeul", size: "30×40", style: "Original" },
  { name: "Amine", city: "Bizerte", size: "40×50", style: "Vintage" },
  { name: "Fatma", city: "Monastir", size: "40×50", style: "Pop Art" },
  { name: "Khalil", city: "Kairouan", size: "30×40", style: "Original" },
  { name: "Rania", city: "Gabès", size: "40×50", style: "Vintage" },
  { name: "Mehdi", city: "Ariana", size: "30×40", style: "Pop Art" },
  { name: "Ines", city: "Mahdia", size: "40×50", style: "Original" },
];

function getTimeAgo() {
  const mins = Math.floor(Math.random() * 45) + 2;
  return `il y a ${mins} min`;
}

export function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(ORDERS[0]);
  const [timeAgo, setTimeAgo] = useState(getTimeAgo());
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (dismissed) return;

    // First show after 8 seconds
    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, 8000);

    return () => clearTimeout(initialTimer);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        const nextIndex = (index + 1) % ORDERS.length;
        setIndex(nextIndex);
        setCurrentOrder(ORDERS[nextIndex]);
        setTimeAgo(getTimeAgo());
        setVisible(true);
      }, 1000);
    }, 30000);

    return () => clearInterval(interval);
  }, [index, dismissed]);

  // Auto-hide after 6 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-20 start-4 z-40 animate-[slide-in-left_0.4s_ease-out]">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-xl max-w-[300px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">
            <span className="font-bold">{currentOrder.name}</span> de{" "}
            <span className="text-primary font-semibold">{currentOrder.city}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            a commandé un portrait {currentOrder.size} {currentOrder.style}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
