import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "21600000000"; // Replace with actual number

export function WhatsAppButton() {
  const url = `https://wa.me/${encodeURIComponent(WHATSAPP_NUMBER)}?text=${encodeURIComponent("Bonjour, je suis intéressé par vos kits de peinture par numéros !")}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg hover:scale-110 transition-transform duration-200 hover:shadow-xl"
      aria-label="Contact WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
