import { BaseDao } from "./BaseDao.js";

class CategoryDao extends BaseDao {
  constructor() {
    super("category");
  }

  createMany(userId, rows, options = {}) {
    return this.model(options).createMany({ data: rows.map((row) => ({ ...row, userId })) });
  }
}

export default new CategoryDao();
