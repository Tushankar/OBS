import { Category } from '../../models/index.js';

export function shapeCategory(c) {
  return { id: String(c._id), name: c.name, slug: c.slug, icon: c.icon || null };
}

// Public list of active categories (event filters + wizard dropdown).
export async function listCategories() {
  const cats = await Category.find({ isActive: true }).sort({ name: 1 });
  return cats.map(shapeCategory);
}
