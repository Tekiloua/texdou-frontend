import { z } from "zod"

// ---------- Types ----------

export interface Article {
  id: number
  numero: string
  titre: string
  contenu: string
}

export interface Chapitre {
  id: number
  numero: string
  titre: string
  description: string
  articles: Article[]
}

export type DeleteTarget =
  | { type: "chapitre"; chapitreId: number }
  | { type: "article"; chapitreId: number; articleId: number }

// ---------- Schémas de validation ----------

export const chapitreSchema = z.object({
  numero: z.string().trim().min(1, "Le numéro est obligatoire"),
  titre: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string(),
})
export type ChapitreFormValues = z.infer<typeof chapitreSchema>

export const articleSchema = z.object({
  chapitre_id: z.number({ message: "Choisissez un chapitre" }),
  numero: z.string().trim().min(1, "Le numéro est obligatoire"),
  titre: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères"),
  contenu: z.string().trim().min(10, "Le contenu doit contenir au moins 10 caractères"),
})
export type ArticleFormValues = z.infer<typeof articleSchema>

// ---------- Données de prototype ----------

export const INITIAL_CHAPITRES: Chapitre[] = [
  {
    id: 1,
    numero: "I",
    titre: "Dispositions générales",
    description: "Champ d'application et définitions du Code des douanes.",
    articles: [
      {
        id: 1,
        numero: "1",
        titre: "Territoire douanier",
        contenu:
          "Le territoire douanier comprend l'ensemble du territoire national, y compris les eaux territoriales et l'espace aérien.",
      },
      {
        id: 2,
        numero: "2",
        titre: "Définitions",
        contenu:
          "Au sens du présent code, on entend par marchandises tous les biens meubles susceptibles de faire l'objet d'un commerce.",
      },
    ],
  },
  {
    id: 2,
    numero: "II",
    titre: "Organisation et fonctionnement du service des douanes",
    description: "Missions, pouvoirs et obligations de l'administration douanière.",
    articles: [
      {
        id: 3,
        numero: "3",
        titre: "Missions de l'administration",
        contenu:
          "L'administration des douanes est chargée de percevoir les droits et taxes et de veiller au respect de la réglementation.",
      },
      {
        id: 4,
        numero: "4",
        titre: "Pouvoirs de contrôle",
        contenu:
          "Les agents des douanes peuvent procéder à la visite des marchandises, des moyens de transport et des personnes.",
      },
    ],
  },
]