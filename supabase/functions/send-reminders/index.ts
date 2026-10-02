import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    console.log(`📅 Recherche des rendez-vous pour le ${dateStr}...`);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        appointment_date,
        service:service_id (name),
        client:client_id (
          profile:profile_id (phone, email, full_name)
        )
      `)
      .eq('appointment_date', dateStr)
      .eq('status', 'confirmed');

    if (error) throw error;

    console.log(`📧 ${appointments?.length || 0} rendez-vous trouvés`);

    let sentCount = 0;
    for (const apt of appointments || []) {
      const clientEmail = apt.client?.profile?.email;
      if (clientEmail) {
        console.log(`📧 Rappel pour ${apt.client?.profile?.full_name}`);
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: appointments?.length || 0, date: dateStr }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});