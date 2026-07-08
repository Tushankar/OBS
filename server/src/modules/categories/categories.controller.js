import * as categoryService from './categories.service.js';

export async function list(req, res) {
  const categories = await categoryService.listCategories();
  res.status(200).json({ categories });
}
