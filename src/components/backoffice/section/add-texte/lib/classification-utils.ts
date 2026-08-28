import type { CheckItem, RawClassificationItem } from "../types/types"

// Transforme une liste plate { id, nom, parent_id } (ou une arborescence déjà
// imbriquée) en arbre CheckItem[], en respectant les relations parent_id →
// children.
export function buildCheckTree(
  items: RawClassificationItem[] | undefined
): CheckItem[] {
  if (!items || items.length === 0) return []

  // Repère le nom du champ contenant les enfants imbriqués, s'il existe
  const nestedKey = (
    [
      "children",
      "sous_categories",
      "sous_themes",
      "sous_statuts",
      "enfants",
    ] as const
  ).find((key) =>
    items.some((it) => Array.isArray(it[key]) && it[key]!.length > 0)
  )

  // Cas 1 : l'API renvoie déjà l'arborescence complète (chaque item porte
  // directement ses enfants). On mappe récursivement sans reconstruire quoi
  // que ce soit — c'était le cas manqué qui empêchait l'affichage des
  // sous-catégories / sous-statuts / sous-thèmes existants.
  if (nestedKey) {
    const mapNode = (it: RawClassificationItem): CheckItem => {
      const rawChildren = it[nestedKey] as RawClassificationItem[] | undefined
      return {
        id: String(it.id),
        label: it.nom,
        children:
          rawChildren && rawChildren.length > 0
            ? rawChildren.map(mapNode)
            : undefined,
      }
    }
    return items.map(mapNode)
  }

  // Cas 2 : liste à plat avec parent_id — on reconstruit l'arbre nous-mêmes.
  const nodes = new Map<string, CheckItem>()
  items.forEach((it) => {
    nodes.set(String(it.id), { id: String(it.id), label: it.nom })
  })

  const roots: CheckItem[] = []
  items.forEach((it) => {
    const node = nodes.get(String(it.id))!
    const parentId = it.parent_id != null ? String(it.parent_id) : null
    const parent =
      parentId && parentId !== String(it.id) ? nodes.get(parentId) : undefined
    if (parent) {
      parent.children = [...(parent.children ?? []), node]
    } else {
      roots.push(node)
    }
  })
  return roots
}
