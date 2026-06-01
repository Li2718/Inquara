import katex from "katex";

type RenderMathOptions = {
  displayMode: boolean;
};

export function renderMathToMarkup(formula: string, options: RenderMathOptions): string {
  return katex.renderToString(formula, {
    displayMode: options.displayMode,
    throwOnError: false,
    strict: "ignore"
  });
}
