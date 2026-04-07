-- ─── LUMIOS PLAY DB SCHEMA ──────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PARENT ACCOUNTS ───────────────────────────────────────────
CREATE TABLE parent_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ─── 2. PROFILES (Enfants) ───────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES parent_accounts(id) ON DELETE CASCADE,
  pseudo TEXT NOT NULL,
  avatar_emoji TEXT,
  age_range TEXT NOT NULL,
  has_lumios BOOLEAN DEFAULT FALSE,
  elo INTEGER DEFAULT 800,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Pseudo must be unique globally
  UNIQUE(pseudo)
);

-- ─── 3. FRIENDS ──────────────────────────────────────────────────
-- (Lien d'amitié entre deux profils)
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un lien unique
  UNIQUE(profile_id, friend_id)
);

-- ─── 4. MATCHES ──────────────────────────────────────────────────
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT, -- Code QR ou Code Arène
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  score TEXT,
  format TEXT DEFAULT 'BO1',
  elo_change_p1 INTEGER,
  elo_change_p2 INTEGER,
  type TEXT CHECK (type IN ('friendly', 'ranked', 'arena', 'competition')),
  competition_id UUID, -- S'il appartient à un tournoi
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. ARENAS (Historique) ──────────────────────────────────────
CREATE TABLE arenas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id),
  level_req TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ─── 6. COMPETITIONS (Tournois/Coupes) ──────────────────────────
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'friendly' CHECK (type IN ('friendly', 'ranked')),
  format TEXT DEFAULT 'elimination' CHECK (format IN ('elimination', 'cup')),
  creator_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'setup' CHECK (status IN ('setup', 'pool', 'bracket', 'ended')),
  champion_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── POLICY EXAMPLES ─────────────────────────────────────────────
-- (Exemple simple, en prod on utiliserait RLS = Row Level Security)
ALTER TABLE parent_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Les parents peuvent voir leurs propres profils
CREATE POLICY "Parents can view their profiles" ON profiles
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM parent_accounts WHERE id = parent_id));

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Parents can only insert/view/update their own account
CREATE POLICY "Allow parent insert" ON parent_accounts
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Allow parent select own" ON parent_accounts
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Allow parent update own" ON parent_accounts
  FOR UPDATE USING (auth.uid() = auth_id);

-- Case-insensitive pseudo uniqueness
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pseudo_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pseudo_case_insensitive_idx ON profiles (LOWER(pseudo));
