"use client";
import { useEffect, useState } from "react";

/** True when an admin Supabase session exists on this origin (logged in via /admin).
    The admin client is imported lazily so visitors never pay for it. */
export function useAdminSession(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let mounted = true;
    import("@/lib/admin")
      .then((A) => A.sb().auth.getSession())
      .then(({ data }) => { if (mounted) setOk(!!data.session); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  return ok;
}
