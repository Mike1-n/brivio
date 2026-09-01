"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  History,
  BarChart2,
  HelpCircle,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "My Quizzes", icon: BookOpen, href: "/dashboard/quizzes" },
    { name: "Create Quiz", icon: PlusCircle, href: "/dashboard/quizzes/create" },
    { name: "Game History", icon: History, href: "/dashboard/reports" },
    { name: "Reports", icon: BarChart2, href: "/dashboard/reports" },
    { name: "Question Bank", icon: HelpCircle, href: "/explore" },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* ========================================================================= */}
      {/* 1. MOBILE BACKDROP & DRAWER OVERLAY */}
      {/* ========================================================================= */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0B0E23] text-slate-300 p-5 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between pt-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Brivio Logo" className="h-9 w-auto object-contain rounded-lg" />
              <span className="text-2xl font-black text-white tracking-tight">
                brivio
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create Quiz Banner */}
          <Link
            href="/dashboard/quizzes/create"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <PlusCircle className="w-4 h-4" /> Create New Quiz
          </Link>

          {/* Mobile Navigation List */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition ${
                    isActive
                      ? "bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/40"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile User & Logout */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {user && (
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5">
              <span className="font-black text-white text-xs block truncate">{user.name}</span>
              <span className="text-slate-400 text-[11px] block truncate">{user.email}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP STICKY SIDEBAR (COLLAPSIBLE) */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-[#0B0E23] text-slate-300 p-4 sticky top-0 h-screen transition-all duration-300 z-30 flex-shrink-0 border-r border-slate-800/40 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Collapse Toggle */}
          <div className="flex items-center justify-between px-2 pt-2">
            {!isCollapsed ? (
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Brivio Logo" className="h-9 w-auto object-contain rounded-lg" />
                <span className="text-2xl font-black text-white tracking-tight">
                  brivio
                </span>
              </Link>
            ) : (
              <Link href="/" className="mx-auto" title="Brivio Home">
                <img src="/logo.png" alt="Brivio Logo" className="w-9 h-9 object-contain rounded-xl" />
              </Link>
            )}

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition ${
                isCollapsed ? "hidden" : "block"
              }`}
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Uncollapse button when collapsed */}
          {isCollapsed && (
            <div className="flex justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Create Button */}
          {!isCollapsed ? (
            <Link
              href="/dashboard/quizzes/create"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/30 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Create Quiz
            </Link>
          ) : (
            <Link
              href="/dashboard/quizzes/create"
              className="flex items-center justify-center w-10 h-10 mx-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition active:scale-95"
              title="Create Quiz"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                  } rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="space-y-2 pt-4 border-t border-white/5">
          {user && !isCollapsed && (
            <div className="px-3 py-2 text-xs">
              <span className="font-bold text-white block truncate">{user.name}</span>
              <span className="text-slate-400 text-[11px] block truncate">{user.email}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition text-left`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. MAIN HOST CONTENT AREA + PHONE MODE TOP HEADER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Navbar (Visible on phone screens) */}
        <header className="bg-[#0B0E23] text-white px-4 py-3 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 flex items-center justify-center"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Brivio Logo" className="h-7 w-auto object-contain rounded" />
              <span className="text-xl font-black tracking-tight text-white">
                brivio
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/30 text-white flex items-center justify-center text-xs font-black shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "🎓"}
            </div>
          </div>
        </header>

        {/* Child Page Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
