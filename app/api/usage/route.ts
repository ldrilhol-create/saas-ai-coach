import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUsage } from '@/lib/rate-limit';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const usage = await getUsage(supabase, user.id);

  return Response.json({
    tier: usage.tier,
    isExpired: usage.isExpired,
    period: usage.period,
    messages: {
      used: usage.messagesUsed,
      limit: usage.limits.messagesPerMonth,
    },
    roadmaps: {
      used: usage.roadmapsUsed,
      limit: usage.limits.roadmapsPerMonth,
    },
  });
}
