import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Some dependencies (monaco / bundled TypeScript lib declarations) embed file
// contents that still contain trailing `//# sourceMappingURL=*.d.ts.map` comment
// lines. Those land as standalone lines in the final bundle, and Django's
// ManifestStaticFilesStorage treats any `^//# sourceMappingURL=` line as a real
// asset reference — failing collectstatic with MissingFileError for a .map that
// does not exist. We don't ship sourcemaps (sourcemap: false), so stripping these
// comment lines is safe and keeps the bundle usable under manifest static storage.
function stripSourceMappingComments(): Plugin {
  return {
    name: "strip-sourcemap-comments",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk") {
          file.code = file.code.replace(/^\/\/# sourceMappingURL=.*$/gm, "");
        }
      }
    },
  };
}

// Builds a single self-contained IIFE bundle (React is inlined, NOT external)
// so the editor runs in any Django admin without an importmap or a host React.
// Output lands directly in the Python package's static dir with stable names;
// cache-busting is delegated to Django's ManifestStaticFilesStorage.
export default defineConfig({
  plugins: [react(), stripSourceMappingComments()],
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
