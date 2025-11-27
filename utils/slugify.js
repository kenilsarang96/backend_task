export function slugifyOrgName(name) {
  if (!name || typeof name !== "string") return "";
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug;
}

export function orgCollectionName(name) {
  const slug = slugifyOrgName(name);
  if (!slug) return null;
  return `org_${slug}`;
}
