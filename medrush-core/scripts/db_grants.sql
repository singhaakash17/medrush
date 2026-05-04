-- Create schemas (all with _m suffix)
CREATE SCHEMA IF NOT EXISTS identity_m;
CREATE SCHEMA IF NOT EXISTS user_m;
CREATE SCHEMA IF NOT EXISTS catalog_m;
CREATE SCHEMA IF NOT EXISTS pharmacy_m;
CREATE SCHEMA IF NOT EXISTS inventory_m;
CREATE SCHEMA IF NOT EXISTS geo_m;
CREATE SCHEMA IF NOT EXISTS cart_m;
CREATE SCHEMA IF NOT EXISTS order_m;
CREATE SCHEMA IF NOT EXISTS rx_m;
CREATE SCHEMA IF NOT EXISTS payment_m;
CREATE SCHEMA IF NOT EXISTS logistics_m;
CREATE SCHEMA IF NOT EXISTS notification_m;
CREATE SCHEMA IF NOT EXISTS audit_m;

-- Application role
DO $$ BEGIN
  CREATE ROLE medrush_app LOGIN PASSWORD 'medrush_dev';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit-specific roles
DO $$ BEGIN
  CREATE ROLE medrush_audit_writer LOGIN PASSWORD 'medrush_audit_dev';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE medrush_audit_reader LOGIN PASSWORD 'medrush_reader_dev';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grant full CRUD on all non-audit schemas to app role
GRANT USAGE ON SCHEMA identity_m, user_m, catalog_m, pharmacy_m, inventory_m, geo_m, cart_m, order_m, rx_m, payment_m, logistics_m, notification_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA user_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA catalog_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pharmacy_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA inventory_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA geo_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cart_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA order_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA rx_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payment_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA logistics_m TO medrush_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA notification_m TO medrush_app;

-- Audit schema: INSERT+SELECT only (enforces append-only at DB level)
GRANT USAGE ON SCHEMA audit_m TO medrush_app;
REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA audit_m FROM medrush_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit_m TO medrush_app;

-- Audit writer role
GRANT USAGE ON SCHEMA audit_m TO medrush_audit_writer;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit_m TO medrush_audit_writer;

-- Audit reader role
GRANT USAGE ON SCHEMA audit_m TO medrush_audit_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA audit_m TO medrush_audit_reader;

-- Trigger to forbid mutations on audit_log (uncomment after table creation)
-- CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS
-- $$ BEGIN RAISE EXCEPTION 'audit_log is immutable'; END $$;
-- CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON audit_m.audit_log
--   FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
