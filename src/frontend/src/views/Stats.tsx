"use client"

import React, { useEffect, useState } from "react"
import ReactECharts from "echarts-for-react"

interface AnalyticsChart {
  legend: string[]
  xAxis: string[]
  series: Array<{
    name: string
    type: string
    data: number[]
    smooth?: boolean
    stack?: string
  }>
}

interface AnalyticsOverview {
  summary: {
    epigraphsTotal: number
    publishedEpigraphs: number
    translatedEpigraphs: number
    sitesTotal: number
    mappedSites: number
    wordsTotal: number
    objectsTotal: number
    translationCoveragePercent: number
    knownPeriodCoveragePercent: number
    coordinateCoveragePercent: number
  }
  charts: {
    translationCoverage: AnalyticsChart
    periodDistribution: AnalyticsChart
    languageDistribution: AnalyticsChart
    textualTypologyDistribution: AnalyticsChart
    writingTechniqueDistribution: AnalyticsChart
    mappedCountryDistribution: AnalyticsChart
    mappedSiteTypeDistribution: AnalyticsChart
    publicationCalendar: Record<string, number[]>
  }
}

interface BarChartOptions {
  bottomPadding?: number
  xAxisLabelMargin?: number
  xAxisLabelRotate?: number
  xAxisWrapLength?: number
}

const chartCardClass = "w-full min-h-[320px] rounded-md border border-gray-200 bg-white p-3"
const chartPalette = ["#0f766e", "#0284c7", "#b45309", "#7c3aed", "#be123c", "#475569"]
const chartSeriesColorMap: Record<string, string> = {
  Epigraphs: "#0f766e",
  "Mapped sites": "#0284c7",
  Publications: "#0f766e",
  Translated: "#27cf35",
  Untranslated: "#717278",
}

function getChartColor(seriesName: string, index: number): string {
  return chartSeriesColorMap[seriesName] ?? chartPalette[index % chartPalette.length]
}

function wrapAxisLabel(label: string, maxLineLength: number): string {
  if (label.length <= maxLineLength) {
    return label
  }

  const words = label.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return label
  }

  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxLineLength) {
      currentLine = nextLine
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    if (word.length <= maxLineLength) {
      currentLine = word
      continue
    }

    const chunks = word.match(new RegExp(`.{1,${maxLineLength}}`, "g")) ?? [word]
    lines.push(...chunks.slice(0, -1))
    currentLine = chunks[chunks.length - 1] ?? ""
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.join("\n")
}

function getBarChartHeight(data: AnalyticsChart, horizontal: boolean): number {
  if (!horizontal) {
    const maxLabelLength = Math.max(0, ...data.xAxis.map((label) => label.length))
    return Math.max(320, data.xAxis.length > 8 || maxLabelLength > 16 ? 380 : 320)
  }

  const wrappedLineCount = data.xAxis.reduce((total, label) => total + wrapAxisLabel(label, 18).split("\n").length, 0)
  return Math.max(320, wrappedLineCount * 28 + 112)
}

const Stats: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/v1/analytics/overview")
        if (!response.ok) {
          throw new Error(`Failed to load analytics (${response.status})`)
        }

        const payload = (await response.json()) as AnalyticsOverview
        if (isMounted) {
          setOverview(payload)
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load analytics")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchOverview()

    return () => {
      isMounted = false
    }
  }, [])

  const getBarOption = (data: AnalyticsChart, title: string, horizontal = false, options: BarChartOptions = {}) => {
    const hasLegend = data.legend.length > 1
    const maxLabelLength = Math.max(0, ...data.xAxis.map((label) => label.length))
    const bottomPadding = options.bottomPadding ?? 24
    const xAxisLabelRotate = options.xAxisLabelRotate ?? (data.xAxis.length > 6 || maxLabelLength > 12 ? 28 : 0)
    const xAxisLabelMargin = options.xAxisLabelMargin ?? 8
    const xAxisWrapLength = options.xAxisWrapLength ?? (maxLabelLength > 18 ? 10 : 12)

    return {
      title: {
        text: title,
        padding: [6, 0, 18, 0],
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      ...(hasLegend
        ? {
            legend: {
              data: data.legend,
              bottom: 2,
              itemHeight: 10,
              itemWidth: 10,
              left: "center",
              padding: 0,
              textStyle: {
                fontSize: 14,
              },
            },
          }
        : {}),
      color: data.series.map((series, index) => getChartColor(series.name, index)),
      xAxis: horizontal
        ? {
            type: "value",
          }
        : {
            type: "category",
            data: data.xAxis,
            axisLabel: {
              interval: 0,
              margin: xAxisLabelMargin,
              rotate: xAxisLabelRotate,
              formatter: (value: string) => wrapAxisLabel(value, xAxisWrapLength),
              hideOverlap: false,
            },
          },
      yAxis: horizontal
        ? {
            type: "category",
            data: data.xAxis,
            inverse: true,
            axisLabel: {
              interval: 0,
              formatter: (value: string) => wrapAxisLabel(value, 18),
              width: 120,
            },
          }
        : {
            type: "value",
          },
      series: data.series.map((series) => ({
        ...series,
        barMaxWidth: horizontal ? 18 : data.series.length > 1 ? 42 : 56,
        itemStyle: {
          color: getChartColor(series.name, data.series.findIndex((item) => item.name === series.name)),
        },
      })),
      grid: {
        top: 56,
        left: horizontal ? 132 : 44,
        right: 20,
        bottom: hasLegend ? bottomPadding : Math.max(bottomPadding - 24, 28),
        containLabel: true,
      },
    }
  }

  const getPieOption = (data: AnalyticsChart, title: string) => {
    const counts = data.series[0]?.data ?? []
    const pieData = data.xAxis.map((label, index) => ({
      name: label,
      value: counts[index] ?? 0,
      itemStyle: {
        color: getChartColor(label, index),
      },
    }))

    return {
      title: {
        text: title,
        padding: [6, 0, 18, 0],
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        bottom: 0,
        itemHeight: 9,
        itemWidth: 9,
        itemGap: 12,
        left: "center",
        padding: 0,
        textStyle: {
          fontSize: 12,
        },
      },
      series: [
        {
          name: data.legend[0] ?? title,
          type: "pie",
          radius: ["30%", "52%"],
          center: ["50%", "47%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          data: pieData,
        },
      ],
    }
  }

  const getCalendarOption = (data: Record<string, number[]>, title: string) => {
    const years = Object.keys(data).sort()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const heatmapData = years.flatMap((year, yearIndex) =>
      data[year].map((value: number, monthIndex: number) => [monthIndex, yearIndex, value]),
    )
    const maxValue = Math.max(1, ...Object.values(data).flat())

    return {
      title: {
        text: title,
        left: "center",
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
        },
      },
      tooltip: {
        position: "top",
        formatter(params: { data: [number, number, number] }) {
          const month = months[params.data[0]]
          const year = years[params.data[1]]
          return `${month} ${year}: ${params.data[2]} publications`
        },
      },
      grid: {
        height: "52%",
        top: 88,
        bottom: 48,
        right: 48,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        splitArea: {
          show: true,
        },
      },
      yAxis: {
        type: "category",
        data: years,
        splitArea: {
          show: true,
        },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: "horizontal",
        left: "center",
        top: 34,
        inRange: {
          color: ["#f3f6f4", "#9aefa4", "#5cd881", "#30db74", "#078023"],
        },
      },
      series: [
        {
          name: "Publications",
          type: "heatmap",
          data: heatmapData,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(15, 23, 42, 0.25)",
            },
          },
        },
      ],
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900" />
        </div>
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Analytics data is unavailable right now."}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Corpus statistics</h1>
        <p className="text-md leading-6 text-gray-600">
          These figures provide an overview of the current state of the epigraphic corpus as represented in the database.
          They are based on the most recent data available and will be updated periodically as new inscriptions are published and added to the database.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-3">
        {/* <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">All epigraphs</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{overview.summary.epigraphsTotal.toLocaleString()}</div>
        </div> */}
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Epigraphs</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{overview.summary.publishedEpigraphs.toLocaleString()}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">With translations</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{overview.summary.translatedEpigraphs.toLocaleString()}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped sites</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{overview.summary.mappedSites.toLocaleString()}</div>
        </div>
        {/* <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Word records</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{overview.summary.wordsTotal.toLocaleString()}</div>
        </div> */}
        {/* <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Object records</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{overview.summary.objectsTotal.toLocaleString()}</div>
        </div> */}
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Translation coverage</div>
          <div className="mt-1 text-md">{overview.summary.translationCoveragePercent}% of published inscriptions include at least one translation.</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Period coverage</div>
          <div className="mt-1 text-md">{overview.summary.knownPeriodCoveragePercent}% of published inscriptions have a known period.</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped site coverage</div>
          <div className="mt-1 text-md">{overview.summary.coordinateCoveragePercent}% of site records include usable coordinates.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={chartCardClass}>
          <ReactECharts
            notMerge
            option={getPieOption(overview.charts.translationCoverage, "Translation coverage")}
            style={{ height: 320, width: "100%" }}
          />
        </div>
        <div className={chartCardClass}>
          <ReactECharts
            option={getBarOption(overview.charts.periodDistribution, "Known period distribution by translation status")}
            style={{ height: getBarChartHeight(overview.charts.periodDistribution, false), width: "100%" }}
          />
        </div>
        <div className={chartCardClass}>
          <ReactECharts
            option={getBarOption(overview.charts.languageDistribution, "Language families by translation status", false, {
              bottomPadding: 12,
              xAxisLabelMargin: 16,
              xAxisLabelRotate: 66,
              xAxisWrapLength: 14,
            })}
            style={{ height: getBarChartHeight(overview.charts.languageDistribution, false), width: "100%" }}
          />
        </div>
        <div className={chartCardClass}>
          <ReactECharts
            option={getBarOption(overview.charts.textualTypologyDistribution, "Textual typology by translation status", false, {
              bottomPadding: 12,
              xAxisLabelMargin: 16,
              xAxisLabelRotate: 66,
              xAxisWrapLength: 14,
            })}
            style={{ height: getBarChartHeight(overview.charts.textualTypologyDistribution, false), width: "100%" }}
          />
        </div>
        <div className={chartCardClass}>
          <ReactECharts
            option={getBarOption(overview.charts.writingTechniqueDistribution, "Writing techniques by translation status")}
            style={{ height: getBarChartHeight(overview.charts.writingTechniqueDistribution, false), width: "100%" }}
          />
        </div>
        {/* <div className={chartCardClass}>
          <ReactECharts
            option={getBarOption(overview.charts.mappedCountryDistribution, "Mapped sites by country")}
            style={{ height: getBarChartHeight(overview.charts.mappedCountryDistribution, false), width: "100%" }}
          />
        </div> */}
        {/* <div className={chartCardClass}>
          <ReactECharts
            option={getBarOption(overview.charts.mappedSiteTypeDistribution, "Mapped site types", false, {
              bottomPadding: 12,
              xAxisLabelMargin: 16,
              xAxisLabelRotate: 66,
              xAxisWrapLength: 14,
            })}
            style={{ height: getBarChartHeight(overview.charts.mappedSiteTypeDistribution, false), width: "100%" }}
          />
        </div> */}
        <div className={chartCardClass}>
          <ReactECharts
            option={getCalendarOption(overview.charts.publicationCalendar, "Publication activity")}
            style={{ height: 320, width: "100%" }}
          />
        </div>
      </div>
    </div>
  )
}

export default Stats