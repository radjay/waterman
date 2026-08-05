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
      function jsxs(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsxs;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs : jsx2)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/ForecastComparison.tsx
  var ForecastComparison_exports = {};
  __export(ForecastComparison_exports, {
    Default: () => Default,
    MultipleSlots: () => MultipleSlots,
    NoForecastData: () => NoForecastData,
    WindOnly: () => WindOnly
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

  // .design-sync/previews/ForecastComparison.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var epicSlot = {
    _id: "fs_scheveningen_1400",
    timestamp: (/* @__PURE__ */ new Date("2026-08-01T14:00:00")).getTime(),
    speed: 22,
    gust: 27,
    direction: 135,
    waveHeight: 1.2,
    wavePeriod: 7,
    score: {
      value: 92,
      reasoning: "Steady 22 kt NW cross-onshore with only 5 kt of gust spread, and a 1.2 m swell on the mid-tide push — textbook Scheveningen wing conditions."
    }
  };
  var idealSlot = {
    _id: "fs_scheveningen_1600",
    timestamp: (/* @__PURE__ */ new Date("2026-08-01T16:00:00")).getTime(),
    speed: 19,
    gust: 24,
    direction: 150,
    waveHeight: 0.9,
    wavePeriod: 6,
    score: {
      value: 81,
      reasoning: "Wind eases as the sea breeze backs off, still powered on a 5m."
    }
  };
  var fadingSlot = {
    _id: "fs_scheveningen_1800",
    timestamp: (/* @__PURE__ */ new Date("2026-08-01T18:00:00")).getTime(),
    speed: 13,
    gust: 18,
    direction: 170,
    waveHeight: 0.6,
    wavePeriod: 5,
    score: {
      value: 54,
      reasoning: "Dropping under 14 kt — marginal unless you size up to a 6m."
    }
  };
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-2xl", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ForecastComparison, { forecastSlots: [epicSlot], sport: "wingfoil" }) });
  var MultipleSlots = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-2xl", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ForecastComparison,
    {
      forecastSlots: [epicSlot, idealSlot, fadingSlot],
      sport: "wingfoil"
    }
  ) });
  var WindOnly = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-2xl", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ForecastComparison,
    {
      forecastSlots: [
        {
          _id: "fs_brouwersdam_1200",
          timestamp: (/* @__PURE__ */ new Date("2026-07-30T12:00:00")).getTime(),
          speed: 24,
          gust: 29,
          direction: 70,
          score: {
            value: 78,
            reasoning: "Flat-water WSW on the Brouwersdam inside — consistent all session."
          }
        }
      ],
      sport: "kitesurfing"
    }
  ) });
  var NoForecastData = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-2xl", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ForecastComparison, { forecastSlots: [], sport: "surfing" }) });
  return __toCommonJS(ForecastComparison_exports);
})();
