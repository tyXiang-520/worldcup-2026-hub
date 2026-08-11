import { Provide, Inject } from "@midwayjs/core";
import { DatabaseSync } from "node:sqlite";
import type { PlayerDetail } from "../interface";
import { MatchService } from "./match.service";

@Provide()
export class PlayerService {
  @Inject()
  matchService: MatchService;

  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  getById(id: number): PlayerDetail | null {
    const row = this.database
      .prepare("SELECT * FROM players WHERE id = ?")
      .get(id) as any;
    if (!row) return null;

    const statsRow = this.database
      .prepare("SELECT * FROM player_tournament_stats WHERE player_id = ?")
      .get(id) as any;

    return {
      id: row.id,
      name: row.name,
      nameEn: row.name_en,
      number: row.number,
      position: row.position,
      nationality: row.nationality,
      age: row.age,
      height: row.height,
      weight: row.weight,
      marketValue: row.market_value,
      club: row.club,
      tournamentStats: statsRow
        ? {
            appearances: statsRow.appearances,
            goals: statsRow.goals,
            assists: statsRow.assists,
            yellowCards: statsRow.yellow_cards,
            redCards: statsRow.red_cards,
            minutesPlayed: statsRow.minutes_played,
          }
        : null,
    };
  }
}
