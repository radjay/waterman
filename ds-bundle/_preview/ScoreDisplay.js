var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.Waterman;
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx2(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs2(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsxs2;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs2 : jsx2)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/ScoreDisplay.tsx
  var ScoreDisplay_exports = {};
  __export(ScoreDisplay_exports, {
    BelowThreshold: () => BelowThreshold,
    InForecastRow: () => InForecastRow,
    ScoreRange: () => ScoreRange,
    Sizes: () => Sizes
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.Waterman;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/ScoreDisplay.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var ScoreRange = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-baseline gap-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 96, size: "lg" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Epic" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 88, size: "lg" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Strong" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 78, size: "lg" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Solid" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 64, size: "lg" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Sailable" })
    ] })
  ] });
  var Sizes = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-baseline gap-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 91, size: "sm" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 91, size: "md" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 91, size: "lg" })
  ] });
  var BelowThreshold = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex max-w-sm flex-col gap-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-ink/15 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Scheveningen Noord" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 82 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-ink/15 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Zandvoort" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 61 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-faded-ink", children: "Ijmuiden" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 47 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-xs text-ink/40", children: "no score under 60" })
      ] })
    ] })
  ] });
  var InForecastRow = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex max-w-md flex-col gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 rounded-card border border-ink/10 p-3 shadow-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink", children: "Scheveningen Noord" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-data text-xs text-faded-ink", children: "19 kn (26*) NW | 0.8m (6s)" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 94, size: "lg" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 rounded-card border border-ink/10 p-3 shadow-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink", children: "Brouwersdam" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-data text-xs text-faded-ink", children: "24 kn (31*) WSW | 0.5m (5s)" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 76, size: "lg" })
    ] })
  ] });
  return __toCommonJS(ScoreDisplay_exports);
})();
