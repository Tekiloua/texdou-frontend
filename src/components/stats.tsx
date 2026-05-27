import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { statistiques } from "@/data/statistiques"
import { Files, Image } from "lucide-react"
import { Badge } from "./ui/badge"

const Stats = () => {
  let arrete = 0
  let avis = 0
  let decision = 0
  let decre = 0
  let annexe = 0
  let circulaire = 0
  let communique = 0
  let note = 0
  let engagement = 0
  let formulaire = 0
  let protocole = 0
  let autre = 0

  statistiques.forEach((stat, _) => {
    switch (stat.categorie) {
      case "Arrête":
        arrete++
        break

      case "Avis":
        avis++
        break

      case "Décision":
        decision++
        break

      case "Decré":
        decre++
        break

      case "Arrête":
        arrete++
        break

      case "Annexe":
        annexe++
        break

      case "Circulaire":
        circulaire++
        break

      case "Communiqué":
        communique++
        break

      case "Engagement":
        engagement++
        break

      case "Formulaire":
        formulaire++
        break

      case "Protocole":
        protocole++
        break

      case "Note":
        note++
        break

      default:
        // code si aucun cas ne correspond
        autre++
    }
  })

  console.log("avis : ", avis)
  console.log("note : ", note)
  console.log("decret : ", decre)
  console.log("decision : ", decision)
  console.log("arrete : ", arrete)
  console.log("annexe : ", annexe)
  console.log("circulaire : ", circulaire)
  console.log("communique : ", communique)
  console.log("engagement : ", engagement)
  console.log("formulaire : ", formulaire)
  console.log("protocole : ", protocole)
  console.log("autres : ", autre)
  console.log("---------------------------------------------")
  return (
    <div>
      <div></div>
      <Table>
        <TableCaption>images</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Nom fichier</TableHead>
            <TableHead>Categorie</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Largeur x Hauteur</TableHead>
            <TableHead>Taille (Mo)</TableHead>
            <TableHead>Blur</TableHead>
            <TableHead>Contraste</TableHead>
            <TableHead>Brightness</TableHead>
            <TableHead>Skew</TableHead>
            <TableHead>Noise Score</TableHead>
            <TableHead>B. Pixel ratio</TableHead>
            <TableHead>Entropy</TableHead>
            <TableHead>L..{"  "}uniformity</TableHead>
            <TableHead>Langue</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>WER</TableHead>
            <TableHead>CER</TableHead>
            <TableHead>OVV Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statistiques.map((stat, i) =>
            stat.type == "PNG" || stat.type == "JPG" || stat.type == "JPEG" ? (
              <>
                <TableRow key={i + "x"} className="bg-blue-100">
                  <TableCell className="flex items-center gap-2 font-medium">
                    <Image />
                    {stat.filename.slice(0, 25)}...
                  </TableCell>
                  <TableCell>{stat.categorie}</TableCell>
                  <TableCell>
                    {" "}
                    <Badge variant={"outline"}>{stat.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {stat.pages[0].largeur} x {stat.pages[0].hauteur}
                    </span>
                  </TableCell>
                  <TableCell>{stat.taille_mb} Mo</TableCell>
                  <TableCell>
                    {stat.pages[0].blur && (
                      <span className="font-semibold">
                        {/* BLUR :  */}
                        {stat.pages[0].blur.toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stat.pages[0].contrast && (
                      <span className="font-semibold">
                        {/* CONTRASTE :  */}
                        {Math.floor(stat.pages[0].contrast)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stat.pages[0].brightness && (
                      <span className="font-semibold">
                        {/* BRIGHTNESS :  */}
                        {stat.pages[0].brightness}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* SKEW */}
                    {stat.pages[0].skew}
                  </TableCell>
                  <TableCell>
                    {/* NOISE SCORE */}
                    {stat.pages[0].noise_score}
                  </TableCell>
                  <TableCell>
                    {/* BLACK PIXEL RATIO */}
                    {stat.pages[0].black_pixel_ratio}
                  </TableCell>
                  <TableCell>
                    {/* ENTROPY */}
                    {stat.pages[0].entropy}
                  </TableCell>
                  <TableCell>
                    {/* LIGHTING UNIFORMITY */}
                    {stat.pages[0].lighting_uniformity}
                  </TableCell>
                  <TableCell>
                    {/* LANGUE */}
                    {stat.pages[0].langue}
                  </TableCell>
                  <TableCell>
                    {/* TIME */}
                    {stat.pages[0].time} sec
                  </TableCell>
                  <TableCell>
                    {/* WER */}
                    {stat.pages[0].WER ? stat.pages[0].WER : "NULL"}
                  </TableCell>
                  <TableCell>
                    {/* CER */}
                    {stat.pages[0].CER ? stat.pages[0].CER : "NULL"}
                  </TableCell>
                  <TableCell>
                    {/* OVV_RATE */}
                    {stat.pages[0].tesseract_data.oov_rate}
                  </TableCell>
                </TableRow>
              </>
            ) : (
              <>
                <TableRow key={i + "y"} className="bg-red-100">
                  <TableCell className="flex items-center gap-2 font-medium text-red-950">
                    <Files /> {stat.filename.slice(0, 40)}...{" "}
                    {/* <span className="ml-4"> {stat.nbpage} page(s)</span> */}
                  </TableCell>
                  <TableCell>{stat.categorie}</TableCell>
                  <TableCell>
                    <Badge variant={"outline"}>{stat.type}</Badge>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>{stat.taille_mb} Mo</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
                {stat.pages ? (
                  stat.pages.map((page, i) => (
                    <TableRow key={i + "z"} className="bg-orange-50">
                      <TableCell className="font-medium">
                        page : {page.page}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {page.largeur} x {page.hauteur}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* BLUR :  */}
                          {page.blur.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* CONTRASTE : */}
                          {page.contrast}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* BRIGHTNESS : */}
                          {page.brightness}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* SKEW : */}
                          {page.skew}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* NOISE SCORE : */}
                          {page.noise_score}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* BLACK PIXEL RATIO : */}
                          {page.black_pixel_ratio}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* ENTROPY : */}
                          {page.entropy}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* LIGHTING UNIFORMITY : */}
                          {page.lighting_uniformity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* LANGUE : */}
                          {page.langue}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* TIME : */}
                          {page.time} sec
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* WER : */}
                          {page.WER ? page.WER : "NULL"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* WER : */}
                          {page.CER ? page.CER : "NULL"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {/* OVV RATE : */}
                          {page.tesseract_data.oov_rate}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <></>
                )}
              </>
            )
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default Stats
