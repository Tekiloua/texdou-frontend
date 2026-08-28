import { z } from "zod"

// ---------- Types ----------

export type SortKey = "name" | "total" | "views"
export type SortDirection = "asc" | "desc"
export type BulkAction = "modifier" | "supprimer"

export interface ApiCategorie {
  id: number
  nom: string
  description: string | null
  slug: string | null
  couleur: string | null
  sous_categories: ApiCategorie[]
}

export interface CategoryRow {
  id: number
  name: string
  slug: string
  description: string
  color: string
  depth: number
}

// ---------- Schéma Zod ----------

export const categorieSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  slug: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  description: z.string().optional(),
  couleur: z.string().optional(),
})

export type CategorieFormValues = z.infer<typeof categorieSchema>

// ---------- Utilitaires ----------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
}

/** Aplatit récursivement l'arbre sous_categories en liste ordonnée avec profondeur */
export function flattenCategories(
  list: ApiCategorie[],
  depth = 0
): CategoryRow[] {
  const result: CategoryRow[] = []
  for (const c of list) {
    result.push({
      id: c.id,
      name: c.nom,
      slug: c.slug ?? slugify(c.nom),
      description: c.description ?? "—",
      color: c.couleur ?? "#0E7490",
      depth,
    })
    if (c.sous_categories?.length) {
      result.push(...flattenCategories(c.sous_categories, depth + 1))
    }
  }
  return result
}