"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <>
      {!isLanding && <Sidebar />}
      <main className={isLanding ? "landing-main" : "main-content"}>
        {children}
      </main>
    </>
  );
}
