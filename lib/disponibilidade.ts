import { diaDaSemana, horaEmMinutos, minutosEmHora } from "./datas";
import type { Data, HorarioSemanal, Hora, Servico } from "./modelo";

const INTERVALO_MINUTOS = 30;

/**
 * Horários possíveis num dia, só pelo horário de funcionamento.
 *
 * Usado APENAS no modo de demonstração. Com base de dados, a disponibilidade
 * real (marcações existentes, intervalos fechados, profissionais) é calculada
 * pela função `horarios_livres` da base de dados.
 */
export function horariosDeExemplo(
  data: Data,
  servico: Servico,
  horarios: HorarioSemanal[],
  hoje: Data,
  horaAtual: Hora,
) {
  if (data < hoje) return [];

  const horario = horarios.find((h) => h.diaSemana === diaDaSemana(data));
  if (!horario?.aberto) return [];

  const fecho = horaEmMinutos(horario.fecho);
  const minimo = data === hoje ? horaEmMinutos(horaAtual) : -1;
  const resultado: Hora[] = [];

  for (
    let inicio = horaEmMinutos(horario.abertura);
    inicio + servico.duracaoMinutos <= fecho;
    inicio += INTERVALO_MINUTOS
  ) {
    if (inicio > minimo) resultado.push(minutosEmHora(inicio));
  }

  return resultado;
}
