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

  // .design-sync/previews/DirectionIndicator.tsx
  var DirectionIndicator_exports = {};
  __export(DirectionIndicator_exports, {
    Compass: () => Compass,
    InForecastRow: () => InForecastRow,
    OffAxisBearings: () => OffAxisBearings
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

  // .design-sync/previews/DirectionIndicator.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var Bearing = ({ deg, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "flex flex-col items-center gap-1",
      style: { width: 84, flex: "0 0 84px" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DirectionIndicator, { direction: deg, className: "font-data text-ink text-[0.95rem]" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-[0.7rem] text-ink/50", children: label })
      ]
    }
  );
  var Compass = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-start", style: { rowGap: 20, columnGap: 8, maxWidth: 372 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 0, label: "0°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 45, label: "45°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 90, label: "90°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 135, label: "135°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 180, label: "180°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 225, label: "225°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 270, label: "270°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 315, label: "315°" })
  ] });
  var OffAxisBearings = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-start", style: { rowGap: 20, columnGap: 8, maxWidth: 372 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 22, label: "22°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 67, label: "67°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 113, label: "113°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 158, label: "158°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 203, label: "203°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 248, label: "248°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 293, label: "293°" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bearing, { deg: 338, label: "338°" })
  ] });
  var InForecastRow = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "flex flex-col border-t border-ink/20 font-data text-[0.95rem] text-ink",
      style: { maxWidth: 420 },
      children: [
        { hour: "08:00", speed: 14, dir: 42 },
        { hour: "11:00", speed: 19, dir: 135 },
        { hour: "14:00", speed: 24, dir: 247 },
        { hour: "17:00", speed: 21, dir: 315 }
      ].map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          className: "flex items-center justify-between gap-4 py-3 px-2 border-b border-ink/20",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold", children: row.hour }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              row.speed,
              " kn"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DirectionIndicator, { direction: row.dir })
          ]
        },
        row.hour
      ))
    }
  );
  return __toCommonJS(DirectionIndicator_exports);
})();
