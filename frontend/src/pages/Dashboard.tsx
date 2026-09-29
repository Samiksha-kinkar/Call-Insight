import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { getDashboard } from '../services/api'

type Sentiment = 'Positive' | 'Neutral' | 'Negative'

type DashboardCall = {
  name: string
  topic: string
  complaint: string
  durationSeconds: number
  sentiment: Sentiment
  resolved: boolean
  date: string
  keywords: string[]
}

type DashboardData = {
  summary: {
    total_calls: number
    positive_sentiment: number
    negative_sentiment: number
    neutral_sentiment: number
    average_call_duration: number
    resolved_calls: number
    unresolved_calls: number
  }
  recent_calls: {
    call_id: string
    filename: string
    sentiment: string
    sentiment_score: number
    topic: string
    subtopic: string
    topic_confidence: number
    resolution: boolean
    resolution_confidence: number
    summary: string
    duration_seconds: number
    timestamp: string
  }[]
  sentiment: {
    sentiment: string
    count: number
  }[]
  calls_over_time: {
    date: string
    calls: number
  }[]
  complaints: {
    category: string
    count: number
  }[]
  topics: {
    topic: string
    count: number
  }[]
  issue_trends: {
    date: string
    issues: number
  }[]
  keywords: {
    keyword: string
    count: number
  }[]
}


const sentimentColors: Record<string, string> = {
  Positive: '#9fcf9a',
  Neutral: '#d6a85f',
  Negative: '#d87575',
}

const dummyCallTemplates = [
  {
    name: 'John Doe',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 272,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['refund', 'billing', 'charge'],
  },
  {
    name: 'Jane Smith',
    topic: 'Refunds',
    complaint: 'Refunds',
    durationSeconds: 198,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['refund', 'payment', 'money'],
  },
  {
    name: 'Robert Brown',
    topic: 'Delivery',
    complaint: 'Delivery Problems',
    durationSeconds: 341,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['delivery', 'late', 'shipment'],
  },
  {
    name: 'Emily Davis',
    topic: 'Network',
    complaint: 'Network Issues',
    durationSeconds: 176,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['network', 'connection', 'app'],
  },
  {
    name: 'Michael Wilson',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 245,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['billing', 'payment', 'charged'],
  },
  {
    name: 'Sarah Johnson',
    topic: 'Account',
    complaint: 'Account Issues',
    durationSeconds: 222,
    sentiment: 'Neutral' as Sentiment,
    resolved: false,
    keywords: ['account', 'verification', 'login'],
  },
  {
    name: 'David Miller',
    topic: 'Refunds',
    complaint: 'Refunds',
    durationSeconds: 167,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['refund', 'money', 'payment'],
  },
  {
    name: 'Jessica Taylor',
    topic: 'Delivery',
    complaint: 'Delivery Problems',
    durationSeconds: 312,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['delivery', 'late', 'shipment'],
  },
  {
    name: 'Daniel Anderson',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 261,
    sentiment: 'Neutral' as Sentiment,
    resolved: true,
    keywords: ['billing', 'payment', 'charge'],
  },
  {
    name: 'Laura Thomas',
    topic: 'Network',
    complaint: 'Network Issues',
    durationSeconds: 189,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['network', 'connection', 'app'],
  },
  {
    name: 'James Jackson',
    topic: 'Refunds',
    complaint: 'Refunds',
    durationSeconds: 284,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['refund', 'payment', 'money'],
  },
  {
    name: 'Anna White',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 155,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['billing', 'payment', 'charged'],
  },
  {
    name: 'Matthew Harris',
    topic: 'Delivery',
    complaint: 'Delivery Problems',
    durationSeconds: 306,
    sentiment: 'Neutral' as Sentiment,
    resolved: false,
    keywords: ['delivery', 'late', 'shipment'],
  },
  {
    name: 'Sophia Martin',
    topic: 'Account',
    complaint: 'Account Issues',
    durationSeconds: 208,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['account', 'verification', 'login'],
  },
  {
    name: 'Christopher Thompson',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 257,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['billing', 'payment', 'charge'],
  },
  {
    name: 'Olivia Garcia',
    topic: 'Refunds',
    complaint: 'Refunds',
    durationSeconds: 171,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['refund', 'money', 'payment'],
  },
  {
    name: 'Andrew Martinez',
    topic: 'Network',
    complaint: 'Network Issues',
    durationSeconds: 216,
    sentiment: 'Neutral' as Sentiment,
    resolved: true,
    keywords: ['network', 'connection', 'app'],
  },
  {
    name: 'Emma Robinson',
    topic: 'Delivery',
    complaint: 'Delivery Problems',
    durationSeconds: 292,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['delivery', 'late', 'shipment'],
  },
  {
    name: 'Joshua Clark',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 204,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['billing', 'payment', 'charged'],
  },
  {
    name: 'Mia Rodriguez',
    topic: 'Account',
    complaint: 'Account Issues',
    durationSeconds: 162,
    sentiment: 'Neutral' as Sentiment,
    resolved: false,
    keywords: ['account', 'verification', 'login'],
  },
  {
    name: 'Ryan Lewis',
    topic: 'Refunds',
    complaint: 'Refunds',
    durationSeconds: 248,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['refund', 'payment', 'money'],
  },
  {
    name: 'Isabella Lee',
    topic: 'Delivery',
    complaint: 'Delivery Problems',
    durationSeconds: 323,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['delivery', 'late', 'shipment'],
  },
  {
    name: 'Nathan Walker',
    topic: 'Billing',
    complaint: 'Billing Issues',
    durationSeconds: 235,
    sentiment: 'Neutral' as Sentiment,
    resolved: true,
    keywords: ['billing', 'payment', 'charge'],
  },
  {
    name: 'Ava Hall',
    topic: 'Network',
    complaint: 'Network Issues',
    durationSeconds: 149,
    sentiment: 'Positive' as Sentiment,
    resolved: true,
    keywords: ['network', 'connection', 'app'],
  },
  {
    name: 'Ethan Allen',
    topic: 'Refunds',
    complaint: 'Refunds',
    durationSeconds: 276,
    sentiment: 'Negative' as Sentiment,
    resolved: false,
    keywords: ['refund', 'payment', 'money'],
  },
]

const dateOffsets = [
  0, 0, 1, 1, 2,
  2, 3, 3, 4, 4,
  5, 5, 6, 6, 0,
  1, 2, 3, 4, 5,
  6, 0, 1, 2, 3,
]

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getLatestRealDate(data?: DashboardData) {
  const dates = (data?.calls_over_time || [])
    .map(item => item.date)
    .filter(Boolean)
    .sort()

  if (dates.length > 0) {
    return new Date(`${dates[dates.length - 1]}T00:00:00`)
  }

  return new Date()
}

function buildDummyCalls(baseDate: Date): DashboardCall[] {
  return dummyCallTemplates.map((call, index) => ({
    ...call,
    date: formatDateKey(
      addDays(baseDate, -dateOffsets[index])
    ),
  }))
}

function normalizeSentiment(value: string): Sentiment {
  const normalized = String(value || '').toLowerCase()

  if (normalized === 'positive') return 'Positive'
  if (normalized === 'negative') return 'Negative'

  return 'Neutral'
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.round(seconds || 0)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds
    ).padStart(2, '0')}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function formatChartDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function mergeCounts(
  realItems: any[] = [],
  realKey: string,
  dummyCounts: Record<string, number>
) {
  const counts: Record<string, number> = {}

  realItems.forEach(item => {
    const key = String(item?.[realKey] || item?.name || 'Unknown')

    if (key === 'Unknown') return

    const value = Number(
      item?.count ??
        item?.value ??
        item?.calls ??
        item?.issues ??
        0
    )

    counts[key] = (counts[key] || 0) + value
  })

  Object.entries(dummyCounts).forEach(([key, value]) => {
    counts[key] = (counts[key] || 0) + value
  })

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      count: value,
    }))
    .sort((a, b) => b.value - a.value)
}

function convertRecentCall(call: any): DashboardCall {
  const sentiment = normalizeSentiment(
    call?.analysis?.sentiment?.label ||
      call?.sentiment ||
      'Neutral'
  )

  const topic =
    call?.analysis?.topic?.category ||
    call?.analysis?.topic?.name ||
    call?.topic ||
    'Unknown'

  const complaint =
    call?.analysis?.complaint?.category ||
    call?.analysis?.complaint?.name ||
    call?.complaint ||
    topic

  const durationSeconds = Number(
    call?.duration_seconds ??
      call?.duration ??
      0
  )

  const timestamp =
    call?.timestamp ||
    new Date().toISOString()

  return {
    name:
      call?.customer_name ||
      call?.customer ||
      call?.filename?.replace(/\.[^/.]+$/, '') ||
      'Customer',
    topic,
    complaint,
    durationSeconds,
    sentiment,
    resolved: Boolean(
      call?.analysis?.resolution?.resolved ??
        call?.resolution?.resolved ??
        call?.resolved ??
        false
    ),
    date: formatDateKey(new Date(timestamp)),
    keywords: [],
  }
}

export default function Dashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [loading, setLoading] = useState(true)

  const [period, setPeriod] = useState('Last 7 Days')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await getDashboard()
        setDashboard(result)
      } catch (error) {
        console.error(
          'Failed to load dashboard:',
          error
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  
  const baseDate = getLatestRealDate(dashboard || undefined)

  const dummyCalls = buildDummyCalls(baseDate)

  const realCalls = (dashboard?.recent_calls || []).map(
    convertRecentCall
  )


  const realSentimentCounts: Record<string, number> = {}

  ;(dashboard?.sentiment || []).forEach((item: any) => {
    const sentiment = normalizeSentiment(
      item?.sentiment ||
        item?.name ||
        item?.label
    )

    realSentimentCounts[sentiment] =
      (realSentimentCounts[sentiment] || 0) +
      Number(item?.count || item?.value || 0)
  })

  const dummySentimentCounts = dummyCalls.reduce(
    (acc, call) => {
      acc[call.sentiment] =
        (acc[call.sentiment] || 0) + 1

      return acc
    },
    {} as Record<string, number>
  )

  const combinedSentimentCounts = {
    Positive:
      (realSentimentCounts.Positive || 0) +
      (dummySentimentCounts.Positive || 0),

    Neutral:
      (realSentimentCounts.Neutral || 0) +
      (dummySentimentCounts.Neutral || 0),

    Negative:
      (realSentimentCounts.Negative || 0) +
      (dummySentimentCounts.Negative || 0),
  }

  
  const realTotalCalls =
    Number(
      dashboard?.summary?.total_calls
    ) || 0

  const dummyTotalCalls = dummyCalls.length

  const totalCalls =
    realTotalCalls + dummyTotalCalls

  

  const dummyResolved = dummyCalls.filter(
    call => call.resolved
  ).length

  const dummyUnresolved =
    dummyCalls.length - dummyResolved

  const realResolved =
    Number(
      dashboard?.summary?.resolved_calls
    ) || 0

  const realUnresolved =
    Number(
      dashboard?.summary?.unresolved_calls
    ) || 0

  const resolvedCalls =
    realResolved + dummyResolved

  const unresolvedCalls =
    realUnresolved + dummyUnresolved


  const realAverageDuration =
    Number(
      dashboard?.summary?.average_call_duration
    ) || 0

  const dummyTotalDuration =
    dummyCalls.reduce(
      (total, call) =>
        total + call.durationSeconds,
      0
    )

  const realTotalDuration =
    realAverageDuration * realTotalCalls

  const combinedAverageDuration =
    totalCalls > 0
      ? (realTotalDuration +
          dummyTotalDuration) /
        totalCalls
      : 0

  
  const sentimentData = [
    {
      name: 'Positive',
      value:
        totalCalls > 0
          ? Number(
              (
                (combinedSentimentCounts.Positive /
                  totalCalls) *
                100
              ).toFixed(1)
            )
          : 0,
    },
    {
      name: 'Neutral',
      value:
        totalCalls > 0
          ? Number(
              (
                (combinedSentimentCounts.Neutral /
                  totalCalls) *
                100
              ).toFixed(1)
            )
          : 0,
    },
    {
      name: 'Negative',
      value:
        totalCalls > 0
          ? Number(
              (
                (combinedSentimentCounts.Negative /
                  totalCalls) *
                100
              ).toFixed(1)
            )
          : 0,
    },
  ]

 
  const dummyCallsByDate =
    dummyCalls.reduce(
      (acc, call) => {
        acc[call.date] =
          (acc[call.date] || 0) + 1

        return acc
      },
      {} as Record<string, number>
    )

  const callsByDate: Record<string, number> = {}

  ;(dashboard?.calls_over_time || []).forEach(
    (item: any) => {
      if (!item?.date) return

      callsByDate[item.date] =
        (callsByDate[item.date] || 0) +
        Number(item.calls || item.count || 0)
    }
  )

  Object.entries(dummyCallsByDate).forEach(
    ([date, count]) => {
      callsByDate[date] =
        (callsByDate[date] || 0) + count
    }
  )

  const callsOverTime = Object.entries(
    callsByDate
  )
    .sort(([a], [b]) =>
      a.localeCompare(b)
    )
    .map(([date, calls]) => ({
      date,
      label: formatChartDate(date),
      calls,
    }))

 

  const dummyComplaintCounts =
    dummyCalls.reduce(
      (acc, call) => {
        acc[call.complaint] =
          (acc[call.complaint] || 0) + 1

        return acc
      },
      {} as Record<string, number>
    )

  const complaintData = mergeCounts(
    dashboard?.complaints || [],
    'category',
    dummyComplaintCounts
  ).map(item => ({
    category: item.name,
    calls: item.value,
  }))

  /*
   * ---------------------------------------------------------
   * REAL + DUMMY TOPICS
   * ---------------------------------------------------------
   */

  const dummyTopicCounts =
    dummyCalls.reduce(
      (acc, call) => {
        acc[call.topic] =
          (acc[call.topic] || 0) + 1

        return acc
      },
      {} as Record<string, number>
    )

  const topicData = mergeCounts(
    dashboard?.topics || [],
    'name',
    dummyTopicCounts
  ).map(item => ({
    name: item.name,
    value: item.value,
  }))

  /*
   * ---------------------------------------------------------
   * REAL + DUMMY WEEKLY TREND
   * ---------------------------------------------------------
   *
   * Every call represents one issue for this dashboard,
   * so the weekly trend is based on the combined call count.
   */

  const weeklyTrend = callsOverTime.map(
    item => ({
      day: item.label,
      issues: item.calls,
    })
  )

  /*
   * ---------------------------------------------------------
   * REAL + DUMMY KEYWORDS
   * ---------------------------------------------------------
   */

  const dummyKeywordCounts =
    dummyCalls.reduce(
      (acc, call) => {
        call.keywords.forEach(keyword => {
          acc[keyword] =
            (acc[keyword] || 0) + 1
        })

        return acc
      },
      {} as Record<string, number>
    )

  const keywordCounts: Record<string, number> = {}

  ;(dashboard?.keywords || []).forEach(
    (item: any) => {
      const word =
        item?.word ||
        item?.keyword ||
        item?.name

      if (!word) return

      keywordCounts[word] =
        (keywordCounts[word] || 0) +
        Number(
          item?.count ||
            item?.value ||
            0
        )
    }
  )

  Object.entries(dummyKeywordCounts).forEach(
    ([word, count]) => {
      keywordCounts[word] =
        (keywordCounts[word] || 0) +
        count
    }
  )

  const keywordData = Object.entries(
    keywordCounts
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word, count], index) => ({
      word,
      size:
        index < 5
          ? 'large'
          : index < 12
            ? 'medium'
            : 'small',
      count,
    }))

  
const recentCalls = [
  ...realCalls,
  ...dummyCalls,
]
  .sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  .slice(0, 6)

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of your customer call
            analytics
          </p>
        </div>

        <select
          className="dashboard-period"
          value={period}
          onChange={event =>
            setPeriod(event.target.value)
          }
        >
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
        </select>
      </div>

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card">
          <span className="dashboard-kpi-label">
            Total Calls
          </span>

          <strong className="dashboard-kpi-value">
            {totalCalls}
          </strong>

          <span className="dashboard-kpi-subtext">
            Real + demo calls
          </span>
        </div>

        <div className="dashboard-kpi-card positive">
          <span className="dashboard-kpi-label">
            Positive Sentiment
          </span>

          <strong className="dashboard-kpi-value">
            {sentimentData[0].value}%
          </strong>

          <span className="dashboard-kpi-subtext">
            {combinedSentimentCounts.Positive}{' '}
            calls
          </span>
        </div>

        <div className="dashboard-kpi-card negative">
          <span className="dashboard-kpi-label">
            Negative Sentiment
          </span>

          <strong className="dashboard-kpi-value">
            {sentimentData[2].value}%
          </strong>

          <span className="dashboard-kpi-subtext">
            {combinedSentimentCounts.Negative}{' '}
            calls
          </span>
        </div>

        <div className="dashboard-kpi-card neutral">
          <span className="dashboard-kpi-label">
            Neutral Sentiment
          </span>

          <strong className="dashboard-kpi-value">
            {sentimentData[1].value}%
          </strong>

          <span className="dashboard-kpi-subtext">
            {combinedSentimentCounts.Neutral}{' '}
            calls
          </span>
        </div>

        <div className="dashboard-kpi-card">
          <span className="dashboard-kpi-label">
            Avg. Call Duration
          </span>

          <strong className="dashboard-kpi-value">
            {formatDuration(
              combinedAverageDuration
            )}
          </strong>

          <span className="dashboard-kpi-subtext">
            Combined average
          </span>
        </div>

        <div className="dashboard-kpi-card resolved">
          <span className="dashboard-kpi-label">
            Resolved
          </span>

          <strong className="dashboard-kpi-value">
            {resolvedCalls}
          </strong>

          <span className="dashboard-kpi-subtext">
            {totalCalls > 0
              ? Math.round(
                  (resolvedCalls /
                    totalCalls) *
                    100
                )
              : 0}
            % resolution rate
          </span>
        </div>

        <div className="dashboard-kpi-card unresolved">
          <span className="dashboard-kpi-label">
            Unresolved
          </span>

          <strong className="dashboard-kpi-value">
            {unresolvedCalls}
          </strong>

          <span className="dashboard-kpi-subtext">
            {totalCalls > 0
              ? Math.round(
                  (unresolvedCalls /
                    totalCalls) *
                    100
                )
              : 0}
            % of calls
          </span>
        </div>
      </div>

      <div className="dashboard-chart-grid">
        <div className="dashboard-chart-card large-chart">
          <div className="dashboard-chart-header">
            <div>
              <h3>Calls Over Time</h3>
              <p>
                Combined real and demo calls
              </p>
            </div>
          </div>

          <div className="dashboard-chart">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <LineChart
                data={callsOverTime}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#b79bea"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <div>
              <h3>Sentiment</h3>
              <p>
                Combined call sentiment
              </p>
            </div>
          </div>

          <div className="dashboard-chart">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) =>
                    `${name} ${value}%`
                  }
                >
                  {sentimentData.map(
                    item => (
                      <Cell
                        key={item.name}
                        fill={
                          sentimentColors[
                            item.name
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  formatter={value =>
                    `${value}%`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <div>
              <h3>
                Complaint Categories
              </h3>
              <p>
                Combined complaint volume
              </p>
            </div>
          </div>

          <div className="dashboard-chart">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart
                data={complaintData}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="category"
                  tick={{
                    fontSize: 11,
                  }}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />

                <Tooltip />

                <Bar
                  dataKey="calls"
                  fill="#b79bea"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <div>
              <h3>Topic Distribution</h3>
              <p>
                Combined call topics
              </p>
            </div>
          </div>

          <div className="dashboard-chart">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <PieChart>
                <Pie
                  data={topicData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label
                >
                  {topicData.map(
                    (_, index) => (
                      <Cell
                        key={`topic-${index}`}
                        fill={
                          [
                            '#9fcf9a',
                            '#d6a85f',
                            '#d87575',
                            '#8fb3cf',
                            '#b79acb',
                            '#a8a8a8',
                            '#c49a6c',
                          ][
                            index %
                              7
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <div>
              <h3>Weekly Trend</h3>
              <p>
                Combined issues by day
              </p>
            </div>
          </div>

          <div className="dashboard-chart">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart
                data={weeklyTrend}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />

                <Tooltip />

                <Bar
                  dataKey="issues"
                  fill="#b79bea"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-chart-card keywords-card">
          <div className="dashboard-chart-header">
            <div>
              <h3>Keywords</h3>
              <p>
                Most common combined call terms
              </p>
            </div>
          </div>

          <div className="keyword-cloud">
            {keywordData.map(
              keyword => (
                <span
                  key={keyword.word}
                  className={`keyword ${keyword.size}`}
                >
                  {keyword.word}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="recent-calls-dashboard">
        <div className="dashboard-chart-header">
          <div>
            <h3>Recent Calls</h3>
          </div>
        </div>

        <div className="dashboard-table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Topic</th>
                <th>Duration</th>
                <th>Sentiment</th>
                <th>Resolution</th>
              </tr>
            </thead>

            <tbody>
              {recentCalls.map(
                (call, index) => (
                  <tr
                    key={`${call.name}-${index}`}
                  >
                    <td>
                      <span className="customer-name">
                        {call.name}
                      </span>
                    </td>

                    <td>
                      {call.topic}
                    </td>

                    <td>
                      {formatDuration(
                        call.durationSeconds
                      )}
                    </td>

                    <td>
                      <span
                        className={`sentiment-badge ${call.sentiment.toLowerCase()}`}
                      >
                        {call.sentiment}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`resolution-badge ${
                          call.resolved
                            ? 'resolved'
                            : 'unresolved'
                        }`}
                      >
                        {call.resolved
                          ? 'Resolved'
                          : 'Unresolved'}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}