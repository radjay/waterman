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

  // .design-sync/previews/Tooltip.tsx
  var Tooltip_exports = {};
  __export(Tooltip_exports, {
    Default: () => Default,
    InToolbar: () => InToolbar,
    Positions: () => Positions,
    Resting: () => Resting
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

  // node_modules/lucide-react/dist/esm/icons/info.js
  init_define_import_meta_env();
  var __iconNode = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "M12 16v-4", key: "1dtifu" }],
    ["path", { d: "M12 8h.01", key: "e9boi3" }]
  ];
  var Info = createLucideIcon("info", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/star.js
  init_define_import_meta_env();
  var __iconNode2 = [
    [
      "path",
      {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
        key: "r04s7s"
      }
    ]
  ];
  var Star = createLucideIcon("star", __iconNode2);

  // node_modules/lucide-react/dist/esm/icons/wind.js
  init_define_import_meta_env();
  var __iconNode3 = [
    ["path", { d: "M12.8 19.6A2 2 0 1 0 14 16H2", key: "148xed" }],
    ["path", { d: "M17.5 8a2.5 2.5 0 1 1 2 4H2", key: "1u4tom" }],
    ["path", { d: "M9.8 4.4A2 2 0 1 1 11 8H2", key: "75valh" }]
  ];
  var Wind = createLucideIcon("wind", __iconNode3);

  // .design-sync/previews/Tooltip.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var ShowTooltips = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `.ds-tip-open [role="tooltip"] { opacity: 1; --tw-translate-y: 0px; }` });
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ds-tip-open", style: { padding: "48px 150px 8px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowTooltips, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "Measured at the Windguru station on the pier", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "icon", "aria-label": "About this reading", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { size: 16 }) }) })
  ] });
  var Positions = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "ds-tip-open flex flex-col items-center",
      style: { padding: "48px 140px", rowGap: "64px" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowTooltips, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "High 06:40 · Low 12:55", position: "top", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "secondary", size: "sm", children: "Top" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "Gusting 26 kt", position: "bottom", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "secondary", size: "sm", children: "Bottom" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "Water 17°C", position: "left", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "secondary", size: "sm", children: "Left" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "0.8 m at 6 s", position: "right", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "secondary", size: "sm", children: "Right" }) })
      ]
    }
  );
  var InToolbar = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "max-w-xl", style: { padding: "52px 8px 8px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShowTooltips, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 border border-ink/15 rounded-card bg-newsprint px-4 py-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "label", children: "Scheveningen Noord" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "Live wind · updated 06:12", className: "ds-tip-open", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "icon", "aria-label": "Live wind", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { size: 16 }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "Save to favourites", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "icon", "aria-label": "Favourite", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { size: 16 }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ScorePill, { score: 87, sport: "wingfoil", size: "sm" })
    ] })
  ] });
  var Resting = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3 py-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Tooltip, { content: "Measured at the Windguru station on the pier", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "icon", "aria-label": "About this reading", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { size: 16 }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Text, { variant: "caption", children: "Resting — the bubble stays hidden until the trigger is hovered." })
  ] });
  return __toCommonJS(Tooltip_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/info.js:
lucide-react/dist/esm/icons/star.js:
lucide-react/dist/esm/icons/wind.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.556.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
