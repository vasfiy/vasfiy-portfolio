"use client";
import { useAdminSession } from "@/lib/useAdminSession";

/** "✎ Edit" shortcut shown only to a logged-in admin — jumps straight to the
    matching admin form (e.g. hash="blog?edit=<id>"). */
export default function AdminEditLink({ hash, label = "Edit" }: { hash: string; label?: string }) {
  const isAdmin = useAdminSession();
  if (!isAdmin) return null;
  return <a className="admin-edit-link" href={`/admin#${hash}`}>✎ {label}</a>;
}
