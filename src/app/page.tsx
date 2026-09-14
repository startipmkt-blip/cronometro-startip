"use client";

import { useState } from "react";
import UserSelect from "@/components/UserSelect";
import Timer from "@/components/Timer";
import History from "@/components/History";
import DailyReport from "@/components/DailyReport";
import WeeklyReport from "@/components/WeeklyReport";
import LiveView from "@/components/LiveView";
import type { Usuario } from "@/lib/types";

type Tab = "timer" | "live" | "daily" | "weekly" | "history";

const TAB_LABELS: Record<Tab, string> = {
  timer: "Cronômetro",
  live: "Ao Vivo",
  daily: "Dia",
  weekly: "Semana",
  history: "Histórico",
};

export default function Home() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [tab, setTab] = useState<Tab>("timer");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) {
    return <UserSelect onSelect={setUser} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">Startip</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {user.nome}
          </span>
        </div>
        <button
          onClick={() => setUser(null)}
          className="text-xs px-3 py-1 rounded-lg cursor-pointer"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          Trocar
        </button>
      </header>

      {/* Tabs */}
      <nav
        className="flex border-b sticky top-[49px] z-10 overflow-x-auto"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t !== "timer") setRefreshKey((k) => k + 1);
            }}
            className="flex-1 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap px-2"
            style={{
              color: tab === t ? "var(--primary)" : "var(--text-muted)",
              borderBottom:
                tab === t ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 py-4">
        <div hidden={tab !== "timer"}>
          <Timer
            user={user}
            onFinish={() => setRefreshKey((k) => k + 1)}
          />
        </div>
        {tab === "live" && <LiveView key={refreshKey} />}
        {tab === "daily" && <DailyReport key={refreshKey} user={user} />}
        {tab === "weekly" && <WeeklyReport key={refreshKey} user={user} />}
        {tab === "history" && <History key={refreshKey} />}
      </main>
    </div>
  );
}
