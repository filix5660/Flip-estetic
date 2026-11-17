-- Plano Essencial passa a ser para salões pequenos: 1 profissional.
-- Salões com equipa ficam no plano Profissional.
-- Aplicar DEPOIS de 20261112110000_plano_demo_sem_limite_servicos.sql.
--
-- Salões que já tenham mais de 1 profissional no Essencial mantêm-nos
-- (o limite só é verificado ao adicionar um novo).

update public.planos set limite_profissionais = 1 where id = 'essencial';
