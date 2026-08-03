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

  // .design-sync/previews/SessionCard.tsx
  var SessionCard_exports = {};
  __export(SessionCard_exports, {
    Default: () => Default,
    JournalFeed: () => JournalFeed,
    SportVariants: () => SportVariants,
    WithoutNotes: () => WithoutNotes
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

  // .design-sync/previews/SessionCard.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var scheveningen = {
    _id: "j5k2n8q1r4t7v0w3x6y9z2a5",
    sport: "wingfoil",
    spotName: "Scheveningen Noord",
    sessionDate: "2026-08-01T14:20:00",
    durationMinutes: 135,
    rating: 5,
    hasForecastData: true,
    sessionNotes: "Solid 19 kt NW filling in with the sea breeze. 5m wing, 1100 front foil — clean shoulder-high runs on the outside bank all afternoon."
  };
  var zandvoort = {
    _id: "b8c1d4e7f0g3h6i9j2k5l8m1",
    sport: "kitesurfing",
    spotName: "Zandvoort",
    sessionDate: "2026-07-28T10:05:00",
    durationMinutes: 90,
    rating: 3,
    hasForecastData: false,
    sessionNotes: "Gusty 24 kt WSW, 9m felt overpowered in the peaks. Water 17°C."
  };
  var wijkAanZee = {
    _id: "n4o7p0q3r6s9t2u5v8w1x4y7",
    sport: "surfing",
    spotName: "Wijk aan Zee",
    sessionDate: "2026-07-24T07:40:00",
    durationMinutes: 55,
    rating: 2,
    hasForecastData: true,
    sessionNotes: "0.8 m windswell, short period and closing out on the low tide push."
  };
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-xl", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: scheveningen }) });
  var SportVariants = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3 max-w-xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: scheveningen }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: zandvoort }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: wijkAanZee })
  ] });
  var WithoutNotes = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3 max-w-xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.SessionCard,
      {
        entry: {
          _id: "c2d5e8f1g4h7i0j3k6l9m2n5",
          sport: "wingfoil",
          spotName: "Brouwersdam",
          sessionDate: "2026-07-19T16:00:00",
          durationMinutes: 105,
          rating: 4,
          hasForecastData: false
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.SessionCard,
      {
        entry: {
          _id: "d6e9f2g5h8i1j4k7l0m3n6o9",
          sport: "kitesurfing",
          customLocation: "Grevelingenmeer — north shore",
          sessionDate: "2025-09-12T13:15:00",
          durationMinutes: 45,
          rating: 3,
          hasForecastData: false
        }
      }
    )
  ] });
  var JournalFeed = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "max-w-xl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-headline text-xl text-ink mb-1", children: "Recent sessions" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-body text-sm text-ink/50 mb-4", children: "12 logged this season · 21h 40m on the water" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: scheveningen }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: zandvoort }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.SessionCard, { entry: wijkAanZee })
    ] })
  ] });
  return __toCommonJS(SessionCard_exports);
})();
