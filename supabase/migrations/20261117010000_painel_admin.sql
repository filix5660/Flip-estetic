-- Painel de controlo da plataforma (/admin).
--
-- Segurança:
--   • A lista de administradores vive no esquema `private`, que a API não
--     expõe: ninguém se consegue tornar administrador pela aplicação.
--     Para adicionar um administrador, correr no SQL Editor:
--       insert into private.administradores (user_id)
--       select id from auth.users where email = 'o-teu-email@exemplo.com';
--   • Todas as funções confirmam `private.e_admin()` e recusam os restantes.
--   • As notas de cortesia ficam numa tabela privada (não aparecem na
--     página pública nem para os donos dos salões).
--   • Cada alteração fica registada em private.registo_admin.
--
-- Aplicar DEPOIS de 20261117000000_essencial_um_profissional.sql.

create table private.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Contas oferecidas (demonstração, parceiros, testes): plano sem pagamento.
create table private.cortesias (
  salao_id uuid primary key references public.saloes (id) on delete cascade,
  nota text not null default '' check (char_length(nota) <= 200),
  concedida_por uuid references auth.users (id) on delete set null,
  concedida_em timestamptz not null default now()
);

create table private.registo_admin (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  acao text not null,
  salao_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

revoke all on private.administradores, private.cortesias, private.registo_admin
  from public, anon, authenticated;

create function private.e_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from private.administradores where user_id = (select auth.uid())
  );
$$;
revoke all on function private.e_admin() from public;

-- A aplicação só pode perguntar se o próprio utilizador é administrador.
create function public.sou_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.e_admin();
$$;

create function public.admin_listar_saloes()
returns table (
  id uuid,
  slug text,
  nome text,
  tipo text,
  plano text,
  criado_em timestamptz,
  email_dono text,
  total_marcacoes bigint,
  marcacoes_30_dias bigint,
  cortesia boolean,
  nota_cortesia text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.e_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  return query
    select
      s.id, s.slug, s.nome, s.tipo, s.plano, s.criado_em,
      (select u.email::text from public.membros_salao m
         join auth.users u on u.id = m.user_id
         where m.salao_id = s.id and m.papel = 'dono'
         order by m.criado_em limit 1),
      (select count(*) from public.marcacoes mc where mc.salao_id = s.id),
      (select count(*) from public.marcacoes mc
         where mc.salao_id = s.id and mc.criado_em > now() - interval '30 days'),
      c.salao_id is not null,
      coalesce(c.nota, '')
    from public.saloes s
    left join private.cortesias c on c.salao_id = s.id
    order by s.criado_em desc;
end;
$$;

create function public.admin_definir_plano(
  p_salao_id uuid,
  p_plano text,
  p_cortesia boolean,
  p_nota text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_anterior text;
  v_nota text := btrim(coalesce(p_nota, ''));
begin
  if not private.e_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if not exists (select 1 from public.planos where id = p_plano)
     or char_length(v_nota) > 200 or p_cortesia is null then
    raise exception 'DADOS_INVALIDOS';
  end if;

  select plano into v_anterior from public.saloes where id = p_salao_id for update;
  if not found then
    raise exception 'NAO_ENCONTRADO';
  end if;

  update public.saloes set plano = p_plano where id = p_salao_id;

  if p_cortesia then
    insert into private.cortesias (salao_id, nota, concedida_por)
      values (p_salao_id, v_nota, v_admin)
      on conflict (salao_id) do update
        set nota = excluded.nota, concedida_por = excluded.concedida_por, concedida_em = now();
  else
    delete from private.cortesias where salao_id = p_salao_id;
  end if;

  insert into private.registo_admin (admin_id, acao, salao_id, detalhes)
    values (v_admin, 'definir_plano', p_salao_id, jsonb_build_object(
      'plano_anterior', v_anterior, 'plano', p_plano,
      'cortesia', p_cortesia, 'nota', v_nota));
end;
$$;

revoke all on function public.sou_admin() from public, anon, authenticated;
revoke all on function public.admin_listar_saloes() from public, anon, authenticated;
revoke all on function public.admin_definir_plano(uuid, text, boolean, text) from public, anon, authenticated;

grant execute on function public.sou_admin() to authenticated;
grant execute on function public.admin_listar_saloes() to authenticated;
grant execute on function public.admin_definir_plano(uuid, text, boolean, text) to authenticated;
