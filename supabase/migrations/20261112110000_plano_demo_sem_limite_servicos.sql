-- Plano Demonstração = agenda pessoal do comerciante: sem limite de serviços.
-- (Também já não tem marcações online, por isso o limite mensal deixa de fazer sentido.)
-- Aplicar DEPOIS de 20261112100000_plano_demo_so_agenda.sql.

update public.planos
  set limite_servicos = null,
      limite_marcacoes_mes = null
  where id = 'demo';
