import { z } from "zod"
import axios from "axios"
import { slugify } from "@/hooks/slugify"

// ---------- Types ----------

export type SortKey = "name"
export type SortDirection = "asc" | "desc"
export type BulkAction = "modifier" | "supprimer"

export interface ApiStatut {
  id: number
  nom: string
  description: string | null
  slug: string | null
  couleur: string | null
  sous_statuts: ApiStatut[]
}

export interface StatutRow {
  id: number
  name: string
  slug: string
  description: string
  color: string
  depth: number
}

// ---------- Schéma Zod ----------

export const statutSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  slug: z.string().optional(),
  parent_id: z.number().nullable().optional(),
  description: z.string().optional(),
  couleur: z.string().optional(),
})

export type StatutFormValues = z.infer<typeof statutSchema>

/** Aplatit récursivement l'arbre sous_statuts en liste ordonnée avec profondeur */
export function flattenStatuts(list: ApiStatut[], depth = 0): StatutRow[] {
  const result: StatutRow[] = []
  for (const s of list) {
    result.push({
      id: s.id,
      name: s.nom,
      slug: s.slug ?? slugify(s.nom),
      description: s.description ?? "—",
      color: s.couleur ?? "#0E7490",
      depth,
    })
    if (s.sous_statuts?.length) {
      result.push(...flattenStatuts(s.sous_statuts, depth + 1))
    }
  }
  return result
}

export async function fetchStatuts(): Promise<ApiStatut[]> {
  const { data } = await axios.get("http://localhost:8000/statuts")
  return data
}