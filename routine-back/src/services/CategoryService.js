import CategoryDao from "../daos/CategoryDao.js";
import { withTransaction } from "../database/transaction.js";
import { DEFAULT_CATEGORIES } from "../shared/constants.js";
import { ConflictError, NotFoundError, ValidationError, isForeignKeyViolation } from "../shared/errors.js";

class CategoryService {
  dto(c) {
    return { id: c.id, name: c.name, colorKey: c.colorKey, icon: c.icon, sortOrder: c.sortOrder, isArchived: c.isArchived };
  }

  /** Users created before categories existed get the default ones the first time they look. */
  async ensureDefaults(userId, options = {}) {
    if ((await CategoryDao.countOwned(userId, {}, options)) === 0) await CategoryDao.createMany(userId, DEFAULT_CATEGORIES, options);
  }

  async list(userId, { includeArchived = false } = {}) {
    await this.ensureDefaults(userId);
    const rows = await CategoryDao.findAllOwned(userId, {
      where: includeArchived ? {} : { isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((c) => this.dto(c));
  }

  /** `null` = no category. Otherwise it must be the user's and not archived. */
  async assertUsable(userId, categoryId, options = {}) {
    if (!categoryId) return null;
    const category = await CategoryDao.findOwned(userId, categoryId, options);
    if (!category || category.isArchived) throw new ValidationError("Escolha uma categoria ativa.", { categoryId: "Escolha uma categoria ativa." });
    return category.id;
  }

  async create(userId, input) {
    const sortOrder = await CategoryDao.countOwned(userId);
    return this.dto(await CategoryDao.create(userId, { ...input, sortOrder }));
  }

  async update(userId, id, input) {
    return withTransaction(async (tx) => {
      if (!(await CategoryDao.findOwned(userId, id, { tx }))) throw new NotFoundError("Categoria não encontrada.");
      return this.dto(await CategoryDao.updateOwned(userId, id, input, { tx }));
    });
  }

  /** Only categories never used can be deleted; used ones are archived (the past keeps its colors). */
  async remove(userId, id) {
    if (!(await CategoryDao.findOwned(userId, id))) throw new NotFoundError("Categoria não encontrada.");
    try {
      await CategoryDao.deleteOwned(userId, id);
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new ConflictError("Esta categoria está em uso. Arquive-a para escondê-la sem mudar o que já passou.");
      throw error;
    }
  }
}

export default new CategoryService();
