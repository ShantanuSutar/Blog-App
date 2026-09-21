import sanitizeHtml from "sanitize-html";

const richTextOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "blockquote",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ol",
    "ul",
    "li",
    "a",
    "span",
    "sub",
    "sup",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    p: ["class"],
    span: ["class"],
    li: ["class"],
  },
  allowedClasses: {
    p: [/^ql-align-/, /^ql-direction-/],
    span: [/^ql-/],
    li: [/^ql-indent-/],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer nofollow",
        ...(attribs.target === "_blank" ? { target: "_blank" } : {}),
      },
    }),
  },
};

export const sanitizeRichText = (value) =>
  sanitizeHtml(typeof value === "string" ? value : "", richTextOptions);

export const sanitizePlainText = (value) =>
  sanitizeHtml(typeof value === "string" ? value : "", {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    })[entity])
    .trim();

export const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
