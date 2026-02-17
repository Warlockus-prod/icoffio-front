-- v8.7.3
-- Admin access control: role mapping for Supabase Auth users.

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
