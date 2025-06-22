import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecisionContext {
  contact_id: string;
  workflow_id: string;
  form_data?: Record<string, any>;
  contact_history?: Record<string, any>;
  custom_data?: Record<string, any>;
}

interface DecisionBranch {
  id: string;
  branch_name: string;
  conditions: Record<string, any>;
  priority: number;
  is_default: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get request body
    const body: DecisionContext = await req.json();
    const { workflow_id, contact_id, form_data, contact_history, custom_data } = body;

    if (!workflow_id || !contact_id) {
      throw new Error('workflow_id and contact_id are required');
    }

    // Fetch workflow branches
    const { data: branches, error: branchError } = await supabaseClient
      .from('decision_branches')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('priority', { ascending: false });

    if (branchError) {
      throw new Error(`Failed to fetch branches: ${branchError.message}`);
    }

    if (!branches || branches.length === 0) {
      throw new Error('No branches found for workflow');
    }

    // Prepare context for AI evaluation
    const evaluationContext = {
      form_data,
      contact_history,
      custom_data,
      current_date: new Date().toISOString(),
    };

    // Find matching branch using AI logic
    let selectedBranch: DecisionBranch | null = null;
    let confidenceScore = 0;

    for (const branch of branches) {
      if (branch.is_default) continue; // Skip default branch in first pass
      
      const matchScore = evaluateBranchConditions(branch.conditions, evaluationContext);
      
      if (matchScore > confidenceScore) {
        selectedBranch = branch;
        confidenceScore = matchScore;
      }
    }

    // If no branch matched or confidence is too low, use default branch
    if (!selectedBranch || confidenceScore < 0.5) {
      selectedBranch = branches.find(b => b.is_default) || null;
      confidenceScore = selectedBranch ? 1.0 : 0;
    }

    if (!selectedBranch) {
      throw new Error('No suitable branch found and no default branch configured');
    }

    // Log the decision
    const executionTime = Date.now() - startTime;
    
    const { error: logError } = await supabaseClient
      .from('decision_logs')
      .insert({
        workflow_id,
        contact_id,
        branch_selected: selectedBranch.id,
        decision_context: evaluationContext,
        confidence_score: confidenceScore,
        execution_time_ms: executionTime,
      });

    if (logError) {
      console.error('Failed to log decision:', logError);
    }

    // Fetch and execute actions for selected branch
    const { data: actions, error: actionsError } = await supabaseClient
      .from('workflow_actions')
      .select('*')
      .eq('branch_id', selectedBranch.id)
      .order('execution_order');

    if (actionsError) {
      console.error('Failed to fetch actions:', actionsError);
    }

    // Return decision result
    return new Response(
      JSON.stringify({
        success: true,
        branch_selected: selectedBranch.branch_name,
        branch_id: selectedBranch.id,
        confidence_score: confidenceScore,
        execution_time_ms: executionTime,
        actions_to_execute: actions || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Decision maker error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// AI evaluation function
function evaluateBranchConditions(conditions: Record<string, any>, context: Record<string, any>): number {
  let score = 0;
  let totalConditions = 0;

  // Evaluate each condition
  for (const [key, condition] of Object.entries(conditions)) {
    totalConditions++;
    
    if (evaluateCondition(condition, context, key)) {
      score++;
    }
  }

  return totalConditions > 0 ? score / totalConditions : 0;
}

function evaluateCondition(condition: any, context: Record<string, any>, key: string): boolean {
  // Handle different condition types
  if (typeof condition === 'object' && condition !== null) {
    const { operator, value, field } = condition;
    const contextValue = getNestedValue(context, field || key);

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'contains':
        return String(contextValue).toLowerCase().includes(String(value).toLowerCase());
      case 'greater_than':
        return Number(contextValue) > Number(value);
      case 'less_than':
        return Number(contextValue) < Number(value);
      case 'exists':
        return contextValue !== undefined && contextValue !== null;
      case 'regex':
        return new RegExp(value).test(String(contextValue));
      case 'in_array':
        return Array.isArray(value) && value.includes(contextValue);
      default:
        return false;
    }
  }

  // Simple equality check
  return getNestedValue(context, key) === condition;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}