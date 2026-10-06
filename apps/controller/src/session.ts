/** Huskes på telefonen, så man kommer tilbage på samme plads efter et refresh eller dvale. */
export interface Session {
  code: string;
  playerId: string;
}

const SESSION_KEY = 'sami.session';
const NAME_KEY = 'sami.name';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Privat browsing o.l. – vi klarer os uden.
  }
}

export function loadSession(): Session | null {
  try {
    const parsed = JSON.parse(read(SESSION_KEY) ?? 'null');
    if (parsed && typeof parsed.code === 'string' && typeof parsed.playerId === 'string') return parsed;
  } catch {
    // ignorer
  }
  return null;
}

export function saveSession(session: Session | null): void {
  write(SESSION_KEY, session ? JSON.stringify(session) : null);
}

export const loadName = (): string => read(NAME_KEY) ?? '';
export const saveName = (name: string): void => write(NAME_KEY, name);
