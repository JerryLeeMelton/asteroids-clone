export interface HighScore {
  name: string;
  score: number;
  date: string;
}

const STORAGE_KEY = 'reacteroids-high-scores';
const MAX_SCORES = 10;

// --- localStorage backend (always available) ---

function readLocalScores(): HighScore[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: unknown): s is HighScore =>
        typeof s === 'object' && s !== null &&
        typeof (s as HighScore).name === 'string' &&
        typeof (s as HighScore).score === 'number' &&
        typeof (s as HighScore).date === 'string'
    );
  } catch {
    return [];
  }
}

function writeLocalScores(scores: HighScore[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

// --- API backend (optional, for global leaderboard) ---

async function fetchRemoteScores(apiUrl: string): Promise<HighScore[] | null> {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function submitRemoteScore(
  apiUrl: string,
  name: string,
  score: number,
): Promise<{ rank: number | null; scores: HighScore[] } | null> {
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- Public API: tries remote first, falls back to localStorage ---

export async function fetchHighScores(apiUrl?: string): Promise<HighScore[]> {
  if (apiUrl) {
    const remote = await fetchRemoteScores(apiUrl);
    if (remote) {
      // Sync remote scores to local storage
      writeLocalScores(remote);
      return remote;
    }
  }
  return readLocalScores();
}

export async function submitHighScore(
  name: string,
  score: number,
  apiUrl?: string,
): Promise<{ rank: number | null; scores: HighScore[] }> {
  const newEntry: HighScore = {
    name: name.toUpperCase(),
    score,
    date: new Date().toISOString(),
  };

  // Try remote first
  if (apiUrl) {
    const remote = await submitRemoteScore(apiUrl, name, score);
    if (remote) {
      writeLocalScores(remote.scores);
      return remote;
    }
  }

  // Fall back to localStorage
  const scores = readLocalScores();
  scores.push(newEntry);
  scores.sort((a, b) => b.score - a.score);
  const topScores = scores.slice(0, MAX_SCORES);
  writeLocalScores(topScores);

  const rank = topScores.findIndex(
    (s) => s.name === newEntry.name && s.score === newEntry.score && s.date === newEntry.date
  );

  return { rank: rank !== -1 ? rank + 1 : null, scores: topScores };
}

export function isHighScore(scores: HighScore[], score: number): boolean {
  if (score <= 0 || !Number.isFinite(score)) return false;
  if (scores.length < MAX_SCORES) return true;
  return score >= scores[scores.length - 1].score;
}
