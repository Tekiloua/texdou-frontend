import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchTexteById } from "@/api/api"
import type { TexteType } from "@/types"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
export const TexteDetails = () => {
  return (
    <div className="mx-auto max-w-5xl">
      <TabsNav />
    </div>
  )
}

const Resume = () => {
  const { id } = useParams()
  const {
    data: dataTextes,
    isLoading: isLoadingTextes,
    error: errorTextes,
  } = useQuery<TexteType>({
    queryKey: ["texte", id],
    queryFn: () => fetchTexteById(id as string),
  })

  if (isLoadingTextes) return <div>Chargement...</div>
  if (errorTextes) return <div>Erreur...</div>
  if (!dataTextes) return null

  return (
    <div className="border p-5">
      <h1 className="text-xl font-bold">{dataTextes.titre}</h1>
      <p className="text-gray-600">Catégorie : {dataTextes.categorie_id}</p>
      <p className="text-gray-600">Statut : {dataTextes.statut_id}</p>
      <div className="">
        <h2 className="mt-4 text-lg font-semibold">Résumé</h2>
        {dataTextes.resume?.length == 0 ? (
          <p className="mx-2 text-sm text-gray-500">Aucun résumé disponible.</p>
        ) : (
          <div
            className="mx-2 text-sm"
            dangerouslySetInnerHTML={{ __html: dataTextes.resume || "" }}
          ></div>
        )}
      </div>
    </div>
  )
}

const Officiel = () => {
  const { id } = useParams()
  const {
    data: dataTextes,
    isLoading: isLoadingTextes,
    error: errorTextes,
  } = useQuery<TexteType>({
    queryKey: ["texte", id],
    queryFn: () => fetchTexteById(id as string),
  })
  if (isLoadingTextes) return <div>Chargement...</div>
  if (errorTextes) return <div>Erreur...</div>
  if (!dataTextes) return null

  return (
    <div className="p-5">
      <div
        className="mx-2 p-4 text-xl text-green-900"
        dangerouslySetInnerHTML={{ __html: dataTextes.titre || "" }}
      ></div>
      <div
        className="mx-2 text-sm"
        dangerouslySetInnerHTML={{ __html: dataTextes.contenu_html || "" }}
      ></div>
    </div>
  )
}

const TabsNav = () => {
  return (
    <Tabs defaultValue="officiel" className="mt-[1%]">
      <TabsList>
        <TabsTrigger value="officiel" className="cursor-pointer">
          Officiel
        </TabsTrigger>
        <TabsTrigger value="resume" className="cursor-pointer">
          Résumé
        </TabsTrigger>
        <TabsTrigger value="officiel_document" className="cursor-pointer">
          Document PDF
        </TabsTrigger>
      </TabsList>
      <TabsContent value="resume">
        <Resume />
      </TabsContent>{" "}
      <TabsContent value="officiel">
        <Officiel />
      </TabsContent>
    </Tabs>
  )
}
