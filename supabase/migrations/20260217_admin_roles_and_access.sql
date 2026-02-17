-- v8.7.3
-- Admin access control: role mapping for Supabase Auth users.
-- 2026 policy baseline:
-- - ag@voxexchange.io is immutable owner (primary)
-- - andrzej.goleta@hybrid.ai is immutable owner (backup)
-- - owner accounts must remain active admin rows in DB

CREATE TABLE IF NOT EXISTS admin_user_roles (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON admin_user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_active ON admin_user_roles(is_active);

COMMENT ON TABLE admin_user_roles IS 'Access roles for admin panel users authenticated via Supabase Auth magic links.';
COMMENT ON COLUMN admin_user_roles.role IS 'Role in admin panel: admin, editor, viewer.';
COMMENT ON COLUMN admin_user_roles.is_active IS 'Soft access switch. false = account denied without deleting history.';

INSERT INTO admin_user_roles (email, role, is_active, invited_by)
VALUES
  ('ag@voxexchange.io', 'admin', TRUE, 'owner-policy-2026'),
  ('andrzej.goleta@hybrid.ai', 'admin', TRUE, 'owner-policy-2026')
ON CONFLICT (email) DO UPDATE
SET
  role = 'admin',
  is_active = TRUE,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION protect_owner_accounts_admin_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND lower(OLD.email) IN ('ag@voxexchange.io', 'andrzej.goleta@hybrid.ai') THEN
    RAISE EXCEPTION 'Owner account % cannot be deleted', OLD.email;
  END IF;

  IF TG_OP = 'UPDATE' AND lower(OLD.email) IN ('ag@voxexchange.io', 'andrzej.goleta@hybrid.ai') THEN
    IF lower(COALESCE(NEW.email, '')) <> lower(OLD.email) THEN
      RAISE EXCEPTION 'Owner email % cannot be changed', OLD.email;
    END IF;

    IF COALESCE(NEW.role, '') <> 'admin' THEN
      RAISE EXCEPTION 'Owner account % must keep role=admin', OLD.email;
    END IF;

    IF COALESCE(NEW.is_active, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Owner account % must stay active', OLD.email;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_owner_accounts_update ON admin_user_roles;
CREATE TRIGGER trg_protect_owner_accounts_update
BEFORE UPDATE ON admin_user_roles
FOR EACH ROW
EXECUTE FUNCTION protect_owner_accounts_admin_user_roles();

DROP TRIGGER IF EXISTS trg_protect_owner_accounts_delete ON admin_user_roles;
CREATE TRIGGER trg_protect_owner_accounts_delete
BEFORE DELETE ON admin_user_roles
FOR EACH ROW
EXECUTE FUNCTION protect_owner_accounts_admin_user_roles();
