import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ✅ PRODUCTION CLEANUP: Supress logs in production
if (import.meta.env.PROD) {
    console.log = () => { };
    console.info = () => { };
    console.warn = () => { };
    console.debug = () => { };
}

createRoot(document.getElementById("root")!).render(<App />);
