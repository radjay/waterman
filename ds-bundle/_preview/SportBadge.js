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

  // .design-sync/previews/SportBadge.tsx
  var SportBadge_exports = {};
  __export(SportBadge_exports, {
    InSpotRows: () => InSpotRows,
    Sizes: () => Sizes,
    Sports: () => Sports,
    Tones: () => Tones
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

  // .design-sync/previews/SportBadge.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var Sports = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 28, className: "text-ink" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Wingfoil" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 28, className: "text-ink" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Kitesurfing" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center gap-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "surfing", size: 28, className: "text-ink" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-[11px] text-faded-ink", children: "Surfing" })
    ] })
  ] });
  var Sizes = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-end gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 14, className: "text-ink" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 20, className: "text-ink" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 28, className: "text-ink" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 40, className: "text-ink" })
  ] });
  var Tones = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 24, className: "text-ink" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 24, className: "text-faded-ink" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 24 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 24, className: "text-red-accent" })
  ] });
  var InSpotRows = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex max-w-sm flex-col gap-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 border-b border-ink/15 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flex-1 font-body text-sm text-ink", children: "Scheveningen Noord" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-xs text-faded-ink", children: "19 kt NW" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 92, size: "sm" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 border-b border-ink/15 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flex-1 font-body text-sm text-ink", children: "Brouwersdam" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-xs text-faded-ink", children: "24 kt WSW" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 84, size: "sm" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "surfing", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flex-1 font-body text-sm text-ink", children: "Wijk aan Zee" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-xs text-faded-ink", children: "1.4 m (9s)" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 67, size: "sm" })
    ] })
  ] });
  return __toCommonJS(SportBadge_exports);
})();
