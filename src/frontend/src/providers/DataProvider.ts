import { DataProvider, GetListParams, GetOneParams, CreateParams, UpdateParams, DeleteOneParams, BaseRecord, CreateResponse, UpdateResponse, DeleteOneResponse, GetOneResponse, GetListResponse } from "@refinedev/core"
import { EpigraphsService } from "../client"

const serviceMap: Record<string, EpigraphsService> = {
  epigraphs: EpigraphsService,
}

const methodMap: Record<string, Record<string, string>> = {
  epigraphs: {
    getList: "epigraphsReadEpigraphs",
    getOne: "epigraphsReadEpigraphById",
    create: "epigraphsCreateEpigraph",
    update: "epigraphsUpdateEpigraph",
    deleteOne: "epigraphsDeleteEpigraph",
  },
}

const singularResourceMap: Record<string, string> = {
  epigraphs: "epigraph",
}

const getServiceAndMethod = (resource: string, action: string) => {
  const service = serviceMap[resource]
  if (!service) {
    throw new Error(`No service found for resource: ${resource}`)
  }

  const methodName = methodMap[resource]?.[action]
  if (!methodName || typeof (service as Record<string, any>)[methodName] !== "function") {
    throw new Error(`Method ${action} not found for resource: ${resource}`)
  }

  return { service, methodName }
}

export const dataProvider: DataProvider = {
  getApiUrl: () => {
    return "https://hudhud.shebascaravan.com/api/v1"
  },

  getList: async <TData extends BaseRecord = {}> ({ resource, pagination, filters, sort }: GetListParams): Promise<GetListResponse<TData>> => {
    const { service, methodName } = getServiceAndMethod(resource, "getList")

    const sortField = sort?.[0]?.field
    const sortOrder = sort?.[0]?.order === "desc" ? "desc" : "asc"

    const response = await (service as Record<string, Function>)[methodName]({
      skip: ((pagination?.current ?? 1) - 1) * (pagination?.pageSize || 10),
      limit: pagination?.pageSize || 10,
      sortField: sortField,
      sortOrder: sortOrder,
      requestBody: filters,
    })

    const data = response[resource] || response || []

    return {
      data: data,
      total: response.count,
    }
  },

  getOne: async <TData extends BaseRecord = {}>({ resource, id }: GetOneParams): Promise<GetOneResponse<TData>> => {
    const { service, methodName } = getServiceAndMethod(resource, "getOne")

    const singularResource = singularResourceMap[resource] || resource.slice(0, -1)

    const data = await (service as Record<string, Function>)[methodName]({
      [`${singularResource}Id`]: id,
    })

    return { data }
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, variables }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    const { service, methodName } = getServiceAndMethod(resource, "create")

    const data = await (service as Record<string, Function>)[methodName]({
      requestBody: variables,
    })

    return { data: data as TData }
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id, variables }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    const { service, methodName } = getServiceAndMethod(resource, "update")

    const singularResource = singularResourceMap[resource] || resource.slice(0, -1)

    const data = await (service as Record<string, Function>)[methodName]({
      [`${singularResource}Id`]: id,
      requestBody: variables,
    })

    return { data: data as TData }
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    const { service, methodName } = getServiceAndMethod(resource, "deleteOne")

    const singularResource = singularResourceMap[resource] || resource.slice(0, -1)

    const data = await (service as Record<string, Function>)[methodName]({
      [`${singularResource}Id`]: id,
    })

    return { data: data as TData }
  },
}