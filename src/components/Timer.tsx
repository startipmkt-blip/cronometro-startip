"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario, TipoTarefa } from "@/lib/types";
import { formatDuration } from "@/lib/format";

export default function Timer({
  user,
  onFinish,
}: {
  user: Usuario;
  onFinish: () => void;
}) {
  const [tipos, setTipos] = useState<TipoTarefa[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [pauseStart, setPauseStart] = useState<Date | null>(null);
  const [registroId, setRegistroId] = useState<string | null>(null);
  const [showNewType, setShowNewType] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTipos();
  }, []);

  function startTicking(start: Date, alreadyPaused: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const total = Math.floor((Date.now() - start.getTime()) / 1000);
      setElapsed(total - alreadyPaused);
    }, 1000);
  }

  async function loadTipos() {
    const { data } = await supabase
      .from("tipos_tarefa")
      .select("id, nome")
      .order("nome");
    if (data) setTipos(data);
  }

  async function handleStart() {
    let finalTipoId = tipoId;

    if (showNewType && novoTipo.trim()) {
      const { data } = await supabase
        .from("tipos_tarefa")
        .insert({ nome: novoTipo.trim() })
        .select("id")
        .single();
      if (data) {
        finalTipoId = data.id;
        setTipoId(data.id);
        await loadTipos();
        setShowNewType(false);
        setNovoTipo("");
      }
    }

    if (!finalTipoId) return;

    const now = new Date();
    setStartTime(now);
    setRunning(true);
    setPaused(false);
    setElapsed(0);
    setPausedTotal(0);
    setPauseStart(null);

    startTicking(now, 0);

    const { data } = await supabase
      .from("registros_tempo")
      .insert({
        usuario_id: user.id,
        tipo_tarefa_id: finalTipoId,
        descricao: descricao.trim(),
        inicio: now.toISOString(),
      })
      .select("id")
      .single();

    if (data) setRegistroId(data.id);
  }

  async function handlePause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPaused(true);
    const now = new Date();
    setPauseStart(now);

    if (registroId) {
      await supabase
        .from("registros_tempo")
        .update({
          pausado: true,
          inicio_pausa: now.toISOString(),
          tempo_pausado_total: pausedTotal,
        })
        .eq("id", registroId);
    }
  }

  async function handleResume() {
    const now = new Date();
    const pauseDuration = pauseStart
      ? Math.floor((now.getTime() - pauseStart.getTime()) / 1000)
      : 0;
    const newPausedTotal = pausedTotal + pauseDuration;

    setPaused(false);
    setPausedTotal(newPausedTotal);
    setPauseStart(null);

    if (startTime) {
      startTicking(startTime, newPausedTotal);
    }

    if (registroId) {
      await supabase
        .from("registros_tempo")
        .update({
          pausado: false,
          inicio_pausa: null,
          tempo_pausado_total: newPausedTotal,
        })
        .eq("id", registroId);
    }
  }

  async function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);

    const fim = new Date();
    let finalPausedTotal = pausedTotal;
    if (pauseStart) {
      finalPausedTotal += Math.floor(
        (fim.getTime() - pauseStart.getTime()) / 1000
      );
    }

    const totalRaw = startTime
      ? Math.floor((fim.getTime() - startTime.getTime()) / 1000)
      : elapsed;
    const duracao = totalRaw - finalPausedTotal;

    if (registroId) {
      await supabase
        .from("registros_tempo")
        .update({
          fim: fim.toISOString(),
          duracao_segundos: Math.max(duracao, 0),
          pausado: false,
          inicio_pausa: null,
          tempo_pausado_total: finalPausedTotal,
        })
        .eq("id", registroId);
    }

    setTipoId("");
    setDescricao("");
    setElapsed(0);
    setStartTime(null);
    setPausedTotal(0);
    setPauseStart(null);
    setRegistroId(null);
    onFinish();
  }

  const canStart =
    !running && (tipoId || (showNewType && novoTipo.trim()));

  const isActive = running && !paused;

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto p-4">
      {/* Tipo de tarefa */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Tipo de tarefa
        </label>
        {!showNewType ? (
          <div className="flex gap-2">
            <select
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              disabled={running}
              className="flex-1 px-3 py-3 rounded-lg text-base disabled:opacity-50"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="">Selecione...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewType(true)}
              disabled={running}
              className="px-3 py-3 rounded-lg text-xl font-bold disabled:opacity-50"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--primary)",
              }}
              title="Novo tipo"
            >
              +
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              placeholder="Nome do novo tipo..."
              disabled={running}
              className="flex-1 px-3 py-3 rounded-lg text-base disabled:opacity-50"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
            <button
              onClick={() => {
                setShowNewType(false);
                setNovoTipo("");
              }}
              disabled={running}
              className="px-3 py-3 rounded-lg text-sm disabled:opacity-50"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Descrição / Cliente
        </label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Carrossel Instagram - Cliente X"
          disabled={running}
          className="px-3 py-3 rounded-lg text-base disabled:opacity-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
      </div>

      {/* Cronômetro */}
      <div
        className="text-center py-8 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="text-5xl font-mono font-bold tabular-nums"
          style={{
            color: paused
              ? "var(--warning, #f59e0b)"
              : isActive
                ? "var(--success)"
                : "var(--text)",
          }}
        >
          {formatDuration(elapsed)}
        </div>
        {paused && (
          <div
            className="text-sm font-semibold mt-2 animate-pulse"
            style={{ color: "var(--warning, #f59e0b)" }}
          >
            PAUSADO
          </div>
        )}
      </div>

      {/* Botões */}
      {!running ? (
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="px-6 py-4 rounded-xl text-lg font-semibold text-white transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "var(--success)" }}
        >
          Iniciar tarefa
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {!paused ? (
            <button
              onClick={handlePause}
              className="px-6 py-4 rounded-xl text-lg font-semibold text-white transition-colors cursor-pointer"
              style={{ background: "var(--warning, #f59e0b)" }}
            >
              Pausar
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="px-6 py-4 rounded-xl text-lg font-semibold text-white transition-colors cursor-pointer"
              style={{ background: "var(--success)" }}
            >
              Retomar tarefa
            </button>
          )}
          <button
            onClick={handleStop}
            className="px-6 py-4 rounded-xl text-lg font-semibold text-white transition-colors cursor-pointer"
            style={{ background: "var(--danger)" }}
          >
            Finalizar tarefa
          </button>
        </div>
      )}
    </div>
  );
}
