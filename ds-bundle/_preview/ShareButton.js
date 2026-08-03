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

  // .design-sync/previews/ShareButton.tsx
  var ShareButton_exports = {};
  __export(ShareButton_exports, {
    Default: () => Default,
    InSpotHeader: () => InSpotHeader,
    OnCard: () => OnCard
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

  // .design-sync/previews/ShareButton.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ShareButton, { url: "https://waterman.app/report/scheveningen-noord", title: "Scheveningen Noord — 19 kt NW" });
  var InSpotHeader = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full max-w-xl flex items-start justify-between gap-4 border-b border-ink/15 pb-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Heading, { level: 2, children: "Scheveningen Noord" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "19 kt NW gusting 26 kt · 0.8 m · water 17°C" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 87, sport: "wingfoil", size: "md" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ShareButton, { url: "https://waterman.app/report/scheveningen-noord", title: "Scheveningen Noord" })
    ] })
  ] });
  var OnCard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "max-w-sm", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { variant: "elevated", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Brouwersdam" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "Saturday 07:00 – 09:15 · 2h 15m" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ShareButton, { url: "https://waterman.app/report/brouwersdam", title: "Brouwersdam session" })
  ] }) }) });
  return __toCommonJS(ShareButton_exports);
})();
