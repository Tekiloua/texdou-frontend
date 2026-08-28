// markdown-to-html.ts
// ───────────────────
// Conversion Markdown → HTML volontairement minimale (pas de dépendance
// externe) : le texte extrait par le VLM (voir rag_route.py, EXTRACTION_PROMPT)
// est du Markdown "simple" — titres, gras/italique, listes, paragraphes.
// On produit du HTML compatible avec les balises reconnues par
// $generateNodesFromDOM côté éditeur (h2/h3, ul/ol/li, p, strong, em), pour
// pouvoir réutiliser exactement le même chemin d'insertion que le HTML
// initial (InitialContentPlugin dans lexical-doc-editor.tsx).

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Formatage inline : gras, italique, code — appliqué après l'échappement
// HTML, donc les marqueurs Markdown eux-mêmes ne sont jamais échappés.
function inlineFormat(text: string) {
  let out = escapeHtml(text)
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>")
  return out
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const html: string[] = []

  let listType: "ul" | "ol" | null = null
  let paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    html.push(`<p>${inlineFormat(paragraphBuffer.join(" "))}</p>`)
    paragraphBuffer = []
  }

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.trim() === "") {
      flushParagraph()
      closeList()
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      closeList()
      const level = heading[1].length >= 3 ? "h3" : "h2"
      html.push(`<${level}>${inlineFormat(heading[2])}</${level}>`)
      continue
    }

    const unordered = /^[-*]\s+(.*)$/.exec(line)
    const ordered = /^\d+\.\s+(.*)$/.exec(line)
    if (unordered || ordered) {
      flushParagraph()
      const kind = unordered ? "ul" : "ol"
      if (listType !== kind) {
        closeList()
        html.push(`<${kind}>`)
        listType = kind
      }
      html.push(`<li>${inlineFormat((unordered ?? ordered)![1])}</li>`)
      continue
    }

    closeList()
    paragraphBuffer.push(line.trim())
  }

  flushParagraph()
  closeList()

  return html.join("\n")
}