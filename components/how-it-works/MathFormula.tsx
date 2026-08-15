import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathFormulaProps {
  tex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathFormula({ tex, displayMode = true, className = "" }: MathFormulaProps) {
  try {
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: "htmlAndMathml",
    });

    return (
      <div
        className={`inline-block max-w-full overflow-x-auto overflow-y-hidden text-center select-all py-1 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    // Fallback if KaTeX fails
    return (
      <div className={`font-mono text-accent text-sm md:text-base font-bold ${className}`}>
        {tex}
      </div>
    );
  }
}
