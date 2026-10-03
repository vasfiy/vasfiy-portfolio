import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";

// Never prerender the admin document: Netlify's durable cache once served a
// 4-day-old HTML shell that pointed at deleted build chunks.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin — Kamoliddin Tilonboyev", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminApp />;
}
