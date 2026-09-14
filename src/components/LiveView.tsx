"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario, TipoTarefa, RegistroTempo } from "@/lib/types";
import { formatDuration } from "@/lib/format";

interface ActiveTask extends RegistroTempo {
  elapsedSeconds: number;
}

export default function LiveView({ user }: { user: Usuario }) {
  const [myTask, setMyTask] = useState<ActiveTask | null>(null);
  const [teamTasks, setTeamTasks] = useState<ActiveTask[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchActive();
    intervalRef.current = setInterval(fetchActive, 5000);
    tickRef.current = setInterval(tickElapsed, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [user.id]);

  async function fetchActive() {
    const { data } = await supabase
      .from("registros_tempo")
      .select("*, usuarios(nome), tipos_tarefa(nome)")
      .is("fim", null)
      .order("inicio", { ascending: false });

    if (data) {
      const now = Date.now();
      const tasks = (data as unknown as RegistroTempo[]).map((r) => ({
        ...r,
        elapsedSeconds: Math.floor(
          (now - new Date(r.inicio).getTime()) / 1000
        ),
      }));

      setMyTask(tasks.find((t) => t.usuario_id === user.id) || null);
      setTeamTasks(tasks.filter((t) => t.usuario_id !== user.id));
    }
  }

  function tickElapsed() {
    setMyTask((prev) =>
      prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null
    );
    setTeamTasks((prev) =>
      prev.map((t) => ({ ...t, elapsedSeconds: t.elapsedSeconds + 1 }))
    );
  }

  async function handleCancel(taskId: string) {
    await supabase.from("registros_tempo").delete().eq("id", taskId);
    fetchActive();
  }

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

      {/* Minha tarefa ativa */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          Minha tarefa — {user.nome}
        </div>
        {myTask ? (
          <div
            className="p-4 rounded-xl flex flex-col gap-3"
            style={{ ...cardStyle, borderLeft: "4px solid var(--success)" }}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--primary)", color: "#fff" }}
                  >
                    {(myTask.tipos_tarefa as unknown as TipoTarefa)?.nome}
                  </span>
                  {myTask.descricao && (
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {myTask.descricao}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-3xl font-mono font-bold tabular-nums"
                  style={{ color: "var(--success)" }}
                >
                  {formatDuration(myTask.elapsedSeconds)}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  desde{" "}
                  {new Date(myTask.inicio).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
            {myTask.elapsedSeconds > 3600 * 8 && (
              <button
                onClick={() => handleCancel(myTask.id)}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer self-start"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                Descartar (tarefa esquecida)
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl text-center" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nenhuma tarefa em andamento.
            </p>
          </div>
        )}
      </div>

      {/* Equipe */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          Equipe
        </div>
        {teamTasks.length === 0 ? (
          <div className="p-4 rounded-xl text-center" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ninguém mais trabalhando no momento.
            </p>
          </div>
        ) : (
          teamTasks.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-xl flex justify-between items-center"
              style={cardStyle}
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm">
                  {(t.usuarios as unknown as Usuario)?.nome}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--primary)", color: "#fff", opacity: 0.9 }}
                  >
                    {(t.tipos_tarefa as unknown as TipoTarefa)?.nome}
                  </span>
                  {t.descricao && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.descricao}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-lg font-mono font-bold tabular-nums"
                  style={{ color: "var(--success)" }}
                >
                  {formatDuration(t.elapsedSeconds)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
