
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
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof CHART_TYPES>("bar")

  React.useEffect(() => {
    // Format: Log to console in development
    const env = process.env.NODE_ENV
    if (env === "development") {
      console.log(
        "Recharts is in development mode. A bunch of warnings will be logged to the console. These can be ignored."
      )
    }
  }, [])

  const Chart = React.useCallback(() => {
    const chart = CHART_TYPES[activeChart]
    return chart ? React.createElement(chart) : null
  }, [activeChart])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={activeChart}
        ref={chartContainerRef}
        className={cn(
          "flex aspect-video items-center justify-center gap-4 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-label_text]:fill-muted-foreground [&_.recharts-polar-axis-name_text]:fill-muted-foreground [&_.recharts-polar-grid_line]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-sector_path]:stroke-border [&_.recharts-surface]:overflow-visible",
          className
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children as React.ReactElement}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"
// #endregion

// #region Chart-specific components
const ChartStyle = RechartsPrimitive.Style
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
    const [_, item] = payload ?? []
    const [itemConfig] =
      (item &&
        Object.entries(config).find(
          ([key, f]) => f.label === item.name || key === item.name
        )) ||
      []

    const value =
      formatter && item?.value
        ? formatter(item.value, item.name, item, 0, item.payload)
        : item?.value
    const name = nameKey && item?.payload ? item.payload[nameKey] : item?.name
    const finalLabel =
      labelKey && item?.payload
        ? item.payload[labelKey]
        // @ts-expect-error - bug in recharts type
        : label || item?.payload.x
    // @ts-expect-error - bug in recharts type
    const indicatorColor = color || item?.color || itemConfig?.[1].color

    if (itemConfig?.[1].hideTooltip || !active || !payload || payload.length === 0) {
      return null
    }

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
              ? // @ts-expect-error - bug in recharts type
                labelFormatter(finalLabel, payload)
              : finalLabel}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <div
            className={cn("flex items-center gap-2 font-medium leading-none")}
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
              <span className="text-muted-foreground">{name}</span>
              <span>{value}</span>
            </div>
          </div>
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
        {payload.map((item) => {
          const key = (nameKey && item.payload?.[nameKey]) || item.dataKey || "value"
          const itemConfig = config[key]

          if (itemConfig?.hideLegend) {
            return null
          }

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {!hideIcon && itemConfig?.icon ? (
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
  } & (
    | {
        color?: string
        fill?: never
        stroke?: never
      }
    | {
        color?: never
        fill?: string
        stroke?: string
      }
  )
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
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  ChartTreemap,
  ChartXAxis,
  ChartYAxis,
}

export type { ChartConfig }
