import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: [
      "humble-achievement-production-94d8.up.railway.app"
    ]
  }
});
