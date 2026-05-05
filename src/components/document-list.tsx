import { useLocation } from "react-router-dom"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { Button } from "./ui/button"
import { Filtre } from "./filtre"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { useEffect, useState } from "react"
import {
  fetchTextes,
  fetchCategories,
  fetchStatuts,
  fetchThemes,
} from "@/api/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { TexteType, CategorieType, StatutType, ThemeType } from "@/types"
import { Link } from "react-router-dom"
import { useFilteredTextes } from "@/hooks/useFiltre"
import { useFiltre } from "@/store/useFiltre"
// import { useFiltre } from "@/store/useFiltre"

const TexteItem = ({
  id,
  titre,
  contenu_html,
  resume,
  date_mise_en_vigueur,
  statut_id,
  categorie_id,
}: TexteType) => {
  const queryClient = useQueryClient()

  //Utilisation de cache pour éviter de faire une requete à chaque fois que l'on affiche un texte
  const { data: dataCategories } = useQuery<CategorieType[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    initialData: () =>
      queryClient.getQueryData<CategorieType[]>(["categories"]),
  })

  //Utilisation de cache pour éviter de faire une requete à chaque fois que l'on affiche un texte
  const { data: dataStatuts } = useQuery<StatutType[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
    initialData: () => queryClient.getQueryData<StatutType[]>(["statuts"]),
  })

  const statusColor =
    statut_id === 1
      ? "bg-amber-300 text-foreground"
      : statut_id === 2
        ? "bg-orange-200 text-foreground"
        : statut_id === 3
          ? "bg-green-300 text-foreground"
          : "bg-gray-200 text-foreground"

  //on prend une partie du titre juste pour l'affichage
  const titre_first = titre?.slice(0, 50)
  //on prend une partie du contenu juste pour l'affichage
  const resume_first =
    resume?.length == 0 ? "Aucun résumé disponible" : resume?.slice(0, 260)

  return (
    <div className="relative flex h-85 max-w-170 flex-col gap-3 bg-primary-foreground border border-slate-400/40 text-sm shadow-md">
      <div className="flex h-[15%] w-full items-center justify-center bg-muted-foreground px-2 py-1 text-sm text-muted">
        <span>
          {dataCategories?.find((cat) => cat.id === categorie_id)?.nom}
        </span>
        {!date_mise_en_vigueur ? (
          <></>
        ) : (
          <span> - {date_mise_en_vigueur.toString()}</span>
        )}
      </div>
      <h1 className="my-3 h-12 w-full overflow-hidden px-[10%] pt-2 font-semibold">
        <p>{titre_first}...</p>
      </h1>
      <p
        className={`mx-3 mb-3 h-30 overflow-hidden pt-2 text-xs ${resume_first ? "" : "flex items-center justify-center"}`}
      >
        {resume_first}
        {resume_first?.length == 0 ? "" : "..."}
      </p>
      <div className="flex items-center justify-between px-5">
        <Link to={`/documents/${id}`}>
          <Button
            variant={"ghost_more"}
            size={"sm"}
            className="rouded-sm text-xs text-blue-600"
          >
            En savoir plus <ArrowRight className="size-4" />
          </Button>
        </Link>
        <Button
          variant={"default"}
          size={"sm"}
          className={`rounded-sm ${statusColor}`}
        >
          {dataStatuts?.find((statut) => statut.id === statut_id)?.nom}
        </Button>
      </div>
    </div>
  )
}

export const DocumentList = () => {
  const location = useLocation()
  const { updateCategorie, updateMotsCles, updateStatut } = useFiltre()
  // 1. Hooks (TOUJOURS en premier)
  const [currentPage, setCurrentPage] = useState<number>(0)

  // 2. Requêtes (hooks aussi)
  const {
    data: dataCategories,
    isLoading: isLoadingCategories,
    error: errorFetchCategories,
  } = useQuery<CategorieType[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  const {
    data: dataThemes,
    isLoading: isLoadingThemes,
    error: errorFetchThemes,
  } = useQuery<ThemeType[]>({
    queryKey: ["themes"],
    queryFn: fetchThemes,
  })

  const {
    data: dataStatuts,
    isLoading: isLoadingStatuts,
    error: errorFetchStatuts,
  } = useQuery<StatutType[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
  })

  const {
    data: dataTextes,
    isLoading: isLoadingTextes,
    error: errorFetchTextes,
  } = useQuery<TexteType[]>({
    queryKey: ["textes"],
    queryFn: fetchTextes,
  })

  const nbDocInPage = 6

  const dataTextesFiltered = useFilteredTextes(dataTextes || [])

  const nbPage = Math.floor(
    dataTextesFiltered.length / nbDocInPage +
      (dataTextesFiltered.length % nbDocInPage > 0 ? 1 : 0)
  )

  useEffect(() => {
    if (currentPage >= nbPage) {
      setCurrentPage(0)
    }
  }, [nbPage, currentPage])

  //on enleve les filtres à chaque fois que l'on change de page (ex: de la page d'accueil à la page de recherche) pour éviter d'avoir des résultats qui ne correspondent pas à la recherche précédente
  useEffect(() => {
    updateCategorie(undefined)
    updateStatut(undefined)
    updateMotsCles(undefined)
  }, [location])

  // 3. Conditions de rendu (après TOUS les hooks)
  if (
    isLoadingTextes ||
    isLoadingCategories ||
    isLoadingStatuts ||
    isLoadingThemes
  )
    return (
      <div className="flex h-[90vh] w-full items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    )

  if (
    errorFetchTextes ||
    errorFetchCategories ||
    errorFetchStatuts ||
    errorFetchThemes
  )
    return <div>Erreur...</div>

  if (!dataTextes || !dataCategories || !dataStatuts || !dataThemes) return null
  // const textesWithResume = dataTextes.map((texte) => {
  //     texte.resume?.length ==

  return (
    <div className="flex flex-col gap-6">
      <Filtre
        dataCategories={dataCategories}
        dataStatuts={dataStatuts}
        dataThemes={dataThemes}
      />
      <div>
        {nbPage > 0 ? (
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 md:grid-cols-2 md:px-8 lg:grid-cols-3">
            {dataTextesFiltered
              .slice(
                currentPage * nbDocInPage,
                currentPage * nbDocInPage + nbDocInPage
              )
              .map((texte, i) => (
                <TexteItem
                  key={i}
                  id={texte.id}
                  titre={texte.titre}
                  categorie_id={texte.categorie_id}
                  contenu_html={texte.contenu_html}
                  resume={texte.resume}
                  date_mise_en_vigueur={texte.date_mise_en_vigueur}
                  statut_id={texte.statut_id}
                />
              ))}
          </div>
        ) : (
          <NoDocumentFound />
        )}
      </div>

      <div className="">
        <Pagination className="my-2">
          <PaginationContent className="grid grid-cols-25">
            {Array.from({ length: nbPage }).map((_, i) => {
              const page = i

              return (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={currentPage === page}
                    onClick={() => {
                      setCurrentPage(page)
                    }}
                  >
                    {page + 1}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

const NoDocumentFound = () => {
  return (
    <div className="mx-auto flex h-105 max-w-7xl items-center justify-center">
      Aucun document trouvé
    </div>
  )
}
