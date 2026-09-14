"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario, TipoTarefa, RegistroTempo } from "@/lib/types";
import { formatDuration, formatDate } from "@/lib/format";

export default function History() {
  const [registros, setRegistros] = useState<RegistroTempo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tipos, setTipos] = useState<TipoTarefa[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [regRes, usrRes, tipRes] = await Promise.all([
      supabase
        .from("registros_tempo")
        .select("*, usuarios(nome), tipos_tarefa(nome)")
        .not("fim", "is", null)
        .order("inicio", { ascending: false }),
      supabase.from("usuarios").select("id, nome").order("nome"),
      supabase.from("tipos_tarefa").select("id, nome").order("nome"),
    ]);
    if (regRes.data) setRegistros(regRes.data as unknown as RegistroTempo[]);
    if (usrRes.data) setUsuarios(usrRes.data);
    if (tipRes.data) setTipos(tipRes.data);
  }

  const filtered = registros.filter((r) => {
    if (filtroUsuario && r.usuario_id !== filtroUsuario) return false;
    if (filtroTipo && r.tipo_tarefa_id !== filtroTipo) return false;
    return true;
  });

  const totalSeconds = filtered.reduce(
    (sum, r) => sum + (r.duracao_segundos || 0),
    0
  );

  const avgByType = new Map<string, { total: number; count: number; nome: string }>();
  for (const r of filtered) {
    if (!r.duracao_segundos) continue;
    const nome =
      (r.tipos_tarefa as unknown as TipoTarefa)?.nome || "Desconhecido";
    const entry = avgByType.get(r.tipo_tarefa_id) || {
      total: 0,
      count: 0,
      nome,
    };
    entry.total += r.duracao_segundos;
    entry.count += 1;
    avgByType.set(r.tipo_tarefa_id, entry);
  }

  const selectStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto p-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm flex-1 min-w-[140px]"
          style={selectStyle}
        >
          <option value="">Todas as pessoas</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm flex-1 min-w-[140px]"
          style={selectStyle}
        >
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Resumo */}
      <div
        className="grid grid-cols-2 gap-3 p-4 rounded-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Total registrado
          </div>
          <div className="text-lg font-bold">
            {formatDuration(totalSeconds)}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Tarefas
          </div>
          <div className="text-lg font-bold">{filtered.length}</div>
        </div>
      </div>

      {/* Médias por tipo */}
      {avgByType.size > 0 && (
        <div
          className="p-4 rounded-xl flex flex-col gap-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
            Tempo médio por tipo
          </div>
          {[...avgByType.values()].map((v) => (
            <div key={v.nome} className="flex justify-between text-sm">
              <span>{v.nome}</span>
              <span className="font-mono">
                {formatDuration(Math.round(v.total / v.count))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhum registro encontrado.
          </p>
        )}
        {filtered.map((r) => (
          <div
            key={r.id}
            className="p-3 rounded-xl flex flex-col gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="font-semibold text-sm">
                  {(r.usuarios as unknown as Usuario)?.nome}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    opacity: 0.9,
                  }}
                >
                  {(r.tipos_tarefa as unknown as TipoTarefa)?.nome}
                </span>
              </div>
              <span className="font-mono text-sm font-bold whitespace-nowrap">
                {r.duracao_segundos
                  ? formatDuration(r.duracao_segundos)
                  : "—"}
              </span>
            </div>
            {r.descricao && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {r.descricao}
              </p>
            )}
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatDate(r.inicio)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
