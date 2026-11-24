-- Reforço de permissões da tabela horarios_profissionais.
--
-- O Supabase dá por omissão todos os privilégios em tabelas novas do esquema
-- public a anon e authenticated. A RLS já bloqueava tudo, mas a regra do
-- projeto é não deixar privilégios a mais: aqui fica só o necessário.
--   • visitantes (anon): nada;
--   • contas (authenticated): só leitura (a RLS limita ao próprio salão);
--   • escrita: só pela função definir_horario_profissional.
--
-- Aplicar DEPOIS de 20261124000000_gestao_profissionais.sql.
-- Pode ser corrido mais do que uma vez sem problema.

revoke all on public.horarios_profissionais from public, anon, authenticated;
grant select on public.horarios_profissionais to authenticated;
