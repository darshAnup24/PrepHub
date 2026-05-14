"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { BookOpen, GraduationCap, Zap, Mic, LogOut, ChevronDown, Brain, Compass, ClipboardList, User, Star, Users } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/quiz", label: "Quiz", icon: Zap },
  { href: "/interview", label: "AI Interview", icon: Mic },
  { href: "/peer-interview", label: "Peer Interview", icon: Users },
  { href: "/company-brain", label: "Company Brain", icon: Brain },
  { href: "/career-guide", label: "Career Guide", icon: Compass },
  { href: "/ats", label: "ATS Checker", icon: ClipboardList },
];

interface Props {
  userName: string;
}

export default function DashboardNav({ userName }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-bg-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">PrepHub</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link flex items-center gap-2 ${active ? "active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
        <ThemeToggle />
        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass border border-bg-border hover:border-primary/40 transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <span className="text-sm font-medium text-text hidden sm:block max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl border border-bg-border shadow-lg py-1 z-50">
              <div className="px-4 py-2.5 border-b border-bg-border">
                <p className="text-xs text-text-muted">Signed in as</p>
                <p className="text-sm font-medium text-text truncate">{userName}</p>
              </div>
              <Link href="/dashboard"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg-card transition-colors"
                onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/profile"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg-card transition-colors"
                onClick={() => setMenuOpen(false)}>
                <User className="w-4 h-4" /> Update Profile
              </Link>
              <Link href="/feedback"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text hover:bg-bg-card transition-colors"
                onClick={() => setMenuOpen(false)}>
                <Star className="w-4 h-4" /> Give Feedback
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-bg-border flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-text-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
