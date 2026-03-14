import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n";
import { OrderProvider } from "@/lib/store";
import Landing from "./pages/Landing";
import Studio from "./pages/Studio";
import ManualArtworkStudio from "./pages/ManualArtworkStudio";
import Confirmation from "./pages/Confirmation";
import Download from "./pages/Download";
import Track from "./pages/Track";
import Gallery from "./pages/Gallery";
import ViewerPage from "./pages/ViewerPage";
import MyPainting from "./pages/MyPainting";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminAbandonedCarts from "./pages/admin/AdminAbandonedCarts";
import AdminRegenerations from "./pages/admin/AdminRegenerations";
import AdminProduction from "./pages/admin/AdminProduction";
import { AdminLayout } from "./components/admin/AdminLayout";
import { WhatsAppButton } from "./components/shared/WhatsAppButton";

const queryClient = new QueryClient();
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <OrderProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={routerFutureFlags}>
            <WhatsAppButton />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/manual" element={<ManualArtworkStudio />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/download" element={<Download />} />
              <Route path="/track" element={<Track />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/viewer/:code" element={<ViewerPage />} />
              <Route path="/my-painting/:code" element={<MyPainting />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
              <Route path="/admin/coupons" element={<AdminLayout><AdminCoupons /></AdminLayout>} />
              <Route path="/admin/abandoned" element={<AdminLayout><AdminAbandonedCarts /></AdminLayout>} />
              <Route path="/admin/regenerations" element={<AdminLayout><AdminRegenerations /></AdminLayout>} />
              <Route path="/admin/production" element={<AdminLayout><AdminProduction /></AdminLayout>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrderProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
