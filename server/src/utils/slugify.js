// URL-safe slug generator. Handles accents (São → sao), ampersands
// (Credit & Commerce → credit-and-commerce) and punctuation.
export function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate a slug from `source` that is unique within `Model.field`. If the
// base slug is taken it appends -2, -3, … until free. `ignoreId` lets an update
// keep its own slug (skip the doc being edited).
export async function uniqueSlug(Model, source, { field = 'slug', ignoreId } = {}) {
  const base = slugify(source) || 'item';
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { [field]: candidate };
    if (ignoreId) query._id = { $ne: ignoreId };
    const clash = await Model.exists(query);
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export default slugify;
