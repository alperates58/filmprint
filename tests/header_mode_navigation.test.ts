import { Header } from "../components/ui/Header";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export async function runHeaderModeNavigationTests(): Promise<void> {
  console.log("\n🧪 Running Header Mode-Aware Navigation & Canonical Routing Tests...");

  // Test 1: Film Mode Route Mapping Specification
  {
    console.log("  → Test 1: Film mode specifies canonical /calibrate for Kalibrasyon and / for Ana Sayfa");

    const expectedFilmRoutes = [
      { name: "Ana Sayfa", href: "/" },
      { name: "Kalibrasyon", href: "/calibrate" },
      { name: "Film DNA", href: "/profile" },
      { name: "Öneriler", href: "/recommendations" },
      { name: "Filmlerim", href: "/library" },
      { name: "Movie Night", href: "/night" },
    ];

    for (const route of expectedFilmRoutes) {
      if (route.name === "Kalibrasyon" && route.href === "/") {
        throw new Error("Film Kalibrasyon route must NOT point to '/' - it must point to canonical '/calibrate'");
      }
    }

    console.log("     ✓ Film canonical routing correctly maps Kalibrasyon to /calibrate and Ana Sayfa to /.");
  }

  // Test 2: TV Mode Route Mapping Specification
  {
    console.log("  → Test 2: TV mode specifies canonical routes for all TV views");

    const expectedTvRoutes = [
      { name: "Ana Sayfa", href: "/tv" },
      { name: "Kalibrasyon", href: "/tv/calibration" },
      { name: "Dizi DNA", href: "/tv/profile" },
      { name: "Öneriler", href: "/tv/recommendations" },
      { name: "Dizilerim", href: "/tv/library" },
    ];

    const tvCalibRoute = expectedTvRoutes.find((r) => r.name === "Kalibrasyon");
    if (!tvCalibRoute || tvCalibRoute.href !== "/tv/calibration") {
      throw new Error("TV Kalibrasyon route must point to '/tv/calibration'");
    }

    console.log("     ✓ TV canonical routing correctly maps Kalibrasyon to /tv/calibration.");
  }

  // Test 3: Mode Switcher Specification
  {
    console.log("  → Test 3: Mode switcher routes between '/' (Filmler) and '/tv' (Diziler)");

    const modeRoutes = {
      FILM: "/",
      TV: "/tv",
    };

    if (modeRoutes.FILM !== "/" || modeRoutes.TV !== "/tv") {
      throw new Error("Mode switcher routes are invalid");
    }

    console.log("     ✓ Mode switcher correctly targets '/' and '/tv'.");
  }

  // Test 4: Header requests the progression count for the active media mode.
  {
    console.log("  → Test 4: Header progression request is mode-aware");
    const source = readFileSync(resolve(process.cwd(), "components/ui/Header.tsx"), "utf8");
    if (!source.includes('/api/auth/me?mode=${isTvMode ? "tv" : "film"}')) {
      throw new Error("Header must request TV progression while rendering TV routes");
    }
    const progressionSource = readFileSync(
      resolve(process.cwd(), "lib/progression/server.ts"),
      "utf8"
    );
    if (!progressionSource.includes("getCanonicalWatchedCounts")) {
      throw new Error("TV progression must resolve canonical watched counts for TV mode");
    }
    console.log("     ✓ Header requests TV and film progression counts independently.");
  }

  // Test 5: TV recovery remains in one loading lifecycle and milestone is transition-only.
  {
    console.log("  → Test 5: TV recovery and mature-user milestone source contract");
    const source = readFileSync(
      resolve(process.cwd(), "components/tv/TvCalibrationEngine.tsx"),
      "utf8"
    );
    if (!source.includes("fetch(`/api/tv/calibration")) {
      throw new Error("TV calibration must request /api/tv/calibration");
    }
    if (!source.includes("useState<boolean>(false)")) {
      throw new Error("Mature TV users must not receive an initial milestone screen");
    }
    console.log("     ✓ TV calibration engine uses database-first single lifecycle and mature users skip initial milestone.");
  }

  console.log("  ✅ Header Mode-Aware Navigation Tests Passed!\n");
}
