import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  cacheDir: "/private/tmp/qc-prototype-vite-cache",
  build: {
    cssMinify: false,
  },
});
