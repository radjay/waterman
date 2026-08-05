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

  // .design-sync/previews/ScoreCard.tsx
  var ScoreCard_exports = {};
  __export(ScoreCard_exports, {
    Clickable: () => Clickable,
    ComingUp: () => ComingUp,
    ScoreTinting: () => ScoreTinting
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

  // .design-sync/previews/ScoreCard.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var ScoreTinting = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex w-full max-w-md flex-col gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.ScoreCard, { score: 94, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Scheveningen Noord" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 94, size: "lg" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ConditionLine, { speed: 19, gust: 26, direction: 315, waveHeight: 0.8, wavePeriod: 6, sport: "wingfoil" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.ScoreCard, { score: 81, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Brouwersdam" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 81, size: "lg" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ConditionLine, { speed: 24, gust: 31, direction: 247, waveHeight: 0.5, wavePeriod: 5, sport: "kitesurfing" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.ScoreCard, { score: 66, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Zandvoort" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 66, size: "lg" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ConditionLine, { speed: 15, gust: 20, direction: 280, waveHeight: 0.6, wavePeriod: 5, sport: "wingfoil" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.ScoreCard, { score: 43, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-faded-ink", children: "Ijmuiden" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink/40", children: "43" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ConditionLine, { speed: 8, gust: 11, direction: 160, waveHeight: 0.3, wavePeriod: 4, sport: "wingfoil" })
    ] })
  ] });
  var Clickable = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex w-full max-w-md flex-col gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreCard, { score: 92, onClick: () => {
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "wingfoil", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink", children: "Scheveningen Noord" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ConditionLine, { speed: 21, gust: 28, direction: 315, waveHeight: 0.8, wavePeriod: 6, sport: "wingfoil" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 92, size: "lg" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreCard, { score: 77, onClick: () => {
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SportBadge, { sport: "kitesurfing", size: 18, className: "text-ink/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink", children: "Brouwersdam" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ConditionLine, { speed: 24, gust: 31, direction: 247, waveHeight: 0.5, wavePeriod: 5, sport: "kitesurfing" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 77, size: "lg" })
    ] }) })
  ] });
  var ComingUp = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex w-full max-w-md flex-col gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-headline text-lg text-ink", children: "Coming up" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreCard, { score: 95, onClick: () => {
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink", children: "Sat morning · Scheveningen Noord" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-data text-xs text-faded-ink", children: "08:00–11:00 · High 06:40 · Low 12:55" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 95, size: "lg" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreCard, { score: 72, onClick: () => {
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink", children: "Sat afternoon · Wijk aan Zee" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-data text-xs text-faded-ink", children: "14:00–17:00 · Water 17°C" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScoreDisplay, { score: 72, size: "lg" })
    ] }) })
  ] });
  return __toCommonJS(ScoreCard_exports);
})();
