CREATE TABLE instances (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  worldmensage_instance_id text NOT NULL UNIQUE,
  current_status           instance_status NOT NULL DEFAULT 'disconnected',
  last_sync_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instances_contractor_id ON instances(contractor_id);
CREATE INDEX idx_instances_status ON instances(current_status);

ALTER TABLE instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instances_contractor_or_admin"
  ON instances FOR ALL
  USING (contractor_id = auth.uid() OR is_admin());
