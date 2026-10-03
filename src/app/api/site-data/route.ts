import { getSiteData } from "@/lib/data";

export const runtime = "nodejs";

/* Public site content as JSON for the client-side search palette — keeps
   @/lib/data (and supabase-js) out of the browser bundle entirely. */
export async function GET() {
  return Response.json(await getSiteData());
}
