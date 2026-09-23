import { query } from "./db";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  data?: Record<string, unknown>,
): Promise<void> {
  await query(
    "insert into audit_log (actor_id, action, entity, entity_id, data) values ($1, $2, $3, $4, $5)",
    [actorId, action, entity, entityId, data ? JSON.stringify(data) : null],
  );
}
