declare module "katex" {
  export interface KatexOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    errorColor?: string;
    macros?: any;
    colorIsTextColor?: boolean;
    maxSize?: number;
    maxExpand?: number;
    allowedProtocols?: string[];
    strict?: boolean | string | Function;
    trust?: boolean | Function;
    output?: "html" | "mathml" | "htmlAndMathml";
    leqno?: boolean;
    fleqn?: boolean;
    minRuleThickness?: number;
  }

  export function renderToString(tex: string, options?: KatexOptions): string;
  export function render(tex: string, element: HTMLElement, options?: KatexOptions): void;
}
