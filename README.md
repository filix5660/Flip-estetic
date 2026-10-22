# Flip Estética

SaaS de marcações e gestão para salões, barbearias e clínicas de estética.
Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript.

## Começar

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

| Endereço | O quê |
| --- | --- |
| `/` | Página inicial e planos |
| `/barbearia-central` | Página de marcação de exemplo (plano Equipa, 2 profissionais) |
| `/estudio-bela` | Página de marcação de exemplo (plano Solo, horários fixos de 30 min) |
| `/gestao` | Área do proprietário (painel, agenda, serviços, horários, equipa, clientes, página pública, plano) |

Na barra lateral da gestão há um seletor de demonstração para alternar entre os dois negócios.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm test` — testes do cálculo de vagas

## Dados

Por agora os dados vivem em memória e voltam ao estado inicial quando o servidor reinicia.
A estrutura está pronta para PostgreSQL: vê [docs/BACKEND.md](docs/BACKEND.md).

Documentação geral do código: [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md).
