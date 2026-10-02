"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { userId: string; name: string; appName: string; groupName: string };

export default function Nav({ userId, name, appName, groupName }: Props) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    Promise.all([
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null),
      supabase
        .from("loans")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("status", "requested"),
    ]).then(([m, r]) => {
      if (cancelled) return;
      setUnread(m.count ?? 0);
      setRequests(r.count ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, userId]);

  const links = [
    { href: "/", label: "Catalogue", badge: 0 },
    { href: "/who-has-what", label: "Who has what", badge: 0 },
    { href: "/add", label: "Add books", badge: 0 },
    { href: "/loans", label: "My loans", badge: requests },
    { href: "/messages", label: "Messages", badge: unread },
    { href: "/profile", label: name.split(" ")[0] || "Profile", badge: 0 },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/books") : pathname.startsWith(href);

  return (
    <header className="bg-gum-deep text-white">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <Link href="/" className="inline-block">
          <span className="block font-display text-2xl font-bold tracking-tight">{appName}</span>
          <span className="block text-sm text-leaf/90">{groupName}</span>
        </Link>
        <nav aria-label="Main" className="-mx-4 mt-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <ul className="flex min-w-max gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`relative flex min-h-11 items-center gap-2 px-3 pb-2 pt-2 font-bold transition-colors ${
                    isActive(l.href)
                      ? "text-white after:absolute after:inset-x-2 after:bottom-0 after:h-1 after:rounded-t after:bg-wattle"
                      : "text-leaf/80 hover:text-white"
                  }`}
                >
                  {l.label}
                  {l.badge > 0 && (
                    <span
                      className="rounded-full bg-wattle px-1.5 text-xs leading-5 text-bark"
                      aria-label={`${l.badge} new`}
                    >
                      {l.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
