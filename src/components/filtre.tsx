import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Calendar } from "@/components/ui/calendar"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { CalendarDays } from "lucide-react"
import type { CategorieType, StatutType, ThemeType } from "@/types"
import { useFiltre } from "@/store/useFiltre"

type FiltreProps = {
  dataCategories: CategorieType[]
  dataStatuts: StatutType[]
  dataThemes: ThemeType[]
}

export const Filtre = ({
  dataCategories,
  dataStatuts,
  dataThemes,
}: FiltreProps) => {
  const {
    categorie,
    statut,
    theme,
    mots_cles,
    date_debut,
    date_fin,
    updateCategorie,
    updateStatut,
    updateTheme,
    updateDateDebut,
    updateDateFin,
    updateMotsCles,
  } = useFiltre()

  // console.log("categorie:", categorie)
  // console.log("statut:", statut)
  // console.log("theme:", theme)
  // console.log("date_debut:", date_debut)
  // console.log("date_fin:", date_fin)
  // console.log("mots_cles:", mots_cles)
  // console.log("-------------------------------")

  return (
    <div className="flex items-center justify-center gap-6 overflow-hidden lg:flex-col">
      <div className="flex flex-col items-center gap-10 lg:flex-row">
        <div className="flex flex-col gap-1">
          <Label>Mots clés</Label>
          <Input
            className="max-w-60 min-w-45 border border-card-foreground text-xs"
            placeholder="mots clés"
            onChange={(e) => updateMotsCles(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Catégorie</Label>
          <Select
            defaultValue="toutes_les_categories"
            onValueChange={updateCategorie}
          >
            <SelectTrigger className="max-w-60 min-w-45 border border-card-foreground">
              <SelectValue></SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Catégorie</SelectLabel>
                <SelectItem value="toutes_les_categories">
                  Toutes les catégories
                </SelectItem>
                {dataCategories.map((categorie) => (
                  <SelectItem key={categorie.id} value={categorie?.nom || ""}>
                    {categorie.nom}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Thème</Label>
          <Select defaultValue={"tous_les_themes"} onValueChange={updateTheme}>
            <SelectTrigger className="max-w-60 min-w-45 border border-card-foreground">
              <SelectValue></SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="tous_les_themes">Tous les thèmes</SelectItem>
                {dataThemes.map((theme) => (
                  <SelectItem key={theme.id} value={theme?.nom || ""}>
                    {theme.nom}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Status</Label>
          <Select
            defaultValue={"tous_les_statuts"}
            onValueChange={updateStatut}
          >
            <SelectTrigger className="max-w-60 min-w-45 border border-card-foreground">
              <SelectValue></SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="tous_les_statuts">
                  Tous les status
                </SelectItem>
                {dataStatuts.map((statut) => (
                  <SelectItem key={statut.id} value={statut?.nom || ""}>
                    {statut.nom}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col items-center gap-10 lg:flex-row">
        <div className="flex flex-col gap-1">
          <Label>Du :</Label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex max-w-60 min-w-45 cursor-pointer items-center justify-between border px-4 py-1 text-sm">
                <span className="text-sm">
                  {date_debut == undefined ? (
                    <>Date de début</>
                  ) : (
                    <>
                      {date_debut.getDate()}-
                      {date_debut.getMonth() < 9
                        ? "0" + (date_debut.getMonth() + 1)
                        : date_debut.getMonth() + 1}
                      -{date_debut.getFullYear()}
                    </>
                  )}
                </span>
                <CalendarDays className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Date du début</AlertDialogTitle>
                <AlertDialogDescription>
                  Choisir la date inscrit sur le document
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex w-full justify-center bg-background">
                <Calendar
                  mode="single"
                  selected={date_debut}
                  onSelect={updateDateDebut}
                  className="rounded-lg border"
                  captionLayout="dropdown"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    updateDateDebut(undefined)
                  }}
                >
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction className="bg-blue-500 text-foreground">
                  Valider
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Au :</Label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex max-w-60 min-w-45 cursor-pointer items-center justify-between border px-4 py-1 text-sm">
                <span className="text-sm">
                  {date_fin == undefined ? (
                    <>Date de fin</>
                  ) : (
                    <>
                      {date_fin.getDate()}-
                      {date_fin.getMonth() < 9
                        ? "0" + (date_fin.getMonth() + 1)
                        : date_fin.getMonth() + 1}
                      -{date_fin.getFullYear()}
                    </>
                  )}
                </span>
                <CalendarDays className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Date du Fin</AlertDialogTitle>
                <AlertDialogDescription>
                  Choisir la date inscrit sur le document
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex w-full justify-center">
                <Calendar
                  mode="single"
                  selected={date_fin}
                  onSelect={updateDateFin}
                  className="rounded-lg border"
                  captionLayout="dropdown"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    updateDateFin(undefined)
                  }}
                >
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction className="bg-blue-500 text-foreground">
                  Valider
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Année</Label>
          <Select defaultValue={"toutes_les_annees"}>
            <SelectTrigger className="max-w-60 min-w-45 border border-card-foreground">
              <SelectValue></SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="toutes_les_annees">
                  Toutes les années
                </SelectItem>
                <SelectItem value={new Date().getFullYear().toString()}>
                  {new Date().getFullYear()}
                </SelectItem>
                {Array.from({ length: new Date().getFullYear() - 1990 }).map(
                  (_, i) => (
                    <SelectItem
                      key={i}
                      value={(new Date().getFullYear() - (i + 1)).toString()}
                    >
                      {(new Date().getFullYear() - (i + 1)).toString()}
                    </SelectItem>
                  )
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
