export const siteName = "Hudhud"
export const defaultDescription = "Search, visualise, and discover Ancient South Arabian texts with AI-powered exploration, interactive maps, timeline views, and advanced search across DASI's inscription database."

const fallbackSiteUrl = "https://hudhud.shebascaravan.com"

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export function getSiteUrl() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_BASE_URL ?? fallbackSiteUrl,
  )
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`
}

export function getDefaultOgImage() {
  return absoluteUrl("/hudhud_logo_white.png")
}