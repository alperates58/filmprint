const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (request.startsWith("@/")) {
    const target = path.join(process.cwd(), request.slice(2));
    if (fs.existsSync(target + ".ts")) return target + ".ts";
    if (fs.existsSync(target + ".tsx")) return target + ".tsx";
    if (fs.existsSync(target + ".js")) return target + ".js";
    if (fs.existsSync(path.join(target, "index.ts"))) return path.join(target, "index.ts");
    if (fs.existsSync(path.join(target, "index.js"))) return path.join(target, "index.js");
    return target;
  }
  return originalResolveFilename.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(content, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: process.cwd(),
      paths: { "@/*": ["./*"] },
    },
  });
  module._compile(result.outputText, filename);
};

const { runCatalogIngestionTests } = require("./catalog_ingestion.test.ts");

async function main() {
  console.log("===============================================================");
  console.log("RUNNING TMDB CATALOG INGESTION ENGINE TESTS");
  console.log("===============================================================\n");
  await runCatalogIngestionTests();
  console.log("\n===============================================================");
  console.log("ALL TMDB CATALOG INGESTION ENGINE TESTS PASSED SUCCESSFULLY");
  console.log("===============================================================\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
