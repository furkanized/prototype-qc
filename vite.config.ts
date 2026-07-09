import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev tooling assigns a port via the PORT env var; fall back to Vite defaults.
const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: envPort,
  },
  build: {
    cssMinify: false,
  },
  preview: {
    port: envPort,
    allowedHosts: [
      "humble-achievement-production-94d8.up.railway.app"
    ]
  }
});
