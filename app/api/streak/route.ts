import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStreakForUser, getNextTaskForUser } from '@/lib/streak';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/streak
 *
 * Returns the current user's streak info + their next "today's task"
 * (used by the in-app banner). Auth via Supabase session cookie.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const [streak, nextTask] = await Promise.all([
    getStreakForUser(supabase, user.id),
    getNextTaskForUser(supabase, user.id),
  ]);

  return Response.json({ streak, nextTask });
}
