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

  // .design-sync/previews/MainLayout.tsx
  var MainLayout_exports = {};
  __export(MainLayout_exports, {
    JournalPage: () => JournalPage,
    ReportPage: () => ReportPage
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

  // .design-sync/previews/MainLayout.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var ReportPage = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.MainLayout, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Heading, { level: 1, children: "The Waterman Report" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "Saturday 18 May · Dutch coast" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Divider, { weight: "medium" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Section, { title: "Coming up", action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "ghost", size: "sm", children: "See all" }), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Scheveningen Noord" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "07:00 – 09:15 · 19 kt NW gusting 26 kt · 0.8 m @ 6 s" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 87, sport: "wingfoil", size: "md" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Wijk aan Zee" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "11:00 – 13:30 · 24 kt WSW · 1.1 m @ 7 s" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 72, sport: "kitesurfing", size: "md" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Brouwersdam" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "Sunday 06:40 – 08:20 · 16 kt W · 0.6 m @ 5 s" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 64, sport: "surfing", size: "md" })
      ] }) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Section, { title: "Tide", divided: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "High 06:40 · Low 12:55 · High 19:10 · water 17°C" }) })
  ] });
  var JournalPage = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.MainLayout, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Heading, { level: 2, children: "Session journal" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "14 sessions logged this season" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Divider, { weight: "light" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Section, { title: "May", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { variant: "elevated", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Brouwersdam · wingfoil" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "14 May · 2h 15m · 21 kt SW gusting 28 kt" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 81, sport: "wingfoil", size: "md" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Card, { variant: "elevated", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Zandvoort · surfing" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "9 May · 1h 40m · 0.9 m @ 6 s · water 16°C" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 68, sport: "surfing", size: "md" })
      ] }) })
    ] }) })
  ] });
  return __toCommonJS(MainLayout_exports);
})();
