import { cache } from "react"
import type { Metadata } from "next"
import Epigraph from "../../../src/views/Epigraph"
import { PageFrame } from "../../../src/next/components/PageFrame"
import {
  createDefaultMetadata,
  createEpigraphMetadata,
  createEpigraphStructuredData,
} from "../../../src/next/lib/metadata"
import {
  BackendRequestError,
  getEpigraphByDasiId,
  getEpigraphStaticParams,
} from "../../../src/next/lib/backend"

export const revalidate = 3600

interface EpigraphPageProps {
  params: Promise<{
    urlKey: string
  }>
}

const loadEpigraph = cache(async (urlKey: string) => {
  const parsedId = Number(urlKey)

  if (!Number.isFinite(parsedId)) {
    return {
      epigraph: null,
      error: "The requested epigraph could not be found.",
    }
  }

  try {
    const epigraph = await getEpigraphByDasiId(parsedId, revalidate)

    return {
      epigraph,
      error: null,
    }
  } catch (error) {
    if (error instanceof BackendRequestError && error.status === 403) {
      return {
        epigraph: null,
        error: "This epigraph is not yet published.",
      }
    }

    if (error instanceof BackendRequestError && error.status === 404) {
      return {
        epigraph: null,
        error: "The requested epigraph does not exist.",
      }
    }

    return {
      epigraph: null,
      error: "Failed to load epigraph. Please try again.",
    }
  }
})

export async function generateStaticParams() {
  return getEpigraphStaticParams(100)
}

export async function generateMetadata({ params }: EpigraphPageProps): Promise<Metadata> {
  const { urlKey } = await params
  const { epigraph } = await loadEpigraph(urlKey)

  return epigraph ? createEpigraphMetadata(epigraph) : createDefaultMetadata()
}

export default async function EpigraphPage({ params }: EpigraphPageProps) {
  const { urlKey } = await params
  const { epigraph, error } = await loadEpigraph(urlKey)
  const structuredData = epigraph ? createEpigraphStructuredData(epigraph) : null

  return (
    <PageFrame>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      ) : null}
      <Epigraph
        initialUrlKey={urlKey}
        initialEpigraph={epigraph}
        initialError={error}
      />
    </PageFrame>
  )
}