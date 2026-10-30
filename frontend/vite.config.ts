import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Builds a single self-contained IIFE bundle (React is inlined, NOT external)
// so the editor runs in any Django admin without an importmap or a host React.
// Output lands directly in the Python package's static dir with stable names;
// cache-busting is delegated to Django's ManifestStaticFilesStorage.
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: resolve(__dirname, "../src/django_jdm_editor/static/django_jdm_editor"),
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "DjangoJDMEditor",
      formats: ["iife"],
      fileName: () => "jdm-editor.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "jdm-editor.js",
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith(".css")) {
            return "jdm-editor.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
