"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ExperimentNav() {
  const pathname = usePathname();
  const links = [
    { href: "/experiment", label: "Forecast" },
    { href: "/experiment/research", label: "Research" },
  ];

  return (
    <nav className="flex gap-4 text-sm">
      {links.map((link) => {
        const active =
          link.href === "/experiment"
            ? pathname === "/experiment"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "font-medium text-ink" : "text-ink/45 hover:text-ink"}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
