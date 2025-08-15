import { EpigraphOut } from "../client"

export interface MetaTagsData {
  title: string
  description: string
  url: string
  image: string
  type: string
}

export const generateEpigraphMetaTags = (epigraph: EpigraphOut): MetaTagsData => {
  const baseUrl = import.meta.env.VITE_BASE_URL
  const fallbackImage = `${baseUrl}/hudhud_logo.png`

  const title = epigraph.title 
    ? `${epigraph.title} - Hudhud` 
    : `Epigraph ${epigraph.dasi_id} - Hudhud`

  let description = ""
  if (epigraph.epigraph_text) {
    const cleanText = epigraph.epigraph_text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    description = cleanText.length > 150 
      ? `${cleanText.substring(0, 147)}...` 
      : cleanText
  }

  const contextParts = []
  if (epigraph.language_level_1) {
    contextParts.push(epigraph.language_level_1)
  }
  if (epigraph.period) {
    contextParts.push(epigraph.period)
  }
  if (epigraph.sites_objs && epigraph.sites_objs.length > 0 && epigraph.sites_objs[0].modern_name) {
    contextParts.push(`from ${epigraph.sites_objs[0].modern_name}`)
  }

  const context = contextParts.length > 0 ? ` (${contextParts.join(', ')})` : ""

  if (!description) {
    description = `Ancient South Arabian inscription ${epigraph.dasi_id}${context}. Explore this epigraph with AI-powered search, interactive maps, and comprehensive analysis.`
  } else {
    description = `${description}${context} - Ancient South Arabian inscription from DASI database.`
  }

  let image = fallbackImage
  if ((epigraph as any).images && Array.isArray((epigraph as any).images)) {
    const images = (epigraph as any).images as any[]
    for (const img of images) {
      if (img.copyright_free) {
        image = `${baseUrl}/public/images/rec_${img.image_id}_high.jpg`
        if (img.is_main) {
          break
        }
      }
    }
  }

  return {
    title,
    description,
    url: `${baseUrl}/epigraphs/${epigraph.dasi_id}`,
    image,
    type: "article"
  }
}

export const generateEpigraphsListMetaTags = (searchParams?: URLSearchParams): MetaTagsData => {
  const baseUrl = import.meta.env.VITE_BASE_URL
  let title = "Browse Epigraphs - Hudhud"
  let description = "Browse and search through thousands of Ancient South Arabian inscriptions with advanced filtering, interactive maps, and AI-powered analysis."
  
  // If there are search parameters, customize the meta tags
  if (searchParams) {
    const searchQuery = searchParams.get('search')
    const period = searchParams.get('period')
    const language = searchParams.get('language_level_1')
    
    const filters = []
    if (period) filters.push(period)
    if (language) filters.push(language)
    
    if (searchQuery) {
      title = `Search results for "${searchQuery}" - Epigraphs - Hudhud`
      description = `Search results for "${searchQuery}" in Ancient South Arabian inscriptions. ${filters.length > 0 ? `Filtered by: ${filters.join(', ')}.` : ''} Explore with AI-powered analysis and interactive maps.`
    } else if (filters.length > 0) {
      title = `${filters.join(', ')} Epigraphs - Hudhud`
      description = `Browse ${filters.join(', ')} Ancient South Arabian inscriptions with advanced search, interactive maps, and comprehensive analysis.`
    }
  }
  
  return {
    title,
    description,
    url: `${baseUrl}/epigraphs${searchParams ? `?${searchParams.toString()}` : ''}`,
    image: `${baseUrl}/hudhud_logo.png`,
    type: "website"
  }
}

export const generateEpigraphStructuredData = (epigraph: EpigraphOut) => {
  const baseUrl = import.meta.env.VITE_BASE_URL
  
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "name": epigraph.title || `Epigraph ${epigraph.dasi_id}`,
    "description": epigraph.epigraph_text 
      ? epigraph.epigraph_text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : `Ancient South Arabian inscription ${epigraph.dasi_id}`,
    "url": `${baseUrl}/epigraphs/${epigraph.dasi_id}`,
    "identifier": epigraph.dasi_id,
    "creator": {
      "@type": "Organization", 
      "name": "Sheba's Caravan - Hudhud Project",
    },
    "dateCreated": epigraph.period || "Unknown period",
    "inLanguage": epigraph.language_level_1 || "Ancient South Arabian",
    "material": epigraph.objects?.[0]?.materials || "Stone",
    "locationCreated": epigraph.sites_objs?.[0]?.modern_name 
      ? {
          "@type": "Place",
          "name": epigraph.sites_objs[0].modern_name,
          ...(epigraph.sites_objs[0].coordinates && {
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": epigraph.sites_objs[0].coordinates[1],
              "longitude": epigraph.sites_objs[0].coordinates[0]
            }
          })
        }
      : undefined,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/epigraphs/${epigraph.dasi_id}`
    },
    "isPartOf": {
      "@type": "Collection",
      "name": "Hudhud - Ancient South Arabian Inscriptions Database"
    }
  }
}

export const getDefaultMetaTags = (): MetaTagsData => {
  const baseUrl = import.meta.env.VITE_BASE_URL
  return {
    title: "Hudhud - Explore Ancient South Arabian Inscriptions",
    description: "Search, visualise, and discover Ancient South Arabian texts with AI-powered exploration, interactive maps, timeline views, and advanced search across DASI's comprehensive inscription database.",
    url: `${baseUrl}/`,
    image: `${baseUrl}/hudhud_logo.png`,
    type: "website"
  }
}
