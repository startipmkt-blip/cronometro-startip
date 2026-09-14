"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";

export default function UserSelect({
  onSelect,
}: {
  onSelect: (user: Usuario) => void;
}) {
  const [users, setUsers] = useState<Usuario[]>([]);

  useEffect(() => {
    supabase
      .from("usuarios")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => {
        if (data) setUsers(data);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Cronômetro Startip
      </h1>
      <p style={{ color: "var(--text-muted)" }}>Quem está trabalhando?</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            className="px-6 py-4 rounded-xl text-lg font-semibold text-white transition-colors cursor-pointer"
            style={{ background: "var(--primary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--primary-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--primary)")
            }
          >
            {u.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
