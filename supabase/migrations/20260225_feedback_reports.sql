-- ============================
-- 12. feedback_reports (TestFlight-like bug reporting)
-- ============================
CREATE TABLE IF NOT EXISTS feedback_reports (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'bug'
    CHECK (category IN ('bug','ui_issue','content_error','feature_request','other')),
  screenshot_url TEXT,
  email VARCHAR(255),
  page_url TEXT NOT NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  user_agent TEXT,
  color_scheme VARCHAR(10),
  locale VARCHAR(5),
  console_errors JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_progress','resolved','dismissed')),
  priority VARCHAR(10) DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback_reports(category);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback_reports(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_page_url ON feedback_reports(page_url);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON feedback_reports;
CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON feedback_reports
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
