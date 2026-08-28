import { z } from "zod"
import axios from "axios"

// ---------- Types ----------

export type SortKey = "name"
export type SortDirection = "asc" | "desc"
export type BulkAction = "modifier" | "supprimer"

export interface ApiTheme {
  id: number
  nom: string
  description: string | null
  slug: string | null
  couleur: string | null
  sous_themes: ApiTheme[]
}

export interface ThemeRow {
  id: number
  name: string
  slug: string
  description: string
  color: string
  depth: number
}

// ---------- Schéma Zod ----------

export const themeSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  slug: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  description: z.string().optional(),
  couleur: z.string().optional(),
})

export type ThemeFormValues = z.infer<typeof themeSchema>

export const editThemeSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  slug: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  description: z.string().optional(),
  couleur: z.string().optional(),
})

export type EditThemeFormValues = z.infer<typeof editThemeSchema>

// ---------- Utilitaires ----------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
}

/** Aplatit récursivement l'arbre sous_themes en liste ordonnée avec profondeur */
export function flattenThemes(list: ApiTheme[], depth = 0): ThemeRow[] {
  const result: ThemeRow[] = []
  for (const t of list) {
    result.push({
      id: t.id,
      name: t.nom,
      slug: t.slug ?? slugify(t.nom),
      description: t.description ?? "—",
      color: t.couleur ?? "#0E7490",
      depth,
    })
    if (t.sous_themes?.length) {
      result.push(...flattenThemes(t.sous_themes, depth + 1))
    }
  }
  return result
}

export async function fetchThemes(): Promise<ApiTheme[]> {
  const { data } = await axios.get("http://localhost:8000/themes")
  return data
}