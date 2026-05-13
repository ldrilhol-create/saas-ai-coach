import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const url = new URL(request.url);
  const roadmapId = url.searchParams.get('roadmapId');

  // Joined select returns the roadmap name alongside each note. When a
  // roadmapId is provided the list is scoped to that roadmap; otherwise we
  // return all of the user's notes across every roadmap (used by /account).
  let query = supabase
    .from('client_notes')
    .select('id, content, category, created_at, roadmap_id, roadmaps(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (roadmapId) {
    query = query.eq('roadmap_id', roadmapId);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const notes = (data ?? []).map((n) => {
    const r = n.roadmaps as unknown;
    const roadmapName =
      r && typeof r === 'object' && 'name' in (r as Record<string, unknown>)
        ? String((r as { name: unknown }).name)
        : null;
    return {
      id: n.id,
      content: n.content,
      category: n.category,
      created_at: n.created_at,
      roadmap_id: n.roadmap_id,
      roadmap_name: roadmapName,
    };
  });
  return Response.json({ notes });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const { error } = await supabase
    .from('client_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
