import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateLegacyStorage } from "@/lib/brand";

migrateLegacyStorage();

createRoot(document.getElementById("root")!).render(<App />);
