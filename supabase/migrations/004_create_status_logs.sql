CREATE TABLE status_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id    uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  contractor_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status         instance_status NOT NULL,
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz
);

CREATE INDEX idx_status_logs_instance_id ON status_logs(instance_id, recorded_at DESC);
CREATE INDEX idx_status_logs_contractor_id ON status_logs(contractor_id);

ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_logs_read_contractor_or_admin"
  ON status_logs FOR SELECT
  USING (contractor_id = auth.uid() OR is_admin());
