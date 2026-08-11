import type {
  MatchListResponse,
  MatchDetailResponse,
  TeamListResponse,
  TeamDetailResponse,
  PlayerDetailResponse,
} from "./types";

const API_BASE = "/api";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API 请求失败：${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchMatches(stage?: string): Promise<MatchListResponse> {
  const qs = stage ? `?stage=${encodeURIComponent(stage)}` : "";
  return fetchAPI<MatchListResponse>(`/matches${qs}`);
}

export function fetchMatchDetail(id: number): Promise<MatchDetailResponse> {
  return fetchAPI<MatchDetailResponse>(`/matches/${id}`);
}

export function fetchTeams(): Promise<TeamListResponse> {
  return fetchAPI<TeamListResponse>("/teams");
}

export function fetchTeamDetail(id: number): Promise<TeamDetailResponse> {
  return fetchAPI<TeamDetailResponse>(`/teams/${id}`);
}

export function fetchPlayerDetail(id: number): Promise<PlayerDetailResponse> {
  return fetchAPI<PlayerDetailResponse>(`/players/${id}`);
}
