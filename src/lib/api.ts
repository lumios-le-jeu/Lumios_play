import { supabase } from './supabase';
import type { ChildProfile, ParentAccount } from './types';

/**
 * MOCK FALLBACKS
 * Used when Supabase is not properly configured locally or network fails
 */
let mockedProfiles: ChildProfile[] = [];
let mockedParent: ParentAccount | null = null;

// ─── AUTHENTIFICATION PARENT ────────────────────────────────────────────────

export async function createParentAccount(email: string, name: string): Promise<{ data: ParentAccount | null, error: any }> {
  if (!supabase) {
    mockedParent = { id: `parent-${Date.now()}`, email, name };
    return { data: mockedParent, error: null };
  }
  
  // Real Supabase Auth creation (without email confirmation for ease of use)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'LumiosPlay123!', // Demo simplified password
  });

  if (authError || !authData.user) return { data: null, error: authError };

  // Insert into parent_accounts table
  const { data, error } = await supabase
    .from('parent_accounts')
    .insert([{ email, name, auth_id: authData.user.id }])
    .select()
    .single();

  return { data, error };
}

export async function loginParent(email: string): Promise<{ data: ParentAccount | null, error: any }> {
  if (!supabase) {
    if (!mockedParent) mockedParent = { id: 'parent-demo', email, name: 'Demo Parent' };
    return { data: mockedParent, error: null };
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: 'LumiosPlay123!',
  });

  if (authError || !authData.user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from('parent_accounts')
    .select('*')
    .eq('auth_id', authData.user.id)
    .single();

  return { data, error };
}

// ─── PROFILS ENFANTS (App data) ──────────────────────────────────────────────

export async function getProfilesForParent(parentId: string): Promise<{ data: ChildProfile[], error: any }> {
  if (!supabase) return { data: mockedProfiles, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (data) {
    const sorted = data.map(p => ({
      id: p.id,
      parentId: p.parent_id,
      pseudo: p.pseudo,
      avatarEmoji: p.avatar_emoji,
      ageRange: p.age_range,
      hasLumios: p.has_lumios,
      elo: p.elo,
      city: p.city,
      createdAt: p.created_at,
    }));
    return { data: sorted, error: null };
  }
  return { data: [], error };
}

export async function createChildProfile(profile: Omit<ChildProfile, 'id' | 'createdAt'>): Promise<{ data: ChildProfile | null, error: any }> {
  if (!supabase) {
    const newP = { ...profile, id: `child-${Date.now()}`, createdAt: new Date().toISOString() };
    mockedProfiles.push(newP);
    return { data: newP, error: null };
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      parent_id: profile.parentId,
      pseudo: profile.pseudo,
      avatar_emoji: profile.avatarEmoji,
      age_range: profile.ageRange,
      has_lumios: profile.hasLumios,
      elo: profile.elo,
      city: profile.city
    }])
    .select()
    .single();

  if (error || !data) return { data: null, error };

  return { data: {
    id: data.id,
    parentId: data.parent_id,
    pseudo: data.pseudo,
    avatarEmoji: data.avatar_emoji,
    ageRange: data.age_range,
    hasLumios: data.has_lumios,
    elo: data.elo,
    city: data.city,
    createdAt: data.created_at,
  }, error: null };
}

export async function updateProfileLumiosStatus(profileId: string, hasLumios: boolean): Promise<boolean> {
  if (!supabase) {
    const p = mockedProfiles.find(x => x.id === profileId);
    if (p) p.hasLumios = hasLumios;
    return true;
  }
  const { error } = await supabase
    .from('profiles')
    .update({ has_lumios: hasLumios })
    .eq('id', profileId);
  return !error;
}

// ─── LEADERBOARD & STATS ────────────────────────────────────────────────────

export async function getGlobalLeaderboard(): Promise<{ data: any[], error: any }> {
  if (!supabase) {
    // Return sorted mocked profiles (or empty if none)
    return { data: mockedProfiles.sort((a,b) => b.elo - a.elo).map((p, i) => ({ ...p, rank: i+1 })), error: null };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('elo', { ascending: false })
    .limit(50);

  if (data) {
    const mapped = data.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      pseudo: p.pseudo,
      avatarEmoji: p.avatar_emoji,
      elo: p.elo,
      city: p.city,
      hasLumios: p.has_lumios
    }));
    return { data: mapped, error: null };
  }
  return { data: [], error };
}

export async function getMatchHistory(profileId: string): Promise<{ data: any[], error: any }> {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player1:profiles!matches_player1_id_fkey(pseudo, avatar_emoji),
      player2:profiles!matches_player2_id_fkey(pseudo, avatar_emoji)
    `)
    .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) return { data: [], error };

  const parsed = data.map((m: any) => {
    const isP1 = m.player1_id === profileId;
    const opponent = isP1 ? m.player2?.pseudo : m.player1?.pseudo;
    const won = m.winner_id === profileId;
    const eloChange = isP1 ? m.elo_change_p1 : m.elo_change_p2;

    return {
      id: m.id,
      opponentPseudo: opponent || 'Anonyme',
      won,
      score: m.score,
      eloChange,
      date: new Date(m.created_at).toISOString().split('T')[0], // YYYY-MM-DD
    };
  });

  return { data: parsed, error: null };
}

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

export async function getFriends(profileId: string): Promise<{ data: any[], error: any }> {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from('friends')
    .select(`
      status,
      friend:profiles!friends_friend_id_fkey (
        id, pseudo, avatar_emoji, has_lumios, elo, city
      )
    `)
    .eq('profile_id', profileId)
    .eq('status', 'accepted');

  if (error || !data) return { data: [], error };

  return {
    data: data.map((f: any) => ({
      id: f.friend.id,
      pseudo: f.friend.pseudo,
      avatarEmoji: f.friend.avatar_emoji,
      hasLumios: f.friend.has_lumios,
      elo: f.friend.elo,
      city: f.friend.city,
      isOnline: Math.random() > 0.5, // Faked online status for realistic feel
      status: f.status
    })),
    error: null
  };
}
