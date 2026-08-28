"use client";

import {
  Bell,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  Home,
  Library,
  Menu,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`app-shell ${compact ? "results-shell" : ""}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand"><span className="brand-mark">V</span><span>VedaAI</span></div>
        <button className="toolkit-pill"><Sparkles size={15} /> AI Teacher&apos;s Toolkit</button>
        <nav className="sidebar-nav">
          <a href="#"><Home /> <span>Home</span></a>
          <a href="#"><Users /> <span>My Classroom</span></a>
          <a href="#"><ClipboardList /> <span>Assignments</span></a>
          <a className="active" href="#"><BookOpen /> <span>Exams</span></a>
          <a href="#"><Library /> <span>My Library</span></a>
        </nav>
        <div className="sidebar-bottom">
          <a href="#"><Settings /> <span>Settings</span></a>
          <div className="school-card"><GraduationCap /><span><strong>Delhi Public School</strong><small>Bokaro Steel City</small></span></div>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <div className="topbar-title"><button aria-label="Back"><ChevronLeft /></button><span>Exams</span></div>
          <div className="topbar-actions"><button aria-label="Help"><CircleHelp /></button><button aria-label="Notifications"><Bell /></button><button aria-label="AI assistant"><Sparkles /></button><div className="avatar">MR</div><span className="teacher-name">Madhur Rastogi</span></div>
          <button className="mobile-menu" aria-label="Open navigation"><Menu /></button>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
