import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function fmtVal(v, f, compactMoney = false) {
  if (v == null || Number.isNaN(v)) return "\u2014";
  switch (f) {
    case "money":
      return compactMoney ? "SAR " + new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(v) : "SAR " + Math.round(v).toLocaleString("en-US");
    case "pct":
      return `${v.toFixed(1)}%`;
    case "days":
      return `${v.toFixed(v < 10 && v % 1 ? 1 : 0)} d`;
    case "hours":
      return `${Math.round(v)} h`;
    case "num":
      return v % 1 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US");
    default:
      return String(v);
  }
}
const P = {
  overview: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "7", height: "9", rx: "1.5" }),
    /* @__PURE__ */ jsx("rect", { x: "14", y: "3", width: "7", height: "5", rx: "1.5" }),
    /* @__PURE__ */ jsx("rect", { x: "14", y: "12", width: "7", height: "9", rx: "1.5" }),
    /* @__PURE__ */ jsx("rect", { x: "3", y: "16", width: "7", height: "5", rx: "1.5" })
  ] }),
  spend: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M12 3v9l6.4 6.4" })
  ] }),
  pipeline: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M3 5h18l-6 7v6l-6 3v-9z" }) }),
  trend: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M3 17l6-6 4 4 8-8" }),
    /* @__PURE__ */ jsx("path", { d: "M15 7h6v6" })
  ] }),
  clock: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M12 7v5l3 2" })
  ] }),
  route: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "6", cy: "18", r: "2.5" }),
    /* @__PURE__ */ jsx("circle", { cx: "18", cy: "6", r: "2.5" }),
    /* @__PURE__ */ jsx("path", { d: "M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" })
  ] }),
  list: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M9 6h12M9 12h12M9 18h12" }),
    /* @__PURE__ */ jsx("circle", { cx: "4.5", cy: "6", r: "1.2" }),
    /* @__PURE__ */ jsx("circle", { cx: "4.5", cy: "12", r: "1.2" }),
    /* @__PURE__ */ jsx("circle", { cx: "4.5", cy: "18", r: "1.2" })
  ] }),
  status: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M8 12l3 3 5-6" })
  ] }),
  hourglass: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" }) }),
  return: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M9 14L4 9l5-5" }),
    /* @__PURE__ */ jsx("path", { d: "M4 9h11a5 5 0 0 1 0 10h-3" })
  ] }),
  wallet: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "3", y: "6", width: "18", height: "13", rx: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M3 10h18M16 14.5h2" }),
    /* @__PURE__ */ jsx("path", { d: "M6 6V5a2 2 0 0 1 2-2h9" })
  ] }),
  box: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M3 7l9-4 9 4-9 4z" }),
    /* @__PURE__ */ jsx("path", { d: "M3 7v10l9 4 9-4V7M12 11v10" })
  ] }),
  file: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" }),
    /* @__PURE__ */ jsx("path", { d: "M14 3v5h5M9 13h6M9 17h6" })
  ] }),
  stages: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "5", height: "16", rx: "1.5" }),
    /* @__PURE__ */ jsx("rect", { x: "10", y: "8", width: "5", height: "12", rx: "1.5" }),
    /* @__PURE__ */ jsx("rect", { x: "17", y: "12", width: "4", height: "8", rx: "1.5" })
  ] }),
  review: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "6.5" }),
    /* @__PURE__ */ jsx("path", { d: "M20 20l-4.3-4.3M8.5 11l2 2 3.5-4" })
  ] }),
  speed: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M4 18a8 8 0 1 1 16 0" }),
    /* @__PURE__ */ jsx("path", { d: "M12 18l4-6" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "18", r: "1.3" })
  ] }),
  users: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "9", cy: "8", r: "3.5" }),
    /* @__PURE__ */ jsx("path", { d: "M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" }),
    /* @__PURE__ */ jsx("path", { d: "M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 5" })
  ] }),
  scale: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M12 3v18M7 21h10M5 7h14" }),
    /* @__PURE__ */ jsx("path", { d: "M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" })
  ] }),
  savings: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M15 9.5c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3 0 1.2-1.2 2.1-3 2.1-1.4 0-2.5-.5-3-1.5M12 6.5v11" })
  ] }),
  tasks: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "4", y: "3", width: "16", height: "18", rx: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M8 8l1.5 1.5L12 7M8 14l1.5 1.5L12 13M14 8.5h3M14 14.5h3" })
  ] }),
  approval: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" }),
    /* @__PURE__ */ jsx("path", { d: "M9 12l2 2 4-4" })
  ] }),
  dept: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "4", y: "3", width: "16", height: "18", rx: "1.5" }),
    /* @__PURE__ */ jsx("path", { d: "M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" })
  ] }),
  bottleneck: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M4 4h16l-6 8 6 8H4l6-8z" }) }),
  sla: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "13", r: "8" }),
    /* @__PURE__ */ jsx("path", { d: "M12 9v4l2.5 2.5M9 2h6" })
  ] }),
  check: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "3" }),
    /* @__PURE__ */ jsx("path", { d: "M8 12l3 3 5-6" })
  ] }),
  alert: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M12 3l9.5 17H2.5z" }),
    /* @__PURE__ */ jsx("path", { d: "M12 10v4.5M12 17.5v.5" })
  ] }),
  po: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M6 3h12v18l-3-2-3 2-3-2-3 2z" }),
    /* @__PURE__ */ jsx("path", { d: "M9 8h6M9 12h6" })
  ] }),
  chart: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("path", { d: "M3 21h18M6 17V10M11 17V6M16 17v-4M21 17V8" }) }),
  contract: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" }),
    /* @__PURE__ */ jsx("path", { d: "M14 3v5h5M8.5 17c1.5-2 2.5 1 4 0s1.5-1 3 0" })
  ] }),
  calendar: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M3 10h18M8 3v4M16 3v4M12 14v3l2 1" })
  ] }),
  gauge: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M4 17a8 8 0 1 1 16 0" }),
    /* @__PURE__ */ jsx("path", { d: "M12 17V11" }),
    /* @__PURE__ */ jsx("path", { d: "M7 17h10" })
  ] }),
  truck: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M3 6h11v10H3zM14 9h4l3 3v4h-7" }),
    /* @__PURE__ */ jsx("circle", { cx: "7", cy: "18", r: "2" }),
    /* @__PURE__ */ jsx("circle", { cx: "17", cy: "18", r: "2" })
  ] }),
  edit: /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("path", { d: "M4 20h4L19 9l-4-4L4 16z" }),
    /* @__PURE__ */ jsx("path", { d: "M13.5 6.5l4 4" })
  ] })
};
function ReportIcon({ name, className = "w-5 h-5" }) {
  return /* @__PURE__ */ jsx("svg", { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: P[name] });
}
const PALETTE = ["#2A6193", "#699843", "#6A47D6", "#E08E00", "#C22C18", "#0E8C8C", "#B5487A", "#868D80", "#3B82F6", "#A16207"];
function BarChart({ data, fmt, onPick, active, color = "#2A6193" }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  return /* @__PURE__ */ jsx("div", { className: "h-[160px] flex items-end gap-2 pt-4", dir: "ltr", children: data.map((d) => /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: () => onPick?.(d.label),
      title: `${d.label}: ${fmtVal(d.value, fmt)}${d.prev != null ? ` (prev ${fmtVal(d.prev, fmt)})` : ""}`,
      className: "flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1 group",
      children: [
        /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold text-neutral-600 tabular-nums whitespace-nowrap", children: fmtVal(d.value, fmt, true) }),
        /* @__PURE__ */ jsxs("div", { className: "w-full max-w-[42px] flex items-end gap-0.5 h-[100px]", children: [
          d.prev != null && /* @__PURE__ */ jsx("span", { className: "flex-1 rounded-t bg-neutral-200", style: { height: `${d.prev / max * 100}%` } }),
          /* @__PURE__ */ jsx("span", { className: `flex-1 rounded-t transition-all ${active === d.label ? "ring-2 ring-offset-1 ring-neutral-900" : ""} group-hover:opacity-80`, style: { height: `${Math.max(2, d.value / max * 100)}%`, background: color } })
        ] }),
        /* @__PURE__ */ jsx("span", { className: `text-[10px] leading-tight text-center line-clamp-2 ${active === d.label ? "text-neutral-900 font-semibold" : "text-neutral-500"}`, children: d.label })
      ]
    },
    d.label
  )) });
}
function HBarChart({ data, fmt, onPick, active, color = "#2A6193" }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  return /* @__PURE__ */ jsx("ul", { className: "space-y-1.5", children: data.map((d) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => onPick?.(d.label), className: `w-full text-start group rounded-md px-1 -mx-1 py-0 ${active === d.label ? "bg-neutral-100" : ""}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 text-[12px]", children: [
      /* @__PURE__ */ jsx("span", { className: "truncate text-neutral-700 group-hover:text-neutral-950", children: d.label }),
      /* @__PURE__ */ jsx("span", { className: "font-semibold text-neutral-800 tabular-nums whitespace-nowrap", dir: "ltr", children: fmtVal(d.value, fmt, true) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-0.5 h-1.5 rounded-full bg-neutral-100 overflow-hidden relative", children: [
      d.prev != null && /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0 start-0 bg-neutral-300/70 rounded-full", style: { width: `${d.prev / max * 100}%` } }),
      /* @__PURE__ */ jsx("div", { className: "relative h-full rounded-full transition-all group-hover:opacity-80", style: { width: `${d.value / max * 100}%`, background: color } })
    ] })
  ] }) }, d.label)) });
}
function DonutChart({ data, fmt, onPick, active, t }) {
  const size = 124, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const tot = data.reduce((s, d) => s + d.value, 0) || 1;
  let off = 0;
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative flex-shrink-0", style: { width: size, height: size }, children: [
      /* @__PURE__ */ jsxs("svg", { width: size, height: size, className: "-rotate-90", children: [
        /* @__PURE__ */ jsx("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: "#F1F5F9", strokeWidth: stroke }),
        data.map((d, i) => {
          const len = d.value / tot * c;
          const el = /* @__PURE__ */ jsx("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: PALETTE[i % PALETTE.length], strokeWidth: active === d.label ? stroke + 4 : stroke, strokeDasharray: `${Math.max(0, len - 2)} ${c}`, strokeDashoffset: -off, className: "cursor-pointer", onClick: () => onPick?.(d.label) }, d.label);
          off += len;
          return el;
        })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center leading-tight pointer-events-none", children: [
        /* @__PURE__ */ jsx("span", { className: "text-[9.5px] uppercase tracking-wide text-neutral-400", children: t("Total", "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A") }),
        /* @__PURE__ */ jsx("span", { className: `${fmtVal(tot, fmt, true).length > 9 ? "text-[11px]" : "text-[14px]"} font-bold text-neutral-900`, dir: "ltr", children: fmtVal(tot, fmt, true) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("ul", { className: "flex-1 min-w-0 space-y-1", children: data.map((d, i) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => onPick?.(d.label), className: `w-full flex items-center gap-2 text-start text-[12px] rounded-md px-1.5 py-0.5 ${active === d.label ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`, children: [
      /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-sm flex-shrink-0", style: { background: PALETTE[i % PALETTE.length] } }),
      /* @__PURE__ */ jsx("span", { className: "truncate flex-1", children: d.label }),
      /* @__PURE__ */ jsxs("span", { className: "font-semibold text-neutral-800 tabular-nums", children: [
        (d.value / tot * 100).toFixed(0),
        "%"
      ] })
    ] }) }, d.label)) })
  ] });
}
function LineChart({ data, fmt, onPick, active, color = "#2A6193" }) {
  const W = 520, H = 170, pad = 22;
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  const x = (i) => pad + i * (W - pad * 2) / Math.max(1, data.length - 1);
  const y = (v) => H - pad - v / max * (H - pad * 2);
  const path = (k) => data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k] ?? 0)}`).join(" ");
  return /* @__PURE__ */ jsx("div", { dir: "ltr", children: /* @__PURE__ */ jsxs("svg", { viewBox: `0 0 ${W} ${H + 18}`, className: "w-full h-[170px]", children: [
    [0.25, 0.5, 0.75, 1].map((g) => /* @__PURE__ */ jsx("line", { x1: pad, x2: W - pad, y1: y(max * g), y2: y(max * g), stroke: "#EEF0F2" }, g)),
    data.some((d) => d.prev != null) && /* @__PURE__ */ jsx("path", { d: path("prev"), fill: "none", stroke: "#CBD5E1", strokeWidth: 2, strokeDasharray: "4 4" }),
    /* @__PURE__ */ jsx("path", { d: `${path("value")} L${x(data.length - 1)},${H - pad} L${x(0)},${H - pad} Z`, fill: color, opacity: 0.08 }),
    /* @__PURE__ */ jsx("path", { d: path("value"), fill: "none", stroke: color, strokeWidth: 2.4, strokeLinejoin: "round" }),
    data.map((d, i) => /* @__PURE__ */ jsxs("g", { className: "cursor-pointer", onClick: () => onPick?.(d.label), children: [
      /* @__PURE__ */ jsx("title", { children: `${d.label}: ${fmtVal(d.value, fmt)}` }),
      /* @__PURE__ */ jsx("circle", { cx: x(i), cy: y(d.value), r: active === d.label ? 6 : 4, fill: "white", stroke: color, strokeWidth: 2 }),
      (data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && /* @__PURE__ */ jsx("text", { x: x(i), y: H + 10, textAnchor: "middle", fontSize: "10", fill: "#6B7280", children: d.label })
    ] }, d.label))
  ] }) });
}
export {
  BarChart,
  DonutChart,
  HBarChart,
  LineChart,
  PALETTE,
  ReportIcon,
  fmtVal
};
