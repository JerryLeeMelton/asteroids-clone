import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface HighScore {
  name: string;
  score: number;
  date: string;
}

const MAX_SCORES = 10;
const SCORES_FILE = path.join(process.cwd(), 'data', 'reacteroids-scores.json');

async function readScores(): Promise<HighScore[]> {
  try {
    const data = await fs.readFile(SCORES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeScores(scores: HighScore[]): Promise<void> {
  const dir = path.dirname(SCORES_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
}

export async function GET() {
  const scores = await readScores();
  return NextResponse.json(scores);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, score } = body;

    if (typeof name !== 'string' || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Sanitize initials: letters only, exactly 3 characters
    const sanitizedName = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    if (sanitizedName.length !== 3) {
      return NextResponse.json({ error: 'Initials must be exactly 3 letters' }, { status: 400 });
    }

    // Validate score is a reasonable positive integer
    if (!Number.isInteger(score) || score <= 0 || score > 9999999) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    const scores = await readScores();

    const newEntry: HighScore = {
      name: sanitizedName,
      score,
      date: new Date().toISOString(),
    };

    scores.push(newEntry);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, MAX_SCORES);

    await writeScores(topScores);

    // Return whether this score made the leaderboard
    const rank = topScores.findIndex(
      (s) => s.name === newEntry.name && s.score === newEntry.score && s.date === newEntry.date
    );

    return NextResponse.json({ rank: rank !== -1 ? rank + 1 : null, scores: topScores });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
