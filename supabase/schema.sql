-- Cronômetro Startip — schema
-- Rodar no SQL Editor do Supabase

-- Usuários da equipe
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz default now()
);

-- Tipos de tarefa (editável)
create table if not exists tipos_tarefa (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz default now()
);

-- Registros de tempo
create table if not exists registros_tempo (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  tipo_tarefa_id uuid not null references tipos_tarefa(id),
  descricao text not null default '',
  inicio timestamptz not null,
  fim timestamptz,
  duracao_segundos integer,
  pausado boolean not null default false,
  inicio_pausa timestamptz,
  tempo_pausado_total integer not null default 0,
  created_at timestamptz default now()
);

-- Índices para consultas de relatório
create index if not exists idx_registros_usuario on registros_tempo(usuario_id);
create index if not exists idx_registros_tipo on registros_tempo(tipo_tarefa_id);
create index if not exists idx_registros_inicio on registros_tempo(inicio);

-- Seed: usuários iniciais
insert into usuarios (nome) values ('Gabriel'), ('Dhomini'), ('Iuri')
on conflict (nome) do nothing;

-- Seed: tipos de tarefa iniciais
insert into tipos_tarefa (nome) values
  ('Carrossel'),
  ('Edição de vídeo'),
  ('Post estático'),
  ('Stories'),
  ('Reels')
on conflict (nome) do nothing;

-- RLS: habilitar mas permitir tudo (sem auth nesta fase)
alter table usuarios enable row level security;
alter table tipos_tarefa enable row level security;
alter table registros_tempo enable row level security;

create policy "allow_all_usuarios" on usuarios for all using (true) with check (true);
create policy "allow_all_tipos" on tipos_tarefa for all using (true) with check (true);
create policy "allow_all_registros" on registros_tempo for all using (true) with check (true);
