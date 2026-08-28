export const decodeTitle = (html: string | undefined): string => {
  const span = document.createElement("span")
  if (!html) return ""
  span.innerHTML = html
  return span.textContent ?? ""
}
