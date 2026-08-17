import fs from "fs";
import path from "path";
import assert from "assert";

export async function runPwaTests() {
  const publicDir = fs.existsSync(path.join(process.cwd(), "public"))
    ? path.join(process.cwd(), "public")
    : path.join(__dirname, "..", "public");

  // 1. Manifest Audit
  const manifestPath = path.join(publicDir, "manifest.webmanifest");
  assert.strictEqual(fs.existsSync(manifestPath), true, "manifest.webmanifest must exist in public/");

  const manifestContent = fs.readFileSync(manifestPath, "utf8");
  const manifestJson = JSON.parse(manifestContent);

  assert.strictEqual(manifestJson.name, "SineAI", "Manifest name must be SineAI");
  assert.strictEqual(manifestJson.short_name, "SineAI", "Manifest short_name must be SineAI");
  assert.strictEqual(manifestJson.start_url, "/", "Manifest start_url must be /");
  assert.strictEqual(manifestJson.display, "standalone", "Manifest display must be standalone");
  assert.ok(
    manifestJson.theme_color === "#0b0d14" || manifestJson.theme_color === "#09090b",
    "Manifest theme_color must match SineAI dark theme"
  );
  assert.ok(
    manifestJson.background_color === "#0b0d14" || manifestJson.background_color === "#09090b",
    "Manifest background_color must match SineAI dark theme"
  );
  assert.strictEqual(manifestJson.lang, "tr", "Manifest lang must be tr");
  assert.ok(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 2, "Manifest must declare icons");

  // 2. Service Worker Policy Audit
  const swPath = path.join(publicDir, "sw.js");
  assert.strictEqual(fs.existsSync(swPath), true, "sw.js must exist in public/");

  const swContent = fs.readFileSync(swPath, "utf8");
  assert.ok(swContent.includes("filmprint-static-v1"), "sw.js must use versioned static cache");
  assert.ok(swContent.includes("/api/"), "sw.js must inspect /api/ requests");
  assert.ok(swContent.includes("navigate"), "sw.js must handle navigation requests");
  assert.ok(swContent.includes("/offline.html"), "sw.js must reference /offline.html fallback");

  // 3. Offline Fallback Audit
  const offlinePath = path.join(publicDir, "offline.html");
  assert.strictEqual(fs.existsSync(offlinePath), true, "offline.html must exist in public/");

  const offlineContent = fs.readFileSync(offlinePath, "utf8");
  assert.ok(offlineContent.includes("SINEAI"), "offline.html must show SINEAI brand");
  assert.ok(offlineContent.includes("Şu anda internet bağlantısı yok."), "offline.html must show offline status message");
  assert.ok(offlineContent.includes("Tekrar Dene"), "offline.html must provide Tekrar Dene button");

  // 4. Icon Files Audit
  assert.strictEqual(fs.existsSync(path.join(publicDir, "icons", "icon-192.png")), true, "icon-192.png must exist");
  assert.strictEqual(fs.existsSync(path.join(publicDir, "icons", "icon-512.png")), true, "icon-512.png must exist");
  assert.strictEqual(fs.existsSync(path.join(publicDir, "icons", "icon-192-maskable.png")), true, "icon-192-maskable.png must exist");
  assert.strictEqual(fs.existsSync(path.join(publicDir, "icons", "icon-512-maskable.png")), true, "icon-512-maskable.png must exist");
  assert.strictEqual(fs.existsSync(path.join(publicDir, "apple-touch-icon.png")), true, "apple-touch-icon.png must exist");

  console.log("✓ PWA & Safe Offline Foundation audit tests passed.");
}
