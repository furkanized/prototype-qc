import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: false,
  },
  preview: {
    allowedHosts: [
      "humble-achievement-production-94d8.up.railway.app"
    ]
  }
});
