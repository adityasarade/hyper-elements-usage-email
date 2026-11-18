/**
 * Kestrel, a fictional API gateway, sends a workspace its month-end usage report.
 *
 * Figtree headlines and DM Mono figures sit on warm paper. The daily chart is a strip of
 * table cells on dark ink, with the busiest day picked out in kestrel-rust.
 */
import { Button, Column, Divider, Email, Heading, Html, Link, Row, Section, Span, Text, type LinkProps } from "@hyper-elements/react";

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
const GREEN = "#27644A";
const AMBER = "#795016";
const ALERT = "#8B3024";
const CALM_WASH = "#EDF2E9";
const WARN_WASH = "#F8EED9";
const ALERT_WASH = "#F7E8E1";
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
export const domainPattern = "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$";

const mono = { fontFamily: MONO, fontSize: 14, lineHeight: 1.4 } as const;
const label = { ...mono, color: QUIET } as const;
const smallHeading = { fontSize: 22, fontWeight: 700, lineHeight: 1.2 } as const;
const exact = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 15 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
const decimal = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 });
const scientific = new Intl.NumberFormat("en-US", { notation: "scientific", maximumSignificantDigits: 3 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const signed = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const monthAndYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const dayAndMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

type QuantityUnit = { singular: string; plural: string };
type Figure = { label: string; value: number; unit: string; previous?: number };

export type UsageReportData = {
  companyName: string;
  postalAddress: string;
  linkDomains: readonly string[];
  workspace: string;
  /** An ISO date in the completed billing month. */
  month: string;
  unit: QuantityUnit;
  metricLabel: string;
  /** One usage value per UTC day, from the first through the last. */
  daily: readonly number[];
  previousTotal: number;
  planName: string;
  planLimit: number;
  breakdownTitle: string;
  breakdownNameStyle: "code" | "text";
  breakdown?: readonly { name: string; count: number }[];
  performanceTitle?: string;
  performance?: readonly Figure[];
  usageUrl: LinkProps["href"];
  planUrl: LinkProps["href"];
  notificationsUrl: LinkProps["href"];
};

export type KestrelUsageReportProps = { data?: UsageReportData };

export const exampleUsage = {
  companyName: "Kestrel Systems",
  postalAddress: "18 Kildeer Ln, Alder Reach",
  linkDomains: ["kestrel.example"],
  workspace: "Northwind Labs",
  unit: { singular: "request", plural: "requests" },
  metricLabel: "API requests",
  breakdownTitle: "Top endpoints",
  breakdownNameStyle: "code",
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
  breakdown: [
    { name: "/v1/events", count: 18_740_618 },
    { name: "/v1/resolve", count: 11_369_082 },
    { name: "/v1/tokens", count: 7_803_154 },
    { name: "/v1/projects", count: 4_221_703 },
  ],
  performanceTitle: "Gateway performance",
  performance: [
    { label: "p50 latency", value: 42, unit: "ms", previous: 39 },
    { label: "p95 latency", value: 118, unit: "ms", previous: 126 },
    { label: "Error rate", value: 0.18, unit: "%", previous: 0.22 },
  ],
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

function number(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e15 || (magnitude > 0 && magnitude < 0.001)) return scientific.format(value);
  return magnitude >= 999.5 ? compact.format(value) : decimal.format(value);
}

// Daily quantities can be fractional. Drop rounding noise before comparing them with a plan limit.
function normalize(value: number) {
  return Number(value.toPrecision(15));
}

function sumUsage(values: readonly number[]) {
  return normalize(values.reduce((sum, value) => sum + value, 0));
}

function quantity(value: number, unit: QuantityUnit, format = number) {
  return `${format(value)} ${value === 1 ? unit.singular : unit.plural}`;
}

function chartCeiling(peak: number) {
  if (peak === 0) return 1;
  const halfStep = 10 ** Math.floor(Math.log10(peak)) / 2 || peak;
  return Math.ceil(peak / halfStep) * halfStep;
}

function usagePercent(ratio: number) {
  if (ratio < 0.8 && ratio >= 0.7995) return "<80%";
  if (ratio < 1 && ratio >= 0.9995) return "<100%";
  if (ratio > 1 && ratio < 1.0005) return ">100%";
  return ratio >= 10 ? `${number(ratio * 100)}%` : percent.format(ratio);
}

function usageForecast(month: Date, total: number, limit: number, unit: QuantityUnit) {
  const next = shiftMonth(month, 1);
  const pace = total / daysInMonth(month);
  const projected = normalize(pace * daysInMonth(next));
  if (projected > limit) {
    const crossing = Math.min(daysInMonth(next), Math.floor(normalize(limit / pace)) + 1);
    const date = longDate.format(dateInMonth(next, crossing)).replace(" ", " ");
    return `At this pace, you’ll pass your limit around ${date}.`;
  }
  return `At this pace, ${monthName.format(next)} closes at ${quantity(projected, unit)}, ${usagePercent(projected / limit)} of your ${number(limit)} limit.`;
}

function companySite(data: UsageReportData) {
  const domains = data.linkDomains.map((domain) => domain.toLowerCase());
  const hostPattern = new RegExp(domainPattern, "i");
  if (domains.length === 0 || domains.some((domain) => !hostPattern.test(domain))) {
    throw new RangeError("Give at least one company link domain as a hostname, without a scheme or path.");
  }
  for (const link of [data.usageUrl, data.planUrl, data.notificationsUrl]) {
    const href = typeof link === "string" ? link : link.href;
    const url = URL.canParse(href) ? new URL(href) : undefined;
    if (!url || !/^https?:\/\//i.test(href) || !domains.includes(url.hostname) || url.username || url.password) {
      throw new RangeError(`Every report URL must use HTTP(S) on a listed company domain (${domains.join(", ")}).`);
    }
  }
  return `https://${domains[0]}`;
}

const leftInset = { padding: [0, 0, 0, 36], mobile: { padding: [0, 0, 0, 16] } } as const;
const rightInset = { padding: [0, 36, 0, 0], mobile: { padding: [0, 16, 0, 0] } } as const;
const insets = { padding: [0, 36], mobile: { padding: [0, 16] } } as const;
const quantityStyle = { ...mono, color: QUIET, textAlign: "right" } as const;

/** Colored table cells give the meter a baseline without an image or web font. */
function fillBar(ratio: number, height: number, track: string, fill: string) {
  const filled = Math.min(1, Math.max(0, ratio)) * 100;
  return (
    <Row stackOnMobile={false} style={{ backgroundColor: track }}>
      {filled > 0 && <Column style={{ width: `${filled}%`, height, backgroundColor: fill }} />}
      {filled < 100 && <Column style={{ width: `${100 - filled}%`, height }} />}
    </Row>
  );
}

function DailyChart({ month, daily, unit }: { month: Date; daily: readonly number[]; unit: QuantityUnit }) {
  const peak = Math.max(...daily);
  const low = Math.min(...daily);
  const peakIndex = daily.indexOf(peak);
  const lowIndex = daily.indexOf(low);
  const ceiling = chartCeiling(peak);
  const plotHeight = 118;
  const barHeight = (count: number) => count === 0 ? 0 : Math.max(1, Math.round(plotHeight * (count / ceiling)));
  const dateLabel = (index: number) => dayAndMonth.format(dateInMonth(month, index + 1));
  const daySummary = (index: number, count: number) => `${dateLabel(index)}, ${quantity(count, unit, exact.format)}.`;
  const weekly = Array.from({ length: Math.ceil(daily.length / 7) }, (_, week) => {
    const start = week * 7;
    const days = daily.slice(start, start + 7);
    return `${start + 1}–${start + days.length} ${shortMonth.format(month)}: ${quantity(sumUsage(days), unit, exact.format)}`;
  });
  const summary = [
    `Busiest day: ${daySummary(peakIndex, peak)}`,
    `Quietest day: ${daySummary(lowIndex, low)}`,
    `Weekly totals: ${weekly.join("; ")}.`,
  ].join("\n");

  return (
    <>
      <Row stackOnMobile={false} style={{ backgroundColor: PLOT, color: PLOT_TEXT, gap: 8, alignItems: "end" }}>
        <Column style={{ padding: [22, 0, 8, 36], mobile: { padding: [20, 0, 8, 16] } }}>
          <Heading level={2} style={smallHeading}>{`${unit.plural.charAt(0).toUpperCase()}${unit.plural.slice(1)} per day`}</Heading>
        </Column>
        <Column style={{ width: 98, padding: [0, 36, 8, 0], mobile: { padding: [0, 16, 8, 0] } }}>
          <Text style={{ ...quantityStyle, color: PLOT_QUIET }}>{number(ceiling)}</Text>
        </Column>
      </Row>
      <Row style={{ backgroundColor: PLOT }}>
        <Column style={insets}>
          <Column id="daily-chart" style={{ width: "100%" }}>
            <Row stackOnMobile={false} style={{ alignItems: "end", gap: 2, padding: [plotHeight - barHeight(peak), 0, 0], border: { top: `1px solid ${PLOT_RULE}`, bottom: `1px solid ${PLOT_RULE}` } }}>
              {daily.map((count, index) => {
                const weekday = dateInMonth(month, index + 1).getUTCDay();
                const weekend = weekday === 0 || weekday === 6;
                return <Column key={index} style={{ height: barHeight(count), backgroundColor: count === 0 ? undefined : index === peakIndex ? PEAK : weekend ? WEEKEND : WEEKDAY }} />;
              })}
            </Row>
            <Html text={summary}><div role="img" aria-label={`Daily chart summary. ${summary.replaceAll("\n", " ")}`} /></Html>
          </Column>
        </Column>
      </Row>
      <Row stackOnMobile={false} style={{ backgroundColor: PLOT, color: PLOT_QUIET }}>
        <Column style={leftInset}><Text style={{ ...mono, padding: [6, 0, 0] }}>{dateLabel(0)}</Text></Column>
        <Column><Text style={{ ...mono, textAlign: "center", padding: [6, 0, 0] }}>{Math.floor(daily.length / 2) + 1}</Text></Column>
        <Column style={rightInset}><Text style={{ ...mono, textAlign: "right", padding: [6, 0, 0] }}>{daily.length}</Text></Column>
      </Row>
      <Row stackOnMobile={false} style={{ backgroundColor: PLOT, color: PLOT_TEXT, gap: 8, alignItems: "end" }}>
        <Column style={{ padding: [15, 0, 20, 36], mobile: { padding: [13, 0, 18, 16] } }}>
          <Text style={{ fontSize: 15, lineHeight: 1.4 }}>
            {peak > 0 ? <><Span style={{ color: PEAK, fontWeight: 700 }}>Peak</Span>{` ${dateLabel(peakIndex)} · ${number(peak)}`}</> : `No ${unit.plural} recorded.`}
          </Text>
        </Column>
        <Column style={{ width: 135, padding: [0, 36, 20, 0], mobile: { padding: [0, 16, 18, 0] } }}>
          <Text style={{ fontSize: 14, color: PLOT_QUIET, textAlign: "right" }}><Span style={{ color: WEEKEND }}>■</Span> Weekends</Text>
        </Column>
      </Row>
    </>
  );
}

function PlanMeter({ planName, planLimit, unit, total, ratio, month }: Pick<UsageReportData, "planName" | "planLimit" | "unit"> & { total: number; ratio: number; month: Date }) {
  const overLimit = ratio > 1;
  const tone = overLimit ? ALERT : ratio >= 0.8 ? AMBER : GREEN;
  const background = overLimit ? ALERT_WASH : ratio >= 0.8 ? WARN_WASH : CALM_WASH;
  const status = overLimit ? "Over the limit" : ratio === 1 ? "Limit reached" : ratio >= 0.8 ? "Approaching limit" : "Within limit";
  const figure = `${number(total)} of ${quantity(planLimit, unit)}`;
  // Keep both segments visible when the included usage or excess is less than one percent of the bar.
  const includedShare = overLimit ? Math.max(0.01, Math.min(0.99, 1 / ratio)) : ratio;
  return (
    <>
      <Row stackOnMobile={false} style={{ backgroundColor: background, gap: 8, alignItems: "end" }}>
        <Column style={{ padding: [19, 0, 9, 36], mobile: { padding: [17, 0, 9, 16] } }}>
          <Heading level={2} style={smallHeading}>{planName} plan</Heading>
        </Column>
        <Column style={{ width: 182, padding: [0, 36, 9, 0], mobile: { padding: [0, 16, 9, 0] } }}>
          <Text style={{ fontSize: 14, color: tone, fontWeight: 700, textAlign: "right" }}>{status}</Text>
        </Column>
      </Row>
      <Row stackOnMobile={false} style={{ backgroundColor: background, gap: 8, alignItems: "end" }}>
        <Column style={{ padding: [0, 0, 9, 36], mobile: { padding: [0, 0, 9, 16] } }}>
          <Text style={label}>{figure}</Text>
        </Column>
        <Column style={{ width: 135, padding: [0, 36, 9, 0], mobile: { padding: [0, 16, 9, 0] } }}>
          <Text style={{ ...quantityStyle, fontSize: 18, color: tone }}>{usagePercent(ratio)}</Text>
        </Column>
      </Row>
      <Row style={{ backgroundColor: background }}>
        <Column style={insets}>
          {overLimit ? fillBar(includedShare, 10, ALERT, INK) : fillBar(includedShare, 8, RULE, tone)}
        </Column>
      </Row>
      <Row style={{ backgroundColor: background }}>
        <Column style={{ padding: [10, 36, 19], gap: 6, mobile: { padding: [10, 16, 17] } }}>
          {overLimit && (
            <Text style={{ fontSize: 15, color: tone, fontWeight: 700 }}>
              {`■ ${quantity(normalize(total - planLimit), unit)} over the limit`}
            </Text>
          )}
          <Text style={{ color: QUIET, fontSize: 15, lineHeight: 1.45 }}>{usageForecast(month, total, planLimit, unit)}</Text>
        </Column>
      </Row>
    </>
  );
}

function Breakdown({ breakdown = [], breakdownTitle, breakdownNameStyle, total }: Pick<UsageReportData, "breakdown" | "breakdownTitle" | "breakdownNameStyle"> & { total: number }) {
  const ranked = [...breakdown].sort((a, b) => b.count - a.count);
  return (
    <>
      <Row style={{ backgroundColor: PAPER }}>
        <Column style={{ padding: [27, 36, 5], mobile: { padding: [23, 16, 4] } }}>
          <Heading level={2} style={smallHeading}>{breakdownTitle}</Heading>
          {ranked.length === 0 && <Text style={{ color: QUIET, padding: [8, 0, 0] }}>No breakdown data for this month.</Text>}
        </Column>
      </Row>
      {ranked.flatMap(({ name, count }) => [
        <Row key={`${name}-label`} stackOnMobile={false} style={{ backgroundColor: PAPER, alignItems: "start", gap: 8 }}>
          <Column style={{ padding: [11, 0, 6, 36], mobile: { padding: [11, 0, 6, 16] } }}>
            <Text style={breakdownNameStyle === "code" ? mono : { fontSize: 15 }}>{name}</Text>
          </Column>
          <Column style={{ width: 106, padding: [11, 36, 6, 0], mobile: { padding: [11, 16, 6, 0] } }}>
            <Text style={quantityStyle}>{number(count)}</Text>
          </Column>
        </Row>,
        <Row key={`${name}-bar`} style={{ backgroundColor: PAPER }}>
          <Column style={insets}>{fillBar(total > 0 ? count / total : 0, 3, TINT, RUST)}</Column>
        </Row>,
      ])}
    </>
  );
}

function figureValue(value: number, unit: string) {
  return `${number(value).replaceAll("-", "−")}${unit === "%" ? "%" : ` ${unit}`}`;
}

function figureDelta(value: number, previous: number, unit: string) {
  if (value === previous) return "Unchanged";
  const difference = normalize(Math.abs(value - previous));
  return `${value > previous ? "+" : "−"}${figureValue(difference, unit === "%" ? "pp" : unit)}`;
}

function Performance({ figures, title }: { figures: readonly Figure[]; title: string }) {
  const showComparison = figures.some(({ previous }) => previous !== undefined);
  return (
    <>
      <Row style={{ backgroundColor: PAPER }}>
        <Column style={{ padding: [27, 36, 11], gap: 4, mobile: { padding: [23, 16, 10] } }}>
          <Heading level={2} style={{ ...smallHeading, fontSize: 19 }}>{title}</Heading>
          {showComparison && <Text style={{ fontSize: 14, color: QUIET }}>Change from last month</Text>}
        </Column>
      </Row>
      <Row stackOnMobile={false} style={{ backgroundColor: PAPER, gap: 15, mobile: { gap: 10 } }}>
        {figures.map(({ label: name, value, unit, previous }, index) => (
          <Column key={name} style={{ ...(index === 0 ? leftInset : {}), ...(index === figures.length - 1 ? rightInset : {}), ...(figures.length === 1 ? insets : {}), gap: 4 }}>
            <Divider style={{ borderTop: `1px solid ${RULE}` }} />
            <Text style={{ fontSize: 14, lineHeight: 1.4, color: QUIET, padding: [4, 0, 0] }}>{name}</Text>
            <Text style={{ ...mono, fontSize: 22, lineHeight: 1.15, mobile: { fontSize: 18 } }}>{figureValue(value, unit)}</Text>
            {previous !== undefined && (
              <Text style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 700, color: value > previous ? GREEN : value < previous ? RUST : QUIET }}>
                {figureDelta(value, previous, unit)}
              </Text>
            )}
          </Column>
        ))}
      </Row>
    </>
  );
}

export default function KestrelUsageReport({ data = exampleUsage }: KestrelUsageReportProps = {}) {
  const month = monthStart(data.month);
  const { daily, workspace, previousTotal, planName, planLimit, unit, performance = [] } = data;
  if (daily.length !== daysInMonth(month)) {
    throw new RangeError(`Give one value for each of ${monthName.format(month)}’s ${daysInMonth(month)} UTC days.`);
  }
  if (![...daily, previousTotal, planLimit, ...(data.breakdown ?? []).map(({ count }) => count)].every((count) => Number.isFinite(count) && count >= 0) || planLimit === 0) {
    throw new RangeError("Usage values must be finite and nonnegative, and the plan limit must be positive.");
  }

  const site = companySite(data);
  const total = sumUsage(daily);
  const ratio = normalize(total / planLimit);
  const overLimit = ratio > 1;
  const change = previousTotal > 0 ? (total - previousTotal) / previousTotal : null;
  const previous = monthName.format(shiftMonth(month, -1));
  const period = monthAndYear.format(month);
  const changeLabel = change === null || change === 0 ? "" : Math.abs(change) < 0.0005
    ? (change > 0 ? "<+0.1%" : ">−0.1%")
    : Math.abs(change) >= 10
      ? `${change > 0 ? "+" : "−"}${number(Math.abs(change) * 100)}%`
      : signed.format(change).replaceAll("-", "−");

  return (
    <Email
      width={616}
      lang="en"
      title={`${data.companyName} usage report · ${period}`}
      previewText={`${workspace} used ${quantity(total, unit)} in ${monthName.format(month)}, ${usagePercent(ratio)} of the ${planName} plan.`}
      fonts={[
        { family: "Figtree", src: "https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4S9DaRvzig.woff2", format: "woff2", weight: "300 900" },
        { family: "DM Mono", src: "https://fonts.gstatic.com/s/dmmono/v16/aFTU7PB1QTsUX8KYthqQBK6PYK0.woff2", format: "woff2", weight: 400 },
      ]}
      style={{ backgroundColor: DESK, color: INK, fontFamily: SANS, fontSize: 16, lineHeight: 1.5 }}
    >
      <Section style={{ padding: [24, 10] }}>
        <Row stackOnMobile={false} style={{ backgroundColor: PAPER, gap: 8, alignItems: "center" }}>
          <Column style={{ padding: [25, 0, 15, 36], mobile: { padding: [20, 0, 12, 16] } }}>
            <Text style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, mobile: { fontSize: 21 } }}>
              <Link href={site} style={{ color: INK, textDecoration: "none" }}>{data.companyName}<Span style={{ color: RUST }}>.</Span></Link>
            </Text>
          </Column>
          <Column style={{ width: 155, padding: [25, 36, 15, 0], mobile: { padding: [20, 16, 12, 0] } }}>
            <Text style={{ ...label, textAlign: "right" }}>USAGE REPORT</Text>
          </Column>
        </Row>
        <Row style={{ backgroundColor: PAPER }}>
          <Column style={{ padding: [0, 36, 26], gap: 8, mobile: { padding: [0, 16, 23] } }}>
            <Divider style={{ borderTop: `1px solid ${INK}` }} />
            <Text style={{ ...label, padding: [10, 0, 0] }}>{period} · {workspace}</Text>
            <Heading level={1} style={{ fontFamily: SANS, fontSize: 80, fontWeight: 700, lineHeight: 1, mobile: { fontSize: 59 } }}>{number(total)}</Heading>
            <Text style={{ fontSize: 18, lineHeight: 1.4, color: QUIET, mobile: { fontSize: 16 } }}>
              <Span style={{ color: INK, fontWeight: 700 }}>{data.metricLabel}</Span>{" · "}
              {change === null
                ? `No usage in ${previous}`
                : change === 0
                  ? `Unchanged from ${previous}`
                  : <><Span style={{ color: change > 0 ? GREEN : RUST, fontWeight: 700 }}>{changeLabel}</Span>{` vs. ${previous}`}</>}
            </Text>
          </Column>
        </Row>
        <DailyChart month={month} daily={daily} unit={unit} />
        <PlanMeter planName={planName} planLimit={planLimit} unit={unit} total={total} ratio={ratio} month={month} />
        <Breakdown breakdown={data.breakdown} breakdownTitle={data.breakdownTitle} breakdownNameStyle={data.breakdownNameStyle} total={total} />
        {performance.length > 0 && <Performance figures={performance} title={data.performanceTitle || "Performance"} />}
        <Row style={{ backgroundColor: PAPER }}>
          <Column style={{ padding: [24, 36, 16], mobile: { padding: [22, 16, 14] } }}>
            <Divider style={{ borderTop: `1px solid ${RULE}` }} />
          </Column>
        </Row>
        <Row stackOnMobile={false} style={{ backgroundColor: PAPER, alignItems: "center", gap: 14 }}>
          <Column style={{ width: 198, padding: [0, 0, 27, 36], mobile: { padding: [0, 0, 23, 16] } }}>
            <Button href={overLimit ? data.planUrl : data.usageUrl} style={{ width: "100%", padding: [13, 0], backgroundColor: RUST, color: PAPER, fontSize: 15, fontWeight: 700 }}>
              {overLimit ? "Upgrade plan" : "See full usage"}
            </Button>
          </Column>
          <Column style={{ padding: [0, 36, 27, 0], mobile: { padding: [0, 16, 23, 0] } }}>
            <Text style={{ fontSize: 15 }}><Link href={overLimit ? data.usageUrl : data.planUrl} style={{ color: RUST, fontWeight: 700 }}>{overLimit ? "See full usage" : "Change plan"}</Link></Text>
          </Column>
        </Row>
        <Row>
          <Column style={{ padding: [16, 18, 0], gap: 4, mobile: { padding: [13, 8, 0] } }}>
            <Text style={{ fontSize: 14, color: QUIET }}>
              Usage updates for {workspace}.{" "}<Link href={data.notificationsUrl} style={{ color: RUST }}>{"Manage notifications"}</Link>
            </Text>
            <Text style={{ fontSize: 14, color: QUIET }}>{data.companyName} · {data.postalAddress}</Text>
          </Column>
        </Row>
      </Section>
    </Email>
  );
}
