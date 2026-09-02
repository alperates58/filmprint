import type { Config } from "tailwindcss";

function withOpacity(variableName: string, rgbVarName: string): any {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${rgbVarName}), ${opacityValue})`;
    }
    return `var(${variableName})`;
  };
}

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background", "--bg-base-rgb"),
        "bg-base": withOpacity("--bg-base", "--bg-base-rgb"),
        "bg-subtle": withOpacity("--bg-subtle", "--bg-subtle-rgb"),
        surface: withOpacity("--surface", "--surface-rgb"),
        "surface-1": withOpacity("--surface-1", "--surface-1-rgb"),
        "surface-2": withOpacity("--surface-2", "--surface-2-rgb"),
        "surface-3": withOpacity("--surface-3", "--surface-3-rgb"),
        "surface-elevated": withOpacity("--surface-elevated", "--surface-elevated-rgb"),
        "surface-glass": "var(--surface-glass)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        "border-focused": withOpacity("--border-focused", "--border-focused-rgb"),
        "text-primary": withOpacity("--text-primary", "--text-primary-rgb"),
        "text-secondary": withOpacity("--text-secondary", "--text-secondary-rgb"),
        "text-muted": withOpacity("--text-muted", "--text-muted-rgb"),
        accent: withOpacity("--accent", "--accent-rgb"),
        "accent-hover": withOpacity("--accent-hover", "--accent-hover-rgb"),
        "accent-subtle": "var(--accent-subtle)",
        "accent-secondary": withOpacity("--accent-secondary", "--accent-secondary-rgb"),
        "accent-secondary-hover": withOpacity("--accent-secondary-hover", "--accent-secondary-hover-rgb"),
        "accent-secondary-subtle": "var(--accent-secondary-subtle)",
        success: withOpacity("--success", "--success-rgb"),
        warning: withOpacity("--warning", "--warning-rgb"),
        destructive: withOpacity("--destructive", "--destructive-rgb"),
        info: withOpacity("--info", "--info-rgb"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        cinematic: "var(--shadow-cinematic)",
        glow: "var(--accent-glow)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [],
};

export default config;
