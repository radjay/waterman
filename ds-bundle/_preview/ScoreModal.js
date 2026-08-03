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

  // .design-sync/previews/ScoreModal.tsx
  var ScoreModal_exports = {};
  __export(ScoreModal_exports, {
    Default: () => Default,
    LowScore: () => LowScore,
    Personalized: () => Personalized,
    ReasoningOnly: () => ReasoningOnly
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

  // .design-sync/previews/ScoreModal.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var noop = () => {
  };
  var Stage = ({ height, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { minHeight: height, width: "100%" }, children });
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stage, { height: 660, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ScoreModal,
    {
      isOpen: true,
      onClose: noop,
      spotName: "Scheveningen Noord",
      slot: { hour: "07:00", sport: "wingfoil" },
      score: {
        value: 87,
        reasoning: "A steady 19 kt from the north-west builds to 24 kt through the morning, with a gust factor of only 1.15 — cross-onshore and very rideable on a 5 m. The 0.8 m swell at 6 s gives clean ramps on the outside, and the tide is pushing in from 06:40 so the sandbar stays covered for the whole window.",
        factors: {
          windQuality: 92,
          waveQuality: 78,
          tideQuality: 85,
          overallConditions: 87
        }
      }
    }
  ) });
  var Personalized = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stage, { height: 660, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ScoreModal,
    {
      isOpen: true,
      onClose: noop,
      spotName: "Wijk aan Zee",
      slot: { hour: "15:00", sport: "kitesurfing" },
      score: {
        _id: "k57b3m1qz9xhd4v0ynp2eaqs",
        value: 94,
        isPersonalized: true,
        reasoning: "You log most of your kite sessions between 20 and 26 kt, and this one sits at 24 kt WSW — side-shore on a mid tide, like your 5-star session here on 14 May.",
        factors: {
          windQuality: 96,
          waveQuality: 71,
          tideQuality: 88,
          overallConditions: 94
        }
      }
    }
  ) });
  var LowScore = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stage, { height: 640, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ScoreModal,
    {
      isOpen: true,
      onClose: noop,
      spotName: "Zandvoort",
      slot: { hour: "11:00", sport: "surfing" },
      score: {
        value: 38,
        reasoning: "Only 0.3 m of leftover windswell at 4 s, and the 15 kt onshore westerly puts chop straight onto the face. Low water at 12:55 pulls the bank dry mid-session. Worth skipping unless you are on a longboard.",
        factors: {
          windQuality: 31,
          waveQuality: 24,
          tideQuality: 55,
          overallConditions: 38
        }
      }
    }
  ) });
  var ReasoningOnly = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stage, { height: 460, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.ScoreModal,
    {
      isOpen: true,
      onClose: noop,
      spotName: "Brouwersdam",
      slot: { hour: "18:00", sport: "wingfoil" },
      score: {
        value: 66,
        reasoning: "Marginal but sailable: 16 kt WSW easing after sunset, flat water inside the dam. Big-wing session — 6 m or up."
      }
    }
  ) });
  return __toCommonJS(ScoreModal_exports);
})();
