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

  // .design-sync/previews/GlobalNavigation.tsx
  var GlobalNavigation_exports = {};
  __export(GlobalNavigation_exports, {
    OverForecastList: () => OverForecastList,
    SignedOut: () => SignedOut
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

  // .design-sync/previews/GlobalNavigation.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var PageStage = ({ height, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "bg-newsprint border border-ink/10 rounded-card overflow-hidden",
      style: { width: "100%", maxWidth: 820, height, position: "relative", transform: "translateZ(0)" },
      children
    }
  );
  var SignedOut = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageStage, { height: 420, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.GlobalNavigation, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "px-8 pt-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Heading, { level: 1, children: "The Waterman Report" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pt-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Divider, { weight: "light" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Section, { title: "Saturday 18 May", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Scheveningen Noord" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "07:00 – 09:15 · 19 kt NW gusting 26 kt · 0.8 m" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 87, sport: "wingfoil", size: "md" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Wijk aan Zee" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "11:00 – 13:30 · 24 kt WSW · 1.1 m @ 7 s" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 72, sport: "kitesurfing", size: "md" })
        ] }) })
      ] }) })
    ] })
  ] });
  var OverForecastList = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageStage, { height: 260, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.GlobalNavigation, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "px-8 pt-6 flex flex-col gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Heading, { level: 3, children: "Sunday 19 May" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "Ijmuiden · 21 kt SW gusting 28 kt · High 06:40 · Low 12:55" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "Zandvoort · 18 kt WNW · 0.9 m @ 6 s · water 17°C" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "Brouwersdam · 16 kt W · 0.6 m @ 5 s" })
    ] })
  ] });
  return __toCommonJS(GlobalNavigation_exports);
})();
