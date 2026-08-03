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

  // .design-sync/previews/ForecastSlot.tsx
  var ForecastSlot_exports = {};
  __export(ForecastSlot_exports, {
    IdealSlot: () => IdealSlot,
    PersonalisedAndFaded: () => PersonalisedAndFaded,
    ScoreRange: () => ScoreRange,
    ShowAllFilter: () => ShowAllFilter,
    SurfingWithTide: () => SurfingWithTide
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

  // .design-sync/previews/ForecastSlot.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var at = (hour) => Date.UTC(2024, 4, 15, hour, 0, 0);
  var score = (value, isPersonalized = false) => ({
    _id: `score_${value}`,
    value,
    reasoning: "Steady onshore breeze with a clean short-period swell.",
    factors: { wind: value, wave: value - 8, tide: value - 4, daylight: 100 },
    isPersonalized
  });
  var slot = (over) => ({
    _id: `slot_${String(over.hour)}_${String(over.spotId ?? "schev")}`,
    spotId: "spot_scheveningen_noord",
    spotName: "Scheveningen Noord",
    timestamp: at(11),
    hour: "11:00",
    speed: 19.4,
    gust: 24.8,
    direction: 247,
    waveHeight: 0.9,
    wavePeriod: 6,
    waveDirection: 296,
    sport: "wingfoil",
    isIdeal: false,
    isEpic: false,
    isContextual: false,
    isTideOnly: false,
    score: score(72),
    ...over
  });
  var Table = ({ children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-col border-t border-ink/20 bg-newsprint", children });
  var IdealSlot = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Table, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ForecastSlot,
    {
      slot: slot({
        hour: "14:00",
        timestamp: at(14),
        speed: 22.6,
        gust: 28.4,
        direction: 247,
        waveHeight: 1.1,
        wavePeriod: 7,
        waveDirection: 288,
        isIdeal: true,
        score: score(88)
      }),
      nearbyTide: null,
      spotName: "Scheveningen Noord"
    }
  ) });
  var ScoreRange = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "08:00",
          timestamp: at(8),
          speed: 26.9,
          gust: 34.2,
          direction: 232,
          waveHeight: 1.6,
          wavePeriod: 9,
          waveDirection: 271,
          isIdeal: true,
          isEpic: true,
          score: score(94)
        }),
        nearbyTide: null,
        spotName: "Scheveningen Noord"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "11:00",
          timestamp: at(11),
          speed: 21.3,
          gust: 27.1,
          direction: 247,
          isIdeal: true,
          score: score(79)
        }),
        nearbyTide: null,
        spotName: "Scheveningen Noord"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "14:00",
          timestamp: at(14),
          speed: 17.5,
          gust: 21.9,
          direction: 268,
          waveHeight: 0.7,
          wavePeriod: 5,
          waveDirection: 302,
          score: score(64)
        }),
        nearbyTide: null,
        spotName: "Scheveningen Noord"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "17:00",
          timestamp: at(17),
          speed: 11.2,
          gust: 14.6,
          direction: 314,
          waveHeight: 0.4,
          wavePeriod: 4,
          waveDirection: 330,
          score: score(38)
        }),
        nearbyTide: null,
        spotName: "Scheveningen Noord"
      }
    )
  ] });
  var ShowAllFilter = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "11:00",
          timestamp: at(11),
          speed: 20.8,
          gust: 26.5,
          direction: 251,
          score: score(71)
        }),
        nearbyTide: null,
        showFilter: "all",
        spotName: "Zandvoort"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "14:00",
          timestamp: at(14),
          speed: 23.4,
          gust: 29.8,
          direction: 244,
          waveHeight: 1.2,
          wavePeriod: 7,
          waveDirection: 284,
          isIdeal: true,
          score: score(86)
        }),
        nearbyTide: null,
        showFilter: "all",
        spotName: "Zandvoort"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "17:00",
          timestamp: at(17),
          speed: 9.6,
          gust: 12.8,
          direction: 22,
          waveHeight: 0.3,
          wavePeriod: 4,
          waveDirection: 12,
          score: score(41)
        }),
        nearbyTide: null,
        showFilter: "all",
        spotName: "Zandvoort"
      }
    )
  ] });
  var SurfingWithTide = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        isSurfing: true,
        slot: slot({
          spotId: "spot_wijk_aan_zee",
          spotName: "Wijk aan Zee",
          hour: "08:00",
          timestamp: at(8),
          speed: 8.4,
          gust: 11.2,
          direction: 96,
          waveHeight: 1.4,
          wavePeriod: 9,
          waveDirection: 292,
          sport: "surfing",
          isIdeal: true,
          score: score(83)
        }),
        nearbyTide: { type: "high", time: at(8) + 40 * 60 * 1e3, height: 1.9, isExactTime: true },
        spotName: "Wijk aan Zee"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        isSurfing: true,
        slot: slot({
          spotId: "spot_wijk_aan_zee",
          spotName: "Wijk aan Zee",
          hour: "11:00",
          timestamp: at(11),
          speed: 10.1,
          gust: 13.5,
          direction: 112,
          waveHeight: 1.2,
          wavePeriod: 8,
          waveDirection: 288,
          sport: "surfing",
          score: score(68)
        }),
        nearbyTide: { isRising: false, isFalling: true, isExactTime: false },
        spotName: "Wijk aan Zee"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        isSurfing: true,
        slot: slot({
          spotId: "spot_wijk_aan_zee",
          spotName: "Wijk aan Zee",
          hour: "14:00",
          timestamp: at(14),
          speed: 12.7,
          gust: 16.4,
          direction: 138,
          waveHeight: 0.9,
          wavePeriod: 7,
          waveDirection: 279,
          sport: "surfing",
          score: score(57)
        }),
        nearbyTide: { type: "low", time: at(14) + 55 * 60 * 1e3, height: 0.3, isExactTime: true },
        spotName: "Wijk aan Zee"
      }
    )
  ] });
  var PersonalisedAndFaded = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "11:00",
          timestamp: at(11),
          speed: 20.2,
          gust: 25.7,
          direction: 249,
          isIdeal: true,
          score: score(81, true)
        }),
        nearbyTide: null,
        spotName: "Brouwersdam"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ForecastSlot,
      {
        slot: slot({
          hour: "20:00",
          timestamp: at(17),
          speed: 18.9,
          gust: 23.1,
          direction: 262,
          waveHeight: 0.8,
          wavePeriod: 6,
          waveDirection: 291,
          isContextual: true,
          score: score(66)
        }),
        nearbyTide: null,
        spotName: "Brouwersdam"
      }
    )
  ] });
  return __toCommonJS(ForecastSlot_exports);
})();
