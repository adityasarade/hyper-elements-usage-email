/**
 * Kestrel, a fictional API gateway, sends a workspace its month-end usage report.
 *
 * Figtree and DM Mono set the report on warm paper. The daily chart is a strip of
 * table cells on dark ink, with the busiest day picked out in kestrel-rust.
 */
import { Button, Column, Email, Heading, Html, Link, Row, Section, Span, Text, type LinkProps } from "@hyper-elements/react";

export const meta = {
  title: "Kestrel monthly usage report",
  description: "An API gateway’s month in requests, with a chart made of table cells so Outlook can count along.",
  root: "Email",
};

const DESK = "#EAE4DB";
const PAPER = "#FFFCF6";
const INK = "#26211D";
const QUIET = "#645A51";
const RULE = "#DDD3C7";
const TINT = "#F5EBE0";
const RUST = "#974021";
const RUST_DOWN = "#793118";
const PLOT = "#29231F";
const PLOT_TEXT = "#FFF1DF";
const PLOT_QUIET = "#D4C0AE";
const PLOT_RULE = "#69584B";
const WEEKDAY = "#D5A687";
const WEEKEND = "#EAD3BB";
const PEAK = "#FF8A57";

const SANS = "Figtree, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'DM Mono', Consolas, 'Courier New', monospace";
const SITE = "https://kestrel.example";

const mono = { fontFamily: MONO, fontSize: 14, lineHeight: 1.4 } as const;
const label = { ...mono, color: QUIET, letterSpacing: 0.5, textTransform: "uppercase" } as const;
const smallHeading = { fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.45 } as const;
const whole = new Intl.NumberFormat("en-US");
const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const compactDetail = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const signed = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const errorPercent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 3 });
const latency = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const monthAndYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayAndMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export type UsageReportData = {
  workspace: string;
  /** An ISO date in the completed billing month. */
  month: string;
  /** One whole request count per UTC day, from the first through the last. */
  daily: readonly number[];
  previousTotal: number;
  planName: string;
  planLimit: number;
  endpoints: readonly { path: string; requests: number }[];
  p50Ms: number;
  p95Ms: number;
  /** A fraction from 0 to 1. */
  errorRate: number;
  usageUrl: LinkProps["href"];
  planUrl: LinkProps["href"];
  notificationsUrl: LinkProps["href"];
};

export type KestrelUsageReportProps = { data?: UsageReportData };

export const exampleUsage = {
  workspace: "Northwind Labs",
  month: "2026-10-01",
  daily: [
    1_245_000, 1_516_000, 1_084_000, 892_000, 1_414_000, 1_605_000, 1_738_000,
    1_573_000, 1_722_000, 963_000, 1_019_000, 1_406_000, 1_687_000, 1_805_000,
    1_612_000, 1_945_000, 1_135_000, 1_082_000, 1_738_000, 1_953_000, 1_785_000,
    1_939_000, 2_421_000, 1_188_000, 1_078_000, 1_747_000, 1_832_000, 2_061_000,
    1_936_000, 1_865_000, 1_214_000,
  ],
  previousTotal: 43_047_000,
  planName: "Scale",
  planLimit: 60_000_000,
  endpoints: [
    { path: "/v1/events", requests: 18_740_618 },
    { path: "/v1/resolve", requests: 11_369_082 },
    { path: "/v1/tokens", requests: 7_803_154 },
    { path: "/v1/projects", requests: 4_221_703 },
  ],
  p50Ms: 42,
  p95Ms: 118,
  errorRate: 0.0018,
  usageUrl: `${SITE}/northwind/usage`,
  planUrl: `${SITE}/northwind/plan`,
  notificationsUrl: `${SITE}/northwind/notifications`,
} satisfies UsageReportData;

function daysInMonth(date: Date) {
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return end.getUTCDate();
}

function dateInMonth(month: Date, day: number) {
  const date = new Date(month);
  date.setUTCDate(day);
  return date;
}

function shiftMonth(month: Date, offset: number) {
  const date = dateInMonth(month, 1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date;
}

function monthStart(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError("Month must be a real date in YYYY-MM-DD format.");
  }
  return dateInMonth(date, 1);
}

function chartCeiling(peak: number) {
  if (peak <= 1) return 1;
  const unit = 10 ** Math.floor(Math.log10(peak));
  return Math.ceil(peak / (unit / 2)) * (unit / 2);
}

function usageForecast(month: Date, total: number, limit: number) {
  const next = shiftMonth(month, 1);
  if (total === 0) return `No requests this month. There’s no usage pace to project into ${monthName.format(next)}.`;
  const pace = total / daysInMonth(month);
  const projected = pace * daysInMonth(next);
  if (projected >= limit) {
    return `At this pace, you’ll reach your limit around ${dayAndMonth.format(dateInMonth(next, Math.ceil(limit / pace)))}.`;
  }
  return `At this pace, ${monthName.format(next)} would close at ${short.format(Math.round(projected))}\u00a0requests.`;
}

function usagePercent(ratio: number) {
  if (ratio >= 100) return `${short.format(ratio * 100)}%`;
  if (ratio >= 0.9995 && ratio < 1) return ">99.9%";
  return percent.format(ratio);
}

/** An empty colored cell scales without loading an image or needing a web font. */
function fillBar(ratio: number, height: number, track: string, fill: string) {
  const filled = Math.min(1, ratio) * 100;
  return (
    <Row stackOnMobile={false} style={{ backgroundColor: track }}>
      {filled > 0 && <Column style={{ width: `${filled}%`, height, backgroundColor: fill }} />}
      {filled < 100 && <Column style={{ width: `${100 - filled}%`, height }} />}
    </Row>
  );
}

function DailyChart({ month, daily }: { month: Date; daily: readonly number[] }) {
  const peak = Math.max(...daily);
  const low = Math.min(...daily);
  const peakIndex = daily.indexOf(peak);
  const lowIndex = daily.indexOf(low);
  const ceiling = chartCeiling(peak);
  const plotHeight = 118;
  const barHeight = (requests: number) => Math.round(plotHeight * requests / ceiling);
  const dateLabel = (index: number) => dayAndMonth.format(dateInMonth(month, index + 1));
  const weekly = Array.from({ length: Math.ceil(daily.length / 7) }, (_, week) => {
    const start = week * 7;
    const days = daily.slice(start, start + 7);
    return `${start + 1}–${start + days.length} ${shortMonth.format(month)}: ${whole.format(days.reduce((sum, value) => sum + value, 0))}`;
  });
  const summary = [
    `Busiest day: ${dateLabel(peakIndex)}, ${whole.format(peak)} requests.`,
    `Quietest day: ${dateLabel(lowIndex)}, ${whole.format(low)} requests.`,
    `Weekly totals: ${weekly.join("; ")}.`,
  ].join("\n");

  return (
    <Column id="daily-chart" style={{ backgroundColor: PLOT, color: PLOT_TEXT, padding: [24, 24, 20], gap: 18, mobile: { padding: [20, 14, 18], gap: 15 } }}>
      <Row stackOnMobile={false} style={{ alignItems: "center", gap: 8 }}>
        <Column>
          <Heading level={2} style={{ ...smallHeading, mobile: { fontSize: 20 } }}>Requests per day</Heading>
        </Column>
        <Column style={{ width: 52 }}>
          <Text style={{ ...mono, color: PLOT_QUIET, textAlign: "right" }}>{short.format(ceiling)}</Text>
        </Column>
      </Row>
      <Column style={{ gap: 8 }}>
        <Row id="daily-bars" stackOnMobile={false} style={{ alignItems: "end", gap: 3, padding: [plotHeight - barHeight(peak), 0, 0], border: { top: `1px solid ${PLOT_RULE}`, bottom: `1px solid ${PLOT_RULE}` }, mobile: { gap: 2 } }}>
          {daily.map((requests, index) => {
            const weekday = dateInMonth(month, index + 1).getUTCDay();
            const weekend = weekday === 0 || weekday === 6;
            return (
              <Column
                key={index}
                style={{
                  height: barHeight(requests),
                  backgroundColor: requests === 0 ? undefined : index === peakIndex ? PEAK : weekend ? WEEKEND : WEEKDAY,
                }}
              />
            );
          })}
        </Row>
        <Row stackOnMobile={false}>
          <Column><Text style={{ ...mono, color: PLOT_QUIET }}>{dateLabel(0)}</Text></Column>
          <Column><Text style={{ ...mono, color: PLOT_QUIET, textAlign: "center" }}>{Math.floor(daily.length / 2) + 1}</Text></Column>
          <Column><Text style={{ ...mono, color: PLOT_QUIET, textAlign: "right" }}>{daily.length}</Text></Column>
        </Row>
      </Column>
      <Column>
        <Row stackOnMobile={false} style={{ alignItems: "center", gap: 8 }}>
          <Column>
            <Text style={{ fontSize: 15, lineHeight: 1.4, color: PLOT_TEXT, mobile: { fontSize: 14 } }}>
              {peak > 0 ? <><Span style={{ color: PEAK, fontWeight: 700 }}>Peak</Span> {dateLabel(peakIndex)} · {compactDetail.format(peak)}</> : "No requests recorded."}
            </Text>
          </Column>
          <Column style={{ width: 91 }}>
            <Row stackOnMobile={false} style={{ gap: 7, alignItems: "center" }}>
              <Column style={{ width: 8, height: 8, backgroundColor: WEEKEND }} />
              <Column><Text style={{ fontSize: 14, color: PLOT_QUIET, textAlign: "right" }}>Weekends</Text></Column>
            </Row>
          </Column>
        </Row>
        {/* The summary is made only from formatted UTC dates and counts. */}
        <Html html={`<div role="img" aria-label="Daily chart summary. ${summary.replaceAll("\n", " ")}"></div>`} text={summary} />
      </Column>
    </Column>
  );
}

function endpointRow(endpoint: UsageReportData["endpoints"][number], total: number) {
  const { path, requests } = endpoint;
  const displayCount = requests < 1_000_000_000 ? whole.format(requests) : short.format(requests);
  return (
    <Column key={path} style={{ gap: 7 }}>
      <Row stackOnMobile={false} style={{ gap: 6, mobile: { gap: 3 } }}>
        <Column><Text style={mono}>{path}</Text></Column>
        <Column style={{ width: Math.ceil(displayCount.length * 8.5) + 1 }}>
          <Text style={{ ...mono, color: QUIET, textAlign: "right" }}>{displayCount}</Text>
        </Column>
      </Row>
      {fillBar(total > 0 ? requests / total : 0, 3, TINT, RUST)}
    </Column>
  );
}

function metric(name: string, value: string, unit = "") {
  return (
    <Column style={{ gap: 5, padding: [10, 0, 0], border: { top: `1px solid ${RULE}` } }}>
      <Text style={{ fontSize: 14, lineHeight: 1.4, color: QUIET }}>{name}</Text>
      <Text style={{ ...mono, fontSize: 23, lineHeight: 1.1, mobile: { fontSize: 18 } }}>
        {value}{unit && <Span style={{ fontFamily: SANS, fontSize: 14, color: QUIET }}>{unit}</Span>}
      </Text>
    </Column>
  );
}

export default function KestrelUsageReport({ data = exampleUsage }: KestrelUsageReportProps = {}) {
  const month = monthStart(data.month);
  const { daily, workspace, previousTotal, planName, planLimit, endpoints, p50Ms, p95Ms, errorRate } = data;
  if (daily.length !== daysInMonth(month)) {
    throw new RangeError(`Give one count for each of ${monthName.format(month)}’s ${daysInMonth(month)} UTC days.`);
  }
  if (![...daily, previousTotal, planLimit, ...endpoints.map(({ requests }) => requests)].every((count) => Number.isSafeInteger(count) && count >= 0) || planLimit === 0) {
    throw new RangeError("Request counts must be nonnegative whole numbers and the plan limit must be positive.");
  }

  const total = daily.reduce((sum, count) => sum + count, 0);
  const usageRatio = total / planLimit;
  const change = previousTotal > 0 ? (total - previousTotal) / previousTotal : null;
  const previous = monthName.format(shiftMonth(month, -1));
  const period = monthAndYear.format(month);
  const forecast = usageForecast(month, total, planLimit);
  const ranked = [...endpoints].sort((a, b) => b.requests - a.requests);
  const planUsed = usagePercent(usageRatio);
  const changeLabel = change !== null && change >= 100 ? `+${short.format(change * 100)}%` : signed.format(change ?? 0);

  return (
    <Email
      width={616}
      lang="en"
      title={`Kestrel usage report · ${period}`}
      previewText={`${workspace} made ${short.format(total)} requests in ${monthName.format(month)} and used ${planUsed} of the ${planName} plan.`}
      fonts={[
        { family: "Figtree", src: "https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4S9DaRvzig.woff2", format: "woff2", weight: "300 900" },
        { family: "DM Mono", src: "https://fonts.gstatic.com/s/dmmono/v16/aFTU7PB1QTsUX8KYthqQBK6PYK0.woff2", format: "woff2", weight: 400 },
      ]}
      style={{ backgroundColor: DESK, color: INK, fontFamily: SANS, fontSize: 16, lineHeight: 1.5 }}
    >
      <Section style={{ padding: [36, 0, 38], gap: 18, mobile: { padding: [12, 10, 24], gap: 14 } }}>
        <Column style={{ backgroundColor: PAPER, padding: [25, 36, 30], gap: 30, mobile: { padding: [21, 16, 24], gap: 24 } }}>
          <Row stackOnMobile={false} style={{ alignItems: "center", padding: [0, 0, 16], border: { bottom: `1px solid ${INK}` } }}>
            <Column>
              <Text style={{ fontSize: 27, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>
                <Link href={SITE} style={{ color: INK, textDecoration: "none" }}>kestrel<Span style={{ color: RUST }}>.</Span></Link>
              </Text>
            </Column>
            <Column style={{ width: 140 }}>
              <Text style={{ ...label, textAlign: "right" }}>Usage report</Text>
            </Column>
          </Row>

          <Column style={{ gap: 9 }}>
            <Text style={{ ...label, textTransform: "none" }}>{period} · {workspace}</Text>
            <Heading level={1} style={{ fontFamily: MONO, fontSize: 84, fontWeight: 400, lineHeight: 1.03, letterSpacing: -5.5, mobile: { fontSize: 62, letterSpacing: -3.5 } }}>
              {short.format(total)}
            </Heading>
            <Text style={{ fontSize: 18, lineHeight: 1.4, color: QUIET, mobile: { fontSize: 16 } }}>
              <Span style={{ color: INK, fontWeight: 700 }}>API requests</Span>
              {" · "}
              {change === null
                ? `No requests in ${previous}`
                : change === 0
                  ? `Unchanged from ${previous}`
                  : <><Span style={{ color: RUST, fontWeight: 700 }}>{changeLabel}</Span> {`vs.\u00a0${previous}`}</>}
            </Text>
          </Column>

          <DailyChart month={month} daily={daily} />

          <Column style={{ backgroundColor: TINT, padding: [18, 22, 20], gap: 11, mobile: { padding: [16, 16, 18] } }}>
            <Heading level={2} style={smallHeading}>{planName} plan</Heading>
            <Row stackOnMobile={false} style={{ alignItems: "end", gap: 8 }}>
              <Column><Text style={{ ...mono, color: QUIET }}>{short.format(total)} of {short.format(planLimit)}</Text></Column>
              <Column style={{ width: 92 }}>
                <Text style={{ ...mono, fontSize: 19, color: RUST, textAlign: "right" }}>{planUsed}</Text>
              </Column>
            </Row>
            {fillBar(usageRatio, 8, RULE, RUST)}
            <Text style={{ color: QUIET, fontSize: 15, lineHeight: 1.45 }}>{forecast}</Text>
          </Column>

          <Column style={{ gap: 15 }}>
            <Heading level={2} style={smallHeading}>Top endpoints</Heading>
            {ranked.length > 0 ? ranked.map((endpoint) => endpointRow(endpoint, total)) : <Text style={{ color: QUIET }}>No endpoint counts for this month.</Text>}
          </Column>

          <Column style={{ gap: 12 }}>
            <Heading level={2} style={{ ...smallHeading, fontSize: 19 }}>Gateway performance</Heading>
            <Row stackOnMobile={false} style={{ gap: 15, mobile: { gap: 10 } }}>
              {metric("p50 latency", latency.format(p50Ms), " ms")}
              {metric("p95 latency", latency.format(p95Ms), " ms")}
              {metric("Error rate", errorPercent.format(errorRate))}
            </Row>
          </Column>

          <Row stackOnMobile={false} style={{ alignItems: "center", gap: 18, padding: [20, 0, 0], border: { top: `1px solid ${RULE}` }, mobile: { gap: 14 } }}>
            <Column style={{ width: 155 }}>
              <Button href={data.usageUrl} style={{ width: "100%", padding: [13, 0], backgroundColor: RUST, color: PAPER, fontSize: 15, fontWeight: 700, hover: { backgroundColor: RUST_DOWN } }}>
                See full usage
              </Button>
            </Column>
            <Column>
              <Text style={{ fontSize: 15 }}><Link href={data.planUrl} style={{ color: RUST, fontWeight: 700 }}>Change plan</Link></Text>
            </Column>
          </Row>
        </Column>

        <Column style={{ gap: 4, padding: [0, 18], mobile: { padding: [0, 8] } }}>
          <Text style={{ fontSize: 14, color: QUIET }}>
            Usage updates for {workspace}.{" "}
            <Link href={data.notificationsUrl} style={{ color: RUST }}>{"Manage\u00a0notifications"}</Link>
          </Text>
          <Text style={{ fontSize: 14, color: QUIET }}>
            Kestrel Systems · 18 Kildeer Ln, Alder Reach
          </Text>
        </Column>
      </Section>
    </Email>
  );
}
