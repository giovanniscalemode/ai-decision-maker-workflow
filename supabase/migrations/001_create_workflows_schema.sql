-- Create workflows table for AI Decision Maker
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL, -- 'form_submitted', 'tag_applied', etc.
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'draft'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_by UUID REFERENCES auth.users(id),
    settings JSONB DEFAULT '{}'::jsonb
);

-- Create decision branches table
CREATE TABLE IF NOT EXISTS public.decision_branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    branch_type VARCHAR(50) NOT NULL, -- 'sales_call', 'send_email', 'add_tag', etc.
    conditions JSONB NOT NULL, -- AI will evaluate these conditions
    priority INTEGER DEFAULT 0, -- Higher priority branches are evaluated first
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create decision logs table for tracking
CREATE TABLE IF NOT EXISTS public.decision_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id),
    contact_id UUID,
    branch_selected UUID REFERENCES public.decision_branches(id),
    decision_context JSONB,
    confidence_score DECIMAL(3,2),
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create workflow actions table
CREATE TABLE IF NOT EXISTS public.workflow_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES public.decision_branches(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'send_email', 'assign_user', 'add_tag', 'webhook'
    action_config JSONB NOT NULL,
    execution_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create RLS policies
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflows
CREATE POLICY "Users can view their own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_workflows_created_by ON public.workflows(created_by);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_decision_logs_workflow_id ON public.decision_logs(workflow_id);
CREATE INDEX idx_decision_logs_created_at ON public.decision_logs(created_at);
CREATE INDEX idx_decision_branches_workflow_id ON public.decision_branches(workflow_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decision_branches_updated_at BEFORE UPDATE ON public.decision_branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();