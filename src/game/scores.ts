export interface HighScore {
  name: string;
  score: number;
  date: string;
}

export async function fetchHighScores(apiUrl: string): Promise<HighScore[]> {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitHighScore(
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

export function isHighScore(scores: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  if (scores.length < 10) return true;
  return score > scores[scores.length - 1].score;
}
