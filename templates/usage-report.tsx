import { lint } from "@hyper-elements/lint";
import { prop } from "@hyper-elements/react";
import { template } from "@hyper-elements/react/template";
import KestrelUsageReport, { domainPattern, exampleUsage } from "../src/kestrel-usage-report";

const MAX_DAILY = 1_000_000_000_000;
const MAX_MONTHLY = 31 * MAX_DAILY;
const MAX_FIGURE = 1_000_000_000_000;
const HAS_TEXT = "\\S";

export default template({
  id: "kestrel.UsageReport",
  version: "2.1.0",
  label: "Monthly usage report",
  guidance: "Use a completed UTC calendar month and the same unit throughout. The report computes usage, change and next month’s forecast. Every URL must use one of your listed company domains.",
  root: "Email",
  fields: {
    companyName: prop.text({ label: "Company name", required: true, maxLength: 36, pattern: HAS_TEXT }),
    postalAddress: prop.text({ label: "Company mailing address", required: true, maxLength: 120, pattern: HAS_TEXT }),
    linkDomains: prop.list(prop.text({ label: "Company hostname", maxLength: 253, pattern: domainPattern }), {
      label: "Allowed company link domains", required: true, min: 1, max: 5,
      guidance: "List exact hostnames in lower case, such as console.example.com. Put your homepage hostname first. List the other company hosts used by your links separately.",
    }),
    workspace: prop.text({
      label: "Workspace name", required: true, maxLength: 36,
      guidance: "Use the name people see in their console.",
    }),
    month: prop.date({
      label: "Billing month", required: true,
      guidance: "Give a date in the completed month, in YYYY-MM-DD format.",
    }),
    unit: prop.object({
      singular: prop.text({ label: "Singular unit", required: true, maxLength: 20, pattern: HAS_TEXT }),
      plural: prop.text({ label: "Plural unit", required: true, maxLength: 20, pattern: HAS_TEXT }),
    }, {
      label: "Billing unit", required: true,
      guidance: "For example, request and requests, or GB in both fields.",
    }),
    metricLabel: prop.text({ label: "Headline metric label", required: true, maxLength: 36, pattern: HAS_TEXT }),
    daily: prop.list(prop.number({ label: "Usage", min: 0, max: MAX_DAILY }), {
      label: "Daily usage", required: true, min: 28, max: 31,
      guidance: "Give one usage value per UTC day in calendar order, including zero for days without usage. Fractional quantities are allowed.",
    }),
    previousTotal: prop.number({
      label: "Previous month’s usage", required: true, min: 0, max: MAX_MONTHLY,
      guidance: "Use 0 if there was no usage in the previous month.",
    }),
    planName: prop.text({ label: "Plan name", required: true, maxLength: 24 }),
    planLimit: prop.number({
      label: "Monthly usage limit", required: true, min: 0.000001, max: MAX_MONTHLY,
      guidance: "Use the same unit as the daily values.",
    }),
    breakdownTitle: prop.text({ label: "Breakdown title", required: true, maxLength: 36, pattern: HAS_TEXT }),
    breakdownNameStyle: prop.choice(["code", "text"], {
      label: "Breakdown name style", required: true,
      guidance: "Use code for routes or IDs and text for names.",
    }),
    breakdown: prop.list(
      prop.object({
        name: prop.text({ label: "Name", required: true, maxLength: 48, pattern: HAS_TEXT }),
        count: prop.number({ label: "Usage", required: true, min: 0, max: MAX_MONTHLY }),
      }, { label: "Breakdown item" }),
      {
        label: "Breakdown", max: 5,
        guidance: "Use distinct names for non-overlapping parts of the month’s usage. Their counts may cover all or part of the monthly total.",
      },
    ),
    performanceTitle: prop.text({ label: "Performance heading", maxLength: 36 }),
    performance: prop.list(
      prop.object({
        label: prop.text({ label: "Figure label", required: true, maxLength: 24, pattern: HAS_TEXT }),
        value: prop.number({ label: "Value", required: true, min: -MAX_FIGURE, max: MAX_FIGURE }),
        unit: prop.text({ label: "Figure unit", required: true, maxLength: 8, pattern: HAS_TEXT }),
        previous: prop.number({ label: "Last month’s value", min: -MAX_FIGURE, max: MAX_FIGURE }),
        better: prop.choice(["higher", "lower"], {
          label: "Direction of improvement", default: "lower",
          guidance: "Choose lower for latency and error rate, or higher for a figure such as uptime.",
        }),
      }, { label: "Figure" }),
      {
        label: "Performance figures", max: 3,
        guidance: "Omit the list to hide this section. Use % for percentages (give 0.18 for 0.18%). With a previous value, the report shows the absolute change in the same unit, or percentage points for %.",
      },
    ),
    usageUrl: prop.link({ label: "Full usage URL", required: true, guidance: "Point to the workspace’s usage page." }),
    planUrl: prop.link({ label: "Plan and upgrade URL", required: true, guidance: "Point to the page where the workspace can change or upgrade its plan." }),
    notificationsUrl: prop.link({ label: "Manage notifications URL", required: true, guidance: "Point to the workspace’s email preferences." }),
  },
  rules: {
    plugins: { lint: lint({ kind: "transactional" }) },
    require: { lint: ["link-text", "lang", "contrast", "preview-text"], core: ["layout/overflow"] },
    root: { lang: true, previewText: true },
    // Hyper Elements link rules are static. The component also checks every destination against linkDomains.
    links: { tags: "deny" },
  },
  migrate: {
    1({ endpoints, p50Ms, p95Ms, errorRate, ...values }) {
      return {
        ...values,
        companyName: exampleUsage.companyName,
        postalAddress: exampleUsage.postalAddress,
        linkDomains: exampleUsage.linkDomains,
        unit: exampleUsage.unit,
        metricLabel: exampleUsage.metricLabel,
        breakdownTitle: exampleUsage.breakdownTitle,
        breakdownNameStyle: exampleUsage.breakdownNameStyle,
        breakdown: Array.isArray(endpoints) ? endpoints.map(({ path, requests }) => ({ name: path, count: requests })) : [],
        performanceTitle: exampleUsage.performanceTitle,
        performance: [
          { label: "p50 latency", value: p50Ms, unit: "ms" },
          { label: "p95 latency", value: p95Ms, unit: "ms" },
          { label: "Error rate", value: typeof errorRate === "number" ? errorRate * 100 : errorRate, unit: "%" },
        ],
      };
    },
  },
  example: exampleUsage,
  render(values) {
    return KestrelUsageReport({ data: values });
  },
});
