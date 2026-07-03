"use client";
import { useAdminSession } from "@/lib/useAdminSession";

/** "✎ Edit" shortcut shown only to a logged-in admin — jumps straight to the
    matching admin form (e.g. hash="blog?edit=<id>"). */
export default function AdminEditLink({ hash, label = "Edit" }: { hash: string; label?: string }) {
  const isAdmin = useAdminSession();
  if (!isAdmin) return null;
  // Production admin lives on its own subdomain; previews/localhost use the /admin path.
  const onProd = typeof location !== "undefined" && location.hostname.endsWith("vasfiy.com");
  const base = onProd ? "https://admin.vasfiy.com/#" : "/admin#";
  return <a className="admin-edit-link" href={base + hash}>✎ {label}</a>;
}
