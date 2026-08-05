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

  // .design-sync/previews/FilterBar.tsx
  var FilterBar_exports = {};
  __export(FilterBar_exports, {
    CollapsedOverForecast: () => CollapsedOverForecast,
    Expanded: () => Expanded,
    WithActions: () => WithActions
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

  // node_modules/lucide-react/dist/esm/lucide-react.js
  init_define_import_meta_env();

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/shared/src/utils.js
  init_define_import_meta_env();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var toCamelCase = (string) => string.replace(
    /^([A-Z])|[\s-_]+(\w)/g,
    (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
  );
  var toPascalCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();
  var hasA11yProp = (props) => {
    for (const prop in props) {
      if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
        return true;
      }
    }
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/defaultAttributes.js
  init_define_import_meta_env();
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  var Icon = (0, import_react.forwardRef)(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => (0, import_react.createElement)(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: mergeClasses("lucide", className),
        ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    )
  );

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react2.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(
          `lucide-${toKebabCase(toPascalCase(iconName))}`,
          `lucide-${iconName}`,
          className
        ),
        ...props
      })
    );
    Component.displayName = toPascalCase(iconName);
    return Component;
  };

  // node_modules/lucide-react/dist/esm/icons/plus.js
  init_define_import_meta_env();
  var __iconNode = [
    ["path", { d: "M5 12h14", key: "1ays0h" }],
    ["path", { d: "M12 5v14", key: "s699le" }]
  ];
  var Plus = createLucideIcon("plus", __iconNode);

  // .design-sync/previews/FilterBar.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var noop = () => {
  };
  var pinExpanded = (expanded) => {
    try {
      window.localStorage.setItem("waterman_filters_expanded", String(expanded));
    } catch {
    }
  };
  var SettleEnterAnimation = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `.ds-filterbar [class~="border-t"] { opacity: 1 !important; }` });
  var SPORTS = [
    { id: "", label: "All" },
    { id: "wingfoil", label: "Wing" },
    { id: "kitesurfing", label: "Kite" },
    { id: "surfing", label: "Surf" }
  ];
  var SHOW = [
    { id: "best", label: "Best" },
    { id: "all", label: "All" }
  ];
  var Expanded = () => {
    pinExpanded(true);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ds-filterbar w-full max-w-3xl", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettleEnterAnimation, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.FilterBar, { activeFilters: ["Wing", "Best"], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FilterGroup, { label: "Sport", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.PillToggle, { name: "fb-sport", options: SPORTS, value: "wingfoil", onChange: noop }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FilterGroup, { label: "Show", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.PillToggle, { name: "fb-show", options: SHOW, value: "best", onChange: noop }) })
      ] })
    ] });
  };
  var WithActions = () => {
    pinExpanded(true);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ds-filterbar w-full max-w-3xl", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettleEnterAnimation, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        ds_exports.FilterBar,
        {
          activeFilters: ["Kite"],
          actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "primary", size: "sm", icon: Plus, children: "New session" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FilterGroup, { label: "Sport", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.PillToggle, { name: "fb-actions-sport", options: SPORTS, value: "kitesurfing", onChange: noop }) })
        }
      )
    ] });
  };
  var CollapsedOverForecast = () => {
    pinExpanded(false);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ds-filterbar w-full max-w-3xl", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettleEnterAnimation, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FilterBar, { activeFilters: ["Surf", "Best"], children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.FilterGroup, { label: "Sport", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.PillToggle, { name: "fb-collapsed-sport", options: SPORTS, value: "surfing", onChange: noop }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pt-2 flex flex-col gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Heading, { level: 3, children: "Saturday 18 May" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "Scheveningen Noord · 19 kt NW · 0.8 m · High 06:40 · Low 12:55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "muted", children: "Wijk aan Zee · 24 kt WSW · 1.1 m · High 07:05 · Low 13:20" })
      ] })
    ] });
  };
  return __toCommonJS(FilterBar_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/plus.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.556.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
