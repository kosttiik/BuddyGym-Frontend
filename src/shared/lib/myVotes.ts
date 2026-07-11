/* The API does not return the caller's vote (duplicates answer 409),
   so the local vote history drives the "you voted" UI state. */

const KEY = "bg.votes";

type VoteMap = Record<string, boolean>;

function load(): VoteMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VoteMap) : {};
  } catch {
    return {};
  }
}

let votes = load();

export function getMyVote(checkinId: string): boolean | undefined {
  return votes[checkinId];
}

export function rememberMyVote(checkinId: string, approve: boolean): void {
  votes = { ...votes, [checkinId]: approve };
  try {
    localStorage.setItem(KEY, JSON.stringify(votes));
  } catch {
    /* state survives in memory for the session */
  }
}
