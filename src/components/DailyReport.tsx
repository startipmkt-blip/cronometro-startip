"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario, TipoTarefa, RegistroTempo } from "@/lib/types";
import { formatDuration } from "@/lib/format";

export default function DailyReport({ user }: { user: Usuario }) {
  const [registros, setRegistros] = useState<RegistroTempo[]>([]);
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  useEffect(() => {
    loadData();
  }, [date, user.id]);

  async function loadData() {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data } = await supabase
      .from("registros_tempo")
      .select("*, usuarios(nome), tipos_tarefa(nome)")
      .eq("usuario_id", user.id)
      .not("fim", "is", null)
      .gte("inicio", startOfDay)
      .lte("inicio", endOfDay)
      .order("inicio", { ascending: true });

    if (data) setRegistros(data as unknown as RegistroTempo[]);
  }

  const totalSeconds = registros.reduce(
    (sum, r) => sum + (r.duracao_segundos || 0),
    0
  );

  const byType = new Map<string, { nome: string; total: number; count: number }>();
  for (const r of registros) {
    if (!r.duracao_segundos) continue;
    const nome = (r.tipos_tarefa as unknown as TipoTarefa)?.nome || "—";
    const entry = byType.get(r.tipo_tarefa_id) || { nome, total: 0, count: 0 };
    entry.total += r.duracao_segundos;
    entry.count += 1;
    byType.set(r.tipo_tarefa_id, entry);
  }

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4">
      {/* Seletor de data */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const d = new Date(date);
            d.setDate(d.getDate() - 1);
            setDate(d.toISOString().slice(0, 10));
          }}
          className="px-3 py-2 rounded-lg text-lg cursor-pointer"
          style={cardStyle}
        >
          &larr;
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-center text-sm"
          style={{ ...cardStyle, color: "var(--text)" }}
        />
        <button
          onClick={() => {
            const d = new Date(date);
            d.setDate(d.getDate() + 1);
            setDate(d.toISOString().slice(0, 10));
          }}
          className="px-3 py-2 rounded-lg text-lg cursor-pointer"
          style={cardStyle}
        >
          &rarr;
        </button>
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={cardStyle}>
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Tempo total do dia
          </div>
          <div className="text-xl font-bold">{formatDuration(totalSeconds)}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Tarefas concluídas
          </div>
          <div className="text-xl font-bold">{registros.length}</div>
        </div>
      </div>

      {/* Tempo por tipo */}
      {byType.size > 0 && (
        <div className="p-4 rounded-xl flex flex-col gap-3" style={cardStyle}>
          <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Tempo por tipo de tarefa
          </div>
          {[...byType.values()]
            .sort((a, b) => b.total - a.total)
            .map((v) => {
              const pct = totalSeconds > 0 ? (v.total / totalSeconds) * 100 : 0;
              return (
                <div key={v.nome} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>
                      {v.nome}{" "}
                      <span style={{ color: "var(--text-muted)" }}>
                        ({v.count}x)
                      </span>
                    </span>
                    <span className="font-mono font-bold">
                      {formatDuration(v.total)}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Lista do dia */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          Tarefas do dia
        </div>
        {registros.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhuma tarefa registrada neste dia.
          </p>
        )}
        {registros.map((r) => {
          const hora = new Date(r.inicio).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={r.id} className="p-3 rounded-xl flex items-center gap-3" style={cardStyle}>
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                {hora}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "var(--primary)", color: "#fff", opacity: 0.9 }}
                  >
                    {(r.tipos_tarefa as unknown as TipoTarefa)?.nome}
                  </span>
                  {r.descricao && (
                    <span className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                      {r.descricao}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-sm font-bold whitespace-nowrap">
                {r.duracao_segundos ? formatDuration(r.duracao_segundos) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
