import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { EpigraphsService, EpigraphsOut } from "../client"
import { EpigraphCard } from "../components/EpigraphCard"
import { Spinner } from "../components/Spinner"
import { MySelect, MyItem } from "../components/Select"

const Epigraphs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [epigraphs, setEpigraphs] = useState<EpigraphsOut | null>(null)
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") || 1))
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize") || 25))
  const [sortField, setSortField] = useState(searchParams.get("sort") || "period")
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "asc")
  const [isLoading, setIsLoading] = useState(false)

  const fetchEpigraphs = async (page: number = 1, size: number = pageSize, sort: string = sortField, order: string = sortOrder) => {
    try {
      setIsLoading(true)
      setSearchParams({ 
        page: page.toString(),
        pageSize: size.toString(),
        sort: sort,
        order: order
      })
      
      const result = await EpigraphsService.epigraphsReadEpigraphs({
        skip: (page - 1) * size,
        limit: size,
        sortField: sort,
        sortOrder: order,
        filters: JSON.stringify({
          dasi_published: true,
        }),
      })
      setEpigraphs(result)
      setCurrentPage(page)
      setPageSize(size)
      setSortField(sort)
      setSortOrder(order)
    } catch (error) {
      console.error("Error fetching epigraphs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const page = Number(searchParams.get("page")) || 1
    const size = Number(searchParams.get("pageSize")) || 25
    const sort = searchParams.get("sort") || "period"
    const order = searchParams.get("order") || "asc"
    fetchEpigraphs(page, size, sort, order)
  }, [])

  const handlePageSizeChange = (newSize: number) => {
    const currentFirstItem = (currentPage - 1) * pageSize + 1
    const newPage = Math.ceil(currentFirstItem / newSize)
    fetchEpigraphs(newPage, newSize, sortField, sortOrder)
  }

  const handleSortChange = (newSort: string) => {
    fetchEpigraphs(1, pageSize, newSort, sortOrder)
  }

  const handleOrderChange = (newOrder: string) => {
    fetchEpigraphs(1, pageSize, sortField, newOrder)
  }

  const renderPagination = () => {
    if (!epigraphs) return null
    const totalPages = Math.ceil(epigraphs.count / pageSize)
    return (
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-end gap-4">
        <div className="sm:flex-1"></div>
        
        <div className="flex gap-2">
          <button
            onClick={() => fetchEpigraphs(currentPage - 1, pageSize, sortField, sortOrder)}
            disabled={currentPage <= 1 || isLoading}
            className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchEpigraphs(currentPage + 1, pageSize, sortField, sortOrder)}
            disabled={currentPage >= totalPages || isLoading}
            className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-end gap-2 sm:flex-1 sm:justify-end">
          <MySelect
            label="Results per page"
            selectedKey={pageSize.toString()}
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                handlePageSizeChange(Number(key))
              }
            }}
            buttonClassName="h-8 max-h-8"
          >
            <MyItem key="10" id="10">10</MyItem>
            <MyItem key="25" id="25">25</MyItem>
            <MyItem key="50" id="50">50</MyItem>
            <MyItem key="100" id="100">100</MyItem>
            <MyItem key="200" id="200">200</MyItem>
            <MyItem key="500" id="500">500</MyItem>
            <MyItem key="1000" id="1000">1000</MyItem>
          </MySelect>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Epigraphs</h1>

      <div className="flex justify-between items-end gap-2 mb-6">
        <div>
          {epigraphs && (
            <p>Showing {Math.min(pageSize, epigraphs.epigraphs.length)} of {epigraphs.count} total epigraphs</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <MySelect
            label="Sort By"
            selectedKey={sortField}
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                handleSortChange(key)
              }
            }}
            buttonClassName="h-8 max-h-8"
          >
            <MyItem key="period" id="period">Period</MyItem>
            <MyItem key="dasi_id" id="dasi_id">DASI ID</MyItem>
            <MyItem key="title" id="title">Title</MyItem>
            <MyItem key="language_level_1" id="language_level_1">Language</MyItem>
          </MySelect>

          <MySelect
            label="Sort Order"
            selectedKey={sortOrder}
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                handleOrderChange(key)
              }
            }}
            buttonClassName="h-8 max-h-8"
          >
            <MyItem key="asc" id="asc">Ascending</MyItem>
            <MyItem key="desc" id="desc">Descending</MyItem>
          </MySelect>
        </div>
      </div>

      {epigraphs && !isLoading ? (
        <div>
          <div className="space-y-4">
            {epigraphs.epigraphs.map((epigraph) => (
              <EpigraphCard
                key={epigraph.id}
                epigraph={epigraph}
                notes={true}
                bibliography={true}
              />
            ))}
          </div>
          {renderPagination()}
        </div>
      ) : (
        <div className="flex justify-center">
          <Spinner size="w-10 h-10" colour="#666" />
        </div>
      )}
    </div>
  )
}

export default Epigraphs