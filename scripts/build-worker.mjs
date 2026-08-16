import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function build() {
  const ts = require("typescript");

  const outdir = path.join(process.cwd(), "dist");
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  console.log("[Build Worker] Compiling standalone background worker scripts with TypeScript...");

  const rootFiles = [
    path.join(process.cwd(), "scripts", "catalog-worker.ts"),
    path.join(process.cwd(), "scripts", "catalog-ingest.ts"),
    path.join(process.cwd(), "scripts", "catalog-status.ts"),
  ];

  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    outDir: outdir,
    rootDir: process.cwd(),
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    baseUrl: process.cwd(),
    paths: {
      "@/*": ["./*"],
    },
  };

  const program = ts.createProgram(rootFiles, compilerOptions);
  const emitResult = program.emit();

  // Rewrite @/ aliases to relative paths in emitted dist files
  const findJsFiles = (dir) => {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findJsFiles(fullPath));
      } else if (entry.name.endsWith(".js")) {
        results.push(fullPath);
      }
    }
    return results;
  };

  const distFiles = findJsFiles(outdir);

  for (const file of distFiles) {
    let content = fs.readFileSync(file, "utf8");
    const dir = path.dirname(file);

    content = content.replace(/require\(['"]@\/([^'"]+)['"]\)/g, (_, match) => {
      const targetAbs = path.join(outdir, match);
      let relPath = path.relative(dir, targetAbs).replace(/\\/g, "/");
      if (!relPath.startsWith(".")) {
        relPath = `./${relPath}`;
      }
      return `require("${relPath}")`;
    });

    fs.writeFileSync(file, content);
  }

  // Create shortcuts in dist root for ease of use
  const shortcuts = [
    { src: "scripts/catalog-worker.js", dest: "catalog-worker.js" },
    { src: "scripts/catalog-ingest.js", dest: "catalog-ingest.js" },
    { src: "scripts/catalog-status.js", dest: "catalog-status.js" },
  ];

  for (const { src, dest } of shortcuts) {
    const srcPath = path.join(outdir, src);
    const destPath = path.join(outdir, dest);
    if (fs.existsSync(srcPath)) {
      fs.writeFileSync(destPath, `require("./${src.replace(/\\/g, "/")}");\n`);
    }
  }

  console.log("[Build Worker] Successfully compiled production worker bundle to dist/!");
}

build().catch((err) => {
  console.error("[Build Worker] Build failed:", err);
  process.exit(1);
});
