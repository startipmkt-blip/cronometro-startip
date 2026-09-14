"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario, TipoTarefa, RegistroTempo } from "@/lib/types";
import { formatDuration } from "@/lib/format";

interface ActiveTask extends RegistroTempo {
  elapsedSeconds: number;
}

export default function LiveView() {
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase
      .from("usuarios")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => {
        if (data) setAllUsers(data);
      });

    fetchActive();
    intervalRef.current = setInterval(fetchActive, 5000);
    tickRef.current = setInterval(tickElapsed, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  async function fetchActive() {
    const { data } = await supabase
      .from("registros_tempo")
      .select("*, usuarios(nome), tipos_tarefa(nome)")
      .is("fim", null)
      .order("inicio", { ascending: true });

    if (data) {
      const now = Date.now();
      setActiveTasks(
        (data as unknown as RegistroTempo[]).map((r) => ({
          ...r,
          elapsedSeconds: Math.floor(
            (now - new Date(r.inicio).getTime()) / 1000
          ),
        }))
      );
    }
  }

  function tickElapsed() {
    setActiveTasks((prev) =>
      prev.map((t) => ({ ...t, elapsedSeconds: t.elapsedSeconds + 1 }))
    );
  }

  const activeUserIds = new Set(activeTasks.map((t) => t.usuario_id));
  const idleUsers = allUsers.filter((u) => !activeUserIds.has(u.id));

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: "var(--success)" }}
        />
        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          Atualização automática a cada 5s
        </span>
      </div>

      {/* Trabalhando agora */}
      {activeTasks.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Trabalhando agora
          </div>
          {activeTasks.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl flex flex-col gap-2"
              style={{
                ...cardStyle,
                borderLeft: "4px solid var(--success)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-base">
                    {(t.usuarios as unknown as Usuario)?.nome}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--primary)", color: "#fff" }}
                    >
                      {(t.tipos_tarefa as unknown as TipoTarefa)?.nome}
                    </span>
                    {t.descricao && (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {t.descricao}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-2xl font-mono font-bold tabular-nums"
                    style={{ color: "var(--success)" }}
                  >
                    {formatDuration(t.elapsedSeconds)}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    desde{" "}
                    {new Date(t.inicio).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="p-6 rounded-xl text-center"
          style={cardStyle}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ninguém trabalhando no momento.
          </p>
        </div>
      )}

      {/* Quem está livre */}
      {idleUsers.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            Sem tarefa ativa
          </div>
          <div className="flex gap-2 flex-wrap">
            {idleUsers.map((u) => (
              <span
                key={u.id}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  ...cardStyle,
                  color: "var(--text-muted)",
                }}
              >
                {u.nome}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
