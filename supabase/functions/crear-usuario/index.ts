
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = ["admin", "directivo", "secretaria", "docente", "preceptor", "alumno", "familia"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Faltan variables de entorno de Supabase." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Falta Authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Usuario no autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("rol, activo")
      .eq("id", callerId)
      .single();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "No se encontró el perfil del usuario solicitante." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!callerProfile.activo || callerProfile.rol !== "admin") {
      return new Response(JSON.stringify({ error: "Solo admin puede crear usuarios." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const nombre = String(body.nombre || "").trim();
    const apellido = String(body.apellido || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rol = String(body.rol || "").trim();

    if (!nombre || !apellido || !email || !password || !rol) {
      return new Response(JSON.stringify({ error: "Faltan campos obligatorios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedRoles.includes(rol)) {
      return new Response(JSON.stringify({ error: "Rol inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol,
      },
    });

    if (createError || !createdUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || "No se pudo crear usuario." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = createdUser.user.id;

    const { error: insertProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        nombre,
        apellido,
        email,
        rol,
        activo: true,
      });

    if (insertProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Se creó Auth pero falló profile. Se revirtió usuario. " + insertProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      user: {
        id: newUserId,
        email,
        nombre,
        apellido,
        rol,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Error inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
