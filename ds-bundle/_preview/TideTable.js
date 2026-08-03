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

  // .design-sync/previews/TideTable.tsx
  var TideTable_exports = {};
  __export(TideTable_exports, {
    DayTides: () => DayTides,
    MissingHeights: () => MissingHeights,
    SideBySide: () => SideBySide,
    TwoDays: () => TwoDays
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

  // .design-sync/previews/TideTable.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var at = (day, hour, minute) => new Date(2026, 7, day, hour, minute).getTime();
  var pad = (n) => String(n).padStart(2, "0");
  var row = (day, hour, minute, type, height) => ({
    time: at(day, hour, minute),
    type,
    height,
    timeStr: `${pad(hour)}:${pad(minute)}`
  });
  var DayTides = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-[360px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.TideTable,
    {
      spotName: "Scheveningen Noord",
      tides: [
        row(3, 6, 40, "high", 1.4),
        row(3, 12, 55, "low", 0.2),
        row(3, 19, 10, "high", 1.5),
        row(4, 1, 20, "low", 0.3)
      ]
    }
  ) });
  var TwoDays = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-[360px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.TideTable,
    {
      spotName: "Brouwersdam",
      tides: [
        row(3, 6, 40, "high", 1.4),
        row(3, 12, 55, "low", 0.2),
        row(3, 19, 10, "high", 1.5),
        row(4, 1, 20, "low", 0.3),
        row(4, 7, 25, "high", 1.6),
        row(4, 13, 40, "low", 0.1),
        row(4, 19, 55, "high", 1.5)
      ]
    }
  ) });
  var MissingHeights = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-[360px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.TideTable,
    {
      spotName: "Wijk aan Zee",
      tides: [
        row(3, 7, 5, "high", 1.3),
        row(3, 13, 20, "low", null),
        row(3, 19, 35, "high", 1.4),
        row(4, 1, 45, "low", null)
      ]
    }
  ) });
  var SideBySide = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-[300px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.TideTable,
      {
        spotName: "Zandvoort",
        tides: [
          row(3, 6, 50, "high", 1.4),
          row(3, 13, 5, "low", 0.2),
          row(3, 19, 20, "high", 1.5)
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-[300px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.TideTable,
      {
        spotName: "Ijmuiden",
        tides: [
          row(3, 6, 15, "high", 1.5),
          row(3, 12, 30, "low", 0.2),
          row(3, 18, 45, "high", 1.6)
        ]
      }
    ) })
  ] });
  return __toCommonJS(TideTable_exports);
})();
