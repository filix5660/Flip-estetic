# Ligar o back-end e a base de dados

O front-end já fala com uma camada de dados assíncrona com a mesma forma de uma
base de dados real. Hoje os dados vivem em memória (`lib/dados/memoria.ts`) e são
recriados de cada vez que o servidor reinicia.

## Como está organizado

```
app/
  page.tsx                 Página inicial do SaaS (planos)
  [slug]/                  Página pública de marcação de cada negócio (/barbearia-central)
    acoes.ts               Server Actions públicas: dias com vaga, horários, confirmar
    fluxo-marcacao.tsx     Serviço → profissional → dia → hora → dados → confirmado
  gestao/                  Área do proprietário
    acoes.ts               Todas as Server Actions da gestão (validação + gravação)
    agenda/ servicos/ horarios/ profissionais/ clientes/ pagina-publica/ definicoes/
lib/
  tipos.ts                 Modelo de domínio (espelha prisma/schema.prisma)
  disponibilidade.ts       Cálculo puro das vagas (com testes)
  agendamento.ts           Regras de negócio: vagas por dia/mês, reservar, agenda do dia
  dados/repositorio.ts     Contrato de acesso a dados
  dados/memoria.ts         Implementação em memória (desenvolvimento)
  dados/semente.ts         Dados de exemplo
  sessao.ts                Negócio da sessão (hoje: cookie de demonstração)
prisma/schema.prisma       Esquema PostgreSQL pronto a usar
```

## Como os horários livres são guardados

**Não são guardados.** Guardamos só as regras e as marcações:

| O quê | Tabela |
| --- | --- |
| Semana normal (períodos por dia; as pausas são os espaços entre períodos) | `PeriodoSemanal` |
| Folgas, férias, feriados ou horário diferente em certas datas | `DiaEspecial` + `DiaEspecialPeriodo` |
| Horas fechadas num dia concreto | `Bloqueio` |
| Duração de cada serviço | `Servico.duracaoMin` |
| Modo das vagas, intervalo entre marcações, antecedência e janela | colunas em `Negocio` |
| Marcações | `Marcacao` |

As vagas são calculadas a pedido em `lib/disponibilidade.ts`:

1. Períodos do dia = dia especial (se existir) ou semana normal.
2. Ocupado = marcações ativas (+ intervalo entre marcações) + bloqueios.
3. Livre = períodos − ocupado.
4. Vagas = inícios onde o serviço cabe inteiro:
   - **pela duração do serviço**: 09:00, 09:45, 10:30… para um serviço de 45 min;
   - **em horários fixos**: grelha fixa (ex.: de 30 em 30 min) definida pelo proprietário.
5. Filtra pela antecedência mínima e pela janela de marcação.

Assim, qualquer alteração do proprietário (novo horário, folga, serviço mais longo)
reflete-se logo, sem vagas desatualizadas. Ao confirmar, as vagas são recalculadas
para evitar marcações duplicadas.

## Passos para ligar o PostgreSQL

1. `npm install prisma @prisma/client` e copia `.env.example` para `.env`.
2. `npx prisma migrate dev --name inicial`.
3. Cria uma migração vazia (`npx prisma migrate dev --create-only --name sem-sobreposicao`),
   cola lá o conteúdo de `prisma/sql/sem-sobreposicao.sql` e aplica-a. Isto impede
   marcações sobrepostas mesmo com pedidos em simultâneo.
4. Cria `lib/dados/prisma.ts` com uma função `criarRepositorioPrisma(): Repositorio`
   que implementa a interface de `lib/dados/repositorio.ts`
   (conversões: `@db.Date` ↔ `"YYYY-MM-DD"`, `PeriodoSemanal[]` ↔ `HorarioSemanal[]`).
5. Em `lib/dados/index.ts`, troca `criarRepositorioMemoria()` por `criarRepositorioPrisma()`.

Nenhuma página, componente ou Server Action precisa de mudar.

## Próximos passos

- **Autenticação**: substituir o cookie de demonstração em `lib/sessao.ts` pela sessão real
  (Auth.js, Clerk, Supabase Auth…). Criar `/entrar` e `/registar`.
- **Logótipos**: enviar para um storage (S3, R2, Supabase Storage) e guardar só o URL.
- **Notificações**: confirmação e lembretes por SMS/WhatsApp/email (ver `TODO` em `app/[slug]/acoes.ts`).
- **Pagamentos dos planos**: Stripe Checkout + webhooks antes de `mudarPlano`.
- **Link de cancelamento** para o cliente (token único por marcação).
