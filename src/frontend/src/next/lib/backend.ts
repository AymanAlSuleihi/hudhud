import type { EpigraphOut, EpigraphsOut } from "../../client"

type BackendFetchInit = RequestInit & {
  next?: {
    revalidate?: number
    tags?: string[]
  }
}

const backendOrigin = (
  process.env.HUDHUD_INTERNAL_API_ORIGIN ??
  process.env.HUDHUD_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ??
  "http://localhost:8081"
).replace(/\/$/, "")

export class BackendRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "BackendRequestError"
    this.status = status
  }
}

function buildBackendUrl(path: string) {
  return `${backendOrigin}${path.startsWith("/") ? path : `/${path}`}`
}

export async function fetchBackendJson<T>(path: string, init: BackendFetchInit = {}): Promise<T> {
  const response = await fetch(buildBackendUrl(path), {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new BackendRequestError(
      `Backend request failed for ${path} with status ${response.status}`,
      response.status,
    )
  }

  return response.json() as Promise<T>
}

export async function getEpigraphByDasiId(
  dasiId: string | number,
  revalidateSeconds = 3600,
): Promise<EpigraphOut> {
  return fetchBackendJson<EpigraphOut>(`/api/v1/epigraphs/dasi_id/${dasiId}`, {
    next: {
      revalidate: revalidateSeconds,
    },
  })
}

export async function getEpigraphStaticParams(limit = 100): Promise<Array<{ urlKey: string }>> {
  const filters = encodeURIComponent(JSON.stringify({ dasi_published: true }))

  try {
    const epigraphs = await fetchBackendJson<EpigraphsOut>(
      `/api/v1/epigraphs/?limit=${limit}&sort_field=dasi_id&sort_order=asc&filters=${filters}`,
      {
        next: {
          revalidate: 86400,
        },
      },
    )

    return (epigraphs.epigraphs ?? []).map((epigraph) => ({
      urlKey: String(epigraph.dasi_id),
    }))
  } catch {
    return []
  }
}