
"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// #region Chart Types
const CHART_TYPES = {
  Area: RechartsPrimitive.AreaChart,
  Bar: RechartsPrimitive.BarChart,
  Line: RechartsPrimitive.LineChart,
  Composed: RechartsPrimitive.ComposedChart,
  Pie: RechartsPrimitive.PieChart,
  Radar: RechartsPrimitive.RadarChart,
  RadialBar: RechartsPrimitive.RadialBarChart,
  Scatter: RechartsPrimitive.ScatterChart,
  Funnel: RechartsPrimitive.FunnelChart,
  Treemap: RechartsPrimitive.Treemap,
  Sankey: RechartsPrimitive.Sankey,
}
// #endregion

// #region Chart Context
type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}
// #endregion

// #region Chart Container
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const chartContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleResize = () => {
      chartContainerRef.current?.dispatchEvent(new Event("resize"))
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={chartContainerRef}
        className={cn(
          "flex aspect-video justify-center gap-4 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-label_text]:fill-muted-foreground [&_.recharts-polar-axis-name_text]:fill-muted-foreground [&_.recharts-polar-grid_line]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-sector_path]:stroke-border [&_.recharts-surface]:overflow-visible",
          className
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"
// #endregion

// #region Chart-specific components
const ChartTooltip = RechartsPrimitive.Tooltip
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const item = payload?.[0]
    
    // Fallback to payload's x/y key if label is not provided
    const finalLabel = labelKey && item?.payload ? item.payload[labelKey] : label

    if (!active || !item) {
      return null
    }

    const categoryPayload =
      payload.length > 1
        ? payload
        : [
            {
              ...item,
              name: (nameKey && item.payload?.[nameKey]) || item.name,
            },
          ]

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!hideLabel && finalLabel ? (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter
              ? labelFormatter(finalLabel, payload)
              : finalLabel}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {categoryPayload.map((item, index) => {
            const itemConfig = config[item.dataKey as string]
            const indicatorColor = color || item.color || itemConfig?.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex items-center gap-2 font-medium [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
                )}
              >
                {!hideIndicator && (
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px]", {
                      "bg-[var(--color-indicator)]": indicator === "dot",
                      "h-1": indicator === "line",
                      "w-0 border-[1.5px] border-dashed bg-transparent":
                        indicator === "dashed",
                      "border-border": !indicatorColor,
                    })}
                    style={
                      {
                        "--color-indicator": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div className="flex flex-1 justify-between">
                  <span className="text-muted-foreground">
                    {itemConfig?.label || item.name}
                  </span>
                  <span>
                    {formatter && item.value != null
                      ? formatter(item.value, item.name || "", item, index, item.payload)
                      : item.value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"
const ChartLegend = RechartsPrimitive.Legend
const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload || !payload.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-4" : "pt-4",
          className
        )}
      >
        {payload.map((item: any) => {
          const key = (nameKey && item.payload?.[nameKey]) || (item.dataKey as string) || "value"
          const itemConfig = config[key]

          if (itemConfig?.hideLegend) {
            return null
          }

          return (
            <div
              key={item.value as string}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

const ChartGrid = RechartsPrimitive.CartesianGrid

// #endregion

// #region Axis
const ChartXAxis = RechartsPrimitive.XAxis
const ChartYAxis = RechartsPrimitive.YAxis
// #endregion

// #region Series
const ChartArea = RechartsPrimitive.Area
const ChartBar = RechartsPrimitive.Bar
const ChartLine = RechartsPrimitive.Line
const ChartComposed = RechartsPrimitive.ComposedChart
const ChartPie = RechartsPrimitive.Pie
const ChartRadar = RechartsPrimitive.Radar
const ChartRadialBar = RechartsPrimitive.RadialBar
const ChartScatter = RechartsPrimitive.Scatter
const ChartFunnel = RechartsPrimitive.Funnel
const ChartTreemap = RechartsPrimitive.Treemap
const ChartSankey = RechartsPrimitive.Sankey
// #endregion

type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    hideTooltip?: boolean
    hideLegend?: boolean
  }
}

export {
  ChartArea,
  ChartBar,
  ChartComposed,
  ChartContainer,
  ChartFunnel,
  ChartGrid,
  ChartLegend,
  ChartLegendContent,
  ChartLine,
  ChartPie,
  ChartRadar,
  ChartRadialBar,
  ChartSankey,
  ChartScatter,
  ChartTooltip,
  ChartTooltipContent,
  ChartTreemap,
  ChartXAxis,
  ChartYAxis,
}

export type { ChartConfig }
