-- Function called by the daily Vercel Cron job at /api/cron/cleanup-logs
-- Deletes status log entries older than 90 days (LGPD retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_status_logs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM status_logs
  WHERE recorded_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
