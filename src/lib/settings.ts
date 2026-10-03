import { queryOne } from "./db";

export type Settings = {
  pilot_mode: boolean;
  invite_only: boolean;
  baseline_sell_through_pct: number | null;
};

export async function settings(): Promise<Settings> {
  const row = await queryOne<Settings>("select pilot_mode, invite_only, baseline_sell_through_pct from app_settings");
  return row ?? { pilot_mode: true, invite_only: true, baseline_sell_through_pct: null };
}
