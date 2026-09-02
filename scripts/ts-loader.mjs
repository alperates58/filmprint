import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relPath = specifier.slice(2);
    const basePath = path.resolve(process.cwd(), relPath);
    const extensions = [
      "",
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      "/index.ts",
      "/index.tsx",
      "/index.js",
    ];
    for (const ext of extensions) {
      const candidate = basePath + ext;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          shortCircuit: true,
          url: pathToFileURL(candidate).href,
        };
      }
    }
  }

  if (specifier.startsWith("next/")) {
    const sub = specifier.slice(5);
    const candidate = path.resolve(process.cwd(), "node_modules/next", `${sub}.js`);
    if (fs.existsSync(candidate)) {
      return {
        shortCircuit: true,
        url: pathToFileURL(candidate).href,
      };
    }
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = context.parentURL
      ? path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Z]:)/, "$1"))
      : process.cwd();
    const basePath = path.resolve(parentDir, specifier);
    const extensions = [
      "",
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      "/index.ts",
      "/index.tsx",
      "/index.js",
    ];
    for (const ext of extensions) {
      const candidate = basePath + ext;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          shortCircuit: true,
          url: pathToFileURL(candidate).href,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filePath,
    });
    return {
      format: "module",
      shortCircuit: true,
      source: outputText,
    };
  }
  return nextLoad(url, context);
}


