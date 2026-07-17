import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: subscriptions, error } = await supabase
    .from("PUSH_SUBSCRIPTIONS")
    .select("subscription");

  if (error) {
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: corsHeaders,
    });
  }

  webpush.setVapidDetails(
    "mailto:contact@ecaille.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const payload = JSON.stringify({
    title: "🎺 Écaille",
    body: "Première notification push !",
  });

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        row.subscription,
        payload
      );
    } catch (err) {
      console.error(err);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent: subscriptions.length,
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});