ALTER TABLE instances RENAME COLUMN worldmensage_nome TO evolution_instance_name;
ALTER TABLE instances RENAME COLUMN worldmensage_instance_id TO evolution_instance_id;
ALTER TABLE instances DROP COLUMN IF EXISTS worldmensage_token;
