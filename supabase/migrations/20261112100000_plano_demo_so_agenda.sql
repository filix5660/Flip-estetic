-- Plano Demonstração = só agenda do dono (sem marcações online).
--
--   1. Cada plano diz se aceita marcações online (planos.marcacoes_online).
--      O plano "demo" não aceita: a função criar_marcacao recusa o pedido.
--   2. O dono pode anotar marcações na sua agenda (criar_marcacao_manual),
--      em qualquer plano. O contacto do cliente passa a ser opcional nesse caso.
--
-- Aplicar DEPOIS de 20261111000000_esquema_inicial.sql.

-- ───────────────── 1. Marcações online por plano ─────────────────

alter table public.planos add column marcacoes_online boolean not null default true;
update public.planos set marcacoes_online = false where id = 'demo';

-- Igual à versão anterior, com a verificação do plano logo a seguir a encontrar o salão.
create or replace function public.criar_marcacao(
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

-- ───────────────── 2. Marcação anotada pelo dono ─────────────────

-- O contacto passa a ser opcional (o dono pode anotar só o nome).
alter table public.clientes drop constraint clientes_contacto_check;
alter table public.clientes add constraint clientes_contacto_check
  check (contacto = '' or char_length(btrim(contacto)) between 5 and 120);

-- Só para membros do salão do serviço. Aceita qualquer hora e datas passadas
-- (é a agenda do dono), mas nunca por cima de outra marcação ativa.
create function public.criar_marcacao_manual(
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
  v_servico public.servicos%rowtype;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_contacto text := btrim(coalesce(p_contacto, ''));
  v_profissional_id uuid;
  v_fim_minutos int;
  v_cliente_id uuid;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'SEM_SESSAO';
  end if;

  select * into v_servico from public.servicos where id = p_servico_id;
  -- Mesmo erro para "não existe" e "não é teu": não revela serviços de outros salões.
  if not found or not private.e_membro(v_servico.salao_id) then
    raise exception 'NAO_ENCONTRADO';
  end if;

  v_fim_minutos := extract(hour from p_inicio)::int * 60
                 + extract(minute from p_inicio)::int
                 + v_servico.duracao_minutos;
  if char_length(v_nome) not between 2 and 80
     or p_data is null or p_inicio is null
     or v_fim_minutos >= 24 * 60
     or (v_contacto <> '' and v_contacto !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
         and v_contacto !~ '^\+?[0-9 ()-]{9,20}$') then
    raise exception 'DADOS_INVALIDOS';
  end if;

  -- Profissional indicado (do mesmo salão e ativo) ou o primeiro ativo.
  select p.id into v_profissional_id from public.profissionais p
    where p.salao_id = v_servico.salao_id and p.ativo
      and (p_profissional_id is null or p.id = p_profissional_id)
    order by p.nome, p.id
    limit 1;
  if v_profissional_id is null then
    raise exception 'DADOS_INVALIDOS';
  end if;

  select id into v_cliente_id from public.clientes
    where salao_id = v_servico.salao_id
      and lower(nome) = lower(v_nome)
      and lower(contacto) = lower(v_contacto)
    limit 1;
  if v_cliente_id is null then
    insert into public.clientes (salao_id, nome, contacto)
      values (v_servico.salao_id, v_nome, v_contacto)
      returning id into v_cliente_id;
  end if;

  begin
    insert into public.marcacoes
      (salao_id, profissional_id, servico_id, cliente_id, data, inicio, fim)
    values (
      v_servico.salao_id, v_profissional_id, v_servico.id, v_cliente_id, p_data, p_inicio,
      (p_inicio + make_interval(mins => v_servico.duracao_minutos))::time
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_INDISPONIVEL';
  end;

  return v_id;
end;
$$;

revoke all on function public.criar_marcacao_manual(uuid, date, time, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.criar_marcacao_manual(uuid, date, time, text, text, uuid)
  to authenticated;
