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

  // .design-sync/previews/Icon.tsx
  var Icon_exports = {};
  __export(Icon_exports, {
    Basic: () => Basic,
    InSpotRow: () => InSpotRow,
    Tones: () => Tones,
    WithLabels: () => WithLabels
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

  // node_modules/lucide-react/dist/esm/icons/clock.js
  init_define_import_meta_env();
  var __iconNode = [
    ["path", { d: "M12 6v6l4 2", key: "mmk7yg" }],
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
  ];
  var Clock = createLucideIcon("clock", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/map-pin.js
  init_define_import_meta_env();
  var __iconNode2 = [
    [
      "path",
      {
        d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
        key: "1r0f0z"
      }
    ],
    ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
  ];
  var MapPin = createLucideIcon("map-pin", __iconNode2);

  // node_modules/lucide-react/dist/esm/icons/thermometer.js
  init_define_import_meta_env();
  var __iconNode3 = [
    ["path", { d: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z", key: "17jzev" }]
  ];
  var Thermometer = createLucideIcon("thermometer", __iconNode3);

  // node_modules/lucide-react/dist/esm/icons/trending-up.js
  init_define_import_meta_env();
  var __iconNode4 = [
    ["path", { d: "M16 7h6v6", key: "box55l" }],
    ["path", { d: "m22 7-8.5 8.5-5-5L2 17", key: "1t1m79" }]
  ];
  var TrendingUp = createLucideIcon("trending-up", __iconNode4);

  // node_modules/lucide-react/dist/esm/icons/waves.js
  init_define_import_meta_env();
  var __iconNode5 = [
    [
      "path",
      {
        d: "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
        key: "knzxuh"
      }
    ],
    [
      "path",
      {
        d: "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
        key: "2jd2cc"
      }
    ],
    [
      "path",
      {
        d: "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
        key: "rd2r6e"
      }
    ]
  ];
  var Waves = createLucideIcon("waves", __iconNode5);

  // node_modules/lucide-react/dist/esm/icons/wind.js
  init_define_import_meta_env();
  var __iconNode6 = [
    ["path", { d: "M12.8 19.6A2 2 0 1 0 14 16H2", key: "148xed" }],
    ["path", { d: "M17.5 8a2.5 2.5 0 1 1 2 4H2", key: "1u4tom" }],
    ["path", { d: "M9.8 4.4A2 2 0 1 1 11 8H2", key: "75valh" }]
  ];
  var Wind = createLucideIcon("wind", __iconNode6);

  // .design-sync/previews/Icon.tsx
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var Basic = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waves, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thermometer, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 20 }) })
  ] });
  var WithLabels = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/50", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { size: 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink", children: "19 kt NW" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/50", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waves, { size: 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink", children: "0.8 m" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/50", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thermometer, { size: 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink", children: "17°C" })
    ] })
  ] });
  var Tones = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-faded-ink", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/30", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { size: 20 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-red-accent", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { size: 20 }) })
  ] });
  var InSpotRow = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex max-w-sm flex-col gap-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-ink/15 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/40", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { size: 14 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Scheveningen Noord" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink", children: "19 kt NW" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-ink/15 pb-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/40", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { size: 14 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Zandvoort" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink", children: "16 kt WNW" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Icon, { className: "text-ink/40", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { size: 14 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-body text-sm text-ink", children: "Brouwersdam" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-data text-sm text-ink", children: "24 kt WSW" })
    ] })
  ] });
  return __toCommonJS(Icon_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/clock.js:
lucide-react/dist/esm/icons/map-pin.js:
lucide-react/dist/esm/icons/thermometer.js:
lucide-react/dist/esm/icons/trending-up.js:
lucide-react/dist/esm/icons/waves.js:
lucide-react/dist/esm/icons/wind.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.556.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
