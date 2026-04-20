import { visit } from "unist-util-visit";

const RESPONSIVE_IMAGE_CLASS = "md3-responsive-image";

function normalizeClassName(classNameValue) {
  if (Array.isArray(classNameValue)) {
    return [...new Set(classNameValue.filter(Boolean).map(String))];
  }

  if (typeof classNameValue === "string" && classNameValue.trim()) {
    return [...new Set(classNameValue.trim().split(/\s+/))];
  }

  return [];
}

export function rehypeResponsiveImages() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "img" || !node.properties) {
        return;
      }

      const width = node.properties.width;
      const hasPercentageWidth =
        typeof width === "string" && width.trim().endsWith("%");

      if (hasPercentageWidth) {
        const widthValue = width.trim();
        const currentStyle =
          typeof node.properties.style === "string"
            ? node.properties.style.trim()
            : "";
        const mergedStyle = currentStyle
          ? `${currentStyle.replace(/;?$/, ";")} width:${widthValue}; max-width:${widthValue};`
          : `width:${widthValue}; max-width:${widthValue};`;

        node.properties.style = mergedStyle;
        delete node.properties.width;
      }

      if (node.properties.layout === undefined) {
        node.properties.layout = "constrained";
      }

      if (node.properties.loading === undefined) {
        node.properties.loading = "lazy";
      }

      if (node.properties.decoding === undefined) {
        node.properties.decoding = "async";
      }

      const classNames = normalizeClassName(node.properties.className);
      if (!classNames.includes(RESPONSIVE_IMAGE_CLASS)) {
        classNames.push(RESPONSIVE_IMAGE_CLASS);
      }
      node.properties.className = classNames;
    });
  };
}
