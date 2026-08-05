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

  // .design-sync/previews/DaySection.tsx
  var DaySection_exports = {};
  __export(DaySection_exports, {
    HighlightedFromDeepLink: () => HighlightedFromDeepLink,
    MultipleSpots: () => MultipleSpots,
    ShowAllFilter: () => ShowAllFilter,
    SingleSpot: () => SingleSpot,
    SurfingWithTides: () => SurfingWithTides
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

  // .design-sync/previews/DaySection.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var at = (hour, minute = 0) => Date.UTC(2024, 4, 15, hour, minute, 0);
  var score = (value, isPersonalized = false) => ({
    _id: `score_${value}`,
    value,
    reasoning: "Steady onshore breeze with a clean short-period swell.",
    factors: { wind: value, wave: value - 8, tide: value - 4, daylight: 100 },
    isPersonalized
  });
  var makeSlots = (spotId, spotName, sport, rows) => rows.map((row, i) => ({
    _id: `${spotId}_slot_${i}`,
    spotId,
    spotName,
    sport,
    isIdeal: false,
    isEpic: false,
    isContextual: false,
    isTideOnly: false,
    waveHeight: 0.8,
    wavePeriod: 6,
    waveDirection: 296,
    ...row
  }));
  var scheveningen = makeSlots(
    "spot_scheveningen_noord",
    "Scheveningen Noord",
    "wingfoil",
    [
      { timestamp: at(8), hour: "08:00", speed: 15.8, gust: 20.4, direction: 238, waveHeight: 0.6, wavePeriod: 5, score: score(58) },
      { timestamp: at(11), hour: "11:00", speed: 21.2, gust: 27, direction: 247, waveHeight: 0.9, wavePeriod: 6, isIdeal: true, score: score(79) },
      { timestamp: at(14), hour: "14:00", speed: 24.6, gust: 31.1, direction: 251, waveHeight: 1.2, wavePeriod: 7, isIdeal: true, isEpic: true, score: score(93) },
      { timestamp: at(17), hour: "17:00", speed: 18.4, gust: 23.3, direction: 268, waveHeight: 1, wavePeriod: 7, score: score(67) }
    ]
  );
  var zandvoort = makeSlots("spot_zandvoort", "Zandvoort", "wingfoil", [
    { timestamp: at(8), hour: "08:00", speed: 13.1, gust: 17.2, direction: 232, waveHeight: 0.5, wavePeriod: 5, score: score(49) },
    { timestamp: at(11), hour: "11:00", speed: 19.7, gust: 25.4, direction: 244, waveHeight: 0.8, wavePeriod: 6, isIdeal: true, score: score(74) },
    { timestamp: at(14), hour: "14:00", speed: 22.9, gust: 28.6, direction: 249, waveHeight: 1.1, wavePeriod: 7, isIdeal: true, score: score(81, true) },
    { timestamp: at(17), hour: "17:00", speed: 16.3, gust: 20.9, direction: 271, waveHeight: 0.9, wavePeriod: 6, score: score(55) }
  ]);
  var zandvoortUnflagged = zandvoort.map((slot) => ({ ...slot, isIdeal: false }));
  var wijkAanZee = makeSlots("spot_wijk_aan_zee", "Wijk aan Zee", "surfing", [
    { timestamp: at(8), hour: "08:00", speed: 8.4, gust: 11.2, direction: 96, waveHeight: 1.4, wavePeriod: 9, waveDirection: 292, isIdeal: true, score: score(84) },
    { timestamp: at(11), hour: "11:00", speed: 10.1, gust: 13.5, direction: 112, waveHeight: 1.2, wavePeriod: 8, waveDirection: 288, score: score(69) },
    { timestamp: at(14), hour: "14:00", speed: 12.7, gust: 16.4, direction: 138, waveHeight: 0.9, wavePeriod: 7, waveDirection: 279, score: score(57) },
    { timestamp: at(17), hour: "17:00", speed: 14.9, gust: 19.1, direction: 154, waveHeight: 0.7, wavePeriod: 6, waveDirection: 271, score: score(44) }
  ]);
  var spotsMap = {
    spot_scheveningen_noord: {
      _id: "spot_scheveningen_noord",
      name: "Scheveningen Noord",
      sports: ["wingfoil", "kitesurfing"],
      url: "https://www.windguru.cz/48557",
      liveReportUrl: "https://www.windguru.cz/station/2329",
      webcamUrl: "https://www.beachcam.nl/scheveningen",
      webcamStreamSource: "iframe"
    },
    spot_zandvoort: {
      _id: "spot_zandvoort",
      name: "Zandvoort",
      sports: ["wingfoil"],
      url: "https://www.windguru.cz/48558",
      liveReportUrl: "https://www.windguru.cz/station/1483"
    },
    spot_wijk_aan_zee: {
      _id: "spot_wijk_aan_zee",
      name: "Wijk aan Zee",
      sports: ["surfing", "wingfoil"],
      url: "https://www.windguru.cz/48559",
      webcamUrl: "https://www.beachcam.nl/wijk-aan-zee",
      webcamStreamSource: "iframe"
    }
  };
  var tidesBySpot = {
    spot_wijk_aan_zee: {
      tides: [
        { type: "high", time: at(9, 40), height: 1.9, timeStr: "09:40" },
        { type: "low", time: at(15, 55), height: 0.3, timeStr: "15:55" }
      ]
    }
  };
  var Report = ({ children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-newsprint", style: { paddingTop: 32 }, children });
  var SingleSpot = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Report, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DaySection,
    {
      day: "Wednesday, May 15",
      slots: [],
      spotsData: { spot_scheveningen_noord: scheveningen },
      selectedSports: ["wingfoil"],
      spotsMap,
      isAuthenticated: true
    }
  ) });
  var MultipleSpots = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Report, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DaySection,
    {
      day: "Wednesday, May 15",
      slots: [],
      spotsData: {
        spot_scheveningen_noord: scheveningen,
        spot_zandvoort: zandvoort
      },
      selectedSports: ["wingfoil"],
      spotsMap,
      isAuthenticated: true
    }
  ) });
  var SurfingWithTides = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Report, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DaySection,
    {
      day: "Wednesday, May 15",
      slots: [],
      spotsData: { spot_wijk_aan_zee: wijkAanZee },
      selectedSports: ["surfing"],
      spotsMap,
      tidesBySpot,
      isAuthenticated: true
    }
  ) });
  var ShowAllFilter = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Report, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DaySection,
    {
      day: "Wednesday, May 15",
      slots: [],
      spotsData: { spot_zandvoort: zandvoortUnflagged },
      selectedSports: ["wingfoil"],
      spotsMap,
      showFilter: "all",
      isAuthenticated: true
    }
  ) });
  var HighlightedFromDeepLink = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Report, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DaySection,
    {
      id: "day-2024-05-15",
      day: "Wednesday, May 15",
      slots: scheveningen,
      spotsData: {},
      selectedSports: ["wingfoil"],
      spotsMap,
      isHighlighted: true,
      isAuthenticated: true
    }
  ) });
  return __toCommonJS(DaySection_exports);
})();
