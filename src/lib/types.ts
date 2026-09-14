export interface Usuario {
  id: string;
  nome: string;
}

export interface TipoTarefa {
  id: string;
  nome: string;
}

export interface RegistroTempo {
  id: string;
  usuario_id: string;
  tipo_tarefa_id: string;
  descricao: string;
  inicio: string;
  fim: string | null;
  duracao_segundos: number | null;
  pausado: boolean;
  inicio_pausa: string | null;
  tempo_pausado_total: number;
  usuarios?: Usuario;
  tipos_tarefa?: TipoTarefa;
}
