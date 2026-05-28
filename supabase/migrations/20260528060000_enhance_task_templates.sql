DROP TABLE IF EXISTS task_templates CASCADE;

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom')),
  preferred_days INT[] DEFAULT '{0,1,2,3,4,5,6}',
  
  estimated_minutes INTEGER DEFAULT 30 CHECK (estimated_minutes > 0),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  milestone_index INTEGER DEFAULT 0,
  
  last_generated_date DATE,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_templates_goal_id ON task_templates(goal_id);
CREATE INDEX idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX idx_task_templates_is_active ON task_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_task_templates_goal_active ON task_templates(goal_id, is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS task_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  
  generated_date DATE NOT NULL,
  
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(template_id, generated_date)
);

CREATE INDEX idx_task_generation_log_goal ON task_generation_log(goal_id);
CREATE INDEX idx_task_generation_log_template ON task_generation_log(template_id);
CREATE INDEX idx_task_generation_log_generated_date ON task_generation_log(generated_date);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'goals' AND column_name = 'last_task_generated_at'
  ) THEN
    ALTER TABLE goals ADD COLUMN last_task_generated_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'goals' AND column_name = 'templates_generated'
  ) THEN
    ALTER TABLE goals ADD COLUMN templates_generated BOOLEAN DEFAULT false;
  END IF;
END $$;

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own task templates"
  ON task_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own task generation log"
  ON task_generation_log
  FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM goals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert task generation log"
  ON task_generation_log
  FOR INSERT
  WITH CHECK (true);
