
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    ok: true,
    mode: "placeholder",
    message: "ADA Chat Base preparada. La conexión real con OpenAI se activará cuando se configure la API key como secret segura."
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
