-- Gestão de profissionais (equipa).
--
--   1. Cada profissional pode ter um horário próprio por dia da semana
--      (folga, ou entrada/saída diferentes). Sem linha para um dia, segue o
--      horário do salão. Só se altera pela função definir_horario_profissional.
--   2. Não se pode desativar o último profissional ativo, nem quem ainda tem
--      marcações por realizar.
--   3. A disponibilidade passa a respeitar o horário de cada profissional.
--   4. Na página pública, o cliente pode escolher o profissional (opcional).
--
-- Aplicar DEPOIS de 20261117010000_painel_admin.sql.

-- ───────────────── 1. Horário próprio de cada profissional ─────────────────

create table public.horarios_profissionais (
  salao_id uuid not null,
  profissional_id uuid not null,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  trabalha boolean not null default true,
  entrada time not null,
  saida time not null,
  primary key (profissional_id, dia_semana),
  check (saida > entrada),
  foreign key (salao_id, profissional_id)
    references public.profissionais (salao_id, id) on delete cascade
);

alter table public.horarios_profissionais enable row level security;

-- Os horários da equipa são internos: só os membros do salão os veem.
-- Escrever só pela função abaixo (nenhum privilégio de escrita direto).
grant select on public.horarios_profissionais to authenticated;
create policy "horarios_profissionais: membros veem" on public.horarios_profissionais
  for select to authenticated using ((select private.e_membro(salao_id)));

-- Substitui o horário de um profissional de uma só vez.
-- p_dias: lista com os dias diferentes do salão, ex.:
--   [{"dia_semana": 1, "trabalha": false, "entrada": "09:00", "saida": "18:00"}]
-- Lista vazia = segue o horário do salão em todos os dias.
create function public.definir_horario_profissional(p_profissional_id uuid, p_dias jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_salao_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'SEM_SESSAO';
  end if;

  select salao_id into v_salao_id from public.profissionais where id = p_profissional_id;
  -- Mesmo erro para "não existe" e "não é teu".
  if v_salao_id is null or not private.e_membro(v_salao_id) then
    raise exception 'NAO_ENCONTRADO';
  end if;

  if p_dias is null or jsonb_typeof(p_dias) <> 'array' or jsonb_array_length(p_dias) > 7 then
    raise exception 'DADOS_INVALIDOS';
  end if;

  delete from public.horarios_profissionais where profissional_id = p_profissional_id;

  begin
    insert into public.horarios_profissionais
      (salao_id, profissional_id, dia_semana, trabalha, entrada, saida)
    select
      v_salao_id,
      p_profissional_id,
      (d ->> 'dia_semana')::smallint,
      (d ->> 'trabalha')::boolean,
      (d ->> 'entrada')::time,
      (d ->> 'saida')::time
    from jsonb_array_elements(p_dias) as d;
  exception when others then
    -- Dia repetido, hora inválida, saída antes da entrada, campo em falta…
    raise exception 'DADOS_INVALIDOS';
  end;
end;
$$;

revoke all on function public.definir_horario_profissional(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.definir_horario_profissional(uuid, jsonb) to authenticated;

-- ───────────────── 2. Desativar um profissional ─────────────────

create function private.verificar_desativar_profissional()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.ativo and not new.ativo then
    -- Em fila com as marcações do mesmo salão (mesma chave de criar_marcacao).
    perform pg_advisory_xact_lock(hashtextextended(new.salao_id::text, 0));

    if not exists (
      select 1 from public.profissionais
      where salao_id = new.salao_id and ativo and id <> new.id
    ) then
      raise exception 'ULTIMO_PROFISSIONAL';
    end if;

    if exists (
      select 1 from public.marcacoes m
      join public.saloes s on s.id = m.salao_id
      where m.profissional_id = new.id
        and m.estado = 'marcada'
        and m.data >= (now() at time zone s.fuso_horario)::date
    ) then
      raise exception 'TEM_MARCACOES';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.verificar_desativar_profissional() from public;

-- Só chega aqui quem passou a RLS (membro do salão): não revela nada a terceiros.
create trigger profissionais_desativar
  before update of ativo on public.profissionais
  for each row execute function private.verificar_desativar_profissional();

-- ───────────────── 3. Disponibilidade com o horário de cada um ─────────────────

-- Igual à versão anterior, mais o horário próprio do profissional.
-- Os horários começam sempre na grelha do salão (abertura + 30 min).
create or replace function private.vagas(p_salao_id uuid, p_servico_id uuid, p_data date)
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
  left join public.horarios_profissionais hp
    on hp.profissional_id = p.id and hp.dia_semana = h.dia_semana
  where s.id = p_salao_id
    -- horário próprio do profissional (sem linha = horário do salão)
    and coalesce(hp.trabalha, true)
    and t.inicio >= p_data + coalesce(hp.entrada, h.abertura)
    and t.inicio + make_interval(mins => sv.duracao_minutos)
        <= p_data + coalesce(hp.saida, h.fecho)
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

-- ───────────────── 4. Escolher o profissional na página pública ─────────────────

drop function public.horarios_livres(text, uuid, date);

create function public.horarios_livres(
  p_slug text,
  p_servico_id uuid,
  p_data date,
  p_profissional_id uuid default null
)
returns table (inicio time)
language sql stable security definer set search_path = ''
as $$
  select distinct v.inicio
  from public.saloes s
  cross join lateral private.vagas(s.id, p_servico_id, p_data) v
  where s.slug = p_slug
    and (p_profissional_id is null or v.profissional_id = p_profissional_id)
  order by v.inicio;
$$;

revoke all on function public.horarios_livres(text, uuid, date, uuid)
  from public, anon, authenticated;
grant execute on function public.horarios_livres(text, uuid, date, uuid) to anon, authenticated;

drop function public.criar_marcacao(text, uuid, date, time, text, text);

-- Igual à versão anterior, com o profissional escolhido (opcional).
create function public.criar_marcacao(
  p_slug text,
  p_servico_id uuid,
  p_data date,
  p_inicio time,
  p_nome text,
  p_contacto text,
  p_profissional_id uuid default null
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

  -- O plano do salão tem de incluir marcações online.
  if not coalesce((select marcacoes_online from public.planos where id = v_salao.plano), false) then
    raise exception 'SEM_MARCACAO_ONLINE';
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

  -- Profissional livre a essa hora (o escolhido, ou quem tem menos marcações no dia).
  -- Um profissional de outro salão nunca aparece em vagas() deste salão.
  select v.profissional_id into v_profissional_id
    from private.vagas(v_salao.id, v_servico.id, p_data) v
    where v.inicio = p_inicio
      and (p_profissional_id is null or v.profissional_id = p_profissional_id)
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

revoke all on function public.criar_marcacao(text, uuid, date, time, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.criar_marcacao(text, uuid, date, time, text, text, uuid)
  to anon, authenticated;
