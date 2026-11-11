-- Flip · esquema inicial
--
-- Princípios de segurança deste ficheiro:
--   1. Todas as tabelas têm RLS ativo. Sem uma policy que permita, ninguém lê.
--   2. Privilégios mínimos: primeiro tira-se tudo a anon/authenticated, depois
--      dá-se só o que cada papel precisa (por tabela e, onde importa, por coluna).
--   3. Visitantes (anon) nunca tocam em clientes nem marcações diretamente:
--      só através de funções que validam tudo (horarios_livres, criar_marcacao).
--   4. Cada registo pertence a um salão e as chaves estrangeiras compostas
--      impedem misturar dados de salões diferentes.
--   5. Funções SECURITY DEFINER têm search_path vazio e nomes qualificados.

create extension if not exists btree_gist with schema extensions;

-- Esquema privado: não é exposto pela API. Guarda funções auxiliares.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ───────────────────────────── Planos ─────────────────────────────
-- ATENÇÃO: limites provisórios, iguais aos de lib/planos.ts. Manter em sintonia.
create table public.planos (
  id text primary key,
  nome text not null,
  limite_profissionais int check (limite_profissionais > 0),
  limite_servicos int check (limite_servicos > 0),
  limite_marcacoes_mes int check (limite_marcacoes_mes > 0)
);

insert into public.planos (id, nome, limite_profissionais, limite_servicos, limite_marcacoes_mes) values
  ('demo', 'Demonstração', 1, 5, 50),
  ('essencial', 'Essencial', 3, null, null),
  ('profissional', 'Profissional', null, null, null);

-- ───────────────────────────── Salões ─────────────────────────────
-- Só contém informação pública (é o que aparece na página de marcação).
create table public.saloes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40)
    check (slug not in (
      'gestao', 'entrar', 'criar-conta', 'comecar', 'sair', 'auth', 'api',
      'admin', 'planos', 'precos', 'ajuda', 'termos', 'privacidade',
      'recuperar-senha', 'conta', 'app', 'www', 'flip'
    )),
  nome text not null check (char_length(btrim(nome)) between 2 and 50),
  tipo text not null default 'outro'
    check (tipo in ('barbearia', 'estetica', 'cabeleireiro', 'unhas', 'outro')),
  apresentacao text not null default '' check (char_length(apresentacao) <= 140),
  morada text not null default '' check (char_length(morada) <= 120),
  telefone text not null default '' check (char_length(telefone) <= 30),
  -- Validado como cor hexadecimal porque é usado em CSS na página pública.
  cor_principal text not null default '#29251f' check (cor_principal ~ '^#[0-9a-fA-F]{6}$'),
  logotipo_url text check (char_length(logotipo_url) <= 300),
  plano text not null default 'demo' references public.planos (id),
  fuso_horario text not null default 'Europe/Lisbon',
  criado_em timestamptz not null default now()
);

create table public.membros_salao (
  salao_id uuid not null references public.saloes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'funcionario')),
  criado_em timestamptz not null default now(),
  primary key (salao_id, user_id)
);
create index membros_salao_user_id_idx on public.membros_salao (user_id);

-- ─────────────────────── Dados de cada salão ───────────────────────
create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  ativo boolean not null default true,
  unique (salao_id, id)
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  duracao_minutos int not null check (duracao_minutos between 5 and 480),
  preco_centimos int not null check (preco_centimos between 0 and 1000000),
  ativo boolean not null default true,
  unique (salao_id, id)
);

create table public.horarios_semanais (
  salao_id uuid not null references public.saloes (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  aberto boolean not null default true,
  abertura time not null default '09:00',
  fecho time not null default '18:00',
  primary key (salao_id, dia_semana),
  check (fecho > abertura)
);

create table public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes (id) on delete cascade,
  profissional_id uuid,
  data date not null,
  inicio time not null,
  fim time not null,
  motivo text not null default '' check (char_length(motivo) <= 120),
  check (fim > inicio),
  foreign key (salao_id, profissional_id)
    references public.profissionais (salao_id, id) on delete cascade
);
create index bloqueios_salao_data_idx on public.bloqueios (salao_id, data);

-- Dados pessoais (RGPD): só o mínimo necessário para a marcação.
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  contacto text not null check (char_length(btrim(contacto)) between 5 and 120),
  criado_em timestamptz not null default now(),
  unique (salao_id, id)
);
create index clientes_salao_contacto_idx on public.clientes (salao_id, lower(contacto));

create table public.marcacoes (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.saloes (id) on delete cascade,
  profissional_id uuid not null,
  servico_id uuid not null,
  cliente_id uuid not null,
  data date not null,
  inicio time not null,
  fim time not null,
  estado text not null default 'marcada'
    check (estado in ('marcada', 'concluida', 'faltou', 'cancelada')),
  -- Valor recebido, definido ao concluir. Null = preço do serviço.
  valor_centimos int check (valor_centimos between 0 and 1000000),
  criado_em timestamptz not null default now(),
  check (fim > inicio),
  -- Chaves compostas: o profissional, o serviço e o cliente têm de ser do mesmo salão.
  foreign key (salao_id, profissional_id) references public.profissionais (salao_id, id),
  foreign key (salao_id, servico_id) references public.servicos (salao_id, id),
  foreign key (salao_id, cliente_id) references public.clientes (salao_id, id),
  -- Um profissional nunca fica com duas marcações ativas sobrepostas,
  -- mesmo que dois clientes confirmem no mesmo instante.
  constraint marcacoes_sem_sobreposicao exclude using gist (
    profissional_id with =,
    tsrange(data + inicio, data + fim) with &&
  ) where (estado in ('marcada', 'concluida'))
);
create index marcacoes_salao_data_idx on public.marcacoes (salao_id, data);
create index marcacoes_cliente_idx on public.marcacoes (cliente_id);

-- ───────────────────── Funções auxiliares (privadas) ─────────────────────
create function private.e_membro(p_salao_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.membros_salao m
    where m.salao_id = p_salao_id and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.e_membro(uuid) from public;
grant execute on function private.e_membro(uuid) to authenticated;

-- Limites do plano (serviços e profissionais ativos).
create function private.verificar_limite_plano()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_limite int;
  v_total int;
begin
  if not new.ativo then
    return new;
  end if;

  if tg_table_name = 'servicos' then
    select p.limite_servicos into v_limite
      from public.saloes s join public.planos p on p.id = s.plano
      where s.id = new.salao_id;
    select count(*) into v_total from public.servicos
      where salao_id = new.salao_id and ativo and id <> new.id;
  else
    select p.limite_profissionais into v_limite
      from public.saloes s join public.planos p on p.id = s.plano
      where s.id = new.salao_id;
    select count(*) into v_total from public.profissionais
      where salao_id = new.salao_id and ativo and id <> new.id;
  end if;

  if v_limite is not null and v_total >= v_limite then
    raise exception 'LIMITE_PLANO';
  end if;
  return new;
end;
$$;
revoke all on function private.verificar_limite_plano() from public;

create trigger servicos_limite_plano
  before insert or update of ativo on public.servicos
  for each row execute function private.verificar_limite_plano();

create trigger profissionais_limite_plano
  before insert or update of ativo on public.profissionais
  for each row execute function private.verificar_limite_plano();

-- Horários livres de um salão num dia: uma linha por (hora, profissional livre).
-- É a única fonte de verdade da disponibilidade.
create function private.vagas(p_salao_id uuid, p_servico_id uuid, p_data date)
returns table (inicio time, profissional_id uuid)
language sql stable security definer set search_path = ''
as $$
  select t.inicio::time, p.id
  from public.saloes s
  join public.servicos sv
    on sv.salao_id = s.id and sv.id = p_servico_id and sv.ativo
  join public.horarios_semanais h
    on h.salao_id = s.id and h.dia_semana = extract(dow from p_data)::int and h.aberto
  cross join lateral generate_series(
    p_data + h.abertura,
    p_data + h.fecho - make_interval(mins => sv.duracao_minutos),
    interval '30 minutes'
  ) as t (inicio)
  join public.profissionais p on p.salao_id = s.id and p.ativo
  where s.id = p_salao_id
    -- só no futuro, e no máximo 90 dias à frente
    and t.inicio > (now() at time zone s.fuso_horario)
    and p_data <= (now() at time zone s.fuso_horario)::date + 90
    and not exists (
      select 1 from public.marcacoes m
      where m.profissional_id = p.id
        and m.data = p_data
        and m.estado in ('marcada', 'concluida')
        and tsrange(m.data + m.inicio, m.data + m.fim)
            && tsrange(t.inicio, t.inicio + make_interval(mins => sv.duracao_minutos))
    )
    and not exists (
      select 1 from public.bloqueios b
      where b.salao_id = s.id
        and b.data = p_data
        and (b.profissional_id is null or b.profissional_id = p.id)
        and tsrange(b.data + b.inicio, b.data + b.fim)
            && tsrange(t.inicio, t.inicio + make_interval(mins => sv.duracao_minutos))
    );
$$;
revoke all on function private.vagas(uuid, uuid, date) from public;

-- ───────────────────── Funções públicas (API) ─────────────────────

-- Horários livres para a página de marcação. Não revela clientes nem marcações.
create function public.horarios_livres(p_slug text, p_servico_id uuid, p_data date)
returns table (inicio time)
language sql stable security definer set search_path = ''
as $$
  select distinct v.inicio
  from public.saloes s
  cross join lateral private.vagas(s.id, p_servico_id, p_data) v
  where s.slug = p_slug
  order by v.inicio;
$$;

-- Cria uma marcação a partir da página pública. Valida tudo no servidor:
-- o cliente só envia o que escolheu, nunca preços, durações ou profissionais.
create function public.criar_marcacao(
  p_slug text,
  p_servico_id uuid,
  p_data date,
  p_inicio time,
  p_nome text,
  p_contacto text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_salao public.saloes%rowtype;
  v_servico public.servicos%rowtype;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_contacto text := btrim(coalesce(p_contacto, ''));
  v_limite int;
  v_profissional_id uuid;
  v_cliente_id uuid;
  v_marcacao_id uuid;
begin
  if char_length(v_nome) not between 2 and 80
     or char_length(v_contacto) not between 5 and 120
     or p_data is null or p_inicio is null then
    raise exception 'DADOS_INVALIDOS';
  end if;

  -- O contacto tem de parecer um email ou um telefone.
  if v_contacto !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     and v_contacto !~ '^\+?[0-9 ()-]{9,20}$' then
    raise exception 'DADOS_INVALIDOS';
  end if;

  select * into v_salao from public.saloes where slug = p_slug;
  if not found then
    raise exception 'SALAO_NAO_ENCONTRADO';
  end if;

  -- Uma marcação de cada vez por salão: torna os limites abaixo fiáveis.
  perform pg_advisory_xact_lock(hashtextextended(v_salao.id::text, 0));

  select * into v_servico from public.servicos
    where id = p_servico_id and salao_id = v_salao.id and ativo;
  if not found then
    raise exception 'DADOS_INVALIDOS';
  end if;

  -- Travão contra abuso: no máximo 20 marcações online por hora em cada salão.
  if (select count(*) from public.marcacoes
        where salao_id = v_salao.id and criado_em > now() - interval '1 hour') >= 20 then
    raise exception 'LIMITE_TEMPORARIO';
  end if;

  -- No máximo 3 marcações futuras por contacto em cada salão.
  if (select count(*) from public.marcacoes m
        join public.clientes c on c.id = m.cliente_id
        where m.salao_id = v_salao.id
          and m.estado = 'marcada'
          and m.data >= (now() at time zone v_salao.fuso_horario)::date
          and lower(c.contacto) = lower(v_contacto)) >= 3 then
    raise exception 'LIMITE_CONTACTO';
  end if;

  -- Limite mensal do plano.
  select limite_marcacoes_mes into v_limite from public.planos where id = v_salao.plano;
  if v_limite is not null and (
    select count(*) from public.marcacoes
      where salao_id = v_salao.id
        and estado <> 'cancelada'
        and date_trunc('month', data) = date_trunc('month', p_data)
  ) >= v_limite then
    raise exception 'LIMITE_PLANO';
  end if;

  -- Profissional livre a essa hora, preferindo quem tem menos marcações no dia.
  select v.profissional_id into v_profissional_id
    from private.vagas(v_salao.id, v_servico.id, p_data) v
    where v.inicio = p_inicio
    order by (
      select count(*) from public.marcacoes m
      where m.profissional_id = v.profissional_id and m.data = p_data
        and m.estado in ('marcada', 'concluida')
    ), v.profissional_id
    limit 1;
  if v_profissional_id is null then
    raise exception 'HORARIO_INDISPONIVEL';
  end if;

  select id into v_cliente_id from public.clientes
    where salao_id = v_salao.id
      and lower(contacto) = lower(v_contacto)
      and lower(nome) = lower(v_nome)
    limit 1;
  if v_cliente_id is null then
    insert into public.clientes (salao_id, nome, contacto)
      values (v_salao.id, v_nome, v_contacto)
      returning id into v_cliente_id;
  end if;

  begin
    insert into public.marcacoes
      (salao_id, profissional_id, servico_id, cliente_id, data, inicio, fim)
    values (
      v_salao.id, v_profissional_id, v_servico.id, v_cliente_id, p_data, p_inicio,
      (p_inicio + make_interval(mins => v_servico.duracao_minutos))::time
    )
    returning id into v_marcacao_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_INDISPONIVEL';
  end;

  return v_marcacao_id;
end;
$$;

-- Cria o salão de quem acabou de se registar (um salão por conta, por agora).
create function public.criar_salao(
  p_nome text,
  p_slug text,
  p_tipo text,
  p_nome_profissional text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_salao_id uuid;
begin
  if v_user_id is null then
    raise exception 'SEM_SESSAO';
  end if;

  -- Evita que dois pedidos simultâneos da mesma conta criem dois salões.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if exists (select 1 from public.membros_salao where user_id = v_user_id) then
    raise exception 'JA_TEM_SALAO';
  end if;

  begin
    insert into public.saloes (nome, slug, tipo)
      values (btrim(p_nome), p_slug, p_tipo)
      returning id into v_salao_id;
  exception
    when unique_violation then raise exception 'SLUG_INDISPONIVEL';
    when check_violation then raise exception 'DADOS_INVALIDOS';
  end;

  insert into public.membros_salao (salao_id, user_id, papel)
    values (v_salao_id, v_user_id, 'dono');

  -- Segunda a sexta 09:00–18:00, sábado 09:00–13:00, domingo fechado.
  insert into public.horarios_semanais (salao_id, dia_semana, aberto, abertura, fecho)
    select v_salao_id, d, d <> 0, '09:00', case when d = 6 then time '13:00' else time '18:00' end
    from generate_series(0, 6) as d;

  begin
    insert into public.profissionais (salao_id, nome)
      values (v_salao_id, btrim(p_nome_profissional));
  exception when check_violation then
    raise exception 'DADOS_INVALIDOS';
  end;

  return p_slug;
end;
$$;

-- ───────────────────────── Privilégios ─────────────────────────
-- Começa do zero: o Supabase dá acesso total por omissão às tabelas de `public`.
revoke all on all tables in schema public from anon, authenticated;
revoke all on function public.horarios_livres(text, uuid, date) from public, anon, authenticated;
revoke all on function public.criar_marcacao(text, uuid, date, time, text, text) from public, anon, authenticated;
revoke all on function public.criar_salao(text, text, text, text) from public, anon, authenticated;

grant select on public.planos to anon, authenticated;

grant select on public.saloes to anon, authenticated;
-- O dono NÃO pode alterar o plano, o slug nem o id do seu salão.
grant update (nome, tipo, apresentacao, morada, telefone, cor_principal, logotipo_url)
  on public.saloes to authenticated;

grant select on public.membros_salao to authenticated;

grant select on public.profissionais to anon, authenticated;
grant insert (salao_id, nome, ativo), update (nome, ativo)
  on public.profissionais to authenticated;

grant select on public.servicos to anon, authenticated;
grant insert (salao_id, nome, duracao_minutos, preco_centimos, ativo),
      update (nome, duracao_minutos, preco_centimos, ativo)
  on public.servicos to authenticated;

grant select on public.horarios_semanais to anon, authenticated;
grant update (aberto, abertura, fecho) on public.horarios_semanais to authenticated;

grant select, delete on public.bloqueios to authenticated;
grant insert (salao_id, profissional_id, data, inicio, fim, motivo)
  on public.bloqueios to authenticated;

grant select on public.clientes to authenticated;

grant select on public.marcacoes to authenticated;
grant update (estado, valor_centimos) on public.marcacoes to authenticated;

grant execute on function public.horarios_livres(text, uuid, date) to anon, authenticated;
grant execute on function public.criar_marcacao(text, uuid, date, time, text, text) to anon, authenticated;
grant execute on function public.criar_salao(text, text, text, text) to authenticated;

-- ───────────────────── Row Level Security ─────────────────────
alter table public.planos enable row level security;
alter table public.saloes enable row level security;
alter table public.membros_salao enable row level security;
alter table public.profissionais enable row level security;
alter table public.servicos enable row level security;
alter table public.horarios_semanais enable row level security;
alter table public.bloqueios enable row level security;
alter table public.clientes enable row level security;
alter table public.marcacoes enable row level security;

-- Público: o que aparece na página de marcação.
create policy "planos: leitura publica" on public.planos
  for select to anon, authenticated using (true);

create policy "saloes: leitura publica" on public.saloes
  for select to anon, authenticated using (true);

create policy "profissionais: publico ve os ativos" on public.profissionais
  for select to anon, authenticated using (ativo);

create policy "servicos: publico ve os ativos" on public.servicos
  for select to anon, authenticated using (ativo);

create policy "horarios: leitura publica" on public.horarios_semanais
  for select to anon, authenticated using (true);

-- Membros: só os dados do seu salão.
create policy "saloes: membros editam o seu" on public.saloes
  for update to authenticated
  using ((select private.e_membro(id)))
  with check ((select private.e_membro(id)));

create policy "membros: cada um ve os seus" on public.membros_salao
  for select to authenticated using (user_id = (select auth.uid()));

create policy "profissionais: membros veem todos" on public.profissionais
  for select to authenticated using ((select private.e_membro(salao_id)));
create policy "profissionais: membros criam" on public.profissionais
  for insert to authenticated with check ((select private.e_membro(salao_id)));
create policy "profissionais: membros editam" on public.profissionais
  for update to authenticated
  using ((select private.e_membro(salao_id)))
  with check ((select private.e_membro(salao_id)));

create policy "servicos: membros veem todos" on public.servicos
  for select to authenticated using ((select private.e_membro(salao_id)));
create policy "servicos: membros criam" on public.servicos
  for insert to authenticated with check ((select private.e_membro(salao_id)));
create policy "servicos: membros editam" on public.servicos
  for update to authenticated
  using ((select private.e_membro(salao_id)))
  with check ((select private.e_membro(salao_id)));

create policy "horarios: membros editam" on public.horarios_semanais
  for update to authenticated
  using ((select private.e_membro(salao_id)))
  with check ((select private.e_membro(salao_id)));

create policy "bloqueios: membros veem" on public.bloqueios
  for select to authenticated using ((select private.e_membro(salao_id)));
create policy "bloqueios: membros criam" on public.bloqueios
  for insert to authenticated with check ((select private.e_membro(salao_id)));
create policy "bloqueios: membros removem" on public.bloqueios
  for delete to authenticated using ((select private.e_membro(salao_id)));

create policy "clientes: membros veem" on public.clientes
  for select to authenticated using ((select private.e_membro(salao_id)));

create policy "marcacoes: membros veem" on public.marcacoes
  for select to authenticated using ((select private.e_membro(salao_id)));
create policy "marcacoes: membros atualizam o estado" on public.marcacoes
  for update to authenticated
  using ((select private.e_membro(salao_id)))
  with check ((select private.e_membro(salao_id)));
