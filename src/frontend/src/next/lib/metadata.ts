import type { Metadata } from "next"
import type { EpigraphOut } from "../../client"
import { absoluteUrl, defaultDescription, getDefaultOgImage, siteName } from "./site"

interface PageMetadataInput {
  title: string
  description: string
  path: string
  image?: string
  type?: "website" | "article"
}

function cleanText(text: string) {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export function createPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path)
  const socialImage = image ?? getDefaultOgImage()
  const socialTitle = `${title} | ${siteName}`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      url: canonical,
      title: socialTitle,
      description,
      images: [socialImage],
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage],
    },
  }
}

export function createDefaultMetadata(): Metadata {
  return createPageMetadata({
    title: "Explore Ancient South Arabian Inscriptions",
    description: defaultDescription,
    path: "/",
  })
}

export function createEpigraphMetadata(epigraph: EpigraphOut): Metadata {
  const title = epigraph.title || `Epigraph ${epigraph.dasi_id}`
  const textDescription = epigraph.epigraph_text ? cleanText(epigraph.epigraph_text) : ""
  const location = epigraph.sites_objs?.[0]?.modern_name
  const description = textDescription
    ? `${textDescription.slice(0, 157)}${textDescription.length > 157 ? "..." : ""}`
    : `Ancient South Arabian inscription ${epigraph.dasi_id}${location ? ` from ${location}` : ""}.`
  const image = Array.isArray((epigraph as { images?: Array<{ image_id: string; copyright_free?: boolean; is_main?: boolean }> }).images)
    ? ((epigraph as { images?: Array<{ image_id: string; copyright_free?: boolean; is_main?: boolean }> }).images ?? [])
        .filter((imageItem) => imageItem.copyright_free)
        .sort((left, right) => Number(Boolean(right.is_main)) - Number(Boolean(left.is_main)))[0]
    : undefined

  return createPageMetadata({
    title,
    description,
    path: `/epigraphs/${epigraph.dasi_id}`,
    image: image ? absoluteUrl(`/public/images/rec_${image.image_id}_high.jpg`) : undefined,
    type: "article",
  })
}

export function createEpigraphStructuredData(epigraph: EpigraphOut): Record<string, unknown> {
  const coordinates = epigraph.sites_objs?.[0]?.coordinates
  const cleanDescription = epigraph.epigraph_text
    ? cleanText(epigraph.epigraph_text)
    : `Ancient South Arabian inscription ${epigraph.dasi_id}`

  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: epigraph.title || `Epigraph ${epigraph.dasi_id}`,
    description: cleanDescription,
    url: absoluteUrl(`/epigraphs/${epigraph.dasi_id}`),
    identifier: epigraph.dasi_id,
    creator: {
      "@type": "Organization",
      name: "Sheba's Caravan - Hudhud Project",
    },
    inLanguage: epigraph.language_level_1 || "Ancient South Arabian",
    dateCreated: epigraph.period || "Unknown period",
    material: epigraph.objects?.[0]?.materials || "Stone",
    locationCreated: epigraph.sites_objs?.[0]?.modern_name
      ? {
          "@type": "Place",
          name: epigraph.sites_objs[0].modern_name,
          ...(Array.isArray(coordinates) && coordinates.length === 2
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: coordinates[1],
                  longitude: coordinates[0],
                },
              }
            : {}),
        }
      : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/epigraphs/${epigraph.dasi_id}`),
    },
    isPartOf: {
      "@type": "Collection",
      name: `${siteName} - Ancient South Arabian Inscriptions Database`,
    },
  }
}