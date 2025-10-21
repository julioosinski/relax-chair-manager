import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration incomplete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🧹 Iniciando limpeza de sessões expiradas...");

    // Buscar sessões expiradas
    const { data: expiredSessions, error: fetchError } = await supabase
      .from("poltronas")
      .select("poltrona_id, qr_code, payment_id, session_ends_at")
      .eq("session_active", true)
      .lt("session_ends_at", new Date().toISOString());

    if (fetchError) {
      console.error("Erro ao buscar sessões expiradas:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch expired sessions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log("✅ Nenhuma sessão expirada encontrada");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expired sessions",
          cleaned: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📋 Encontradas ${expiredSessions.length} sessões expiradas`);

    // Limpar cada sessão expirada
    for (const session of expiredSessions) {
      try {
        // Desativar sessão e limpar campos temporários
        // NÃO limpar public_payment_url - é o QR Code fixo para impressão
        const { error: updateError } = await supabase
          .from("poltronas")
          .update({
            session_active: false,
            session_started_at: null,
            session_ends_at: null,
            current_payment_id: null,
            qr_code: null,
            payment_id: null,
          })
          .eq("poltrona_id", session.poltrona_id);

        if (updateError) {
          console.error(`Erro ao limpar sessão ${session.poltrona_id}:`, updateError);
        } else {
          console.log(`✅ Sessão ${session.poltrona_id} limpa com sucesso`);
          
          // Registrar no log
          await supabase.from("logs").insert({
            poltrona_id: session.poltrona_id,
            message: `🧹 Sessão expirada limpa automaticamente - QR Code removido para regeneração`,
          });
        }
      } catch (error) {
        console.error(`Erro ao processar sessão ${session.poltrona_id}:`, error);
      }
    }

    console.log(`✅ Limpeza concluída: ${expiredSessions.length} sessões processadas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Expired sessions cleaned successfully",
        cleaned: expiredSessions.length,
        sessions: expiredSessions.map(s => s.poltrona_id)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Erro na função de limpeza:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
