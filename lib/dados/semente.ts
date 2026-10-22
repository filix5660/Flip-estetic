/**
 * Dados de exemplo para desenvolvimento.
 * Dois negócios de demonstração, um em cada plano:
 *   /barbearia-central → plano Equipa (2 profissionais, vagas pela duração do serviço)
 *   /estudio-bela      → plano Solo (vagas em intervalos fixos de 30 min)
 * As marcações são geradas à volta da data de hoje para a agenda nunca estar vazia.
 */

import { periodosDeTrabalho, subtrairIntervalos } from "../disponibilidade";
import { agoraNoFuso, horaParaMin, somarDias } from "../tempo";
import type {
  Cliente,
  HorarioSemanal,
  Intervalo,
  Marcacao,
  Negocio,
  Profissional,
  Servico,
} from "../tipos";
import type { BaseDados } from "./memoria";

const FUSO = "Europe/Lisbon";
const CRIADO = "2026-01-01T09:00:00.000Z";

const p = (inicio: string, fim: string): Intervalo => ({
  inicioMin: horaParaMin(inicio),
  fimMin: horaParaMin(fim),
});

function semana(
  profissionalId: string,
  dias: Partial<Record<number, Intervalo[]>>,
): HorarioSemanal[] {
  return [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
    profissionalId,
    diaSemana,
    intervalos: dias[diaSemana] ?? [],
  }));
}

export function criarSemente(): BaseDados {
  const hoje = agoraNoFuso(FUSO).data;

  const negocios: Negocio[] = [
    {
      id: "neg-barbearia",
      slug: "barbearia-central",
      nome: "Barbearia Central",
      tipo: "barbearia",
      apresentacao: "Cortes clássicos e modernos, barba feita à navalha e um bom café.",
      morada: "Rua das Flores, 24 · Lisboa",
      telefone: "+351 912 345 678",
      corPrincipal: "#2b2620",
      logotipoUrl: null,
      fusoHorario: FUSO,
      plano: "equipa",
      regras: {
        modoVagas: "duracao_servico",
        intervaloFixoMin: 30,
        folgaEntreMarcacoesMin: 0,
        antecedenciaMinimaMin: 60,
        janelaMarcacaoDias: 60,
      },
      criadoEm: CRIADO,
    },
    {
      id: "neg-estudio",
      slug: "estudio-bela",
      nome: "Estúdio Bela",
      tipo: "estetica",
      apresentacao: "Estética, unhas e bem-estar num espaço tranquilo.",
      morada: "Av. da Liberdade, 120 · Porto",
      telefone: "+351 934 567 890",
      corPrincipal: "#9b4f63",
      logotipoUrl: null,
      fusoHorario: FUSO,
      plano: "solo",
      regras: {
        modoVagas: "intervalo_fixo",
        intervaloFixoMin: 30,
        folgaEntreMarcacoesMin: 10,
        antecedenciaMinimaMin: 120,
        janelaMarcacaoDias: 45,
      },
      criadoEm: CRIADO,
    },
  ];

  const profissionais: Profissional[] = [
    { id: "pro-ricardo", negocioId: "neg-barbearia", nome: "Ricardo Alves", cargo: "Barbeiro sénior", cor: "#8a6a4b", ativo: true },
    { id: "pro-tiago", negocioId: "neg-barbearia", nome: "Tiago Sousa", cargo: "Barbeiro", cor: "#3f6b5c", ativo: true },
    { id: "pro-ines", negocioId: "neg-estudio", nome: "Inês Martins", cargo: "Esteticista", cor: "#9b4f63", ativo: true },
  ];

  const servicos: Servico[] = [
    { id: "srv-corte", negocioId: "neg-barbearia", nome: "Corte de cabelo", descricao: "Corte à tesoura ou máquina, com lavagem.", duracaoMin: 30, precoCentimos: 1500, ativo: true, profissionalIds: ["pro-ricardo", "pro-tiago"] },
    { id: "srv-barba", negocioId: "neg-barbearia", nome: "Barba", descricao: "Barba aparada e desenhada, com toalha quente.", duracaoMin: 20, precoCentimos: 1000, ativo: true, profissionalIds: ["pro-ricardo", "pro-tiago"] },
    { id: "srv-combo", negocioId: "neg-barbearia", nome: "Corte + barba", descricao: "O serviço completo.", duracaoMin: 45, precoCentimos: 2200, ativo: true, profissionalIds: ["pro-ricardo", "pro-tiago"] },
    { id: "srv-infantil", negocioId: "neg-barbearia", nome: "Corte infantil", descricao: "Até aos 12 anos.", duracaoMin: 25, precoCentimos: 1200, ativo: true, profissionalIds: ["pro-tiago"] },
    { id: "srv-pigmento", negocioId: "neg-barbearia", nome: "Pigmentação de barba", descricao: "Uniformiza falhas e realça o desenho.", duracaoMin: 40, precoCentimos: 1800, ativo: true, profissionalIds: ["pro-ricardo"] },
    { id: "srv-limpeza", negocioId: "neg-estudio", nome: "Limpeza de pele", descricao: "Limpeza profunda com extração e máscara.", duracaoMin: 60, precoCentimos: 3500, ativo: true, profissionalIds: ["pro-ines"] },
    { id: "srv-manicure", negocioId: "neg-estudio", nome: "Manicure com verniz gel", descricao: "", duracaoMin: 45, precoCentimos: 1800, ativo: true, profissionalIds: ["pro-ines"] },
    { id: "srv-sobrancelhas", negocioId: "neg-estudio", nome: "Design de sobrancelhas", descricao: "", duracaoMin: 30, precoCentimos: 1200, ativo: true, profissionalIds: ["pro-ines"] },
    { id: "srv-massagem", negocioId: "neg-estudio", nome: "Massagem relaxante", descricao: "Corpo inteiro, com óleos aromáticos.", duracaoMin: 60, precoCentimos: 4000, ativo: true, profissionalIds: ["pro-ines"] },
  ];

  const horarios: HorarioSemanal[] = [
    // Ricardo: terça a sábado, com pausa para almoço.
    ...semana("pro-ricardo", {
      2: [p("09:00", "13:00"), p("14:00", "19:00")],
      3: [p("09:00", "13:00"), p("14:00", "19:00")],
      4: [p("09:00", "13:00"), p("14:00", "19:00")],
      5: [p("09:00", "13:00"), p("14:00", "19:00")],
      6: [p("09:00", "14:00")],
    }),
    // Tiago: segunda a sexta sem pausa, sábado de manhã.
    ...semana("pro-tiago", {
      1: [p("10:00", "19:00")],
      2: [p("10:00", "19:00")],
      3: [p("10:00", "19:00")],
      4: [p("10:00", "19:00")],
      5: [p("10:00", "19:00")],
      6: [p("09:00", "13:00")],
    }),
    // Inês: segunda a sexta, pausa das 13h às 14h; quinta só de tarde.
    ...semana("pro-ines", {
      1: [p("09:30", "13:00"), p("14:00", "18:30")],
      2: [p("09:30", "13:00"), p("14:00", "18:30")],
      3: [p("09:30", "13:00"), p("14:00", "18:30")],
      4: [p("14:00", "20:00")],
      5: [p("09:30", "13:00"), p("14:00", "18:30")],
    }),
  ];

  const diasEspeciais = [
    { id: "esp-1", profissionalId: "pro-ricardo", dataInicio: somarDias(hoje, 9), dataFim: somarDias(hoje, 11), intervalos: [], motivo: "Formação" },
    { id: "esp-2", profissionalId: "pro-ines", dataInicio: somarDias(hoje, 20), dataFim: somarDias(hoje, 27), intervalos: [], motivo: "Férias" },
  ];

  const bloqueios = [
    { id: "blq-1", profissionalId: "pro-tiago", data: somarDias(hoje, 1), inicioMin: horaParaMin("16:00"), fimMin: horaParaMin("17:00"), motivo: "Consulta médica" },
  ];

  const nomesClientes: [string, string][] = [
    ["João Pereira", "+351 911 111 111"],
    ["Rui Costa", "+351 912 222 222"],
    ["Miguel Santos", "+351 913 333 333"],
    ["Pedro Lopes", "+351 914 444 444"],
    ["André Ferreira", "+351 915 555 555"],
    ["Carlos Mendes", "+351 916 666 666"],
    ["Sofia Rodrigues", "+351 921 111 111"],
    ["Ana Oliveira", "+351 922 222 222"],
    ["Beatriz Gomes", "+351 923 333 333"],
    ["Marta Ribeiro", "+351 924 444 444"],
  ];

  const clientes: Cliente[] = nomesClientes.map(([nome, telefone], i) => ({
    id: `cli-${i + 1}`,
    negocioId: i < 6 ? "neg-barbearia" : "neg-estudio",
    nome,
    telefone,
    email: "",
    notas: i === 0 ? "Prefere corte com tesoura." : "",
    criadoEm: CRIADO,
  }));

  const base: BaseDados = {
    negocios,
    profissionais,
    servicos,
    horarios,
    diasEspeciais,
    bloqueios,
    clientes,
    marcacoes: [],
  };

  base.marcacoes = gerarMarcacoes(base, hoje);
  return base;
}

/** Preenche cerca de metade do horário de cada profissional, de forma determinística. */
function gerarMarcacoes(base: BaseDados, hoje: string): Marcacao[] {
  const marcacoes: Marcacao[] = [];
  const agora = agoraNoFuso(FUSO);
  let contador = 0;

  for (const profissional of base.profissionais) {
    const servicos = base.servicos.filter((s) => s.profissionalIds.includes(profissional.id));
    const clientes = base.clientes.filter((c) => c.negocioId === profissional.negocioId);
    const horario = base.horarios.filter((h) => h.profissionalId === profissional.id);
    const especiais = base.diasEspeciais.filter((d) => d.profissionalId === profissional.id);

    for (let d = -21; d <= 6; d++) {
      const data = somarDias(hoje, d);
      const { intervalos } = periodosDeTrabalho(data, horario, especiais);
      const bloqueados = base.bloqueios.filter(
        (b) => b.profissionalId === profissional.id && b.data === data,
      );

      for (const periodo of subtrairIntervalos(intervalos, bloqueados)) {
        let t = periodo.inicioMin;
        while (t < periodo.fimMin) {
          contador++;
          const servico = servicos[contador % servicos.length];
          const fim = t + servico.duracaoMin;
          if (fim > periodo.fimMin) break;

          // Padrão pseudo-aleatório: ~55% do tempo ocupado.
          if ((contador * 7 + d * 3) % 9 < 5) {
            const passou = d < 0 || (d === 0 && fim <= agora.minutos);
            let estado: Marcacao["estado"] = passou ? "concluida" : "confirmada";
            if (passou && contador % 17 === 0) estado = "falta";
            if (contador % 23 === 0) estado = "cancelada";

            marcacoes.push({
              id: `mar-${contador}`,
              negocioId: profissional.negocioId,
              profissionalId: profissional.id,
              servicoId: servico.id,
              clienteId: clientes[contador % clientes.length].id,
              data,
              inicioMin: t,
              fimMin: fim,
              estado,
              origem: contador % 4 === 0 ? "manual" : "online",
              precoCentimos: servico.precoCentimos,
              notas: "",
              criadaEm: CRIADO,
            });
            t = fim;
          } else {
            t += 30;
          }
        }
      }
    }
  }

  return marcacoes;
}
