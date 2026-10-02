"use client";
import { useEffect, useState } from "react";

/** True when an admin Supabase session exists on this origin (logged in via /admin).
    The admin client is imported lazily, and only when the kt-auth cookie mirror is
    present (admin.ts writes it on every sign-in — host-only on localhost, .vasfiy.com
    in production), so anonymous visitors never fetch/parse supabase-js (~57 KB gz).
    A live onAuthStateChange subscription keeps the flag honest: logout in another
    tab flips it to false instead of the ✏️ FAB lingering until reload. */
export function useAdminSession(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    // Cheap synchronous gate: no auth cookie on this origin → no session to find.
    if (typeof document === "undefined" || !/(?:^|;\s*)kt-auth\.0=/.test(document.cookie)) return;
    let mounted = true;
    let unsub: (() => void) | undefined;
    import("@/lib/admin")
      .then((A) => {
        if (!mounted) return;
        A.sb().auth.getSession().then(({ data }) => { if (mounted) setOk(!!data.session); }).catch(() => {});
        const { data } = A.sb().auth.onAuthStateChange((_e, session) => { if (mounted) setOk(!!session); });
        unsub = () => data.subscription.unsubscribe();
      })
      .catch(() => {});
    return () => { mounted = false; unsub?.(); };
  }, []);
  return ok;
}
