export type Categorie =
  | "Accord"
  | "Arrêté"
  | "Avis public"
  | "Avis aux usagers"
  | "Circulaire"
  | "Communiqué"
  | "Décision"

export type Statut = "Abrogé" | "En vigueur" | "Modifié" | "Modifié et remplacé"

export type Document = {
  titre: string
  categorie: Categorie
  statut: Statut
  date: string // format ISO recommandé: YYYY-MM-DD
}

export const documents: Document[] = [
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Accord commercial régional 2020",
    categorie: "Accord",
    statut: "En vigueur",
    date: "2020-03-15",
  },
  {
    titre: "Arrêté ministériel sur les importations",
    categorie: "Arrêté",
    statut: "Modifié",
    date: "2021-06-10",
  },
]
