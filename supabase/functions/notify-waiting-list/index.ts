import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  appointmentDate: string;
  appointmentTime: string;
  barberId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { appointmentDate, appointmentTime, barberId }: NotifyRequest = await req.json();

    console.log(`Checking waiting list for: ${appointmentDate} at ${appointmentTime}, barber: ${barberId || 'any'}`);

    let query = supabase
      .from('waiting_list')
      .select(`
        *,
        profiles!waiting_list_user_id_fkey (full_name, id),
        services (name),
        barbers (name)
      `)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .eq('status', 'active');

    if (barberId) {
      query = query.or(`barber_id.is.null,barber_id.eq.${barberId}`);
    } else {
      query = query.is('barber_id', null);
    }

    const { data: waitingList, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching waiting list:', fetchError);
      throw fetchError;
    }

    if (!waitingList || waitingList.length === 0) {
      console.log('No one on the waiting list for this slot');
      return new Response(
        JSON.stringify({ message: 'No waiting list entries found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${waitingList.length} people on waiting list`);

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }

    const notifications = waitingList.map(async (entry) => {
      const authUser = authUsers.users.find(u => u.id === entry.user_id);
      if (!authUser?.email) {
        console.log(`No email found for user ${entry.user_id}`);
        return;
      }

      const customerName = entry.profiles?.full_name || 'Valued Customer';
      const serviceName = entry.services?.name || 'your service';
      const barberName = entry.barbers?.name || 'any available barber';

      console.log(`Sending notification to ${authUser.email}`);

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Barbershop <onboarding@resend.dev>',
            to: [authUser.email],
            subject: '🎉 Time Slot Available - Book Now!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50;">Good News, ${customerName}!</h1>
                <p style="font-size: 16px; line-height: 1.6;">
                  A time slot you were waiting for has become available:
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
                  <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p style="margin: 10px 0;"><strong>Time:</strong> ${appointmentTime}</p>
                  <p style="margin: 10px 0;"><strong>Barber:</strong> ${barberName}</p>
                </div>
                <p style="font-size: 16px; line-height: 1.6;">
                  This slot is now available! Book quickly before someone else takes it.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/booking" 
                     style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Book Now
                  </a>
                </div>
                <p style="color: #7f8c8d; font-size: 14px;">
                  If you no longer need this notification, you can manage your waiting list preferences in your dashboard.
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Resend API error:', errorData);
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        await supabase
          .from('waiting_list')
          .update({ 
            notified_at: new Date().toISOString(),
            status: 'notified'
          })
          .eq('id', entry.id);

        console.log(`Successfully notified ${authUser.email}`);
      } catch (emailError) {
        console.error(`Error sending email to ${authUser.email}:`, emailError);
      }
    });

    await Promise.all(notifications);

    return new Response(
      JSON.stringify({ 
        message: `Notified ${waitingList.length} users`,
        notified: waitingList.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in notify-waiting-list function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
