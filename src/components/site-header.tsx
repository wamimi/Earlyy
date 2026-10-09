"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { EarlyLogo } from "./early-logo";

const links = [
  { label: "How it works", href: "/#how" },
  { label: "For teams", href: "/#teams" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Brands", href: "/brands" },
  { label: "Developers", href: "/developers" },
] as const;

export function SiteHeader({ action }: { action?: ReactNode } = {}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Early home">
        <EarlyLogo />
      </Link>

      <nav className={open ? "site-nav is-open" : "site-nav"} aria-label="Main navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        {action ?? <Link className="button button-small button-dark" href="/waitlist">Join the waitlist</Link>}
        <button
          className="menu-button"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
