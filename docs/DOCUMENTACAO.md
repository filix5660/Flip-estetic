# Flip Estética — documentação

SaaS de marcações online e gestão de agenda para salões, barbearias e estética.

**Stack:** Next.js 16 (App Router, Server Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4.
**Estado atual:** front-end completo com dados de exemplo em memória; pronto para ligar PostgreSQL (ver [BACKEND.md](BACKEND.md)).

---

## 1. Como correr

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testes do cálculo de vagas
npm run lint
npm run build
```

| Endereço | O que é |
| --- | --- |
| `/` | Página do SaaS e planos |
| `/barbearia-central` | Exemplo de página de marcação — plano **Equipa**, vagas pela duração do serviço |
| `/estudio-bela` | Exemplo — plano **Solo**, vagas em horários fixos de 30 min |
| `/gestao` | Área do proprietário |

Na barra lateral da gestão há um seletor para alternar entre os dois negócios de demonstração.
Os dados voltam ao início sempre que o servidor reinicia.

---

## 2. Estrutura de pastas

```
app/
  page.tsx                  Página inicial (marketing + planos)
  layout.tsx, globals.css   Layout raiz, fontes e tokens de design (Tailwind)
  not-found.tsx             Página 404
  [slug]/                   Página pública de marcação de cada negócio
    page.tsx                Carrega o negócio e envia só dados públicos
    fluxo-marcacao.tsx      Passos da marcação (Client Component)
    acoes.ts                Server Actions públicas
  gestao/                   Área do proprietário
    layout.tsx              Barra lateral + conteúdo
    barra-lateral.tsx       Navegação (computador e telemóvel)
    acoes.ts                Todas as Server Actions da gestão
    page.tsx                Painel
    agenda/                 Agenda do dia, estados, nova marcação
    servicos/               Serviços (duração, preço, quem faz)
    horarios/               Semana normal, folgas, bloqueios, regras das vagas
    profissionais/          Equipa (ou perfil no plano Solo)
    clientes/               Lista de clientes
    pagina-publica/         Personalizar a página pública
    definicoes/             Plano (Solo / Equipa)
components/                 UI partilhada: botões, cartões, calendário, diálogo, ícones…
lib/
  tipos.ts                  Modelo de domínio
  tempo.ts                  Datas ISO e minutos do dia
  formatar.ts               Preços, durações, datas em pt-PT
  validar.ts                Telefone, email, cor, slug
  planos.ts                 Definição dos planos e limites
  disponibilidade.ts        Cálculo puro das vagas (+ .test.ts)
  agendamento.ts            Regras de negócio (vagas, reservar, agenda do dia)
  sessao.ts                 Negócio da sessão (hoje: cookie de demonstração)
  dados/
    repositorio.ts          Contrato de acesso a dados
    memoria.ts              Implementação em memória
    semente.ts              Dados de exemplo
    index.ts                Escolhe a implementação (`repo`)
prisma/                     Esquema PostgreSQL e SQL anti-sobreposição
docs/                       Esta documentação e BACKEND.md
```

---

## 3. Arquitetura em camadas

```
Página (Server Component)  ──lê──▶  lib/agendamento.ts  ──▶  lib/dados (repo)
      │                                     │
      ▼                                     ▼
Componente cliente ──chama──▶ Server Action (acoes.ts) ──valida──▶ repo ──▶ revalidatePath
                                            │
                                lib/disponibilidade.ts (cálculo puro)
```

- **Páginas** leem dados no servidor e passam ao browser só o necessário.
- **Componentes cliente** tratam da interação e chamam **Server Actions**.
- **Server Actions** confirmam o negócio da sessão, validam, gravam no `repo` e atualizam as páginas (`revalidatePath`). Devolvem sempre `{ ok: true, dados }` ou `{ ok: false, erro }`.
- **`repo`** é a única porta para os dados. Trocar memória por PostgreSQL não mexe no resto.

---

## 4. Modelo de dados (`lib/tipos.ts`)

| Entidade | Para quê |
| --- | --- |
| `Negocio` | Dados públicos, plano, fuso horário e `regras` de marcação |
| `Profissional` | Quem atende (1 no Solo, até 15 no Equipa) |
| `Servico` | Nome, duração, preço, ativo, profissionais que o fazem |
| `HorarioSemanal` | Períodos de trabalho por dia da semana |
| `DiaEspecial` | Folga/férias ou horário diferente num intervalo de datas |
| `Bloqueio` | Horas fechadas numa data |
| `Cliente` | Criado automaticamente pelo telemóvel |
| `Marcacao` | Data, início/fim, estado, origem (online/manual), preço no momento |

**Convenções:** datas são `"YYYY-MM-DD"` no fuso do negócio; horas são minutos desde a meia-noite (`570` = 09:30); preços em cêntimos.

---

## 5. Como as vagas são calculadas

As vagas **não são guardadas** — calculam-se a pedido em `lib/disponibilidade.ts`:

1. **Períodos do dia** = dia especial, se existir; senão, a semana normal.
2. **Ocupado** = marcações ativas (com o intervalo entre marcações) + bloqueios.
3. **Livre** = períodos − ocupado.
4. **Vagas** = inícios onde o serviço cabe inteiro, conforme o modo:
   - `duracao_servico` — seguidas com a duração do serviço (45 min → 09:00, 09:45, 10:30…);
   - `intervalo_fixo` — numa grelha fixa (ex.: a cada 30 min).
5. Remove o que viola a **antecedência mínima** ou a **janela de marcação** (o proprietário pode ignorar estes limites nas marcações manuais).

No plano Equipa com "sem preferência", juntam-se as vagas de todos os profissionais; ao confirmar, a marcação vai para o profissional livre com menos marcações nesse dia.
Ao confirmar, as vagas são **recalculadas** para evitar marcações duplicadas (na base de dados há ainda uma restrição SQL).

As pausas não são um conceito à parte: são os espaços entre períodos de um dia, totalmente decididos pelo proprietário.

---

## 6. Funcionalidades por página

**Cliente — `/[slug]`**
Serviço → profissional (Equipa) → dia (só dias com vaga) → hora → dados → confirmação, com opção de adicionar ao calendário (.ics) e lembrar os dados no dispositivo.

**Gestão**
| Página | O que faz |
| --- | --- |
| Painel | Marcações de hoje, faturação prevista, ocupação, próximos 7 dias, link |
| Agenda | Dia por profissional (marcações, livres, pausas, bloqueios); concluir, falta, cancelar, repor; nova marcação manual. Estado no URL (`?data`, `?profissional`, `?nova`) |
| Serviços | Criar/editar/desativar/remover; duração, preço e quem faz |
| Horários | Semana normal com vários períodos por dia, folgas e dias diferentes, horas fechadas, regras das vagas e pré-visualização |
| Equipa / Perfil | Profissionais, cor na agenda, ativo/inativo, limite do plano |
| Clientes | Pesquisa, visitas, faltas, última e próxima visita, total gasto |
| Página pública | Nome, endereço (slug), contactos, logótipo, cor, pré-visualização |
| Plano | Mudar entre Solo e Equipa |

---

## 7. Design

- Tokens em `app/globals.css` (`@theme`): `fundo`, `superficie`, `tinta`, `suave`, `linha`, `escuro`, `acento-*` → utilitários como `bg-fundo`, `text-suave`, `border-linha`.
- A cor de cada negócio é aplicada com as variáveis `--marca` / `--marca-texto` (`bg-(--marca)`), e o texto escolhe automaticamente branco ou escuro pelo contraste.
- Componentes base em `components/ui.tsx`: `Botao`, `BotaoLink`, `Cartao`, `CabecalhoPagina`, `Campo`, `classeInput`, `Interruptor`, `Alerta`, `Distintivo`, `Avatar`, `EstadoVazio`.

---

## 8. Próximos passos

1. Ligar PostgreSQL com Prisma — passos em [BACKEND.md](BACKEND.md).
2. Autenticação (substituir o cookie em `lib/sessao.ts`) e páginas `/entrar` e `/registar`.
3. Envio de logótipos para storage (hoje ficam em data URL).
4. Notificações e lembretes (SMS/WhatsApp/email) e link de cancelamento para o cliente.
5. Pagamentos dos planos (Stripe).

Os pontos de entrada estão marcados com `TODO(...)` no código.
