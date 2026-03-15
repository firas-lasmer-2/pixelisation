import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Legacy redirect: /studio/manual → /studio with product query param preserved.
 * The unified Studio page now handles all product types.
 */
const ManualArtworkStudio = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const product = searchParams.get("product") || "stencil_paint";
    const resume = searchParams.get("resume");
    const params = new URLSearchParams();
    params.set("product", product);
    if (resume) params.set("resume", resume);
    navigate(`/studio?${params.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  return null;
};

export default ManualArtworkStudio;
