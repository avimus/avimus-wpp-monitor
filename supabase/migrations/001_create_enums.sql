CREATE TYPE instance_status AS ENUM (
  'connected',
  'disconnected',
  'delivery_failure',
  'reconnecting'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'contractor'
);
