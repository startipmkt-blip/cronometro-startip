"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario, TipoTarefa, RegistroTempo } from "@/lib/types";
import { formatDuration } from "@/lib/format";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

interface WeekData {
  monday: Date;
  label: string;
  registros: RegistroTempo[];
  totalSeconds: number;
  taskCount: number;
  byType: Map<string, { nome: string; total: number; count: number; avg: number }>;
}

export default function WeeklyReport({ user }: { user: Usuario }) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeks();
  }, [user.id]);

  async function loadWeeks() {
    setLoading(true);

    const now = new Date();
    const currentMonday = getMonday(now);
    const weeksBack = 4;
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (weeksBack - 1) * 7);

    const { data } = await supabase
      .from("registros_tempo")
      .select("*, usuarios(nome), tipos_tarefa(nome)")
      .eq("usuario_id", user.id)
      .not("fim", "is", null)
      .gte("inicio", startDate.toISOString())
      .order("inicio", { ascending: true });

    const allRegistros = (data || []) as unknown as RegistroTempo[];
    const result: WeekData[] = [];

    for (let i = 0; i < weeksBack; i++) {
      const monday = new Date(startDate);
      monday.setDate(monday.getDate() + i * 7);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 7);

      const weekRegistros = allRegistros.filter((r) => {
        const d = new Date(r.inicio);
        return d >= monday && d < sunday;
      });

      const totalSeconds = weekRegistros.reduce(
        (sum, r) => sum + (r.duracao_segundos || 0),
        0
      );

      const byType = new Map<string, { nome: string; total: number; count: number; avg: number }>();
      for (const r of weekRegistros) {
        if (!r.duracao_segundos) continue;
        const nome = (r.tipos_tarefa as unknown as TipoTarefa)?.nome || "—";
        const entry = byType.get(r.tipo_tarefa_id) || { nome, total: 0, count: 0, avg: 0 };
        entry.total += r.duracao_segundos;
        entry.count += 1;
        entry.avg = Math.round(entry.total / entry.count);
        byType.set(r.tipo_tarefa_id, entry);
      }

      result.push({
        monday,
        label: formatWeekRange(monday),
        registros: weekRegistros,
        totalSeconds,
        taskCount: weekRegistros.length,
        byType,
      });
    }

    setWeeks(result);
    setLoading(false);
  }

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
  };

  // Comparar tempo médio por tipo entre semanas
  const allTypeIds = new Set<string>();
  const typeNames = new Map<string, string>();
  for (const w of weeks) {
    for (const [id, v] of w.byType) {
      allTypeIds.add(id);
      typeNames.set(id, v.nome);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  const currentWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto p-4">
      <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        Relatório semanal — {user.nome}
      </div>

      {/* Comparação esta semana vs anterior */}
      {currentWeek && prevWeek && (
        <div className="p-4 rounded-xl flex flex-col gap-3" style={cardStyle}>
          <div className="text-sm font-semibold">Esta semana vs anterior</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Semana atual ({currentWeek.label})
              </div>
              <div className="text-lg font-bold">
                {formatDuration(currentWeek.totalSeconds)}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {currentWeek.taskCount} tarefas
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Semana anterior ({prevWeek.label})
              </div>
              <div className="text-lg font-bold">
                {formatDuration(prevWeek.totalSeconds)}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {prevWeek.taskCount} tarefas
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evolução por tipo de tarefa */}
      {allTypeIds.size > 0 && (
        <div className="p-4 rounded-xl flex flex-col gap-4" style={cardStyle}>
          <div className="text-sm font-semibold">Evolução do tempo médio por tipo</div>
          {[...allTypeIds].map((typeId) => {
            const nome = typeNames.get(typeId) || "—";
            const weekAvgs = weeks.map((w) => {
              const entry = w.byType.get(typeId);
              return { label: w.label, avg: entry?.avg || 0, count: entry?.count || 0 };
            });

            const hasData = weekAvgs.some((wa) => wa.count > 0);
            if (!hasData) return null;

            const maxAvg = Math.max(...weekAvgs.map((wa) => wa.avg), 1);

            const last = weekAvgs[weekAvgs.length - 1];
            const prevWithData = [...weekAvgs].reverse().find((wa, i) => i > 0 && wa.count > 0);
            let trend: "faster" | "slower" | "same" | "new" = "new";
            if (prevWithData && last.count > 0) {
              const diff = last.avg - prevWithData.avg;
              const pct = Math.abs(diff) / prevWithData.avg;
              if (pct < 0.05) trend = "same";
              else if (diff < 0) trend = "faster";
              else trend = "slower";
            }

            const trendColor =
              trend === "faster"
                ? "var(--success)"
                : trend === "slower"
                  ? "var(--danger)"
                  : "var(--text-muted)";
            const trendLabel =
              trend === "faster"
                ? "Mais rápido"
                : trend === "slower"
                  ? "Mais lento"
                  : trend === "same"
                    ? "Estável"
                    : "Novo";

            return (
              <div key={typeId} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{nome}</span>
                  <span className="text-xs font-semibold" style={{ color: trendColor }}>
                    {trendLabel}
                  </span>
                </div>
                {/* Mini bar chart das semanas */}
                <div className="flex items-end gap-1 h-16">
                  {weekAvgs.map((wa, i) => {
                    const height = wa.avg > 0 ? Math.max((wa.avg / maxAvg) * 100, 8) : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end h-12">
                          {wa.count > 0 ? (
                            <div
                              className="w-full max-w-[40px] rounded-t"
                              style={{
                                height: `${height}%`,
                                background:
                                  i === weekAvgs.length - 1
                                    ? "var(--primary)"
                                    : "var(--border)",
                                minHeight: "4px",
                              }}
                            />
                          ) : (
                            <div
                              className="w-2 h-0.5 rounded"
                              style={{ background: "var(--border)" }}
                            />
                          )}
                        </div>
                        {wa.count > 0 && (
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {formatDuration(wa.avg)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1">
                  {weeks.map((w, i) => (
                    <span
                      key={i}
                      className="flex-1 text-center text-[9px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {w.monday.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo por semana */}
      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          Resumo das últimas 4 semanas
        </div>
        {[...weeks].reverse().map((w, i) => (
          <div key={i} className="p-3 rounded-xl" style={cardStyle}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">{w.label}</span>
              <span className="font-mono text-sm font-bold">
                {formatDuration(w.totalSeconds)}
              </span>
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {w.taskCount} tarefas
              {w.byType.size > 0 && (
                <span>
                  {" — "}
                  {[...w.byType.values()]
                    .map((v) => `${v.nome}: ${v.count}x (média ${formatDuration(v.avg)})`)
                    .join(", ")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
