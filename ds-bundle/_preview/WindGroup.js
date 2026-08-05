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

  // .design-sync/previews/WindGroup.tsx
  var WindGroup_exports = {};
  __export(WindGroup_exports, {
    InForecastTable: () => InForecastTable,
    MissingReadings: () => MissingReadings,
    WithGusts: () => WithGusts,
    WithoutGusts: () => WithoutGusts
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

  // .design-sync/previews/WindGroup.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var WithGusts = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3 font-data text-[0.95rem] text-ink", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 12.4, gust: 16.1, direction: 42 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 19.2, gust: 24.8, direction: 315 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 24.6, gust: 31.3, direction: 247 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 31.7, gust: 41.2, direction: 202 })
  ] });
  var WithoutGusts = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3 font-data text-[0.95rem] text-ink", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 8.3, gust: 11.9, direction: 90, showGust: false }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 16.5, gust: 22.4, direction: 225, showGust: false }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 27.1, gust: 35, direction: 270, showGust: false })
  ] });
  var MissingReadings = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3 font-data text-[0.95rem] text-ink", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 18.6, gust: void 0, direction: 247 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: void 0, gust: void 0, direction: 247 }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: 18.6, gust: 23.4, direction: null })
  ] });
  var InForecastTable = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-col border-t border-ink/20 font-data text-[0.95rem] text-ink", style: { maxWidth: 420 }, children: [
    { hour: "08:00", speed: 14.2, gust: 18.7, direction: 42 },
    { hour: "11:00", speed: 19.8, gust: 25.1, direction: 315 },
    { hour: "14:00", speed: 24.3, gust: 30.9, direction: 247 },
    { hour: "17:00", speed: 21, gust: 27.6, direction: 292 }
  ].map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-6 py-3 px-2 border-b border-ink/20", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold", style: { width: 56 }, children: row.hour }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WindGroup, { speed: row.speed, gust: row.gust, direction: row.direction })
  ] }, row.hour)) });
  return __toCommonJS(WindGroup_exports);
})();
