import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { paymentId } = await req.json();

    if (!paymentId) {
      console.error('❌ Missing paymentId parameter');
      return new Response(
        JSON.stringify({ error: 'paymentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Checking payment status for: ${paymentId}`);

    // Query payment status using service role credentials
    const { data: payment, error } = await supabase
      .from('payments')
      .select('status, approved_at, amount')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error querying payment:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to query payment status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payment) {
      console.log(`⚠️ Payment not found: ${paymentId}`);
      return new Response(
        JSON.stringify({ status: 'not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Payment status: ${payment.status}`);

    // Return only the necessary information
    return new Response(
      JSON.stringify({
        status: payment.status,
        approved_at: payment.approved_at,
        amount: payment.amount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
