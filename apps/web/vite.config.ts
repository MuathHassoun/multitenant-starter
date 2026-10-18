import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser talks to /api on the same origin; Vite forwards it to the Next.js API (no CORS needed in dev).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:4000" } },
});
