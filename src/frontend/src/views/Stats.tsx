import React from "react"
import { useState, useEffect } from "react"
import ReactECharts from "echarts-for-react"
import { AnalyticsService } from "../client"

const Stats: React.FC = () => {
  // const [counts, setCounts] = useState(null)
  const [translatedStatusDistribution, setTranslatedStatusDistribution] = useState<any>(null)
  const [periodDistribution, setPeriodDistribution] = useState<any>(null)
  const [activityDistribution, setActivityDistribution] = useState<any>(null)
  // const [periodScriptTypologyDistribution, setPeriodScriptTypologyDistribution] = useState<any>(null)
  const [scriptTypologyDistribution, setScriptTypologyDistribution] = useState<any>(null)
  const [writingTechniques, setWritingTechniques] = useState<any>(null)
  const [calendar, setCalendar] = useState<any>(null)

  useEffect(() => {
    AnalyticsService.analyticsTranslatedStatusDistribution().then((res) => {
      setTranslatedStatusDistribution(res)
    })
    AnalyticsService.analyticsPeriodDistribution().then((res) => {
      setPeriodDistribution(res)
    })
    AnalyticsService.analyticsActivityDistribution().then((res) => {
      setActivityDistribution(res)
    })
    AnalyticsService.analyticsCalendarHeatmap().then((res) => {
      setCalendar(res)
    })

    
    // AnalyticsService.analyticsPeriodScriptTypologyDistribution().then((res) => {
    //   setPeriodScriptTypologyDistribution(res)
    // })


    AnalyticsService.analyticsScriptTypologyDistribution().then((res) => {
      setScriptTypologyDistribution(res)
    })



    // AnalyticsService.analyticsPeriodWritingTechniquesDistribution().then((res) => {
    //   setPeriodWritingTechniques(res)
    // })
    AnalyticsService.analyticsWritingTechniquesDistribution().then((res) => {
      setWritingTechniques(res)
    })
    // EpigraphsService.epigraphsAnalyzeWords().then((res) => {
    //   setWords(res)
    // })
    // EpigraphsService.epigraphsAnalyzeWritingTechniques().then((res) => {
    //   setPeriodWritingTechniques(res)
    // })
  }, [])

  const getOption = (data: any, title: string) => {
    if (!data) {
      return {}
    }
    return {
      title: {
        text: title,
        padding: [0, 0, 20, 0]
      },
      tooltip: {},
      legend: {
        data: data.legend,
        top: "bottom",
        bottom: 0,
      },
      xAxis: {
        data: data.xAxis,
      },
      yAxis: {},
      series: data.series,
      grid: {
        top: 50,
        bottom: 50,
        containLabel: true,
      }
    }
  }

  const getCalendarOption = (data: any, title: string) => {
    const years = Object.keys(data).sort()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const heatmapData = years.flatMap((year, yIndex) => 
      data[year].map((value: number, mIndex: number) => [mIndex, yIndex, value])
    )
    
    return {
      title: {
        text: title,
        left: "center"
      },
      tooltip: {
        position: "top",
        formatter: function (params: any) {
          const month = months[params.data[0]]
          const year = years[params.data[1]]
          return `${month} ${year}: ${params.data[2]} publications`
        }
      },
      grid: {
        height: "50%",
        top: 90,
        bottom: 50,
        right: 60,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: "category",
        data: years,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: Math.max(...Object.values(data).flat() as number[]),
        calculable: true,
        orient: "horizontal",
        left: "center",
        top: 35,
        inRange: {
          color: ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"]
        }
      },
      series: [{
        name: "Publications",
        type: "heatmap",
        data: heatmapData,
        label: {
          show: false,
          // formatter: function(params: any) {
          //   return params.data[2] > 0 ? params.data[2] : ""
          // }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)"
          }
        }
      }]
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* <div className="flex justify-center gap-2 pb-4">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            width="48"
            height="48"
            viewBox="0 0 238 231"
            className="fill-current -translate-y-3 h-full scale-[2.8]"
          >
            <path d="m 175.6,202.4 c -0.3,-2.4 -4.7,-6.5 -6.3,-8.2 -1.9,-2.1 -4.1,-4 -6,-6.1 -1.7,-1.9 -3.9,-3.3 -5.4,-5.4 -1.9,-2.6 -3.5,-5.5 -5.2,-8.2 -0.8,-1.3 -1.7,-2.6 -2.4,-3.9 -0.8,-1.6 -0.2,-2.5 -0.6,-3.9 -0.6,-2.2 -3.6,-5.5 -4.9,-7.5 -3.5,-5.5 -6.2,-10.6 -10,-15.9 -1.7,-2.3 -3.2,-4.1 -3.4,-7 -0.2,-3.2 -1.3,-5.5 -2.9,-8.3 -3.3,-5.4 -8,-9.5 -10.1,-15.5 -2,-5.5 -1.9,-12.3 -1.1,-18 0.4,-2.8 0.6,-5.5 1.1,-8.3 0.3,-1.5 0.6,-3.1 0.8,-4.6 0.1,-1.4 -0.2,-2.7 -0.1,-4 0.1,-1.6 0.9,-2.9 0.9,-4.6 0,-1.7 -0.6,-2 1.6,-2.9 3.1,-1.3 7.4,-1.5 10.8,-2 3.2,-0.5 6.5,-0.7 9.6,-1.7 1.4,-0.5 3.1,-0.9 3.1,-2.6 0,-1.9 -2.1,-2.1 -3.8,-1.8 1.6,-1 2,-2.8 0.6,-3.8 -1.1,-0.8 -3.4,-0.4 -4.6,-0.4 0.9,-1.6 1.1,-2.3 2.5,-3.3 1.5,-1.1 3.4,-1.6 4.8,-2.7 1.1,-0.9 2.3,-2.2 1,-3.1 -1.3,-0.9 -3.8,0.6 -4.9,1.1 1.2,-1.4 1.8,-3.1 -0.5,-3.4 -1.7,-0.2 -2.5,0.9 -3.5,2 0.5,-2.3 2.7,-2.3 3.7,-3.9 1.5,-2.5 -2.2,-2.2 -3.8,-2 -3.7,0.4 -7.3,2.1 -11,2.8 1.7,-2.5 3.5,-4.8 5.3,-7.2 1.5,-2 3.7,-3.9 4.3,-6.4 1.2,-4.5 -4.1,-1 -5.8,0.2 -2.4,1.7 -4.5,4 -7,5.3 1.4,-2.4 1.8,-3.5 -0.2,-5.5 -0.3,-0.3 -0.8,0.2 -1.3,-0.4 -0.3,-0.3 0.4,-0.8 0,-1.2 -1,-1 -0.8,-1.4 -2.4,-1.2 -3.7,0.5 -7.4,5 -9.7,7.5 -1.5,-2.3 -2.5,-4 -2.7,-6.8 -0.1,-1.8 1.1,-6.8 -0.2,-8.1 -3.4,-3.6 -6.5,9.4 -6.9,11.2 -1.3,-2.7 -3.1,-5.7 -5.7,-2.5 -2.1,2.5 -1.5,5.4 -1.2,8.4 -2.2,-1.1 -5.8,-8.1 -7.7,-3.2 -1.3,3.4 1.3,6 1.7,9.2 -1.2,-0.7 -2.5,-1.3 -3.4,-0.4 -1.1,1 -0.5,2.7 0.2,3.7 -2.6,-0.7 0.1,3.6 0.5,4.7 -3.2,-0.2 -1.8,1.4 -2.4,3.3 -0.5,1.6 -2.4,1.5 -1.4,4 0.9,2.2 3.1,3.5 5,4.6 1.4,0.8 4.9,1.6 4.6,3.5 -10.8,1.9 -22,3.6 -32.1,7.9 -1.1,0.5 -7.7,3.8 -3.9,4.6 0.7,0.1 2.2,-0.7 2.8,-0.9 2.1,-0.7 4.2,-1.4 6.4,-2.1 5.6,-1.9 11.4,-2.4 17.3,-3.2 2.4,-0.4 4.6,-0.4 7,-0.3 1.2,0 2.7,-0.2 3.6,0.4 0.8,0.5 2.1,2.6 2.7,3.3 3.4,5 1.7,9.6 -0.4,14.7 -2.6,6.2 -5.5,12.3 -8.3,18.4 -0.8,1.9 -1.6,4.2 -2.9,5.9 -1.7,2.2 -3.7,3 -4.5,5.8 -1.6,6 0.3,13.2 1.9,19.1 1,3.5 2.2,5.8 4.7,8.7 1.9,2.2 4.2,3.6 5.8,6.1 0.1,-0.2 0.2,-0.5 0.4,-0.8 0.2,1.3 1.4,4.9 3.1,3.2 0.7,1.8 1.4,3.3 2.4,4.9 0.1,-0.4 0.5,-0.7 0.6,-1.1 2.6,2.1 4.8,7.6 5.3,10.8 0.7,4.6 0.6,6.6 -1.8,10.5 -2.3,3.8 -3.8,7.9 -8.6,8.1 -3.4,0.2 -8.5,-1.1 -9.7,3.4 1.7,-1.1 3.6,-0.2 5.6,-0.3 1.7,-0.1 3.7,0 5.4,-0.3 2,-0.3 3.5,-1.3 5.6,-0.8 2.4,0.5 3.4,1.6 5.9,1.6 3.9,-0.1 7.9,0.6 11.8,0.2 0.8,-0.1 1.5,-0.5 2.4,-0.5 1.1,0 2.4,0.8 3.5,1.1 1.7,0.4 4.1,1.2 5.8,0.6 -2.3,-1 -4.4,-1.1 -6.5,-2.5 -2.5,-1.6 -2.5,-2.6 -1.8,-5.4 0.7,-2.7 1.7,-5.2 3,-7.6 0.3,-0.6 1.1,-2.9 1.3,-3.1 0.6,-0.5 1.9,-0.2 3,-0.4 -0.9,-0.5 -1.7,-1.2 -2.5,-1.9 4.8,1.8 11,1.1 15.1,4.5 4.5,3.8 8.2,8.7 12.7,12.6 2.2,1.9 4.2,3.8 6.3,5.8 1.7,1.6 3.4,4.2 5.5,4.9 1,0.3 3.4,0.6 4.5,0.3 1.3,-0.3 1.5,-0.9 2.9,-0.9 0.2,0 1.1,0.8 1.5,0.9 0.5,0.1 1.5,0.1 1.9,0 1.8,-0.2 2,0 1.7,-1.8z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <h1 className="text-[34px] font-semibold tracking-tighter -translate-x-5">Hudhud</h1>
          <h1 className="text-4xl font-semibold tracking-tighter">𐩠 𐩵 𐩠 𐩵</h1>
        </div>
      </div> */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4"> 
        {translatedStatusDistribution && (
          <div className="w-full min-h-[250px]">
            <ReactECharts
              option={getOption(translatedStatusDistribution, "Translated Status Distribution")}
              style={{ height: "100%", minHeight: "250px", width: "100%" }}
            />
          </div>
        )}
        {periodDistribution && (
          <div className="w-full min-h-[250px]">
            <ReactECharts 
              option={getOption(periodDistribution, "Period Distribution")}
              style={{ height: "100%", minHeight: "250px", width: "100%" }}
            />
          </div>
        )}
        {activityDistribution && (
          <div className="w-full min-h-[250px]">
            <ReactECharts
              option={getOption(activityDistribution, "Activity Distribution")}
              style={{ height: "100%", minHeight: "250px", width: "100%" }}
            />
          </div>
        )}
        {calendar && (
          <div className="w-full min-h-[250px]">
          <ReactECharts 
            option={getCalendarOption(calendar, "Publication Activity")} 
            style={{ height: "100%", minHeight: "250px", width: "100%" }} 
            />
          </div>
        )}

        {/* {periodScriptTypologyDistribution && (
          <div className="w-full min-h-[250px]">
          <ReactECharts
            option={getOption(periodScriptTypologyDistribution, "Script Typology Distribution")}
            style={{ height: "100%", minHeight: "250px", width: "100%" }} 
            />
          </div>
        )} */}
        {scriptTypologyDistribution && (
          <div className="w-full min-h-[250px]">
          <ReactECharts
            option={getOption(scriptTypologyDistribution, "Script Typology Distribution")}
            style={{ height: "100%", minHeight: "250px", width: "100%" }} 
            />
          </div>
        )}
        {writingTechniques && (
          <div className="w-full min-h-[250px]">
          <ReactECharts
            option={getOption(writingTechniques, "Writing Techniques")}
            style={{ height: "100%", minHeight: "250px", width: "100%" }} 
            />
          </div>
        )}
        {/* {counts && (
          <ReactECharts option={getOption(counts, "Epigraphs Counts")} style={{ height: 500, width: 500 }} />
        )} */}
        {/* {words && (
          <ReactECharts option={words} style={{ height: 500, width: 500 }} />
        )} */}
        {/* {periodWritingTechniques && (
          <ReactECharts option={getOption(periodWritingTechniques, "Writing Techniques")} style={{ height: 500, width: 500 }} />
        )} */}
      </div>
    </div>
  )
}

export default Stats