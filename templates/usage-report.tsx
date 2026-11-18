import { lint } from "@hyper-elements/lint";
import { prop } from "@hyper-elements/react";
import { template } from "@hyper-elements/react/template";
import KestrelUsageReport, { exampleUsage, type UsageReportData } from "../src/kestrel-usage-report";

const MAX_DAILY = 10_000_000_000;
const MAX_MONTHLY = 31 * MAX_DAILY;

export default template({
  id: "kestrel.UsageReport",
  version: "1.0.0",
  label: "Kestrel monthly usage report",
  guidance: "Use one completed UTC billing month per workspace. The email calculates totals, month-over-month change and next month’s forecast from raw counts.",
  root: "Email",
  fields: {
    workspace: prop.text({
      label: "Workspace name", required: true, maxLength: 36,
      guidance: "Use the name people see in their console.",
    }),
    month: prop.date({
      label: "Billing month", required: true,
      guidance: "Give a date in the completed month, in YYYY-MM-DD format.",
    }),
    daily: prop.list(prop.number({ label: "Requests", min: 0, max: MAX_DAILY, integer: true }), {
      label: "Daily requests", required: true, min: 28, max: 31,
      guidance: "Give one whole count per UTC day in calendar order, including zero for days without traffic.",
    }),
    previousTotal: prop.number({
      label: "Previous month’s requests", required: true, min: 0, max: MAX_MONTHLY, integer: true,
      guidance: "Use a whole count for the previous calendar month. Use 0 if there were no requests.",
    }),
    planName: prop.text({ label: "Plan name", required: true, maxLength: 24 }),
    planLimit: prop.number({
      label: "Monthly request limit", required: true, min: 1, max: MAX_MONTHLY, integer: true,
      guidance: "Give the plan’s monthly allowance as a whole request count.",
    }),
    endpoints: prop.list(
      prop.object({
        path: prop.text({ label: "Route", required: true, maxLength: 20, pattern: "^/[A-Za-z0-9_./{}:-]*$" }),
        requests: prop.number({ label: "Requests", required: true, min: 0, max: MAX_MONTHLY, integer: true }),
      }, { label: "Endpoint" }),
      {
        label: "Top endpoints", max: 5,
        guidance: "Use distinct route paths with no query strings and their whole monthly request counts. The report sorts them by traffic. Omit this list if endpoint data is unavailable.",
      },
    ),
    p50Ms: prop.number({ label: "p50 latency (ms)", required: true, min: 0, max: 9999 }),
    p95Ms: prop.number({ label: "p95 latency (ms)", required: true, min: 0, max: 9999 }),
    errorRate: prop.number({
      label: "Error rate", required: true, min: 0, max: 1,
      guidance: "Give a fraction of total requests. For example, 0.0018 displays as 0.18%.",
    }),
    usageUrl: prop.link({ label: "Full usage URL", required: true, guidance: "Point to the workspace’s usage page." }),
    planUrl: prop.link({ label: "Change plan URL", required: true, guidance: "Point to the workspace’s plan settings." }),
    notificationsUrl: prop.link({ label: "Manage notifications URL", required: true, guidance: "Point to the workspace’s email preferences." }),
  },
  rules: {
    plugins: { lint: lint({ kind: "transactional" }) },
    require: { lint: ["link-text", "lang", "contrast", "preview-text"], core: ["layout/overflow"] },
    root: { lang: true, previewText: true },
    links: { domains: ["kestrel.example"], tags: "deny" },
  },
  example: exampleUsage,
  render(values) {
    const data: UsageReportData = values;
    return KestrelUsageReport({ data });
  },
});
