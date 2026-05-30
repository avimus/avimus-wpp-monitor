-- Nome fixo da instância na Worldmensage (passado como `nome` no /instance-create).
-- Imutável após o cadastro pelo admin — nunca sobrescrito pelo sistema.
-- worldmensage_instance_id continua sendo atualizado a cada reconexão (valor dinâmico do result.instance).
ALTER TABLE public.instances ADD COLUMN worldmensage_nome text;
