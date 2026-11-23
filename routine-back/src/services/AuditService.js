import AuditLogDao from "../daos/AuditLogDao.js";

class AuditService {
  /**
   * Appends an entry to the audit trail. Pass `{ tx }` so the entry is
   * committed atomically with the change it describes. `metadata` holds small,
   * non-sensitive context (before/after values) — never passwords or tokens.
   * @param {{ userId: string, action: string, entityType: string, entityId?: string | null, metadata?: object }} entry
   */
  record(entry, options = {}) {
    return AuditLogDao.create(
      entry.userId,
      { action: entry.action, entityType: entry.entityType, entityId: entry.entityId ?? null, metadata: entry.metadata },
      options,
    );
  }
}

export default new AuditService();
