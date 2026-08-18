import React from "react";

interface MathFormulaProps {
  tex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathFormula({ tex, displayMode = true, className = "" }: MathFormulaProps) {
  let html: string | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const katex = require("katex");
    html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: "htmlAndMathml",
    });
  } catch {
    // KaTeX is not installed or threw an error
  }

  if (html) {
    return (
      <div
        className={`inline-block max-w-full overflow-x-auto overflow-y-hidden text-center select-all py-1 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={`font-mono text-accent text-sm md:text-base font-bold select-all py-1 ${className}`}>
      {tex}
    </div>
  );
}
