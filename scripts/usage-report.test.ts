import assert from "node:assert/strict";
import { test } from "node:test";
import { render } from "@hyper-elements/react";
import KestrelUsageReport, { exampleUsage } from "../src/kestrel-usage-report";
import UsageReport from "../templates/usage-report";

const leapMonth = {
  ...exampleUsage, month: "2024-02-29", daily: Array<number>(29).fill(1), breakdown: [],
};

test("rejects inconsistent billing data with the field name", () => {
  const nextMonth = new Date();
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
  for (const [patch, message] of [
    [{ month: nextMonth.toISOString().slice(0, 10) }, /month: .*future/],
    [{ daily: leapMonth.daily.slice(1) }, /daily: expected 29 .* received 28/],
    [{ breakdown: [{ name: "items", count: 0 }, { name: "items", count: 1 }] }, /breakdown\[1\]\.name: duplicate/],
    [{ breakdown: [{ name: "items", count: 30 }] }, /breakdown\[0\]\.count: 30 exceeds/],
    [{ breakdown: [{ name: "a", count: 15 }, { name: "b", count: 15 }] }, /breakdown: .*combined exceed/],
  ] as const) {
    const result = UsageReport.check({ ...leapMonth, ...patch });
    assert.equal(result.valid, false);
    assert(result.diagnostics.some(({ message: text }) => message.test(text)));
  }
});

test("accepts fractional shares up to the total and detects a small excess", () => {
  const daily = [0.3, ...Array<number>(28).fill(0)];
  const breakdown = [{ name: "a", count: 0.1 }, { name: "b", count: 0.2 }];
  assert.equal(UsageReport.check({ ...leapMonth, daily, breakdown }).valid, true);
  assert.throws(() => KestrelUsageReport({ data: {
    ...leapMonth, daily, breakdown: [...breakdown, { name: "c", count: 1e-17 }],
  } }), /breakdown: .*combined exceed/);
});

test("colors signed deltas by improvement and keeps usage growth positive", async () => {
  const { html } = await render(KestrelUsageReport());
  assert.match(html, /color:#974021[^">]*">\+3\sms</);
  assert.match(html, /color:#27644a[^">]*">−8\sms</);
  assert.match(html, /color:#27644a[^">]*">−0\.04\spp</);
  assert.match(html, /color:#27644a[^">]*">\+12%</);

  const figure = { label: "Uptime", unit: "%", previous: 97, better: "higher" } as const;
  for (const [value, expected] of [
    [98, /color:#27644a[^">]*">\+1\spp</],
    [96, /color:#974021[^">]*">−1\spp</],
    [97, /color:#645a51[^">]*">Unchanged</],
  ] as const) {
    const { html } = await render(KestrelUsageReport({ data: { ...exampleUsage, performance: [{ ...figure, value }] } }));
    assert.match(html, expected);
  }
  const performance = [{ label: "Latency", unit: "ms", value: 5, previous: 6 }];
  const result = UsageReport.check({ ...exampleUsage, performance });
  assert.equal(result.values?.performance?.[0].better, "lower");
  const legacy = await render(KestrelUsageReport({ data: { ...exampleUsage, performance } }));
  assert.match(legacy.html, /color:#27644a[^">]*">−1\sms</);
});
