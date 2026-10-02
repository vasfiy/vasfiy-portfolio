import DOMPurify from "dompurify";

/* DOMPurify interop differs between the client bundle and the Next server
   bundle (the server wrap puts the implementation under .default). Normalize
   once here; without a DOM (prerender) dompurify passes HTML through. */
const impl = ((DOMPurify as any).default ?? DOMPurify) as { sanitize: (s: string, opts?: any) => string };

export function sanitizeHtml(html: string): string {
  try { return impl.sanitize(html ?? "", { ADD_ATTR: ["target"] }); } catch { return ""; }
}
