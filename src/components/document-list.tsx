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
  resume,
  numero,
  // date_mise_en_vigueur,
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

  // const statusColor =
  //   statut_id === 1
  //     ? "bg-amber-300 text-foreground"
  //     : statut_id === 2
  //       ? "bg-orange-200 text-foreground"
  //       : statut_id === 3
  //         ? "bg-green-300 text-foreground"
  //         : "bg-gray-200 text-foreground"

  //on prend une partie du titre juste pour l'affichage
  const titre_first = titre?.slice(0, 50)
  //on prend une partie du contenu juste pour l'affichage
  const resume_first = resume?.slice(0, 260)

  return (
    <Link
      to={`/documents/${id}`}
      className="flex h-85 max-w-100 min-w-50 cursor-pointer flex-col gap-3 rounded-md border border-b-4 bg-card text-sm shadow-sm active:border-b"
    >
      <div className="flex h-[15%] items-center justify-center px-2 py-1 text-sm text-card-foreground">
        <span>
          <span>
            {dataCategories?.find((cat) => cat.id === categorie_id)?.nom}
          </span>
          {!numero ? <></> : <span> - {numero}</span>}
        </span>
      </div>
      <h1 className="my-3 h-12 w-full overflow-hidden px-[10%] pt-2 font-semibold text-card-foreground">
        <p>{titre_first}...</p>
      </h1>
      <div
        className={`mx-3 mb-3 h-30 overflow-hidden pt-2 text-sm ${resume_first ? "" : "flex items-center justify-center"}`}
      >
        {resume_first}
        {resume_first?.length == 0 ? <NoResumeAvailable /> : "..."}
      </div>
      <div className="flex items-center justify-between px-5">
        <Link to={`/documents/${id}`}>
          <Button variant={"ghost"} size={"sm"}>
            En savoir plus <ArrowRight className="size-4" />
          </Button>
        </Link>
        <Button 
        variant={"secondary"}
        className="">
          {dataStatuts?.find((statut) => statut.id === statut_id)?.nom}
        </Button>
      </div>
    </Link>
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
    <div className="flex flex-col items-center gap-10">
      <Filtre
        dataCategories={dataCategories}
        dataStatuts={dataStatuts}
        dataThemes={dataThemes}
      />
      <div>
        {nbPage > 0 ? (
          <div className="mx-auto grid max-w-2xl gap-8 p-4 sm:max-w-3xl lg:max-w-7xl lg:grid-cols-3">
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
                  numero={texte.numero}
                  resume={texte.resume}
                  // date_mise_en_vigueur={texte.date_mise_en_vigueur}
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
          <PaginationContent className="grid grid-cols-15 lg:grid-cols-20">
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
    <div className="flex h-105 max-w-7xl items-center justify-center">
      Aucun document trouvé
    </div>
  )
}

const NoResumeAvailable = () => {
  return (
    <p className="flex h-30 items-center justify-center">
      Aucun résumé disponible
    </p>
  )
}
