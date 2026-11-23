import { BaseDao } from "./BaseDao.js";

/** Append-only audit trail. */
class AuditLogDao extends BaseDao {
  constructor() {
    super("auditLog");
  }
}

export default new AuditLogDao();
