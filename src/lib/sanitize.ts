import DOMPurify from "dompurify";

/* DOMPurify interop differs between the client bundle and the Next server
   bundle (the server wrap puts the implementation under .default). Normalize
   once here; without a DOM (prerender) dompurify passes HTML through. */
const impl = ((DOMPurify as any).default ?? DOMPurify) as { sanitize: (s: string, opts?: any) => string };

function stripUnsafe(html: string): string {
  // server prerender has no DOM — conservatively strip the dangerous bits so
  // SSR HTML keeps its text instead of rendering empty
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    try { return stripUnsafe(html ?? ""); } catch { return ""; }
  }
  try { return impl.sanitize(html ?? "", { ADD_ATTR: ["target"] }); } catch { return ""; }
}
