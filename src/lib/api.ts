import { supabase } from './supabase';
import type { ChildProfile, ParentAccount, AccountType, MatchMode, ScoreDetail } from './types';

// ─── AUTHENTIFICATION ────────────────────────────────────────────────────────

export async function createParentAccount(
  email: string,
  name: string,
  accountType: AccountType = 'family',
  password: string = 'LumiosPlay123!'
): Promise<{ data: ParentAccount | null, error: any }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from('parent_accounts')
    .insert([{ email, name, auth_id: authData.user.id, account_type: accountType }])
    .select()
    .single();

  if (error || !data) return { data: null, error };

  return {
    data: {
      id: data.id,
      name: data.name,
      email: data.email,
      accountType: data.account_type || 'family',
    },
    error: null,
  };
}

export async function loginParent(email: string, password: string = 'LumiosPlay123!'): Promise<{ data: ParentAccount | null, error: any }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from('parent_accounts')
    .select('*')
    .eq('auth_id', authData.user.id)
    .single();

  if (error || !data) return { data: null, error };

  return {
    data: {
      id: data.id,
      name: data.name,
      email: data.email,
      accountType: data.account_type || 'family',
    },
    error: null,
  };
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('email', email.trim())
    .maybeSingle();
  return !!data;
}

export async function isPseudoTaken(pseudo: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('pseudo', pseudo.trim())
    .maybeSingle();
  return !!data;
}

// ─── PROFILS ─────────────────────────────────────────────────────────────────

function mapProfile(p: any): ChildProfile {
  return {
    id: p.id,
    parentId: p.parent_id,
    pseudo: p.pseudo,
    avatarEmoji: p.avatar_emoji,
    ageRange: p.age_range,
    hasLumios: p.has_lumios,
    elo: p.elo,
    city: p.city,
    createdAt: p.created_at,
    rankTier: p.rank_tier || 'bronze',
    rankStep: p.rank_step ?? 0,
    seasonXp: p.season_xp ?? 0,
    winStreak: p.win_streak ?? 0,
    accountType: p.account_type || 'family',
  };
}

export async function getProfilesForParent(parentId: string): Promise<{ data: ChildProfile[], error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (data) {
    return { data: data.map(mapProfile), error: null };
  }
  return { data: [], error };
}

export async function createChildProfile(profile: Omit<ChildProfile, 'id' | 'createdAt'>): Promise<{ data: ChildProfile | null, error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      parent_id: profile.parentId,
      pseudo: profile.pseudo,
      avatar_emoji: profile.avatarEmoji,
      age_range: profile.ageRange,
      has_lumios: profile.hasLumios,
      elo: profile.elo,
      city: profile.city,
      rank_tier: profile.rankTier || 'bronze',
      rank_step: profile.rankStep ?? 0,
      season_xp: profile.seasonXp ?? 0,
      win_streak: profile.winStreak ?? 0,
      account_type: profile.accountType || 'family',
    }])
    .select()
    .single();

  if (error || !data) return { data: null, error };
  return { data: mapProfile(data), error: null };
}

export async function updateProfileLumiosStatus(profileId: string, hasLumios: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ has_lumios: hasLumios })
    .eq('id', profileId);
  return !error;
}

export async function updateProfileRank(
  profileId: string,
  rankTier: string,
  rankStep: number,
  seasonXp: number,
  winStreak: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      rank_tier: rankTier,
      rank_step: rankStep,
      season_xp: Math.max(0, seasonXp),
      win_streak: winStreak,
    })
    .eq('id', profileId);
  return !error;
}

// ─── DAILY DUEL LIMIT ───────────────────────────────────────────────────────

export async function getDailyDuelCount(profileId: string, opponentId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('match_mode', 'competitive')
    .gte('created_at', today.toISOString())
    .or(`and(player1_id.eq.${profileId},player2_id.eq.${opponentId}),and(player1_id.eq.${opponentId},player2_id.eq.${profileId})`);

  return count || 0;
}

// ─── MATCH SUBMISSION ───────────────────────────────────────────────────────

export async function submitMatchResult(match: {
  player1Id: string;
  player2Id: string;
  winnerId: string;
  score: string;
  scoreDetail: ScoreDetail;
  matchMode: MatchMode;
  matchType: 'duel' | 'arena' | 'competition';
  stepChangeP1: number;
  stepChangeP2: number;
  commentWinner?: string;
  commentLoser?: string;
  mediaUrl?: string;
  validatedByLoser?: boolean;
}): Promise<{ data: any; error: any }> {
  const { data, error } = await supabase
    .from('matches')
    .insert([{
      player1_id: match.player1Id,
      player2_id: match.player2Id,
      winner_id: match.winnerId,
      score: match.score,
      score_detail: match.scoreDetail,
      match_mode: match.matchMode,
      match_type: match.matchType,
      format: 'BO3',
      step_change_p1: match.stepChangeP1,
      step_change_p2: match.stepChangeP2,
      comment_winner: match.commentWinner || null,
      comment_loser: match.commentLoser || null,
      media_url: match.mediaUrl || null,
      validated_by_loser: match.validatedByLoser ?? false,
      contested: false,
    }])
    .select()
    .single();

  return { data, error };
}

export async function contestMatch(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('matches')
    .update({ contested: true })
    .eq('id', matchId);
  return !error;
}

export async function validateMatch(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('matches')
    .update({ validated_by_loser: true })
    .eq('id', matchId);
  return !error;
}

// ─── MEDIA UPLOAD ───────────────────────────────────────────────────────────

export async function uploadMatchMedia(file: File, matchId: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `match-media/${matchId}.${ext}`;

  const { error } = await supabase.storage
    .from('match-media')
    .upload(path, file, { upsert: true });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('match-media')
    .getPublicUrl(path);

  return urlData?.publicUrl || null;
}

// ─── LEADERBOARD & STATS ────────────────────────────────────────────────────

export async function getGlobalLeaderboard(): Promise<{ data: any[], error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('rank_step', { ascending: false })
    .order('season_xp', { ascending: false })
    .limit(50);

  if (data) {
    const mapped = data.map((p: any, i: number) => ({
      rank: i + 1,
      id: p.id,
      pseudo: p.pseudo,
      avatarEmoji: p.avatar_emoji,
      elo: p.elo,
      city: p.city,
      hasLumios: p.has_lumios,
      rankTier: p.rank_tier || 'bronze',
      rankStep: p.rank_step ?? 0,
      seasonXp: p.season_xp ?? 0,
    }));
    return { data: mapped, error: null };
  }
  return { data: [], error };
}

export async function getMatchHistory(profileId: string): Promise<{ data: any[], error: any }> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player1:profiles!matches_player1_id_fkey(pseudo, avatar_emoji),
      player2:profiles!matches_player2_id_fkey(pseudo, avatar_emoji)
    `)
    .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { data: [], error };

  const parsed = data.map((m: any) => {
    const isP1 = m.player1_id === profileId;
    const opponent = isP1 ? m.player2?.pseudo : m.player1?.pseudo;
    const won = m.winner_id === profileId;
    const stepChange = isP1 ? (m.step_change_p1 ?? 0) : (m.step_change_p2 ?? 0);
    const eloChange = isP1 ? m.elo_change_p1 : m.elo_change_p2;

    return {
      id: m.id,
      opponentPseudo: opponent || 'Anonyme',
      won,
      score: m.score,
      scoreDetail: m.score_detail,
      matchMode: m.match_mode || 'competitive',
      stepChange,
      eloChange: eloChange ?? 0,
      date: new Date(m.created_at).toISOString().split('T')[0],
      validatedByLoser: m.validated_by_loser,
      contested: m.contested,
      commentWinner: m.comment_winner,
      commentLoser: m.comment_loser,
      mediaUrl: m.media_url,
    };
  });

  return { data: parsed, error: null };
}

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

export async function getFriends(profileId: string): Promise<{ data: any[], error: any }> {
  const { data, error } = await supabase
    .from('friends')
    .select(`
      status,
      friend:profiles!friends_friend_id_fkey (
        id, pseudo, avatar_emoji, has_lumios, elo, city, rank_tier, rank_step
      )
    `)
    .eq('profile_id', profileId)
    .eq('status', 'accepted');

  if (error || !data) return { data: [], error };

  const friendsWithCounts = await Promise.all(data.map(async (f: any) => {
    const { count } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`and(player1_id.eq.${profileId},player2_id.eq.${f.friend.id}),and(player1_id.eq.${f.friend.id},player2_id.eq.${profileId})`);

    return {
      id: f.friend.id,
      pseudo: f.friend.pseudo,
      avatarEmoji: f.friend.avatar_emoji,
      hasLumios: f.friend.has_lumios,
      elo: f.friend.elo,
      city: f.friend.city,
      isOnline: Math.random() > 0.5,
      status: f.status,
      rankTier: f.friend.rank_tier || 'bronze',
      rankStep: f.friend.rank_step ?? 0,
      matchCount: count || 0,
    };
  }));

  return { data: friendsWithCounts, error: null };
}

export async function getPendingFriendRequests(profileId: string): Promise<{ data: any[], error: any }> {
  // Demandes reçues : quelqu'un nous a envoyé une demande (friend_id = profileId, status = pending)
  const { data, error } = await supabase
    .from('friends')
    .select(`
      status,
      requester:profiles!friends_profile_id_fkey (
        id, pseudo, avatar_emoji, has_lumios, elo, city, rank_tier, rank_step
      )
    `)
    .eq('friend_id', profileId)
    .eq('status', 'pending');

  if (error || !data) return { data: [], error };

  const mapped = data.map((r: any) => ({
    id: r.requester.id,
    pseudo: r.requester.pseudo,
    avatarEmoji: r.requester.avatar_emoji,
    hasLumios: r.requester.has_lumios,
    city: r.requester.city,
    rankTier: r.requester.rank_tier || 'bronze',
    rankStep: r.requester.rank_step ?? 0,
  }));

  return { data: mapped, error: null };
}

export async function searchProfiles(query: string, excludeId?: string): Promise<{ data: any[], error: any }> {
  let q = supabase
    .from('profiles')
    .select('*, id, pseudo, avatar_emoji, elo, city, rank_tier, rank_step')
    .ilike('pseudo', `%${query}%`)
    .limit(10);

  if (excludeId) {
    q = q.neq('id', excludeId);
  }

  const { data, error } = await q;
  return { data: data || [], error };
}

export async function addFriend(profileId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friends')
    .upsert([
      { profile_id: profileId, friend_id: friendId, status: 'pending' },
    ]);
  return !error;
}

export async function acceptFriendRequest(profileId: string, requesterId: string): Promise<boolean> {
  // Accept: both sides become 'accepted'
  const { error: e1 } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('profile_id', requesterId)
    .eq('friend_id', profileId);
  if (e1) return false;
  const { error: e2 } = await supabase
    .from('friends')
    .upsert([{ profile_id: profileId, friend_id: requesterId, status: 'accepted' }]);
  return !e2;
}

export async function declineFriendRequest(profileId: string, requesterId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('profile_id', requesterId)
    .eq('friend_id', profileId);
  return !error;
}

// ─── FAMILY LINKING (#15) ─────────────────────────────────────────────────────

/** Un compte individuel envoie une demande de rattachement à une famille */
export async function requestFamilyLink(profileId: string, familyParentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('family_link_requests')
    .upsert([{ requester_profile_id: profileId, family_parent_id: familyParentId, status: 'pending' }]);
  return !error;
}

/** Récupérer les demandes de rattachement reçues par un responsable de famille */
export async function getPendingFamilyRequests(parentId: string): Promise<{ data: any[], error: any }> {
  const { data, error } = await supabase
    .from('family_link_requests')
    .select(`
      id,
      status,
      requester:profiles!family_link_requests_requester_profile_id_fkey (
        id, pseudo, avatar_emoji, rank_tier, rank_step, age_range
      )
    `)
    .eq('family_parent_id', parentId)
    .eq('status', 'pending');

  if (error || !data) return { data: [], error };
  return {
    data: data.map((r: any) => ({
      requestId: r.id,
      id: r.requester.id,
      pseudo: r.requester.pseudo,
      avatarEmoji: r.requester.avatar_emoji,
      rankTier: r.requester.rank_tier || 'bronze',
      rankStep: r.requester.rank_step ?? 0,
      ageRange: r.requester.age_range,
    })),
    error: null,
  };
}

/** Accepter le rattachement : déplacer le profil sous la famille */
export async function acceptFamilyLink(requestId: string, requesterProfileId: string, familyParentId: string): Promise<boolean> {
  // Mettre à jour le parent_id du profil individuel
  const { error: e1 } = await supabase
    .from('profiles')
    .update({ parent_id: familyParentId, account_type: 'family' })
    .eq('id', requesterProfileId);
  if (e1) return false;

  // Marquer la demande comme acceptée
  const { error: e2 } = await supabase
    .from('family_link_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  return !e2;
}

/** Refuser le rattachement */
export async function declineFamilyLink(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('family_link_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  return !error;
}

/** Rechercher un compte famille par nom ou email */
export async function searchFamilyAccounts(query: string): Promise<{ data: any[], error: any }> {
  const { data, error } = await supabase
    .from('parent_accounts')
    .select('id, name, email, account_type')
    .eq('account_type', 'family')
    .ilike('name', `%${query}%`)
    .limit(8);
  return { data: data || [], error };
}

