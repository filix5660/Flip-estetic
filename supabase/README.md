# Ligar o Flip ao Supabase

Enquanto o `.env.local` não existir, a aplicação corre em **modo de demonstração**
(dados de exemplo, sem contas). Estes passos ativam a base de dados real.

## 1. Criar o projeto

1. Em supabase.com, cria um projeto na região **Central EU (Frankfurt)**.
2. Guarda a palavra-passe da base de dados num gestor de palavras-passe.

## 2. Criar as tabelas

No painel: **SQL Editor → New query**. Corre cada ficheiro de `migrations/`, **por ordem**
(cola o conteúdo completo e carrega em **Run**):

1. `20261111000000_esquema_inicial.sql`
2. `20261112100000_plano_demo_so_agenda.sql` (plano grátis só com agenda; marcação anotada pelo dono)
3. `20261112110000_plano_demo_sem_limite_servicos.sql` (plano grátis sem limite de serviços)
4. `20261117000000_essencial_um_profissional.sql` (plano Essencial só com 1 profissional)
5. `20261117010000_painel_admin.sql` (painel de controlo em /admin)
6. `20261124000000_gestao_profissionais.sql` (equipa: horário de cada profissional e escolha na marcação)

Cada um tem de terminar com "Success. No rows returned". Um ficheiro já aplicado não se corre outra vez.

## Tornar-te administrador (painel /admin)

Depois de criares a tua conta no site, corre no SQL Editor (com o teu email):

```sql
insert into private.administradores (user_id)
select id from auth.users where email = 'o-teu-email@exemplo.com';
```

Só dá para fazer isto no SQL Editor: a aplicação não tem forma de criar administradores.
O painel lista os salões e permite mudar o plano e marcar contas de cortesia
(demonstração, parceiros). Cada alteração fica em `private.registo_admin`.

## 3. Configurar o login

Em **Authentication**:

- **Sign In / Providers → Email**: manter "Confirm email" **ligado**;
  definir o tamanho mínimo da palavra-passe em **10**.
- **URL Configuration**:
  - *Site URL*: `http://localhost:3000` (em produção, o endereço real com https).
  - *Redirect URLs*: acrescentar `http://localhost:3000/auth/confirmar`
    (e o equivalente de produção).

## 4. Chaves

1. Copia `.env.example` para `.env.local` (na raiz do projeto).
2. Preenche com o **Project URL** e a chave **publishable**
   (Project Settings → API / API Keys).
3. Reinicia o `npm run dev`.

> **Nunca** uses a chave `secret` / `service_role` neste projeto, nem a coles
> em conversas, issues ou commits. Se isso acontecer, gera uma nova no painel.

## 5. Confirmar que ficou seguro

- **Advisors → Security Advisor** no painel: não deve haver avisos de
  "RLS disabled" em tabelas de `public`.
- Cria duas contas com dois salões e confirma que cada uma só vê os seus dados.

## Regras para futuras alterações à base de dados

- Cada alteração é um ficheiro novo em `migrations/` (nunca editar um já aplicado).
- **Toda a tabela nova** precisa de: `enable row level security`, `revoke all … from anon, authenticated`
  e depois só os `grant` e as policies necessárias. O Supabase dá acesso total por omissão.
- Funções `security definer` têm sempre `set search_path = ''` e nomes com esquema (`public.…`).
- Os limites dos planos existem em dois sítios: tabela `planos` e `lib/planos.ts`. Alterar os dois.

## Antes de ter clientes reais

- Plano pago do Supabase (o gratuito pausa o projeto e não tem cópias de segurança).
- Servidor de email próprio (o do Supabase só envia poucos emails por hora).
- Proteção contra robôs na página de marcação (CAPTCHA, ex.: Cloudflare Turnstile).
- Recuperação de palavra-passe e eliminação de conta/dados (RGPD).
- Política de privacidade e termos de utilização.
