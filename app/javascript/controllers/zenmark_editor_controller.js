// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/zenmark_editor_controller_src.js
import { Controller } from "@hotwired/stimulus";

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/didi/dist/index.js
var CLASS_PATTERN = /^class[ {]/;
function isClass(fn) {
  return CLASS_PATTERN.test(fn.toString());
}
function isArray(obj) {
  return Array.isArray(obj);
}
function hasOwnProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function annotate(...args) {
  if (args.length === 1 && isArray(args[0])) {
    args = args[0];
  }
  args = [...args];
  const fn = args.pop();
  fn.$inject = args;
  return fn;
}
var CONSTRUCTOR_ARGS = /constructor\s*[^(]*\(\s*([^)]*)\)/m;
var FN_ARGS = /^(?:async\s+)?(?:function\s*[^(]*)?(?:\(\s*([^)]*)\)|(\w+))/m;
var FN_ARG = /\/\*([^*]*)\*\//m;
function parseAnnotations(fn) {
  if (typeof fn !== "function") {
    throw new Error(`Cannot annotate "${fn}". Expected a function!`);
  }
  const match = fn.toString().match(isClass(fn) ? CONSTRUCTOR_ARGS : FN_ARGS);
  if (!match) {
    return [];
  }
  const args = match[1] || match[2];
  return args && args.split(",").map((arg) => {
    const argMatch = arg.match(FN_ARG);
    return (argMatch && argMatch[1] || arg).trim();
  }) || [];
}
function Injector(modules, _parent) {
  const parent = _parent || /** @type InjectorContext */
  {
    get: function(name, strict) {
      if (strict === false) {
        return null;
      }
      currentlyResolving.push(name);
      throw error(`No provider for "${name}"!`);
    }
  };
  const currentlyResolving = [];
  const providers = this._providers = Object.create(parent._providers || null);
  const instances = this._instances = /* @__PURE__ */ Object.create(null);
  const self = instances.injector = this;
  const error = function(msg) {
    const stack = currentlyResolving.join(" -> ");
    currentlyResolving.length = 0;
    return new Error(stack ? `${msg} (Resolving: ${stack})` : msg);
  };
  function get(name, strict) {
    if (!providers[name] && name.includes(".")) {
      const parts = name.split(".");
      let pivot = get(
        /** @type { string } */
        parts.shift()
      );
      while (parts.length) {
        pivot = pivot[
          /** @type { string } */
          parts.shift()
        ];
      }
      return pivot;
    }
    if (hasOwnProp(instances, name)) {
      return instances[name];
    }
    if (hasOwnProp(providers, name)) {
      if (currentlyResolving.indexOf(name) !== -1) {
        currentlyResolving.push(name);
        throw error("Cannot resolve circular dependency!");
      }
      currentlyResolving.push(name);
      instances[name] = providers[name][0](providers[name][1]);
      currentlyResolving.pop();
      return instances[name];
    }
    return parent.get(name, strict);
  }
  function fnDef(fn, locals) {
    if (typeof locals === "undefined") {
      locals = {};
    }
    if (typeof fn !== "function") {
      if (isArray(fn)) {
        fn = annotate(fn.slice());
      } else {
        throw error(`Cannot invoke "${fn}". Expected a function!`);
      }
    }
    const inject = fn.$inject || parseAnnotations(fn);
    const dependencies = inject.map((dep) => {
      if (hasOwnProp(locals, dep)) {
        return locals[dep];
      } else {
        return get(dep);
      }
    });
    return {
      fn,
      dependencies
    };
  }
  function instantiate(type) {
    const {
      fn,
      dependencies
    } = fnDef(type);
    const Constructor = Function.prototype.bind.call(fn, null, ...dependencies);
    return new Constructor();
  }
  function invoke(func, context, locals) {
    const {
      fn,
      dependencies
    } = fnDef(func, locals);
    return fn.apply(context, dependencies);
  }
  function createPrivateInjectorFactory(childInjector) {
    return annotate((key) => childInjector.get(key));
  }
  function createChild(modules2, forceNewInstances) {
    if (forceNewInstances && forceNewInstances.length) {
      const fromParentModule = /* @__PURE__ */ Object.create(null);
      const matchedScopes = /* @__PURE__ */ Object.create(null);
      const privateInjectorsCache = [];
      const privateChildInjectors = [];
      const privateChildFactories = [];
      let provider;
      let cacheIdx;
      let privateChildInjector;
      let privateChildInjectorFactory;
      for (let name in providers) {
        provider = providers[name];
        if (forceNewInstances.indexOf(name) !== -1) {
          if (provider[2] === "private") {
            cacheIdx = privateInjectorsCache.indexOf(provider[3]);
            if (cacheIdx === -1) {
              privateChildInjector = provider[3].createChild([], forceNewInstances);
              privateChildInjectorFactory = createPrivateInjectorFactory(privateChildInjector);
              privateInjectorsCache.push(provider[3]);
              privateChildInjectors.push(privateChildInjector);
              privateChildFactories.push(privateChildInjectorFactory);
              fromParentModule[name] = [privateChildInjectorFactory, name, "private", privateChildInjector];
            } else {
              fromParentModule[name] = [privateChildFactories[cacheIdx], name, "private", privateChildInjectors[cacheIdx]];
            }
          } else {
            fromParentModule[name] = [provider[2], provider[1]];
          }
          matchedScopes[name] = true;
        }
        if ((provider[2] === "factory" || provider[2] === "type") && provider[1].$scope) {
          forceNewInstances.forEach((scope) => {
            if (provider[1].$scope.indexOf(scope) !== -1) {
              fromParentModule[name] = [provider[2], provider[1]];
              matchedScopes[scope] = true;
            }
          });
        }
      }
      forceNewInstances.forEach((scope) => {
        if (!matchedScopes[scope]) {
          throw new Error('No provider for "' + scope + '". Cannot use provider from the parent!');
        }
      });
      modules2.unshift(fromParentModule);
    }
    return new Injector(modules2, self);
  }
  const factoryMap = {
    factory: invoke,
    type: instantiate,
    value: function(value) {
      return value;
    }
  };
  function createInitializer(moduleDefinition, injector) {
    const initializers = moduleDefinition.__init__ || [];
    return function() {
      initializers.forEach((initializer) => {
        if (typeof initializer === "string") {
          injector.get(initializer);
        } else {
          injector.invoke(initializer);
        }
      });
    };
  }
  function loadModule(moduleDefinition) {
    const moduleExports = moduleDefinition.__exports__;
    if (moduleExports) {
      const nestedModules = moduleDefinition.__modules__;
      const clonedModule = Object.keys(moduleDefinition).reduce((clonedModule2, key) => {
        if (key !== "__exports__" && key !== "__modules__" && key !== "__init__" && key !== "__depends__") {
          clonedModule2[key] = moduleDefinition[key];
        }
        return clonedModule2;
      }, /* @__PURE__ */ Object.create(null));
      const childModules = (nestedModules || []).concat(clonedModule);
      const privateInjector = createChild(childModules);
      const getFromPrivateInjector = annotate(function(key) {
        return privateInjector.get(key);
      });
      moduleExports.forEach(function(key) {
        providers[key] = [getFromPrivateInjector, key, "private", privateInjector];
      });
      const initializers = (moduleDefinition.__init__ || []).slice();
      initializers.unshift(function() {
        privateInjector.init();
      });
      moduleDefinition = Object.assign({}, moduleDefinition, {
        __init__: initializers
      });
      return createInitializer(moduleDefinition, privateInjector);
    }
    Object.keys(moduleDefinition).forEach(function(key) {
      if (key === "__init__" || key === "__depends__") {
        return;
      }
      const typeDeclaration = (
        /** @type { TypedDeclaration } */
        moduleDefinition[key]
      );
      if (typeDeclaration[2] === "private") {
        providers[key] = typeDeclaration;
        return;
      }
      const type = typeDeclaration[0];
      const value = typeDeclaration[1];
      providers[key] = [factoryMap[type], arrayUnwrap(type, value), type];
    });
    return createInitializer(moduleDefinition, self);
  }
  function resolveDependencies(moduleDefinitions, moduleDefinition) {
    if (moduleDefinitions.indexOf(moduleDefinition) !== -1) {
      return moduleDefinitions;
    }
    moduleDefinitions = (moduleDefinition.__depends__ || []).reduce(resolveDependencies, moduleDefinitions);
    if (moduleDefinitions.indexOf(moduleDefinition) !== -1) {
      return moduleDefinitions;
    }
    return moduleDefinitions.concat(moduleDefinition);
  }
  function bootstrap2(moduleDefinitions) {
    const initializers = moduleDefinitions.reduce(resolveDependencies, []).map(loadModule);
    let initialized = false;
    return function() {
      if (initialized) {
        return;
      }
      initialized = true;
      initializers.forEach((initializer) => initializer());
    };
  }
  this.get = get;
  this.invoke = invoke;
  this.instantiate = instantiate;
  this.createChild = createChild;
  this.init = bootstrap2(modules);
}
function arrayUnwrap(type, value) {
  if (type !== "value" && isArray(value)) {
    value = annotate(value.slice());
  }
  return value;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/inherits-browser/dist/index.es.js
function e(e2, t) {
  t && (e2.super_ = t, e2.prototype = Object.create(t.prototype, { constructor: { value: e2, enumerable: false, writable: true, configurable: true } }));
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/draw/BaseRenderer.js
var DEFAULT_RENDER_PRIORITY = 1e3;
function BaseRenderer(eventBus, renderPriority) {
  var self = this;
  renderPriority = renderPriority || DEFAULT_RENDER_PRIORITY;
  eventBus.on(["render.shape", "render.connection"], renderPriority, function(evt, context) {
    var type = evt.type, element = context.element, visuals = context.gfx, attrs = context.attrs;
    if (self.canRender(element)) {
      if (type === "render.shape") {
        return self.drawShape(visuals, element, attrs);
      } else {
        return self.drawConnection(visuals, element, attrs);
      }
    }
  });
  eventBus.on(["render.getShapePath", "render.getConnectionPath"], renderPriority, function(evt, element) {
    if (self.canRender(element)) {
      if (evt.type === "render.getShapePath") {
        return self.getShapePath(element);
      } else {
        return self.getConnectionPath(element);
      }
    }
  });
}
BaseRenderer.prototype.canRender = function(element) {
};
BaseRenderer.prototype.drawShape = function(visuals, shape) {
};
BaseRenderer.prototype.drawConnection = function(visuals, connection) {
};
BaseRenderer.prototype.getShapePath = function(shape) {
};
BaseRenderer.prototype.getConnectionPath = function(connection) {
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/min-dash/dist/index.js
function flatten(arr) {
  return Array.prototype.concat.apply([], arr);
}
var nativeToString = Object.prototype.toString;
var nativeHasOwnProperty = Object.prototype.hasOwnProperty;
function isUndefined(obj) {
  return obj === void 0;
}
function isDefined(obj) {
  return obj !== void 0;
}
function isNil(obj) {
  return obj == null;
}
function isArray2(obj) {
  return nativeToString.call(obj) === "[object Array]";
}
function isObject(obj) {
  return nativeToString.call(obj) === "[object Object]";
}
function isNumber(obj) {
  return nativeToString.call(obj) === "[object Number]";
}
function isFunction(obj) {
  const tag = nativeToString.call(obj);
  return tag === "[object Function]" || tag === "[object AsyncFunction]" || tag === "[object GeneratorFunction]" || tag === "[object AsyncGeneratorFunction]" || tag === "[object Proxy]";
}
function isString(obj) {
  return nativeToString.call(obj) === "[object String]";
}
function ensureArray(obj) {
  if (isArray2(obj)) {
    return;
  }
  throw new Error("must supply array");
}
function has(target, key) {
  return !isNil(target) && nativeHasOwnProperty.call(target, key);
}
function find(collection, matcher) {
  const matchFn = toMatcher(matcher);
  let match;
  forEach(collection, function(val, key) {
    if (matchFn(val, key)) {
      match = val;
      return false;
    }
  });
  return match;
}
function filter(collection, matcher) {
  const matchFn = toMatcher(matcher);
  let result = [];
  forEach(collection, function(val, key) {
    if (matchFn(val, key)) {
      result.push(val);
    }
  });
  return result;
}
function forEach(collection, iterator) {
  let val, result;
  if (isUndefined(collection)) {
    return;
  }
  const convertKey = isArray2(collection) ? toNum : identity;
  for (let key in collection) {
    if (has(collection, key)) {
      val = collection[key];
      result = iterator(val, convertKey(key));
      if (result === false) {
        return val;
      }
    }
  }
}
function without(arr, matcher) {
  if (isUndefined(arr)) {
    return [];
  }
  ensureArray(arr);
  const matchFn = toMatcher(matcher);
  return arr.filter(function(el, idx) {
    return !matchFn(el, idx);
  });
}
function reduce(collection, iterator, result) {
  forEach(collection, function(value, idx) {
    result = iterator(result, value, idx);
  });
  return result;
}
function every(collection, matcher) {
  return !!reduce(collection, function(matches, val, key) {
    return matches && matcher(val, key);
  }, true);
}
function some(collection, matcher) {
  return !!find(collection, matcher);
}
function map(collection, fn) {
  let result = [];
  forEach(collection, function(val, key) {
    result.push(fn(val, key));
  });
  return result;
}
function keys(collection) {
  return collection && Object.keys(collection) || [];
}
function size(collection) {
  return keys(collection).length;
}
function values(collection) {
  return map(collection, (val) => val);
}
function groupBy(collection, extractor, grouped = {}) {
  extractor = toExtractor(extractor);
  forEach(collection, function(val) {
    let discriminator = extractor(val) || "_";
    let group = grouped[discriminator];
    if (!group) {
      group = grouped[discriminator] = [];
    }
    group.push(val);
  });
  return grouped;
}
function uniqueBy(extractor, ...collections) {
  extractor = toExtractor(extractor);
  let grouped = {};
  forEach(collections, (c) => groupBy(c, extractor, grouped));
  let result = map(grouped, function(val, key) {
    return val[0];
  });
  return result;
}
function sortBy(collection, extractor) {
  extractor = toExtractor(extractor);
  let sorted = [];
  forEach(collection, function(value, key) {
    let disc = extractor(value, key);
    let entry = {
      d: disc,
      v: value
    };
    for (var idx = 0; idx < sorted.length; idx++) {
      let { d } = sorted[idx];
      if (disc < d) {
        sorted.splice(idx, 0, entry);
        return;
      }
    }
    sorted.push(entry);
  });
  return map(sorted, (e2) => e2.v);
}
function matchPattern(pattern) {
  return function(el) {
    return every(pattern, function(val, key) {
      return el[key] === val;
    });
  };
}
function toExtractor(extractor) {
  return isFunction(extractor) ? extractor : (e2) => {
    return e2[extractor];
  };
}
function toMatcher(matcher) {
  return isFunction(matcher) ? matcher : (e2) => {
    return e2 === matcher;
  };
}
function identity(arg) {
  return arg;
}
function toNum(arg) {
  return Number(arg);
}
function debounce(fn, timeout) {
  let timer;
  let lastArgs;
  let lastThis;
  let lastNow;
  function fire(force) {
    let now = Date.now();
    let scheduledDiff = force ? 0 : lastNow + timeout - now;
    if (scheduledDiff > 0) {
      return schedule(scheduledDiff);
    }
    fn.apply(lastThis, lastArgs);
    clear3();
  }
  function schedule(timeout2) {
    timer = setTimeout(fire, timeout2);
  }
  function clear3() {
    if (timer) {
      clearTimeout(timer);
    }
    timer = lastNow = lastArgs = lastThis = void 0;
  }
  function flush() {
    if (timer) {
      fire(true);
    }
    clear3();
  }
  function callback(...args) {
    lastNow = Date.now();
    lastArgs = args;
    lastThis = this;
    if (!timer) {
      schedule(timeout);
    }
  }
  callback.flush = flush;
  callback.cancel = clear3;
  return callback;
}
function bind(fn, target) {
  return fn.bind(target);
}
function assign(target, ...others) {
  return Object.assign(target, ...others);
}
function pick(target, properties) {
  let result = {};
  let obj = Object(target);
  forEach(properties, function(prop) {
    if (prop in obj) {
      result[prop] = target[prop];
    }
  });
  return result;
}
function omit(target, properties) {
  let result = {};
  let obj = Object(target);
  forEach(obj, function(prop, key) {
    if (properties.indexOf(key) === -1) {
      result[key] = prop;
    }
  });
  return result;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/tiny-svg/dist/index.js
function ensureImported(element, target) {
  if (element.ownerDocument !== target.ownerDocument) {
    try {
      return target.ownerDocument.importNode(element, true);
    } catch (e2) {
    }
  }
  return element;
}
function appendTo(element, target) {
  return target.appendChild(ensureImported(element, target));
}
function append(target, node2) {
  appendTo(node2, target);
  return target;
}
var LENGTH_ATTR = 2;
var CSS_PROPERTIES = {
  "alignment-baseline": 1,
  "baseline-shift": 1,
  "clip": 1,
  "clip-path": 1,
  "clip-rule": 1,
  "color": 1,
  "color-interpolation": 1,
  "color-interpolation-filters": 1,
  "color-profile": 1,
  "color-rendering": 1,
  "cursor": 1,
  "direction": 1,
  "display": 1,
  "dominant-baseline": 1,
  "enable-background": 1,
  "fill": 1,
  "fill-opacity": 1,
  "fill-rule": 1,
  "filter": 1,
  "flood-color": 1,
  "flood-opacity": 1,
  "font": 1,
  "font-family": 1,
  "font-size": LENGTH_ATTR,
  "font-size-adjust": 1,
  "font-stretch": 1,
  "font-style": 1,
  "font-variant": 1,
  "font-weight": 1,
  "glyph-orientation-horizontal": 1,
  "glyph-orientation-vertical": 1,
  "image-rendering": 1,
  "kerning": 1,
  "letter-spacing": 1,
  "lighting-color": 1,
  "marker": 1,
  "marker-end": 1,
  "marker-mid": 1,
  "marker-start": 1,
  "mask": 1,
  "opacity": 1,
  "overflow": 1,
  "pointer-events": 1,
  "shape-rendering": 1,
  "stop-color": 1,
  "stop-opacity": 1,
  "stroke": 1,
  "stroke-dasharray": 1,
  "stroke-dashoffset": 1,
  "stroke-linecap": 1,
  "stroke-linejoin": 1,
  "stroke-miterlimit": 1,
  "stroke-opacity": 1,
  "stroke-width": LENGTH_ATTR,
  "text-anchor": 1,
  "text-decoration": 1,
  "text-rendering": 1,
  "unicode-bidi": 1,
  "visibility": 1,
  "word-spacing": 1,
  "writing-mode": 1
};
function getAttribute(node2, name) {
  if (CSS_PROPERTIES[name]) {
    return node2.style[name];
  } else {
    return node2.getAttributeNS(null, name);
  }
}
function setAttribute(node2, name, value) {
  var hyphenated = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  var type = CSS_PROPERTIES[hyphenated];
  if (type) {
    if (type === LENGTH_ATTR && typeof value === "number") {
      value = String(value) + "px";
    }
    node2.style[hyphenated] = value;
  } else {
    node2.setAttributeNS(null, name, value);
  }
}
function setAttributes(node2, attrs) {
  var names = Object.keys(attrs), i, name;
  for (i = 0, name; name = names[i]; i++) {
    setAttribute(node2, name, attrs[name]);
  }
}
function attr(node2, name, value) {
  if (typeof name === "string") {
    if (value !== void 0) {
      setAttribute(node2, name, value);
    } else {
      return getAttribute(node2, name);
    }
  } else {
    setAttributes(node2, name);
  }
  return node2;
}
var toString = Object.prototype.toString;
function classes(el) {
  return new ClassList(el);
}
function ClassList(el) {
  if (!el || !el.nodeType) {
    throw new Error("A DOM element reference is required");
  }
  this.el = el;
  this.list = el.classList;
}
ClassList.prototype.add = function(name) {
  this.list.add(name);
  return this;
};
ClassList.prototype.remove = function(name) {
  if ("[object RegExp]" == toString.call(name)) {
    return this.removeMatching(name);
  }
  this.list.remove(name);
  return this;
};
ClassList.prototype.removeMatching = function(re) {
  const arr = this.array();
  for (let i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      this.remove(arr[i]);
    }
  }
  return this;
};
ClassList.prototype.toggle = function(name, force) {
  if ("undefined" !== typeof force) {
    if (force !== this.list.toggle(name, force)) {
      this.list.toggle(name);
    }
  } else {
    this.list.toggle(name);
  }
  return this;
};
ClassList.prototype.array = function() {
  return Array.from(this.list);
};
ClassList.prototype.has = ClassList.prototype.contains = function(name) {
  return this.list.contains(name);
};
function clear(element) {
  var child;
  while (child = element.firstChild) {
    element.removeChild(child);
  }
  return element;
}
function clone(element) {
  return element.cloneNode(true);
}
var ns = {
  svg: "http://www.w3.org/2000/svg"
};
var SVG_START = '<svg xmlns="' + ns.svg + '"';
function parse(svg) {
  var unwrap = false;
  if (svg.substring(0, 4) === "<svg") {
    if (svg.indexOf(ns.svg) === -1) {
      svg = SVG_START + svg.substring(4);
    }
  } else {
    svg = SVG_START + ">" + svg + "</svg>";
    unwrap = true;
  }
  var parsed = parseDocument(svg);
  if (!unwrap) {
    return parsed;
  }
  var fragment = document.createDocumentFragment();
  var parent = parsed.firstChild;
  while (parent.firstChild) {
    fragment.appendChild(parent.firstChild);
  }
  return fragment;
}
function parseDocument(svg) {
  var parser;
  parser = new DOMParser();
  parser.async = false;
  return parser.parseFromString(svg, "text/xml");
}
function create(name, attrs) {
  var element;
  name = name.trim();
  if (name.charAt(0) === "<") {
    element = parse(name).firstChild;
    element = document.importNode(element, true);
  } else {
    element = document.createElementNS(ns.svg, name);
  }
  if (attrs) {
    attr(element, attrs);
  }
  return element;
}
var node = null;
function getNode() {
  if (node === null) {
    node = create("svg");
  }
  return node;
}
function extend(object, props) {
  var i, k, keys2 = Object.keys(props);
  for (i = 0; k = keys2[i]; i++) {
    object[k] = props[k];
  }
  return object;
}
function createMatrix(a, b, c, d, e2, f) {
  var matrix = getNode().createSVGMatrix();
  switch (arguments.length) {
    case 0:
      return matrix;
    case 1:
      return extend(matrix, a);
    case 6:
      return extend(matrix, {
        a,
        b,
        c,
        d,
        e: e2,
        f
      });
  }
}
function createTransform(matrix) {
  if (matrix) {
    return getNode().createSVGTransformFromMatrix(matrix);
  } else {
    return getNode().createSVGTransform();
  }
}
function remove(element) {
  var parent = element.parentNode;
  if (parent) {
    parent.removeChild(element);
  }
  return element;
}
function wrapMatrix(transformList, transform3) {
  if (transform3 instanceof SVGMatrix) {
    return transformList.createSVGTransformFromMatrix(transform3);
  }
  return transform3;
}
function setTransforms(transformList, transforms) {
  var i, t;
  transformList.clear();
  for (i = 0; t = transforms[i]; i++) {
    transformList.appendItem(wrapMatrix(transformList, t));
  }
}
function transform(node2, transforms) {
  var transformList = node2.transform.baseVal;
  if (transforms) {
    if (!Array.isArray(transforms)) {
      transforms = [transforms];
    }
    setTransforms(transformList, transforms);
  }
  return transformList.consolidate();
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/RenderUtil.js
function componentsToPath(elements) {
  return elements.flat().join(",").replace(/,?([A-Za-z]),?/g, "$1");
}
function move(point) {
  return ["M", point.x, point.y];
}
function lineTo(point) {
  return ["L", point.x, point.y];
}
function curveTo(p1, p2, p3) {
  return ["C", p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
}
function drawPath(waypoints, cornerRadius) {
  const pointCount = waypoints.length;
  const path = [move(waypoints[0])];
  for (let i = 1; i < pointCount; i++) {
    const pointBefore = waypoints[i - 1];
    const point = waypoints[i];
    const pointAfter = waypoints[i + 1];
    if (!pointAfter || !cornerRadius) {
      path.push(lineTo(point));
      continue;
    }
    const effectiveRadius = Math.min(
      cornerRadius,
      vectorLength(point.x - pointBefore.x, point.y - pointBefore.y),
      vectorLength(pointAfter.x - point.x, pointAfter.y - point.y)
    );
    if (!effectiveRadius) {
      path.push(lineTo(point));
      continue;
    }
    const beforePoint = getPointAtLength(point, pointBefore, effectiveRadius);
    const beforePoint2 = getPointAtLength(point, pointBefore, effectiveRadius * 0.5);
    const afterPoint = getPointAtLength(point, pointAfter, effectiveRadius);
    const afterPoint2 = getPointAtLength(point, pointAfter, effectiveRadius * 0.5);
    path.push(lineTo(beforePoint));
    path.push(curveTo(beforePoint2, afterPoint2, afterPoint));
  }
  return path;
}
function getPointAtLength(start, end, length2) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const totalLength = vectorLength(deltaX, deltaY);
  const percent = length2 / totalLength;
  return {
    x: start.x + deltaX * percent,
    y: start.y + deltaY * percent
  };
}
function vectorLength(x, y) {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}
function createLine(points, attrs, radius) {
  if (isNumber(attrs)) {
    radius = attrs;
    attrs = null;
  }
  if (!attrs) {
    attrs = {};
  }
  const line = create("path", attrs);
  if (isNumber(radius)) {
    line.dataset.cornerRadius = String(radius);
  }
  return updateLine(line, points);
}
function updateLine(gfx, points) {
  const cornerRadius = parseInt(gfx.dataset.cornerRadius, 10) || 0;
  attr(gfx, {
    d: componentsToPath(drawPath(points, cornerRadius))
  });
  return gfx;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Elements.js
function getParents(elements) {
  var elementsSet = new Set(elements);
  return filter(elements, function(element) {
    var parent = element.parent;
    while (parent) {
      if (elementsSet.has(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  });
}
function eachElement(elements, fn, depth) {
  depth = depth || 0;
  if (!isArray2(elements)) {
    elements = [elements];
  }
  forEach(elements, function(s, i) {
    var filter2 = fn(s, i, depth);
    if (isArray2(filter2) && filter2.length) {
      eachElement(filter2, fn, depth + 1);
    }
  });
}
function selfAndChildren(elements, unique, maxDepth) {
  var result = /* @__PURE__ */ new Set(), processedChildren = /* @__PURE__ */ new Set();
  eachElement(elements, function(element, i, depth) {
    result.add(element);
    var children = element.children;
    if (maxDepth === -1 || depth < maxDepth) {
      if (children && !processedChildren.has(children)) {
        processedChildren.add(children);
        return children;
      }
    }
  });
  return Array.from(result);
}
function selfAndAllChildren(elements, allowDuplicates) {
  return selfAndChildren(elements, true, -1);
}
function getClosure(elements, isTopLevel, closure) {
  if (isUndefined(isTopLevel)) {
    isTopLevel = true;
  }
  if (isObject(isTopLevel)) {
    closure = isTopLevel;
    isTopLevel = true;
  }
  closure = closure || {};
  var allShapes = copyObject(closure.allShapes), allConnections = copyObject(closure.allConnections), enclosedElements = copyObject(closure.enclosedElements), enclosedConnections = copyObject(closure.enclosedConnections);
  var topLevel = copyObject(
    closure.topLevel,
    isTopLevel && groupBy(elements, function(e2) {
      return e2.id;
    })
  );
  function handleConnection(c) {
    if (topLevel[c.source.id] && topLevel[c.target.id]) {
      topLevel[c.id] = [c];
    }
    if (allShapes[c.source.id] && allShapes[c.target.id]) {
      enclosedConnections[c.id] = enclosedElements[c.id] = c;
    }
    allConnections[c.id] = c;
  }
  function handleElement(element) {
    enclosedElements[element.id] = element;
    if (element.waypoints) {
      enclosedConnections[element.id] = allConnections[element.id] = element;
    } else {
      allShapes[element.id] = element;
      forEach(element.incoming, handleConnection);
      forEach(element.outgoing, handleConnection);
      return element.children;
    }
  }
  eachElement(elements, handleElement);
  return {
    allShapes,
    allConnections,
    topLevel,
    enclosedConnections,
    enclosedElements
  };
}
function getBBox(elements, stopRecursion) {
  stopRecursion = !!stopRecursion;
  if (!isArray2(elements)) {
    elements = [elements];
  }
  var minX, minY, maxX, maxY;
  forEach(elements, function(element) {
    var bbox = element;
    if (element.waypoints && !stopRecursion) {
      bbox = getBBox(element.waypoints, true);
    }
    var x = bbox.x, y = bbox.y, height = bbox.height || 0, width = bbox.width || 0;
    if (x < minX || minX === void 0) {
      minX = x;
    }
    if (y < minY || minY === void 0) {
      minY = y;
    }
    if (x + width > maxX || maxX === void 0) {
      maxX = x + width;
    }
    if (y + height > maxY || maxY === void 0) {
      maxY = y + height;
    }
  });
  return {
    x: minX,
    y: minY,
    height: maxY - minY,
    width: maxX - minX
  };
}
function getType(element) {
  if ("waypoints" in element) {
    return "connection";
  }
  if ("x" in element) {
    return "shape";
  }
  return "root";
}
function isFrameElement(element) {
  return !!(element && element.isFrame);
}
function copyObject(src1, src2) {
  return assign({}, src1 || {}, src2 || {});
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/draw/DefaultRenderer.js
var DEFAULT_RENDER_PRIORITY2 = 1;
function DefaultRenderer(eventBus, styles) {
  BaseRenderer.call(this, eventBus, DEFAULT_RENDER_PRIORITY2);
  this.CONNECTION_STYLE = styles.style(["no-fill"], { strokeWidth: 5, stroke: "fuchsia" });
  this.SHAPE_STYLE = styles.style({ fill: "white", stroke: "fuchsia", strokeWidth: 2 });
  this.FRAME_STYLE = styles.style(["no-fill"], { stroke: "fuchsia", strokeDasharray: 4, strokeWidth: 2 });
}
e(DefaultRenderer, BaseRenderer);
DefaultRenderer.prototype.canRender = function() {
  return true;
};
DefaultRenderer.prototype.drawShape = function drawShape(visuals, element, attrs) {
  var rect = create("rect");
  attr(rect, {
    x: 0,
    y: 0,
    width: element.width || 0,
    height: element.height || 0
  });
  if (isFrameElement(element)) {
    attr(rect, assign({}, this.FRAME_STYLE, attrs || {}));
  } else {
    attr(rect, assign({}, this.SHAPE_STYLE, attrs || {}));
  }
  append(visuals, rect);
  return rect;
};
DefaultRenderer.prototype.drawConnection = function drawConnection(visuals, connection, attrs) {
  var line = createLine(connection.waypoints, assign({}, this.CONNECTION_STYLE, attrs || {}));
  append(visuals, line);
  return line;
};
DefaultRenderer.prototype.getShapePath = function getShapePath(shape) {
  var x = shape.x, y = shape.y, width = shape.width, height = shape.height;
  var shapePath = [
    ["M", x, y],
    ["l", width, 0],
    ["l", 0, height],
    ["l", -width, 0],
    ["z"]
  ];
  return componentsToPath(shapePath);
};
DefaultRenderer.prototype.getConnectionPath = function getConnectionPath(connection) {
  var waypoints = connection.waypoints;
  var idx, point, connectionPath = [];
  for (idx = 0; point = waypoints[idx]; idx++) {
    point = point.original || point;
    connectionPath.push([idx === 0 ? "M" : "L", point.x, point.y]);
  }
  return componentsToPath(connectionPath);
};
DefaultRenderer.$inject = ["eventBus", "styles"];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/draw/Styles.js
function Styles() {
  var defaultTraits = {
    "no-fill": {
      fill: "none"
    },
    "no-border": {
      strokeOpacity: 0
    },
    "no-events": {
      pointerEvents: "none"
    }
  };
  var self = this;
  this.cls = function(className, traits, additionalAttrs) {
    var attrs = this.style(traits, additionalAttrs);
    return assign(attrs, { "class": className });
  };
  this.style = function(traits, additionalAttrs) {
    if (!isArray2(traits) && !additionalAttrs) {
      additionalAttrs = traits;
      traits = [];
    }
    var attrs = reduce(traits, function(attrs2, t) {
      return assign(attrs2, defaultTraits[t] || {});
    }, {});
    return additionalAttrs ? assign(attrs, additionalAttrs) : attrs;
  };
  this.computeStyle = function(custom, traits, defaultStyles) {
    if (!isArray2(traits)) {
      defaultStyles = traits;
      traits = [];
    }
    return self.style(traits || [], assign({}, defaultStyles, custom || {}));
  };
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/draw/index.js
var draw_default = {
  __init__: ["defaultRenderer"],
  defaultRenderer: ["type", DefaultRenderer],
  styles: ["type", Styles]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/domify/index.js
var wrapMap = {
  legend: [1, "<fieldset>", "</fieldset>"],
  tr: [2, "<table><tbody>", "</tbody></table>"],
  col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
  _default: [0, "", ""]
};
wrapMap.td = wrapMap.th = [3, "<table><tbody><tr>", "</tr></tbody></table>"];
wrapMap.option = wrapMap.optgroup = [1, '<select multiple="multiple">', "</select>"];
wrapMap.thead = wrapMap.tbody = wrapMap.colgroup = wrapMap.caption = wrapMap.tfoot = [1, "<table>", "</table>"];
wrapMap.polyline = wrapMap.ellipse = wrapMap.polygon = wrapMap.circle = wrapMap.text = wrapMap.line = wrapMap.path = wrapMap.rect = wrapMap.g = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">', "</svg>"];
function domify(htmlString, document2 = globalThis.document) {
  if (typeof htmlString !== "string") {
    throw new TypeError("String expected");
  }
  const commentMatch = /^<!--(.*?)-->$/s.exec(htmlString);
  if (commentMatch) {
    return document2.createComment(commentMatch[1]);
  }
  const tagName = /<([\w:]+)/.exec(htmlString)?.[1];
  if (!tagName) {
    return document2.createTextNode(htmlString);
  }
  htmlString = htmlString.trim();
  if (tagName === "body") {
    const element2 = document2.createElement("html");
    element2.innerHTML = htmlString;
    const { lastChild } = element2;
    lastChild.remove();
    return lastChild;
  }
  let [depth, prefix, suffix] = Object.hasOwn(wrapMap, tagName) ? wrapMap[tagName] : wrapMap._default;
  let element = document2.createElement("div");
  element.innerHTML = prefix + htmlString + suffix;
  while (depth--) {
    element = element.lastChild;
  }
  if (element.firstChild === element.lastChild) {
    const { firstChild } = element;
    firstChild.remove();
    return firstChild;
  }
  const fragment = document2.createDocumentFragment();
  fragment.append(...element.childNodes);
  return fragment;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/min-dom/dist/index.js
function _mergeNamespaces(n, m) {
  m.forEach(function(e2) {
    e2 && typeof e2 !== "string" && !Array.isArray(e2) && Object.keys(e2).forEach(function(k) {
      if (k !== "default" && !(k in n)) {
        var d = Object.getOwnPropertyDescriptor(e2, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function() {
            return e2[k];
          }
        });
      }
    });
  });
  return Object.freeze(n);
}
function assign2(element, ...styleSources) {
  const target = element.style;
  forEach(styleSources, function(style) {
    if (!style) {
      return;
    }
    forEach(style, function(value, key) {
      target[key] = value;
    });
  });
  return element;
}
function attr2(el, name, val) {
  if (arguments.length == 2) {
    return el.getAttribute(name);
  }
  if (val === null) {
    return el.removeAttribute(name);
  }
  el.setAttribute(name, val);
  return el;
}
var toString2 = Object.prototype.toString;
function classes2(el) {
  return new ClassList2(el);
}
function ClassList2(el) {
  if (!el || !el.nodeType) {
    throw new Error("A DOM element reference is required");
  }
  this.el = el;
  this.list = el.classList;
}
ClassList2.prototype.add = function(name) {
  this.list.add(name);
  return this;
};
ClassList2.prototype.remove = function(name) {
  if ("[object RegExp]" == toString2.call(name)) {
    return this.removeMatching(name);
  }
  this.list.remove(name);
  return this;
};
ClassList2.prototype.removeMatching = function(re) {
  const arr = this.array();
  for (let i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      this.remove(arr[i]);
    }
  }
  return this;
};
ClassList2.prototype.toggle = function(name, force) {
  if ("undefined" !== typeof force) {
    if (force !== this.list.toggle(name, force)) {
      this.list.toggle(name);
    }
  } else {
    this.list.toggle(name);
  }
  return this;
};
ClassList2.prototype.array = function() {
  return Array.from(this.list);
};
ClassList2.prototype.has = ClassList2.prototype.contains = function(name) {
  return this.list.contains(name);
};
function clear2(element) {
  var child;
  while (child = element.firstChild) {
    element.removeChild(child);
  }
  return element;
}
function closest(element, selector, checkYourSelf) {
  var actualElement = checkYourSelf ? element : element.parentNode;
  return actualElement && typeof actualElement.closest === "function" && actualElement.closest(selector) || null;
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var componentEvent = {};
var hasRequiredComponentEvent;
function requireComponentEvent() {
  if (hasRequiredComponentEvent) return componentEvent;
  hasRequiredComponentEvent = 1;
  var bind3, unbind2, prefix;
  function detect() {
    bind3 = window.addEventListener ? "addEventListener" : "attachEvent";
    unbind2 = window.removeEventListener ? "removeEventListener" : "detachEvent";
    prefix = bind3 !== "addEventListener" ? "on" : "";
  }
  componentEvent.bind = function(el, type, fn, capture) {
    if (!bind3) detect();
    el[bind3](prefix + type, fn, capture || false);
    return fn;
  };
  componentEvent.unbind = function(el, type, fn, capture) {
    if (!unbind2) detect();
    el[unbind2](prefix + type, fn, capture || false);
    return fn;
  };
  return componentEvent;
}
var componentEventExports = requireComponentEvent();
var index = /* @__PURE__ */ getDefaultExportFromCjs(componentEventExports);
var event = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [componentEventExports]);
var forceCaptureEvents = ["focus", "blur"];
function bind2(el, selector, type, fn, capture) {
  if (forceCaptureEvents.indexOf(type) !== -1) {
    capture = true;
  }
  return event.bind(el, type, function(e2) {
    var target = e2.target || e2.srcElement;
    e2.delegateTarget = closest(target, selector, true);
    if (e2.delegateTarget) {
      fn.call(el, e2);
    }
  }, capture);
}
function unbind(el, type, fn, capture) {
  if (forceCaptureEvents.indexOf(type) !== -1) {
    capture = true;
  }
  return event.unbind(el, type, fn, capture);
}
var delegate = {
  bind: bind2,
  unbind
};
function query(selector, el) {
  el = el || document;
  return el.querySelector(selector);
}
function all(selector, el) {
  el = el || document;
  return el.querySelectorAll(selector);
}
function remove2(el) {
  el.parentNode && el.parentNode.removeChild(el);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Collections.js
function remove3(collection, element) {
  if (!collection || !element) {
    return -1;
  }
  var idx = collection.indexOf(element);
  if (idx !== -1) {
    collection.splice(idx, 1);
  }
  return idx;
}
function add(collection, element, idx) {
  if (!collection || !element) {
    return;
  }
  if (typeof idx !== "number") {
    idx = -1;
  }
  var currentIdx = collection.indexOf(element);
  if (currentIdx !== -1) {
    if (currentIdx === idx) {
      return;
    } else {
      if (idx !== -1) {
        collection.splice(currentIdx, 1);
      } else {
        return;
      }
    }
  }
  if (idx !== -1) {
    collection.splice(idx, 0, element);
  } else {
    collection.push(element);
  }
}
function indexOf(collection, element) {
  if (!collection || !element) {
    return -1;
  }
  return collection.indexOf(element);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Geometry.js
function pointDistance(a, b) {
  if (!a || !b) {
    return -1;
  }
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
  );
}
function pointsOnLine(p, q, r, accuracy) {
  if (typeof accuracy === "undefined") {
    accuracy = 5;
  }
  if (!p || !q || !r) {
    return false;
  }
  var val = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x), dist = pointDistance(p, q);
  return Math.abs(val / dist) <= accuracy;
}
var ALIGNED_THRESHOLD = 2;
function pointsAligned(a, b) {
  var points = Array.from(arguments).flat();
  const axisMap = {
    "x": "v",
    "y": "h"
  };
  for (const [axis, orientation] of Object.entries(axisMap)) {
    if (pointsAlignedOnAxis(axis, points)) {
      return orientation;
    }
  }
  return false;
}
function pointsAlignedOnAxis(axis, points) {
  const referencePoint = points[0];
  return every(points, function(point) {
    return Math.abs(referencePoint[axis] - point[axis]) <= ALIGNED_THRESHOLD;
  });
}
function pointInRect(p, rect, tolerance) {
  tolerance = tolerance || 0;
  return p.x > rect.x - tolerance && p.y > rect.y - tolerance && p.x < rect.x + rect.width + tolerance && p.y < rect.y + rect.height + tolerance;
}
function getMidPoint(p, q) {
  return {
    x: Math.round(p.x + (q.x - p.x) / 2),
    y: Math.round(p.y + (q.y - p.y) / 2)
  };
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/path-intersection/intersect.js
var p2s = /,?([a-z]),?/gi;
var toFloat = parseFloat;
var math = Math;
var PI = math.PI;
var mmin = math.min;
var mmax = math.max;
var pow = math.pow;
var abs = math.abs;
var pathCommand = /([a-z])[\s,]*((-?\d*\.?\d*(?:e[-+]?\d+)?[\s]*,?[\s]*)+)/ig;
var pathValues = /(-?\d*\.?\d*(?:e[-+]?\d+)?)[\s]*,?[\s]*/ig;
var arcNumber = "-?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?";
var arcSeparator = "[\\s]*,?[\\s]*";
var arcValues = new RegExp(
  "(?=(" + arcNumber + "))\\1" + arcSeparator + "(?=(" + arcNumber + "))\\2" + arcSeparator + "(?=(" + arcNumber + "))\\3" + arcSeparator + "([01])" + arcSeparator + "([01])" + arcSeparator + "(?=(" + arcNumber + "))\\6" + arcSeparator + "(?=(" + arcNumber + "))\\7" + arcSeparator,
  "g"
);
var isArray3 = Array.isArray || function(o) {
  return o instanceof Array;
};
function parsePathString(pathString) {
  if (!pathString) {
    return null;
  }
  var paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0 }, pathComponents = [];
  String(pathString).replace(pathCommand, function(a, b, c) {
    var params = [], name = b.toLowerCase();
    c.replace(name == "a" ? arcValues : pathValues, function() {
      for (var i = 1; i < arguments.length - 2; i++) {
        arguments[i] && params.push(+arguments[i]);
      }
    });
    if (name == "m" && params.length > 2) {
      pathComponents.push([b, ...params.splice(0, 2)]);
      name = "l";
      b = b == "m" ? "l" : "L";
    }
    while (params.length >= paramCounts[name]) {
      pathComponents.push([b, ...params.splice(0, paramCounts[name])]);
      if (!paramCounts[name]) {
        break;
      }
    }
  });
  pathComponents.toString = pathToString;
  return pathComponents;
}
function isPathAbsolute(pathComponents) {
  for (var i = 0, ii = pathComponents.length; i < ii; i++) {
    var command = pathComponents[i][0];
    if (typeof command === "string" && command !== command.toUpperCase()) {
      return false;
    }
  }
  return true;
}
function isPathCurve(pathComponents) {
  for (var i = 0, ii = pathComponents.length; i < ii; i++) {
    var command = pathComponents[i][0];
    if (command !== "M" && command !== "C") {
      return false;
    }
  }
  return true;
}
function rectBBox(x, y, width, height) {
  if (arguments.length === 1) {
    y = x.y;
    width = x.width;
    height = x.height;
    x = x.x;
  }
  return {
    x,
    y,
    width,
    height,
    x2: x + width,
    y2: y + height
  };
}
function pathToString() {
  return this.join(",").replace(p2s, "$1");
}
function pathClone(pathComponents) {
  var pathComponentsClone = new Array(pathComponents.length);
  for (var i = 0, ii = pathComponents.length; i < ii; i++) {
    var component = pathComponents[i];
    var componentClone = pathComponentsClone[i] = new Array(component.length);
    for (var j = 0, jj = component.length; j < jj; j++) {
      componentClone[j] = component[j];
    }
  }
  pathComponentsClone.toString = pathToString;
  return pathComponentsClone;
}
function findDotsAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
  var t1 = 1 - t, t13 = pow(t1, 3), t12 = pow(t1, 2), t2 = t * t, t3 = t2 * t, x = t13 * p1x + t12 * 3 * t * c1x + t1 * 3 * t * t * c2x + t3 * p2x, y = t13 * p1y + t12 * 3 * t * c1y + t1 * 3 * t * t * c2y + t3 * p2y;
  return {
    x: fixError(x),
    y: fixError(y)
  };
}
function bezierBBox(points) {
  var bbox = curveBBox(...points);
  return rectBBox(
    bbox.x0,
    bbox.y0,
    bbox.x1 - bbox.x0,
    bbox.y1 - bbox.y0
  );
}
function isPointInsideBBox(bbox, x, y) {
  return x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height;
}
function isBBoxIntersect(bbox1, bbox2) {
  return isPointInsideBBox(bbox2, bbox1.x, bbox1.y) || isPointInsideBBox(bbox2, bbox1.x2, bbox1.y) || isPointInsideBBox(bbox2, bbox1.x, bbox1.y2) || isPointInsideBBox(bbox2, bbox1.x2, bbox1.y2) || isPointInsideBBox(bbox1, bbox2.x, bbox2.y) || isPointInsideBBox(bbox1, bbox2.x2, bbox2.y) || isPointInsideBBox(bbox1, bbox2.x, bbox2.y2) || isPointInsideBBox(bbox1, bbox2.x2, bbox2.y2) || (bbox1.x < bbox2.x2 && bbox1.x > bbox2.x || bbox2.x < bbox1.x2 && bbox2.x > bbox1.x) && (bbox1.y < bbox2.y2 && bbox1.y > bbox2.y || bbox2.y < bbox1.y2 && bbox2.y > bbox1.y);
}
function base3(t, p1, p2, p3, p4) {
  var t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4, t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
  return t * t2 - 3 * p1 + 3 * p2;
}
function bezlen(x1, y1, x2, y2, x3, y3, x4, y4, z) {
  if (z == null) {
    z = 1;
  }
  z = z > 1 ? 1 : z < 0 ? 0 : z;
  var z2 = z / 2, n = 12, Tvalues = [-0.1252, 0.1252, -0.3678, 0.3678, -0.5873, 0.5873, -0.7699, 0.7699, -0.9041, 0.9041, -0.9816, 0.9816], Cvalues = [0.2491, 0.2491, 0.2335, 0.2335, 0.2032, 0.2032, 0.1601, 0.1601, 0.1069, 0.1069, 0.0472, 0.0472], sum = 0;
  for (var i = 0; i < n; i++) {
    var ct = z2 * Tvalues[i] + z2, xbase = base3(ct, x1, x2, x3, x4), ybase = base3(ct, y1, y2, y3, y4), comb = xbase * xbase + ybase * ybase;
    sum += Cvalues[i] * math.sqrt(comb);
  }
  return z2 * sum;
}
function intersectLines(x1, y1, x2, y2, x3, y3, x4, y4) {
  if (mmax(x1, x2) < mmin(x3, x4) || mmin(x1, x2) > mmax(x3, x4) || mmax(y1, y2) < mmin(y3, y4) || mmin(y1, y2) > mmax(y3, y4)) {
    return;
  }
  var nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4), ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4), denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (!denominator) {
    return;
  }
  var px = fixError(nx / denominator), py = fixError(ny / denominator), px2 = +px.toFixed(2), py2 = +py.toFixed(2);
  if (px2 < +mmin(x1, x2).toFixed(2) || px2 > +mmax(x1, x2).toFixed(2) || px2 < +mmin(x3, x4).toFixed(2) || px2 > +mmax(x3, x4).toFixed(2) || py2 < +mmin(y1, y2).toFixed(2) || py2 > +mmax(y1, y2).toFixed(2) || py2 < +mmin(y3, y4).toFixed(2) || py2 > +mmax(y3, y4).toFixed(2)) {
    return;
  }
  return { x: px, y: py };
}
function fixError(number) {
  return Math.round(number * 1e11) / 1e11;
}
function findBezierIntersections(bez1, bez2, justCount, bbox1, bbox2) {
  bbox1 = bbox1 || bezierBBox(bez1);
  bbox2 = bbox2 || bezierBBox(bez2);
  if (!isBBoxIntersect(bbox1, bbox2)) {
    return justCount ? 0 : [];
  }
  var l1 = bezlen(...bez1), l2 = bezlen(...bez2), n1 = isLine(bez1) ? 1 : ~~(l1 / 5) || 1, n2 = isLine(bez2) ? 1 : ~~(l2 / 5) || 1, dots1 = new Array(n1 + 1), dots2 = new Array(n2 + 1), xy = {}, res = justCount ? 0 : [], i, j;
  for (i = 0; i < n1 + 1; i++) {
    var t = i / n1, p = findDotsAtSegment(...bez1, t);
    dots1[i] = { x: p.x, y: p.y, t };
  }
  for (i = 0; i < n2 + 1; i++) {
    t = i / n2;
    p = findDotsAtSegment(...bez2, t);
    dots2[i] = { x: p.x, y: p.y, t };
  }
  for (i = 0; i < n1; i++) {
    for (j = 0; j < n2; j++) {
      var di = dots1[i], di1 = dots1[i + 1], dj = dots2[j], dj1 = dots2[j + 1], ci = abs(di1.x - di.x) < 0.01 ? "y" : "x", cj = abs(dj1.x - dj.x) < 0.01 ? "y" : "x", is = intersectLines(di.x, di.y, di1.x, di1.y, dj.x, dj.y, dj1.x, dj1.y), key;
      if (is) {
        key = is.x.toFixed(9) + "#" + is.y.toFixed(9);
        if (xy[key]) {
          continue;
        }
        xy[key] = true;
        var t1 = di.t + abs((is[ci] - di[ci]) / (di1[ci] - di[ci])) * (di1.t - di.t), t2 = dj.t + abs((is[cj] - dj[cj]) / (dj1[cj] - dj[cj])) * (dj1.t - dj.t);
        if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
          if (justCount) {
            res++;
          } else {
            res.push({
              x: is.x,
              y: is.y,
              t1,
              t2
            });
          }
        }
      }
    }
  }
  return res;
}
function findPathIntersections(path1, path2, justCount) {
  var segments1 = pathToSegments(pathToCurve(path1)), segments2 = pathToSegments(pathToCurve(path2)), res = justCount ? 0 : [];
  for (var i = 0, ii = segments1.length; i < ii; i++) {
    var s1 = segments1[i];
    for (var j = 0, jj = segments2.length; j < jj; j++) {
      var s2 = segments2[j];
      if (!isBBoxIntersect(s1.bbox, s2.bbox)) {
        continue;
      }
      var intr = findBezierIntersections(s1.bez, s2.bez, justCount, s1.bbox, s2.bbox);
      if (justCount) {
        res += intr;
      } else {
        for (var k = 0, kk = intr.length; k < kk; k++) {
          intr[k].segment1 = s1.segment;
          intr[k].segment2 = s2.segment;
          intr[k].bez1 = s1.bez;
          intr[k].bez2 = s2.bez;
          res.push(intr[k]);
        }
      }
    }
  }
  return res;
}
function pathToSegments(pathComponents) {
  var segments = [], x = 0, y = 0, xm = 0, ym = 0;
  for (var i = 0, ii = pathComponents.length; i < ii; i++) {
    var pi = pathComponents[i], bez;
    if (pi[0] == "M") {
      x = xm = pi[1];
      y = ym = pi[2];
      continue;
    }
    if (pi[0] == "C") {
      bez = [x, y, pi[1], pi[2], pi[3], pi[4], pi[5], pi[6]];
      x = pi[5];
      y = pi[6];
    } else {
      bez = [x, y, x, y, xm, ym, xm, ym];
      x = xm;
      y = ym;
    }
    segments.push({
      bez,
      bbox: bezierBBox(bez),
      segment: i
    });
  }
  return segments;
}
function isPathComponents(path) {
  return isArray3(path) && isArray3(path[0]);
}
function pathToAbsolute(pathComponents) {
  if (isPathAbsolute(pathComponents)) {
    return pathComponents;
  }
  var res = new Array(pathComponents.length), x = 0, y = 0, mx = 0, my = 0, start = 0, pa0;
  if (pathComponents[0][0] == "M") {
    x = +pathComponents[0][1];
    y = +pathComponents[0][2];
    mx = x;
    my = y;
    start++;
    res[0] = ["M", x, y];
  }
  for (var r, pa, i = start, ii = pathComponents.length; i < ii; i++) {
    pa = pathComponents[i];
    pa0 = pa[0];
    res[i] = r = new Array(pa.length);
    if (pa0 != pa0.toUpperCase()) {
      r[0] = pa0.toUpperCase();
      switch (r[0]) {
        case "A":
          r[1] = pa[1];
          r[2] = pa[2];
          r[3] = pa[3];
          r[4] = pa[4];
          r[5] = pa[5];
          r[6] = +pa[6] + x;
          r[7] = +pa[7] + y;
          break;
        case "V":
          r[1] = +pa[1] + y;
          break;
        case "H":
          r[1] = +pa[1] + x;
          break;
        case "M":
          mx = +pa[1] + x;
          my = +pa[2] + y;
        default:
          for (var j = 1, jj = pa.length; j < jj; j++) {
            r[j] = +pa[j] + (j % 2 ? x : y);
          }
      }
    } else {
      for (var k = 0, kk = pa.length; k < kk; k++) {
        r[k] = pa[k];
      }
    }
    pa0 = pa0.toUpperCase();
    switch (r[0]) {
      case "Z":
        x = +mx;
        y = +my;
        break;
      case "H":
        x = r[1];
        break;
      case "V":
        y = r[1];
        break;
      case "M":
        mx = r[r.length - 2];
        my = r[r.length - 1];
      default:
        x = r[r.length - 2];
        y = r[r.length - 1];
    }
  }
  res.toString = pathToString;
  return res;
}
function isLine(bez) {
  return bez[0] === bez[2] && bez[1] === bez[3] && bez[4] === bez[6] && bez[5] === bez[7];
}
function lineToCurve(x1, y1, x2, y2) {
  return [
    x1,
    y1,
    x2,
    y2,
    x2,
    y2
  ];
}
function qubicToCurve(x1, y1, ax, ay, x2, y2) {
  var _13 = 1 / 3, _23 = 2 / 3;
  return [
    _13 * x1 + _23 * ax,
    _13 * y1 + _23 * ay,
    _13 * x2 + _23 * ax,
    _13 * y2 + _23 * ay,
    x2,
    y2
  ];
}
function arcToCurve(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
  var _120 = PI * 120 / 180, rad = PI / 180 * (+angle || 0), res = [], xy, cos = math.cos(rad), sin = math.sin(rad), rotate2 = function(x3, y3) {
    return { x: x3 * cos - y3 * sin, y: x3 * sin + y3 * cos };
  };
  if (!recursive) {
    xy = rotate2(x1, -y1);
    x1 = xy.x;
    y1 = -xy.y;
    xy = rotate2(x2, -y2);
    x2 = xy.x;
    y2 = -xy.y;
    var x = (x1 - x2) / 2, y = (y1 - y2) / 2;
    var h = x * x / (rx * rx) + y * y / (ry * ry);
    if (h > 1) {
      h = math.sqrt(h);
      rx = h * rx;
      ry = h * ry;
    }
    var rx2 = rx * rx, ry2 = ry * ry, k = (large_arc_flag == sweep_flag ? -1 : 1) * math.sqrt(abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x))), cx = k * rx * y / ry + (x1 + x2) / 2, cy = k * -ry * x / rx + (y1 + y2) / 2, f1 = math.asin(((y1 - cy) / ry).toFixed(9)), f2 = math.asin(((y2 - cy) / ry).toFixed(9));
    f1 = x1 < cx ? PI - f1 : f1;
    f2 = x2 < cx ? PI - f2 : f2;
    f1 < 0 && (f1 = PI * 2 + f1);
    f2 < 0 && (f2 = PI * 2 + f2);
    if (sweep_flag && f1 > f2) {
      f1 = f1 - PI * 2;
    }
    if (!sweep_flag && f2 > f1) {
      f2 = f2 - PI * 2;
    }
  } else {
    f1 = recursive[0];
    f2 = recursive[1];
    cx = recursive[2];
    cy = recursive[3];
  }
  var df = f2 - f1;
  if (abs(df) > _120) {
    var f2old = f2, x2old = x2, y2old = y2;
    f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
    x2 = cx + rx * math.cos(f2);
    y2 = cy + ry * math.sin(f2);
    res = arcToCurve(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy]);
  }
  df = f2 - f1;
  var c1 = math.cos(f1), s1 = math.sin(f1), c2 = math.cos(f2), s2 = math.sin(f2), t = math.tan(df / 4), hx = 4 / 3 * rx * t, hy = 4 / 3 * ry * t, m1 = [x1, y1], m2 = [x1 + hx * s1, y1 - hy * c1], m3 = [x2 + hx * s2, y2 - hy * c2], m4 = [x2, y2];
  m2[0] = 2 * m1[0] - m2[0];
  m2[1] = 2 * m1[1] - m2[1];
  if (recursive) {
    return [m2, m3, m4].concat(res);
  } else {
    res = [m2, m3, m4].concat(res).join().split(",");
    var newres = [];
    for (var i = 0, ii = res.length; i < ii; i++) {
      newres[i] = i % 2 ? rotate2(res[i - 1], res[i]).y : rotate2(res[i], res[i + 1]).x;
    }
    return newres;
  }
}
function curveBBox(x0, y0, x1, y1, x2, y2, x3, y3) {
  var tvalues = [], bounds = [[], []], a, b, c, t, t1, t2, b2ac, sqrtb2ac;
  for (var i = 0; i < 2; ++i) {
    if (i == 0) {
      b = 6 * x0 - 12 * x1 + 6 * x2;
      a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
      c = 3 * x1 - 3 * x0;
    } else {
      b = 6 * y0 - 12 * y1 + 6 * y2;
      a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
      c = 3 * y1 - 3 * y0;
    }
    if (abs(a) < 1e-12) {
      if (abs(b) < 1e-12) {
        continue;
      }
      t = -c / b;
      if (0 < t && t < 1) {
        tvalues.push(t);
      }
      continue;
    }
    b2ac = b * b - 4 * c * a;
    sqrtb2ac = math.sqrt(b2ac);
    if (b2ac < 0) {
      continue;
    }
    t1 = (-b + sqrtb2ac) / (2 * a);
    if (0 < t1 && t1 < 1) {
      tvalues.push(t1);
    }
    t2 = (-b - sqrtb2ac) / (2 * a);
    if (0 < t2 && t2 < 1) {
      tvalues.push(t2);
    }
  }
  var j = tvalues.length, jlen = j, mt;
  while (j--) {
    t = tvalues[j];
    mt = 1 - t;
    bounds[0][j] = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    bounds[1][j] = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
  }
  bounds[0][jlen] = x0;
  bounds[1][jlen] = y0;
  bounds[0][jlen + 1] = x3;
  bounds[1][jlen + 1] = y3;
  bounds[0].length = bounds[1].length = jlen + 2;
  return {
    x0: mmin(...bounds[0]),
    y0: mmin(...bounds[1]),
    x1: mmax(...bounds[0]),
    y1: mmax(...bounds[1])
  };
}
function pathToCurve(path) {
  if (!isPathComponents(path)) {
    path = parsePathString(path);
  }
  if (isPathCurve(path)) {
    return path;
  }
  var curvedPath = pathClone(pathToAbsolute(path)), attrs = { x: 0, y: 0, bx: 0, by: 0, X: 0, Y: 0, qx: null, qy: null }, processPath = function(path2, d, pathCommand3) {
    var nx, ny;
    if (!path2) {
      return ["C", d.x, d.y, d.x, d.y, d.x, d.y];
    }
    !(path2[0] in { T: 1, Q: 1 }) && (d.qx = d.qy = null);
    switch (path2[0]) {
      case "M":
        d.X = path2[1];
        d.Y = path2[2];
        break;
      case "A":
        path2 = ["C", ...arcToCurve(d.x, d.y, ...path2.slice(1))];
        break;
      case "S":
        if (pathCommand3 == "C" || pathCommand3 == "S") {
          nx = d.x * 2 - d.bx;
          ny = d.y * 2 - d.by;
        } else {
          nx = d.x;
          ny = d.y;
        }
        path2 = ["C", nx, ny, ...path2.slice(1)];
        break;
      case "T":
        if (pathCommand3 == "Q" || pathCommand3 == "T") {
          d.qx = d.x * 2 - d.qx;
          d.qy = d.y * 2 - d.qy;
        } else {
          d.qx = d.x;
          d.qy = d.y;
        }
        path2 = ["C", ...qubicToCurve(d.x, d.y, d.qx, d.qy, path2[1], path2[2])];
        break;
      case "Q":
        d.qx = path2[1];
        d.qy = path2[2];
        path2 = ["C", ...qubicToCurve(d.x, d.y, path2[1], path2[2], path2[3], path2[4])];
        break;
      case "L":
        path2 = ["C", ...lineToCurve(d.x, d.y, path2[1], path2[2])];
        break;
      case "H":
        path2 = ["C", ...lineToCurve(d.x, d.y, path2[1], d.y)];
        break;
      case "V":
        path2 = ["C", ...lineToCurve(d.x, d.y, d.x, path2[1])];
        break;
      case "Z":
        path2 = ["C", ...lineToCurve(d.x, d.y, d.X, d.Y)];
        break;
    }
    return path2;
  }, fixArc = function(pp, i2) {
    if (pp[i2].length > 7) {
      pp[i2].shift();
      var pi = pp[i2];
      while (pi.length) {
        pathCommands[i2] = "A";
        pp.splice(i2++, 0, ["C", ...pi.splice(0, 6)]);
      }
      pp.splice(i2, 1);
      ii = curvedPath.length;
    }
  }, pathCommands = [], pfirst = "", pathCommand2 = "";
  for (var i = 0, ii = curvedPath.length; i < ii; i++) {
    curvedPath[i] && (pfirst = curvedPath[i][0]);
    if (pfirst != "C") {
      pathCommands[i] = pfirst;
      i && (pathCommand2 = pathCommands[i - 1]);
    }
    curvedPath[i] = processPath(curvedPath[i], attrs, pathCommand2);
    if (pathCommands[i] != "A" && pfirst == "C") pathCommands[i] = "C";
    fixArc(curvedPath, i);
    var seg = curvedPath[i], seglen = seg.length;
    attrs.x = seg[seglen - 2];
    attrs.y = seg[seglen - 1];
    attrs.bx = toFloat(seg[seglen - 4]) || attrs.x;
    attrs.by = toFloat(seg[seglen - 3]) || attrs.y;
  }
  return curvedPath;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/ModelUtil.js
function isConnection(value) {
  return isObject(value) && has(value, "waypoints");
}
function isLabel(value) {
  return isObject(value) && has(value, "labelTarget");
}
function isRoot(value) {
  return isObject(value) && isNil(value.parent);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/layout/LayoutUtil.js
function roundBounds(bounds) {
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  };
}
function roundPoint(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}
function asTRBL(bounds) {
  return {
    top: bounds.y,
    right: bounds.x + (bounds.width || 0),
    bottom: bounds.y + (bounds.height || 0),
    left: bounds.x
  };
}
function asBounds(trbl) {
  return {
    x: trbl.left,
    y: trbl.top,
    width: trbl.right - trbl.left,
    height: trbl.bottom - trbl.top
  };
}
function getBoundsMid(bounds) {
  return roundPoint({
    x: bounds.x + (bounds.width || 0) / 2,
    y: bounds.y + (bounds.height || 0) / 2
  });
}
function getConnectionMid(connection) {
  var waypoints = connection.waypoints;
  var parts = waypoints.reduce(function(parts2, point, index2) {
    var lastPoint = waypoints[index2 - 1];
    if (lastPoint) {
      var lastPart = parts2[parts2.length - 1];
      var startLength = lastPart && lastPart.endLength || 0;
      var length2 = distance(lastPoint, point);
      parts2.push({
        start: lastPoint,
        end: point,
        startLength,
        endLength: startLength + length2,
        length: length2
      });
    }
    return parts2;
  }, []);
  var totalLength = parts.reduce(function(length2, part) {
    return length2 + part.length;
  }, 0);
  var midLength = totalLength / 2;
  var i = 0;
  var midSegment = parts[i];
  while (midSegment.endLength < midLength) {
    midSegment = parts[++i];
  }
  var segmentProgress = (midLength - midSegment.startLength) / midSegment.length;
  var midPoint = {
    x: midSegment.start.x + (midSegment.end.x - midSegment.start.x) * segmentProgress,
    y: midSegment.start.y + (midSegment.end.y - midSegment.start.y) * segmentProgress
  };
  return midPoint;
}
function getMid(element) {
  if (isConnection(element)) {
    return getConnectionMid(element);
  }
  return getBoundsMid(element);
}
function getOrientation(rect, reference, padding) {
  padding = padding || 0;
  if (!isObject(padding)) {
    padding = { x: padding, y: padding };
  }
  var rectOrientation = asTRBL(rect), referenceOrientation = asTRBL(reference);
  var top = rectOrientation.bottom + padding.y <= referenceOrientation.top, right = rectOrientation.left - padding.x >= referenceOrientation.right, bottom = rectOrientation.top - padding.y >= referenceOrientation.bottom, left = rectOrientation.right + padding.x <= referenceOrientation.left;
  var vertical = top ? "top" : bottom ? "bottom" : null, horizontal = left ? "left" : right ? "right" : null;
  if (horizontal && vertical) {
    return vertical + "-" + horizontal;
  } else {
    return horizontal || vertical || "intersect";
  }
}
function filterRedundantWaypoints(waypoints) {
  waypoints = waypoints.slice();
  var idx = 0, point, previousPoint, nextPoint;
  while (waypoints[idx]) {
    point = waypoints[idx];
    previousPoint = waypoints[idx - 1];
    nextPoint = waypoints[idx + 1];
    if (pointDistance(point, nextPoint) === 0 || pointsOnLine(previousPoint, nextPoint, point)) {
      waypoints.splice(idx, 1);
    } else {
      idx++;
    }
  }
  return waypoints;
}
function distance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/core/Canvas.js
function round(number, resolution) {
  return Math.round(number * resolution) / resolution;
}
function ensurePx(number) {
  return isNumber(number) ? number + "px" : number;
}
function findRoot(element) {
  while (element.parent) {
    element = element.parent;
  }
  return element;
}
function createContainer(options) {
  options = assign({}, { width: "100%", height: "100%" }, options);
  const container = options.container || document.body;
  const parent = document.createElement("div");
  parent.setAttribute("class", "djs-container djs-parent bio-theme-parent");
  assign2(parent, {
    position: "relative",
    overflow: "hidden",
    width: ensurePx(options.width),
    height: ensurePx(options.height)
  });
  container.appendChild(parent);
  return parent;
}
function createGroup(parent, cls, childIndex) {
  const group = create("g");
  classes(group).add(cls);
  const index2 = childIndex !== void 0 ? childIndex : parent.childNodes.length - 1;
  parent.insertBefore(group, parent.childNodes[index2] || null);
  return group;
}
var BASE_LAYER = "base";
var PLANE_LAYER_INDEX = 0;
var UTILITY_LAYER_INDEX = 1;
var REQUIRED_MODEL_ATTRS = {
  shape: ["x", "y", "width", "height"],
  connection: ["waypoints"]
};
function Canvas(config, eventBus, graphicsFactory, elementRegistry) {
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._graphicsFactory = graphicsFactory;
  this._rootsIdx = 0;
  this._layers = {};
  this._planes = [];
  this._rootElement = null;
  this._focused = false;
  this._init(config || {});
}
Canvas.$inject = [
  "config.canvas",
  "eventBus",
  "graphicsFactory",
  "elementRegistry"
];
Canvas.prototype._init = function(config) {
  const eventBus = this._eventBus;
  const container = this._container = createContainer(config);
  const svg = this._svg = create("svg");
  attr(svg, {
    width: "100%",
    height: "100%"
  });
  attr2(svg, "tabindex", 0);
  config.autoFocus && eventBus.on("element.hover", () => {
    this.restoreFocus();
  });
  eventBus.on("element.mousedown", 500, (event2) => {
    this.focus();
  });
  svg.addEventListener("focusin", () => {
    this._setFocused(true);
  });
  svg.addEventListener("focusout", () => {
    this._setFocused(false);
  });
  svg.addEventListener("mouseover", () => {
    this._eventBus.fire("canvas.mouseover");
  });
  svg.addEventListener("mouseout", () => {
    this._eventBus.fire("canvas.mouseout");
  });
  append(container, svg);
  const viewport = this._viewport = createGroup(svg, "viewport");
  if (config.deferUpdate) {
    this._viewboxChanged = debounce(this._viewboxChanged, 300);
  }
  this._restoreFocus = debounce(this._restoreFocus, 0);
  eventBus.on("diagram.init", () => {
    eventBus.fire("canvas.init", {
      svg,
      viewport
    });
  });
  eventBus.on([
    "shape.added",
    "connection.added",
    "shape.removed",
    "connection.removed",
    "elements.changed",
    "root.set"
  ], () => {
    delete this._cachedViewbox;
  });
  eventBus.on("diagram.destroy", 500, this._destroy, this);
  eventBus.on("diagram.clear", 500, this._clear, this);
};
Canvas.prototype._destroy = function() {
  this._restoreFocus.cancel();
  this._eventBus.fire("canvas.destroy", {
    svg: this._svg,
    viewport: this._viewport
  });
  const parent = this._container.parentNode;
  if (parent) {
    parent.removeChild(this._container);
  }
  delete this._svg;
  delete this._container;
  delete this._layers;
  delete this._planes;
  delete this._rootElement;
  delete this._viewport;
};
Canvas.prototype._setFocused = function(focused) {
  if (focused == this._focused) {
    return;
  }
  this._focused = focused;
  this._eventBus.fire("canvas.focus.changed", { focused });
};
Canvas.prototype._clear = function() {
  const allElements = this._elementRegistry.getAll();
  allElements.forEach((element) => {
    const type = getType(element);
    if (type === "root") {
      this.removeRootElement(element);
    } else {
      this._removeElement(element, type);
    }
  });
  this._planes = [];
  this._rootElement = null;
  delete this._cachedViewbox;
};
Canvas.prototype.focus = function() {
  this._svg.focus({ preventScroll: true });
  this._setFocused(true);
};
Canvas.prototype.restoreFocus = function() {
  this._restoreFocus();
};
Canvas.prototype._restoreFocus = function() {
  if (document.activeElement === document.body) {
    this.focus();
  }
};
Canvas.prototype.isFocused = function() {
  return this._focused;
};
Canvas.prototype.getDefaultLayer = function() {
  return this.getLayer(BASE_LAYER, PLANE_LAYER_INDEX);
};
Canvas.prototype.getLayer = function(name, index2) {
  if (!name) {
    throw new Error("must specify a name");
  }
  let layer = this._layers[name];
  if (!layer) {
    layer = this._layers[name] = this._createLayer(name, index2);
  }
  if (typeof index2 !== "undefined" && layer.index !== index2) {
    throw new Error("layer <" + name + "> already created at index <" + index2 + ">");
  }
  return layer.group;
};
Canvas.prototype._getChildIndex = function(index2) {
  return reduce(this._layers, function(childIndex, layer) {
    if (layer.visible && index2 >= layer.index) {
      childIndex++;
    }
    return childIndex;
  }, 0);
};
Canvas.prototype._createLayer = function(name, index2) {
  if (typeof index2 === "undefined") {
    index2 = UTILITY_LAYER_INDEX;
  }
  const childIndex = this._getChildIndex(index2);
  return {
    group: createGroup(this._viewport, "layer-" + name, childIndex),
    index: index2,
    visible: true
  };
};
Canvas.prototype.showLayer = function(name) {
  if (!name) {
    throw new Error("must specify a name");
  }
  const layer = this._layers[name];
  if (!layer) {
    throw new Error("layer <" + name + "> does not exist");
  }
  const viewport = this._viewport;
  const group = layer.group;
  const index2 = layer.index;
  if (layer.visible) {
    return group;
  }
  const childIndex = this._getChildIndex(index2);
  viewport.insertBefore(group, viewport.childNodes[childIndex] || null);
  layer.visible = true;
  return group;
};
Canvas.prototype.hideLayer = function(name) {
  if (!name) {
    throw new Error("must specify a name");
  }
  const layer = this._layers[name];
  if (!layer) {
    throw new Error("layer <" + name + "> does not exist");
  }
  const group = layer.group;
  if (!layer.visible) {
    return group;
  }
  remove(group);
  layer.visible = false;
  return group;
};
Canvas.prototype._removeLayer = function(name) {
  const layer = this._layers[name];
  if (layer) {
    delete this._layers[name];
    remove(layer.group);
  }
};
Canvas.prototype.getActiveLayer = function() {
  const plane = this._findPlaneForRoot(this.getRootElement());
  if (!plane) {
    return null;
  }
  return plane.layer;
};
Canvas.prototype.findRoot = function(element) {
  const elements = this._resolveElements(element);
  let root;
  for (const element2 of elements) {
    const plane = this._findPlaneForRoot(
      findRoot(element2)
    );
    if (!plane) {
      return;
    }
    if (root && plane.rootElement !== root) {
      return void 0;
    }
    root = plane.rootElement;
  }
  return root;
};
Canvas.prototype.getRootElements = function() {
  return this._planes.map(function(plane) {
    return plane.rootElement;
  });
};
Canvas.prototype._findPlaneForRoot = function(rootElement) {
  return find(this._planes, function(plane) {
    return plane.rootElement === rootElement;
  });
};
Canvas.prototype._resolveElement = function(element) {
  if (typeof element === "string") {
    return this._elementRegistry.get(element);
  }
  return element;
};
Canvas.prototype._resolveElements = function(elements) {
  if (!isArray2(elements)) {
    elements = [elements];
  }
  return elements.map((element) => this._resolveElement(element)).filter(Boolean);
};
Canvas.prototype.getContainer = function() {
  return this._container;
};
Canvas.prototype._updateMarker = function(element, marker, add2) {
  let container;
  element = this._resolveElement(element);
  element.markers = element.markers || /* @__PURE__ */ new Set();
  container = this._elementRegistry._elements[element.id];
  if (!container) {
    return;
  }
  forEach([container.gfx, container.secondaryGfx], function(gfx) {
    if (gfx) {
      if (add2) {
        element.markers.add(marker);
        classes(gfx).add(marker);
      } else {
        element.markers.delete(marker);
        classes(gfx).remove(marker);
      }
    }
  });
  this._eventBus.fire("element.marker.update", { element, gfx: container.gfx, marker, add: !!add2 });
};
Canvas.prototype.addMarker = function(element, marker) {
  this._updateMarker(element, marker, true);
};
Canvas.prototype.removeMarker = function(element, marker) {
  this._updateMarker(element, marker, false);
};
Canvas.prototype.hasMarker = function(element, marker) {
  element = this._resolveElement(element);
  if (!element.markers) {
    return false;
  }
  return element.markers.has(marker);
};
Canvas.prototype.toggleMarker = function(element, marker) {
  if (this.hasMarker(element, marker)) {
    this.removeMarker(element, marker);
  } else {
    this.addMarker(element, marker);
  }
};
Canvas.prototype.getRootElement = function() {
  const rootElement = this._rootElement;
  if (rootElement || this._planes.length) {
    return rootElement;
  }
  return this.setRootElement(this.addRootElement(null));
};
Canvas.prototype.addRootElement = function(rootElement) {
  const idx = this._rootsIdx++;
  if (!rootElement) {
    rootElement = {
      id: "__implicitroot_" + idx,
      children: [],
      isImplicit: true
    };
  }
  const layerName = rootElement.layer = "root-" + idx;
  this._ensureValid("root", rootElement);
  const layer = this.getLayer(layerName, PLANE_LAYER_INDEX);
  this.hideLayer(layerName);
  this._addRoot(rootElement, layer);
  this._planes.push({
    rootElement,
    layer
  });
  return rootElement;
};
Canvas.prototype.removeRootElement = function(rootElement) {
  rootElement = this._resolveElement(rootElement);
  const plane = this._findPlaneForRoot(rootElement);
  if (!plane) {
    return;
  }
  this._removeRoot(rootElement);
  this._removeLayer(rootElement.layer);
  this._planes = this._planes.filter(function(plane2) {
    return plane2.rootElement !== rootElement;
  });
  if (this._rootElement === rootElement) {
    this._rootElement = null;
  }
  return rootElement;
};
Canvas.prototype.setRootElement = function(rootElement) {
  if (rootElement === this._rootElement) {
    return rootElement;
  }
  let plane;
  if (!rootElement) {
    throw new Error("rootElement required");
  }
  plane = this._findPlaneForRoot(rootElement);
  if (!plane) {
    rootElement = this.addRootElement(rootElement);
  }
  this._setRoot(rootElement);
  return rootElement;
};
Canvas.prototype._removeRoot = function(element) {
  const elementRegistry = this._elementRegistry, eventBus = this._eventBus;
  eventBus.fire("root.remove", { element });
  eventBus.fire("root.removed", { element });
  elementRegistry.remove(element);
};
Canvas.prototype._addRoot = function(element, gfx) {
  const elementRegistry = this._elementRegistry, eventBus = this._eventBus;
  eventBus.fire("root.add", { element });
  elementRegistry.add(element, gfx);
  eventBus.fire("root.added", { element, gfx });
};
Canvas.prototype._setRoot = function(rootElement, layer) {
  const currentRoot = this._rootElement;
  if (currentRoot) {
    this._elementRegistry.updateGraphics(currentRoot, null, true);
    this.hideLayer(currentRoot.layer);
  }
  if (rootElement) {
    if (!layer) {
      layer = this._findPlaneForRoot(rootElement).layer;
    }
    this._elementRegistry.updateGraphics(rootElement, this._svg, true);
    this.showLayer(rootElement.layer);
  }
  this._rootElement = rootElement;
  this._eventBus.fire("root.set", { element: rootElement });
};
Canvas.prototype._ensureValid = function(type, element) {
  if (!element.id) {
    throw new Error("element must have an id");
  }
  if (this._elementRegistry.get(element.id)) {
    throw new Error("element <" + element.id + "> already exists");
  }
  const requiredAttrs = REQUIRED_MODEL_ATTRS[type];
  const valid = every(requiredAttrs, function(attr3) {
    return typeof element[attr3] !== "undefined";
  });
  if (!valid) {
    throw new Error(
      "must supply { " + requiredAttrs.join(", ") + " } with " + type
    );
  }
};
Canvas.prototype._setParent = function(element, parent, parentIndex) {
  add(parent.children, element, parentIndex);
  element.parent = parent;
};
Canvas.prototype._addElement = function(type, element, parent, parentIndex) {
  parent = parent || this.getRootElement();
  const eventBus = this._eventBus, graphicsFactory = this._graphicsFactory;
  this._ensureValid(type, element);
  eventBus.fire(type + ".add", { element, parent });
  this._setParent(element, parent, parentIndex);
  const gfx = graphicsFactory.create(type, element, parentIndex);
  this._elementRegistry.add(element, gfx);
  graphicsFactory.update(type, element, gfx);
  eventBus.fire(type + ".added", { element, gfx });
  return element;
};
Canvas.prototype.addShape = function(shape, parent, parentIndex) {
  return this._addElement("shape", shape, parent, parentIndex);
};
Canvas.prototype.addConnection = function(connection, parent, parentIndex) {
  return this._addElement("connection", connection, parent, parentIndex);
};
Canvas.prototype._removeElement = function(element, type) {
  const elementRegistry = this._elementRegistry, graphicsFactory = this._graphicsFactory, eventBus = this._eventBus;
  element = elementRegistry.get(element.id || element);
  if (!element) {
    return;
  }
  eventBus.fire(type + ".remove", { element });
  graphicsFactory.remove(element);
  remove3(element.parent && element.parent.children, element);
  element.parent = null;
  eventBus.fire(type + ".removed", { element });
  elementRegistry.remove(element);
  return element;
};
Canvas.prototype.removeShape = function(shape) {
  return this._removeElement(shape, "shape");
};
Canvas.prototype.removeConnection = function(connection) {
  return this._removeElement(connection, "connection");
};
Canvas.prototype.getGraphics = function(element, secondary) {
  return this._elementRegistry.getGraphics(element, secondary);
};
Canvas.prototype._changeViewbox = function(changeFn) {
  this._eventBus.fire("canvas.viewbox.changing");
  changeFn.apply(this);
  this._cachedViewbox = null;
  this._viewboxChanged();
};
Canvas.prototype._viewboxChanged = function() {
  this._eventBus.fire("canvas.viewbox.changed", { viewbox: this.viewbox() });
};
Canvas.prototype.viewbox = function(box) {
  if (box === void 0 && this._cachedViewbox) {
    return structuredClone(this._cachedViewbox);
  }
  const viewport = this._viewport, outerBox = this.getSize();
  let innerBox, matrix, activeLayer, transform3, scale, x, y;
  if (!box) {
    activeLayer = this._rootElement ? this.getActiveLayer() : null;
    innerBox = activeLayer && activeLayer.getBBox() || {};
    transform3 = transform(viewport);
    matrix = transform3 ? transform3.matrix : createMatrix();
    scale = round(matrix.a, 1e3);
    x = round(-matrix.e || 0, 1e3);
    y = round(-matrix.f || 0, 1e3);
    box = this._cachedViewbox = {
      x: x ? x / scale : 0,
      y: y ? y / scale : 0,
      width: outerBox.width / scale,
      height: outerBox.height / scale,
      scale,
      inner: {
        width: innerBox.width || 0,
        height: innerBox.height || 0,
        x: innerBox.x || 0,
        y: innerBox.y || 0
      },
      outer: outerBox
    };
    return box;
  } else {
    this._changeViewbox(function() {
      scale = Math.min(outerBox.width / box.width, outerBox.height / box.height);
      const matrix2 = this._svg.createSVGMatrix().scale(scale).translate(-box.x, -box.y);
      transform(viewport, matrix2);
    });
  }
  return box;
};
Canvas.prototype.scroll = function(delta2) {
  const node2 = this._viewport;
  let matrix = node2.getCTM();
  if (delta2) {
    this._changeViewbox(function() {
      delta2 = assign({ dx: 0, dy: 0 }, delta2 || {});
      matrix = this._svg.createSVGMatrix().translate(delta2.dx, delta2.dy).multiply(matrix);
      setCTM(node2, matrix);
    });
  }
  return { x: matrix.e, y: matrix.f };
};
Canvas.prototype.scrollToElement = function(element, padding) {
  let defaultPadding = 100;
  const elements = this._resolveElements(element);
  if (!elements.length) {
    return;
  }
  const rootElement = this.findRoot(elements);
  if (!rootElement) {
    return;
  }
  if (rootElement !== this.getRootElement()) {
    this.setRootElement(rootElement);
  }
  const visibleElements = elements.filter((e2) => e2 != rootElement);
  if (!visibleElements.length) {
    return;
  }
  if (!padding) {
    padding = {};
  }
  if (typeof padding === "number") {
    defaultPadding = padding;
  }
  padding = {
    top: padding.top || defaultPadding,
    right: padding.right || defaultPadding,
    bottom: padding.bottom || defaultPadding,
    left: padding.left || defaultPadding
  };
  const elementBounds = getBBox(visibleElements), elementTrbl = asTRBL(elementBounds), viewboxBounds = this.viewbox(), zoom2 = this.zoom();
  let dx, dy;
  viewboxBounds.y += padding.top / zoom2;
  viewboxBounds.x += padding.left / zoom2;
  viewboxBounds.width -= (padding.right + padding.left) / zoom2;
  viewboxBounds.height -= (padding.bottom + padding.top) / zoom2;
  const viewboxTrbl = asTRBL(viewboxBounds);
  const canFit = elementBounds.width < viewboxBounds.width && elementBounds.height < viewboxBounds.height;
  if (!canFit) {
    dx = elementBounds.x - viewboxBounds.x;
    dy = elementBounds.y - viewboxBounds.y;
  } else {
    const dRight = Math.max(0, elementTrbl.right - viewboxTrbl.right), dLeft = Math.min(0, elementTrbl.left - viewboxTrbl.left), dBottom = Math.max(0, elementTrbl.bottom - viewboxTrbl.bottom), dTop = Math.min(0, elementTrbl.top - viewboxTrbl.top);
    dx = dRight || dLeft;
    dy = dBottom || dTop;
  }
  this.scroll({ dx: -dx * zoom2, dy: -dy * zoom2 });
};
Canvas.prototype.zoom = function(newScale, center2) {
  if (!newScale) {
    return this.viewbox(newScale).scale;
  }
  if (newScale === "fit-viewport") {
    return this._fitViewport(center2);
  }
  let outer, matrix;
  this._changeViewbox(function() {
    if (typeof center2 !== "object") {
      outer = this.viewbox().outer;
      center2 = {
        x: outer.width / 2,
        y: outer.height / 2
      };
    }
    matrix = this._setZoom(newScale, center2);
  });
  return round(matrix.a, 1e3);
};
function setCTM(node2, m) {
  const mstr = "matrix(" + m.a + "," + m.b + "," + m.c + "," + m.d + "," + m.e + "," + m.f + ")";
  node2.setAttribute("transform", mstr);
}
Canvas.prototype._fitViewport = function(center2) {
  const vbox = this.viewbox(), outer = vbox.outer, inner = vbox.inner;
  let newScale, newViewbox;
  if (inner.x >= 0 && inner.y >= 0 && inner.x + inner.width <= outer.width && inner.y + inner.height <= outer.height && !center2) {
    newViewbox = {
      x: 0,
      y: 0,
      width: Math.max(inner.width + inner.x, outer.width),
      height: Math.max(inner.height + inner.y, outer.height)
    };
  } else {
    newScale = Math.min(1, outer.width / inner.width, outer.height / inner.height);
    newViewbox = {
      x: inner.x + (center2 ? inner.width / 2 - outer.width / newScale / 2 : 0),
      y: inner.y + (center2 ? inner.height / 2 - outer.height / newScale / 2 : 0),
      width: outer.width / newScale,
      height: outer.height / newScale
    };
  }
  this.viewbox(newViewbox);
  return this.viewbox(false).scale;
};
Canvas.prototype._setZoom = function(scale, center2) {
  const svg = this._svg, viewport = this._viewport;
  const matrix = svg.createSVGMatrix();
  const point = svg.createSVGPoint();
  let centerPoint, originalPoint, currentMatrix, scaleMatrix, newMatrix;
  currentMatrix = viewport.getCTM();
  const currentScale = currentMatrix.a;
  if (center2) {
    centerPoint = assign(point, center2);
    originalPoint = centerPoint.matrixTransform(currentMatrix.inverse());
    scaleMatrix = matrix.translate(originalPoint.x, originalPoint.y).scale(1 / currentScale * scale).translate(-originalPoint.x, -originalPoint.y);
    newMatrix = currentMatrix.multiply(scaleMatrix);
  } else {
    newMatrix = matrix.scale(scale);
  }
  setCTM(this._viewport, newMatrix);
  return newMatrix;
};
Canvas.prototype.getSize = function() {
  return {
    width: this._container.clientWidth,
    height: this._container.clientHeight
  };
};
Canvas.prototype.getAbsoluteBBox = function(element) {
  const vbox = this.viewbox();
  let bbox;
  if (element.waypoints) {
    const gfx = this.getGraphics(element);
    bbox = gfx.getBBox();
  } else {
    bbox = element;
  }
  const x = bbox.x * vbox.scale - vbox.x * vbox.scale;
  const y = bbox.y * vbox.scale - vbox.y * vbox.scale;
  const width = bbox.width * vbox.scale;
  const height = bbox.height * vbox.scale;
  return {
    x,
    y,
    width,
    height
  };
};
Canvas.prototype.resized = function() {
  delete this._cachedViewbox;
  this._eventBus.fire("canvas.resized");
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/core/ElementRegistry.js
var ELEMENT_ID = "data-element-id";
function ElementRegistry(eventBus) {
  this._elements = {};
  this._eventBus = eventBus;
}
ElementRegistry.$inject = ["eventBus"];
ElementRegistry.prototype.add = function(element, gfx, secondaryGfx) {
  var id = element.id;
  this._validateId(id);
  attr(gfx, ELEMENT_ID, id);
  if (secondaryGfx) {
    attr(secondaryGfx, ELEMENT_ID, id);
  }
  this._elements[id] = { element, gfx, secondaryGfx };
};
ElementRegistry.prototype.remove = function(element) {
  var elements = this._elements, id = element.id || element, container = id && elements[id];
  if (container) {
    attr(container.gfx, ELEMENT_ID, "");
    if (container.secondaryGfx) {
      attr(container.secondaryGfx, ELEMENT_ID, "");
    }
    delete elements[id];
  }
};
ElementRegistry.prototype.updateId = function(element, newId) {
  this._validateId(newId);
  if (typeof element === "string") {
    element = this.get(element);
  }
  this._eventBus.fire("element.updateId", {
    element,
    newId
  });
  var gfx = this.getGraphics(element), secondaryGfx = this.getGraphics(element, true);
  this.remove(element);
  element.id = newId;
  this.add(element, gfx, secondaryGfx);
};
ElementRegistry.prototype.updateGraphics = function(filter2, gfx, secondary) {
  var id = filter2.id || filter2;
  var container = this._elements[id];
  if (secondary) {
    container.secondaryGfx = gfx;
  } else {
    container.gfx = gfx;
  }
  if (gfx) {
    attr(gfx, ELEMENT_ID, id);
  }
  return gfx;
};
ElementRegistry.prototype.get = function(filter2) {
  var id;
  if (typeof filter2 === "string") {
    id = filter2;
  } else {
    id = filter2 && attr(filter2, ELEMENT_ID);
  }
  var container = this._elements[id];
  return container && container.element;
};
ElementRegistry.prototype.filter = function(fn) {
  var filtered = [];
  this.forEach(function(element, gfx) {
    if (fn(element, gfx)) {
      filtered.push(element);
    }
  });
  return filtered;
};
ElementRegistry.prototype.find = function(fn) {
  var map2 = this._elements, keys2 = Object.keys(map2);
  for (var i = 0; i < keys2.length; i++) {
    var id = keys2[i], container = map2[id], element = container.element, gfx = container.gfx;
    if (fn(element, gfx)) {
      return element;
    }
  }
};
ElementRegistry.prototype.getAll = function() {
  return this.filter(function(e2) {
    return e2;
  });
};
ElementRegistry.prototype.forEach = function(fn) {
  var map2 = this._elements;
  Object.keys(map2).forEach(function(id) {
    var container = map2[id], element = container.element, gfx = container.gfx;
    return fn(element, gfx);
  });
};
ElementRegistry.prototype.getGraphics = function(filter2, secondary) {
  var id = filter2.id || filter2;
  var container = this._elements[id];
  return container && (secondary ? container.secondaryGfx : container.gfx);
};
ElementRegistry.prototype._validateId = function(id) {
  if (!id) {
    throw new Error("element must have an id");
  }
  if (this._elements[id]) {
    throw new Error("element with id " + id + " already added");
  }
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/object-refs/dist/index.js
function extend2(collection, refs, property, target) {
  var inverseProperty = property.inverse;
  Object.defineProperty(collection, "remove", {
    value: function(element) {
      var idx = this.indexOf(element);
      if (idx !== -1) {
        this.splice(idx, 1);
        refs.unset(element, inverseProperty, target);
      }
      return element;
    }
  });
  Object.defineProperty(collection, "contains", {
    value: function(element) {
      return this.indexOf(element) !== -1;
    }
  });
  Object.defineProperty(collection, "add", {
    value: function(element, idx) {
      var currentIdx = this.indexOf(element);
      if (typeof idx === "undefined") {
        if (currentIdx !== -1) {
          return;
        }
        idx = this.length;
      }
      if (currentIdx !== -1) {
        this.splice(currentIdx, 1);
      }
      this.splice(idx, 0, element);
      if (currentIdx === -1) {
        refs.set(element, inverseProperty, target);
      }
    }
  });
  Object.defineProperty(collection, "__refs_collection", {
    value: true
  });
  return collection;
}
function isExtended(collection) {
  return collection.__refs_collection === true;
}
function hasOwnProperty(e2, property) {
  return Object.prototype.hasOwnProperty.call(e2, property.name || property);
}
function defineCollectionProperty(ref, property, target) {
  var collection = extend2(target[property.name] || [], ref, property, target);
  Object.defineProperty(target, property.name, {
    enumerable: property.enumerable,
    value: collection
  });
  if (collection.length) {
    collection.forEach(function(o) {
      ref.set(o, property.inverse, target);
    });
  }
}
function defineProperty(ref, property, target) {
  var inverseProperty = property.inverse;
  var _value = target[property.name];
  Object.defineProperty(target, property.name, {
    configurable: property.configurable,
    enumerable: property.enumerable,
    get: function() {
      return _value;
    },
    set: function(value) {
      if (value === _value) {
        return;
      }
      var old = _value;
      _value = null;
      if (old) {
        ref.unset(old, inverseProperty, target);
      }
      _value = value;
      ref.set(_value, inverseProperty, target);
    }
  });
}
function Refs(a, b) {
  if (!(this instanceof Refs)) {
    return new Refs(a, b);
  }
  a.inverse = b;
  b.inverse = a;
  this.props = {};
  this.props[a.name] = a;
  this.props[b.name] = b;
}
Refs.prototype.bind = function(target, property) {
  if (typeof property === "string") {
    if (!this.props[property]) {
      throw new Error("no property <" + property + "> in ref");
    }
    property = this.props[property];
  }
  if (property.collection) {
    defineCollectionProperty(this, property, target);
  } else {
    defineProperty(this, property, target);
  }
};
Refs.prototype.ensureRefsCollection = function(target, property) {
  var collection = target[property.name];
  if (!isExtended(collection)) {
    defineCollectionProperty(this, property, target);
  }
  return collection;
};
Refs.prototype.ensureBound = function(target, property) {
  if (!hasOwnProperty(target, property)) {
    this.bind(target, property);
  }
};
Refs.prototype.unset = function(target, property, value) {
  if (target) {
    this.ensureBound(target, property);
    if (property.collection) {
      this.ensureRefsCollection(target, property).remove(value);
    } else {
      target[property.name] = void 0;
    }
  }
};
Refs.prototype.set = function(target, property, value) {
  if (target) {
    this.ensureBound(target, property);
    if (property.collection) {
      this.ensureRefsCollection(target, property).add(value);
    } else {
      target[property.name] = value;
    }
  }
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/model/index.js
var parentRefs = new Refs({ name: "children", enumerable: true, collection: true }, { name: "parent" });
var labelRefs = new Refs({ name: "labels", enumerable: true, collection: true }, { name: "labelTarget" });
var attacherRefs = new Refs({ name: "attachers", collection: true }, { name: "host" });
var outgoingRefs = new Refs({ name: "outgoing", collection: true }, { name: "source" });
var incomingRefs = new Refs({ name: "incoming", collection: true }, { name: "target" });
function ElementImpl() {
  Object.defineProperty(this, "businessObject", {
    writable: true
  });
  Object.defineProperty(this, "label", {
    get: function() {
      return this.labels[0];
    },
    set: function(newLabel) {
      var label = this.label, labels = this.labels;
      if (!newLabel && label) {
        labels.remove(label);
      } else {
        labels.add(newLabel, 0);
      }
    }
  });
  parentRefs.bind(this, "parent");
  labelRefs.bind(this, "labels");
  outgoingRefs.bind(this, "outgoing");
  incomingRefs.bind(this, "incoming");
}
function ShapeImpl() {
  ElementImpl.call(this);
  parentRefs.bind(this, "children");
  attacherRefs.bind(this, "host");
  attacherRefs.bind(this, "attachers");
}
e(ShapeImpl, ElementImpl);
function RootImpl() {
  ElementImpl.call(this);
  parentRefs.bind(this, "children");
}
e(RootImpl, ShapeImpl);
function LabelImpl() {
  ShapeImpl.call(this);
  labelRefs.bind(this, "labelTarget");
}
e(LabelImpl, ShapeImpl);
function ConnectionImpl() {
  ElementImpl.call(this);
  outgoingRefs.bind(this, "source");
  incomingRefs.bind(this, "target");
}
e(ConnectionImpl, ElementImpl);
var types = {
  connection: ConnectionImpl,
  shape: ShapeImpl,
  label: LabelImpl,
  root: RootImpl
};
function create2(type, attrs) {
  var Type = types[type];
  if (!Type) {
    throw new Error("unknown type: <" + type + ">");
  }
  return assign(new Type(), attrs);
}
function isModelElement(obj) {
  return obj instanceof ElementImpl;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/core/ElementFactory.js
function ElementFactory() {
  this._uid = 12;
}
ElementFactory.prototype.createRoot = function(attrs) {
  return this.create("root", attrs);
};
ElementFactory.prototype.createLabel = function(attrs) {
  return this.create("label", attrs);
};
ElementFactory.prototype.createShape = function(attrs) {
  return this.create("shape", attrs);
};
ElementFactory.prototype.createConnection = function(attrs) {
  return this.create("connection", attrs);
};
ElementFactory.prototype.create = function(type, attrs) {
  attrs = assign({}, attrs || {});
  if (!attrs.id) {
    attrs.id = type + "_" + this._uid++;
  }
  return create2(type, attrs);
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/core/EventBus.js
var FN_REF = "__fn";
var DEFAULT_PRIORITY = 1e3;
var slice = Array.prototype.slice;
function EventBus() {
  this._listeners = {};
  this.on("diagram.destroy", 1, this._destroy, this);
}
EventBus.prototype.on = function(events, priority, callback, that) {
  events = isArray2(events) ? events : [events];
  if (isFunction(priority)) {
    that = callback;
    callback = priority;
    priority = DEFAULT_PRIORITY;
  }
  if (!isNumber(priority)) {
    throw new Error("priority must be a number");
  }
  var actualCallback = callback;
  if (that) {
    actualCallback = bind(callback, that);
    actualCallback[FN_REF] = callback[FN_REF] || callback;
  }
  var self = this;
  events.forEach(function(e2) {
    self._addListener(e2, {
      priority,
      callback: actualCallback,
      next: null
    });
  });
};
EventBus.prototype.once = function(events, priority, callback, that) {
  var self = this;
  if (isFunction(priority)) {
    that = callback;
    callback = priority;
    priority = DEFAULT_PRIORITY;
  }
  if (!isNumber(priority)) {
    throw new Error("priority must be a number");
  }
  function wrappedCallback() {
    wrappedCallback.__isTomb = true;
    var result = callback.apply(that, arguments);
    self.off(events, wrappedCallback);
    return result;
  }
  wrappedCallback[FN_REF] = callback;
  this.on(events, priority, wrappedCallback);
};
EventBus.prototype.off = function(events, callback) {
  events = isArray2(events) ? events : [events];
  var self = this;
  events.forEach(function(event2) {
    self._removeListener(event2, callback);
  });
};
EventBus.prototype.createEvent = function(data) {
  var event2 = new InternalEvent();
  event2.init(data);
  return event2;
};
EventBus.prototype.fire = function(type, data) {
  var event2, firstListener, returnValue, args;
  args = slice.call(arguments);
  if (typeof type === "object") {
    data = type;
    type = data.type;
  }
  if (!type) {
    throw new Error("no event type specified");
  }
  firstListener = this._listeners[type];
  if (!firstListener) {
    return;
  }
  if (data instanceof InternalEvent) {
    event2 = data;
  } else {
    event2 = this.createEvent(data);
  }
  args[0] = event2;
  var originalType = event2.type;
  if (type !== originalType) {
    event2.type = type;
  }
  try {
    returnValue = this._invokeListeners(event2, args, firstListener);
  } finally {
    if (type !== originalType) {
      event2.type = originalType;
    }
  }
  if (returnValue === void 0 && event2.defaultPrevented) {
    returnValue = false;
  }
  return returnValue;
};
EventBus.prototype.handleError = function(error) {
  return this.fire("error", { error }) === false;
};
EventBus.prototype._destroy = function() {
  this._listeners = {};
};
EventBus.prototype._invokeListeners = function(event2, args, listener) {
  var returnValue;
  while (listener) {
    if (event2.cancelBubble) {
      break;
    }
    returnValue = this._invokeListener(event2, args, listener);
    listener = listener.next;
  }
  return returnValue;
};
EventBus.prototype._invokeListener = function(event2, args, listener) {
  var returnValue;
  if (listener.callback.__isTomb) {
    return returnValue;
  }
  try {
    returnValue = invokeFunction(listener.callback, args);
    if (returnValue !== void 0) {
      event2.returnValue = returnValue;
      event2.stopPropagation();
    }
    if (returnValue === false) {
      event2.preventDefault();
    }
  } catch (error) {
    if (!this.handleError(error)) {
      console.error("unhandled error in event listener", error);
      throw error;
    }
  }
  return returnValue;
};
EventBus.prototype._addListener = function(event2, newListener) {
  var listener = this._getListeners(event2), previousListener;
  if (!listener) {
    this._setListeners(event2, newListener);
    return;
  }
  while (listener) {
    if (listener.priority < newListener.priority) {
      newListener.next = listener;
      if (previousListener) {
        previousListener.next = newListener;
      } else {
        this._setListeners(event2, newListener);
      }
      return;
    }
    previousListener = listener;
    listener = listener.next;
  }
  previousListener.next = newListener;
};
EventBus.prototype._getListeners = function(name) {
  return this._listeners[name];
};
EventBus.prototype._setListeners = function(name, listener) {
  this._listeners[name] = listener;
};
EventBus.prototype._removeListener = function(event2, callback) {
  var listener = this._getListeners(event2), nextListener, previousListener, listenerCallback;
  if (!callback) {
    this._setListeners(event2, null);
    return;
  }
  while (listener) {
    nextListener = listener.next;
    listenerCallback = listener.callback;
    if (listenerCallback === callback || listenerCallback[FN_REF] === callback) {
      if (previousListener) {
        previousListener.next = nextListener;
      } else {
        this._setListeners(event2, nextListener);
      }
    }
    previousListener = listener;
    listener = nextListener;
  }
};
function InternalEvent() {
}
InternalEvent.prototype.stopPropagation = function() {
  this.cancelBubble = true;
};
InternalEvent.prototype.preventDefault = function() {
  this.defaultPrevented = true;
};
InternalEvent.prototype.init = function(data) {
  assign(this, data || {});
};
function invokeFunction(fn, args) {
  return fn.apply(null, args);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/GraphicsUtil.js
function getVisual(gfx) {
  return gfx.childNodes[0];
}
function getChildren(gfx) {
  return gfx.parentNode.childNodes[1];
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/SvgTransformUtil.js
function transform2(gfx, x, y, angle, amount) {
  var translate2 = createTransform();
  translate2.setTranslate(x, y);
  var rotate2 = createTransform();
  rotate2.setRotate(angle || 0, 0, 0);
  var scale = createTransform();
  scale.setScale(amount || 1, amount || 1);
  transform(gfx, [translate2, rotate2, scale]);
}
function translate(gfx, x, y) {
  var translate2 = createTransform();
  translate2.setTranslate(x, y);
  transform(gfx, translate2);
}
function rotate(gfx, angle) {
  var rotate2 = createTransform();
  rotate2.setRotate(angle, 0, 0);
  transform(gfx, rotate2);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/core/GraphicsFactory.js
function GraphicsFactory(eventBus, elementRegistry) {
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
}
GraphicsFactory.$inject = ["eventBus", "elementRegistry"];
GraphicsFactory.prototype._getChildrenContainer = function(element) {
  var gfx = this._elementRegistry.getGraphics(element);
  var childrenGfx;
  if (!element.parent) {
    childrenGfx = gfx;
  } else {
    childrenGfx = getChildren(gfx);
    if (!childrenGfx) {
      childrenGfx = create("g");
      classes(childrenGfx).add("djs-children");
      append(gfx.parentNode, childrenGfx);
    }
  }
  return childrenGfx;
};
GraphicsFactory.prototype._clear = function(gfx) {
  var visual = getVisual(gfx);
  clear2(visual);
  return visual;
};
GraphicsFactory.prototype._createContainer = function(type, childrenGfx, parentIndex, isFrame) {
  var outerGfx = create("g");
  classes(outerGfx).add("djs-group");
  if (typeof parentIndex !== "undefined") {
    prependTo(outerGfx, childrenGfx, childrenGfx.childNodes[parentIndex]);
  } else {
    append(childrenGfx, outerGfx);
  }
  var gfx = create("g");
  classes(gfx).add("djs-element");
  classes(gfx).add("djs-" + type);
  if (isFrame) {
    classes(gfx).add("djs-frame");
  }
  append(outerGfx, gfx);
  var visual = create("g");
  classes(visual).add("djs-visual");
  append(gfx, visual);
  return gfx;
};
GraphicsFactory.prototype.create = function(type, element, parentIndex) {
  var childrenGfx = this._getChildrenContainer(element.parent);
  return this._createContainer(type, childrenGfx, parentIndex, isFrameElement(element));
};
GraphicsFactory.prototype.updateContainments = function(elements) {
  var self = this, elementRegistry = this._elementRegistry, parents;
  parents = reduce(elements, function(map2, e2) {
    if (e2.parent) {
      map2[e2.parent.id] = e2.parent;
    }
    return map2;
  }, {});
  forEach(parents, function(parent) {
    var children = parent.children;
    if (!children) {
      return;
    }
    var childrenGfx = self._getChildrenContainer(parent);
    var expected = childrenGfx.firstChild;
    forEach(children, function(child) {
      var childGfx = elementRegistry.getGraphics(child).parentNode;
      if (childGfx === expected) {
        expected = expected.nextSibling;
      } else {
        childrenGfx.insertBefore(childGfx, expected);
      }
    });
  });
};
GraphicsFactory.prototype.drawShape = function(visual, element, attrs = {}) {
  var eventBus = this._eventBus;
  return eventBus.fire("render.shape", { gfx: visual, element, attrs });
};
GraphicsFactory.prototype.getShapePath = function(element) {
  var eventBus = this._eventBus;
  return eventBus.fire("render.getShapePath", element);
};
GraphicsFactory.prototype.drawConnection = function(visual, element, attrs = {}) {
  var eventBus = this._eventBus;
  return eventBus.fire("render.connection", { gfx: visual, element, attrs });
};
GraphicsFactory.prototype.getConnectionPath = function(connection) {
  var eventBus = this._eventBus;
  return eventBus.fire("render.getConnectionPath", connection);
};
GraphicsFactory.prototype.update = function(type, element, gfx) {
  if (!element.parent) {
    return;
  }
  var visual = this._clear(gfx);
  if (type === "shape") {
    this.drawShape(visual, element);
    translate(gfx, element.x, element.y);
  } else if (type === "connection") {
    this.drawConnection(visual, element);
  } else {
    throw new Error("unknown type: " + type);
  }
  if (element.hidden) {
    attr(gfx, "display", "none");
  } else {
    attr(gfx, "display", "block");
  }
};
GraphicsFactory.prototype.remove = function(element) {
  var gfx = this._elementRegistry.getGraphics(element);
  remove(gfx.parentNode);
};
function prependTo(newNode, parentNode, siblingNode) {
  var node2 = siblingNode || parentNode.firstChild;
  if (newNode === node2) {
    return;
  }
  parentNode.insertBefore(newNode, node2);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/core/index.js
var core_default = {
  __depends__: [draw_default],
  __init__: ["canvas"],
  canvas: ["type", Canvas],
  elementRegistry: ["type", ElementRegistry],
  elementFactory: ["type", ElementFactory],
  eventBus: ["type", EventBus],
  graphicsFactory: ["type", GraphicsFactory]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/Diagram.js
function bootstrap(modules) {
  var injector = new Injector(modules);
  injector.init();
  return injector;
}
function createInjector(options) {
  options = options || {};
  var configModule = {
    "config": ["value", options]
  };
  var modules = [configModule, core_default].concat(options.modules || []);
  return bootstrap(modules);
}
function Diagram(options, injector) {
  this._injector = injector || createInjector(options);
  this.get("eventBus").fire("diagram.init");
}
Diagram.prototype.get = function(name, strict) {
  return this._injector.get(name, strict);
};
Diagram.prototype.invoke = function(func, context, locals) {
  return this._injector.invoke(func, context, locals);
};
Diagram.prototype.destroy = function() {
  this.get("eventBus").fire("diagram.destroy");
};
Diagram.prototype.clear = function() {
  this.get("eventBus").fire("diagram.clear");
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/command/CommandStack.js
function CommandStack(eventBus, injector) {
  this._handlerMap = {};
  this._stack = [];
  this._stackIdx = -1;
  this._currentExecution = {
    actions: [],
    dirty: [],
    trigger: null
  };
  this._injector = injector;
  this._eventBus = eventBus;
  this._uid = 1;
  eventBus.on([
    "diagram.destroy",
    "diagram.clear"
  ], function() {
    this.clear(false);
  }, this);
}
CommandStack.$inject = ["eventBus", "injector"];
CommandStack.prototype.execute = function(command, context) {
  if (!command) {
    throw new Error("command required");
  }
  this._currentExecution.trigger = "execute";
  const action = { command, context };
  this._pushAction(action);
  this._internalExecute(action);
  this._popAction();
};
CommandStack.prototype.canExecute = function(command, context) {
  const action = { command, context };
  const handler = this._getHandler(command);
  let result = this._fire(command, "canExecute", action);
  if (result === void 0) {
    if (!handler) {
      return false;
    }
    if (handler.canExecute) {
      result = handler.canExecute(context);
    }
  }
  return result;
};
CommandStack.prototype.clear = function(emit) {
  this._stack.length = 0;
  this._stackIdx = -1;
  if (emit !== false) {
    this._fire("changed", { trigger: "clear" });
  }
};
CommandStack.prototype.undo = function() {
  let action = this._getUndoAction(), next;
  if (action) {
    this._currentExecution.trigger = "undo";
    this._pushAction(action);
    while (action) {
      this._internalUndo(action);
      next = this._getUndoAction();
      if (!next || next.id !== action.id) {
        break;
      }
      action = next;
    }
    this._popAction();
  }
};
CommandStack.prototype.redo = function() {
  let action = this._getRedoAction(), next;
  if (action) {
    this._currentExecution.trigger = "redo";
    this._pushAction(action);
    while (action) {
      this._internalExecute(action, true);
      next = this._getRedoAction();
      if (!next || next.id !== action.id) {
        break;
      }
      action = next;
    }
    this._popAction();
  }
};
CommandStack.prototype.register = function(command, handler) {
  this._setHandler(command, handler);
};
CommandStack.prototype.registerHandler = function(command, handlerCls) {
  if (!command || !handlerCls) {
    throw new Error("command and handlerCls must be defined");
  }
  const handler = this._injector.instantiate(handlerCls);
  this.register(command, handler);
};
CommandStack.prototype.canUndo = function() {
  return !!this._getUndoAction();
};
CommandStack.prototype.canRedo = function() {
  return !!this._getRedoAction();
};
CommandStack.prototype._getRedoAction = function() {
  return this._stack[this._stackIdx + 1];
};
CommandStack.prototype._getUndoAction = function() {
  return this._stack[this._stackIdx];
};
CommandStack.prototype._internalUndo = function(action) {
  const command = action.command, context = action.context;
  const handler = this._getHandler(command);
  this._atomicDo(() => {
    this._fire(command, "revert", action);
    if (handler.revert) {
      this._markDirty(handler.revert(context));
    }
    this._revertedAction(action);
    this._fire(command, "reverted", action);
  });
};
CommandStack.prototype._fire = function(command, qualifier, event2) {
  if (arguments.length < 3) {
    event2 = qualifier;
    qualifier = null;
  }
  const names = qualifier ? [command + "." + qualifier, qualifier] : [command];
  let result;
  event2 = this._eventBus.createEvent(event2);
  for (const name of names) {
    result = this._eventBus.fire("commandStack." + name, event2);
    if (event2.cancelBubble) {
      break;
    }
  }
  return result;
};
CommandStack.prototype._createId = function() {
  return this._uid++;
};
CommandStack.prototype._atomicDo = function(fn) {
  const execution = this._currentExecution;
  execution.atomic = true;
  try {
    fn();
  } finally {
    execution.atomic = false;
  }
};
CommandStack.prototype._internalExecute = function(action, redo) {
  const command = action.command, context = action.context;
  const handler = this._getHandler(command);
  if (!handler) {
    throw new Error("no command handler registered for <" + command + ">");
  }
  this._pushAction(action);
  if (!redo) {
    this._fire(command, "preExecute", action);
    if (handler.preExecute) {
      handler.preExecute(context);
    }
    this._fire(command, "preExecuted", action);
  }
  this._atomicDo(() => {
    this._fire(command, "execute", action);
    if (handler.execute) {
      this._markDirty(handler.execute(context));
    }
    this._executedAction(action, redo);
    this._fire(command, "executed", action);
  });
  if (!redo) {
    this._fire(command, "postExecute", action);
    if (handler.postExecute) {
      handler.postExecute(context);
    }
    this._fire(command, "postExecuted", action);
  }
  this._popAction();
};
CommandStack.prototype._pushAction = function(action) {
  const execution = this._currentExecution, actions = execution.actions;
  const baseAction = actions[0];
  if (execution.atomic) {
    throw new Error("illegal invocation in <execute> or <revert> phase (action: " + action.command + ")");
  }
  if (!action.id) {
    action.id = baseAction && baseAction.id || this._createId();
  }
  actions.push(action);
};
CommandStack.prototype._popAction = function() {
  const execution = this._currentExecution, trigger = execution.trigger, actions = execution.actions, dirty = execution.dirty;
  actions.pop();
  if (!actions.length) {
    this._eventBus.fire("elements.changed", { elements: uniqueBy("id", dirty.reverse()) });
    dirty.length = 0;
    this._fire("changed", { trigger });
    execution.trigger = null;
  }
};
CommandStack.prototype._markDirty = function(elements) {
  const execution = this._currentExecution;
  if (!elements) {
    return;
  }
  elements = isArray2(elements) ? elements : [elements];
  execution.dirty = execution.dirty.concat(elements);
};
CommandStack.prototype._executedAction = function(action, redo) {
  const stackIdx = ++this._stackIdx;
  if (!redo) {
    this._stack.splice(stackIdx, this._stack.length, action);
  }
};
CommandStack.prototype._revertedAction = function(action) {
  this._stackIdx--;
};
CommandStack.prototype._getHandler = function(command) {
  return this._handlerMap[command];
};
CommandStack.prototype._setHandler = function(command, handler) {
  if (!command || !handler) {
    throw new Error("command and handler required");
  }
  if (this._handlerMap[command]) {
    throw new Error("overriding handler for command <" + command + ">");
  }
  this._handlerMap[command] = handler;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/command/index.js
var command_default = {
  commandStack: ["type", CommandStack]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/change-support/ChangeSupport.js
function ChangeSupport(eventBus, canvas, elementRegistry, graphicsFactory) {
  eventBus.on("element.changed", function(event2) {
    var element = event2.element;
    if (element.parent || element === canvas.getRootElement()) {
      event2.gfx = elementRegistry.getGraphics(element);
    }
    if (!event2.gfx) {
      return;
    }
    eventBus.fire(getType(element) + ".changed", event2);
  });
  eventBus.on("elements.changed", function(event2) {
    var elements = event2.elements;
    elements.forEach(function(e2) {
      eventBus.fire("element.changed", { element: e2 });
    });
    graphicsFactory.updateContainments(elements);
  });
  eventBus.on("shape.changed", function(event2) {
    graphicsFactory.update("shape", event2.element, event2.gfx);
  });
  eventBus.on("connection.changed", function(event2) {
    graphicsFactory.update("connection", event2.element, event2.gfx);
  });
}
ChangeSupport.$inject = [
  "eventBus",
  "canvas",
  "elementRegistry",
  "graphicsFactory"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/change-support/index.js
var change_support_default = {
  __init__: ["changeSupport"],
  changeSupport: ["type", ChangeSupport]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Event.js
function __stopPropagation(event2) {
  if (!event2 || typeof event2.stopPropagation !== "function") {
    return;
  }
  event2.stopPropagation();
}
function getOriginal(event2) {
  return event2.originalEvent || event2.srcEvent;
}
function stopPropagation(event2) {
  __stopPropagation(event2);
  __stopPropagation(getOriginal(event2));
}
function toPoint(event2) {
  if (event2.pointers && event2.pointers.length) {
    event2 = event2.pointers[0];
  }
  if (event2.touches && event2.touches.length) {
    event2 = event2.touches[0];
  }
  return event2 ? {
    x: event2.clientX,
    y: event2.clientY
  } : null;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Platform.js
function isMac() {
  return /mac/i.test(navigator.platform);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Mouse.js
function isButton(event2, button) {
  return (getOriginal(event2) || event2).button === button;
}
function isPrimaryButton(event2) {
  return isButton(event2, 0);
}
function isAuxiliaryButton(event2) {
  return isButton(event2, 1);
}
function hasSecondaryModifier(event2) {
  var originalEvent = getOriginal(event2) || event2;
  return isPrimaryButton(event2) && originalEvent.shiftKey;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/interaction-events/InteractionEvents.js
function allowAll(event2) {
  return true;
}
function allowPrimaryAndAuxiliary(event2) {
  return isPrimaryButton(event2) || isAuxiliaryButton(event2);
}
var LOW_PRIORITY = 500;
function InteractionEvents(eventBus, elementRegistry, styles) {
  var self = this;
  function fire(type, event2, element) {
    if (isIgnored(type, event2)) {
      return;
    }
    var target, gfx, returnValue;
    if (!element) {
      target = event2.delegateTarget || event2.target;
      if (target) {
        gfx = target;
        element = elementRegistry.get(gfx);
      }
    } else {
      gfx = elementRegistry.getGraphics(element);
    }
    if (!gfx || !element) {
      return;
    }
    returnValue = eventBus.fire(type, {
      element,
      gfx,
      originalEvent: event2
    });
    if (returnValue === false) {
      event2.stopPropagation();
      event2.preventDefault();
    }
  }
  var handlers = {};
  function mouseHandler(localEventName) {
    return handlers[localEventName];
  }
  function isIgnored(localEventName, event2) {
    var filter2 = ignoredFilters[localEventName] || isPrimaryButton;
    return !filter2(event2);
  }
  var bindings = {
    click: "element.click",
    contextmenu: "element.contextmenu",
    dblclick: "element.dblclick",
    mousedown: "element.mousedown",
    mousemove: "element.mousemove",
    mouseover: "element.hover",
    mouseout: "element.out",
    mouseup: "element.mouseup"
  };
  var ignoredFilters = {
    "element.contextmenu": allowAll,
    "element.mousedown": allowPrimaryAndAuxiliary,
    "element.mouseup": allowPrimaryAndAuxiliary,
    "element.click": allowPrimaryAndAuxiliary,
    "element.dblclick": allowPrimaryAndAuxiliary
  };
  function triggerMouseEvent(eventName, event2, targetElement) {
    var localEventName = bindings[eventName];
    if (!localEventName) {
      throw new Error("unmapped DOM event name <" + eventName + ">");
    }
    return fire(localEventName, event2, targetElement);
  }
  var ELEMENT_SELECTOR = "svg, .djs-element";
  function registerEvent(node2, event2, localEvent, ignoredFilter) {
    var handler = handlers[localEvent] = function(event3) {
      fire(localEvent, event3);
    };
    if (ignoredFilter) {
      ignoredFilters[localEvent] = ignoredFilter;
    }
    handler.$delegate = delegate.bind(node2, ELEMENT_SELECTOR, event2, handler);
  }
  function unregisterEvent(node2, event2, localEvent) {
    var handler = mouseHandler(localEvent);
    if (!handler) {
      return;
    }
    delegate.unbind(node2, event2, handler.$delegate);
  }
  function registerEvents(svg) {
    forEach(bindings, function(val, key) {
      registerEvent(svg, key, val);
    });
  }
  function unregisterEvents(svg) {
    forEach(bindings, function(val, key) {
      unregisterEvent(svg, key, val);
    });
  }
  eventBus.on("canvas.destroy", function(event2) {
    unregisterEvents(event2.svg);
  });
  eventBus.on("canvas.init", function(event2) {
    registerEvents(event2.svg);
  });
  eventBus.on(["shape.added", "connection.added"], function(event2) {
    var element = event2.element, gfx = event2.gfx;
    eventBus.fire("interactionEvents.createHit", { element, gfx });
  });
  eventBus.on([
    "shape.changed",
    "connection.changed"
  ], LOW_PRIORITY, function(event2) {
    var element = event2.element, gfx = event2.gfx;
    eventBus.fire("interactionEvents.updateHit", { element, gfx });
  });
  eventBus.on("interactionEvents.createHit", LOW_PRIORITY, function(event2) {
    var element = event2.element, gfx = event2.gfx;
    self.createDefaultHit(element, gfx);
  });
  eventBus.on("interactionEvents.updateHit", function(event2) {
    var element = event2.element, gfx = event2.gfx;
    self.updateDefaultHit(element, gfx);
  });
  var STROKE_HIT_STYLE = createHitStyle("djs-hit djs-hit-stroke");
  var CLICK_STROKE_HIT_STYLE = createHitStyle("djs-hit djs-hit-click-stroke");
  var ALL_HIT_STYLE = createHitStyle("djs-hit djs-hit-all");
  var NO_MOVE_HIT_STYLE = createHitStyle("djs-hit djs-hit-no-move");
  var HIT_TYPES = {
    "all": ALL_HIT_STYLE,
    "click-stroke": CLICK_STROKE_HIT_STYLE,
    "stroke": STROKE_HIT_STYLE,
    "no-move": NO_MOVE_HIT_STYLE
  };
  function createHitStyle(classNames, attrs) {
    attrs = assign({
      stroke: "white",
      strokeWidth: 15
    }, attrs || {});
    return styles.cls(classNames, ["no-fill", "no-border"], attrs);
  }
  function applyStyle(hit, type) {
    var attrs = HIT_TYPES[type];
    if (!attrs) {
      throw new Error("invalid hit type <" + type + ">");
    }
    attr(hit, attrs);
    return hit;
  }
  function appendHit(gfx, hit) {
    append(gfx, hit);
  }
  this.removeHits = function(gfx) {
    var hits = all(".djs-hit", gfx);
    forEach(hits, remove);
  };
  this.createDefaultHit = function(element, gfx) {
    var waypoints = element.waypoints, isFrame = element.isFrame, boxType;
    if (waypoints) {
      return this.createWaypointsHit(gfx, waypoints);
    } else {
      boxType = isFrame ? "stroke" : "all";
      return this.createBoxHit(gfx, boxType, {
        width: element.width,
        height: element.height
      });
    }
  };
  this.createWaypointsHit = function(gfx, waypoints) {
    var hit = createLine(waypoints);
    applyStyle(hit, "stroke");
    appendHit(gfx, hit);
    return hit;
  };
  this.createBoxHit = function(gfx, type, attrs) {
    attrs = assign({
      x: 0,
      y: 0
    }, attrs);
    var hit = create("rect");
    applyStyle(hit, type);
    attr(hit, attrs);
    appendHit(gfx, hit);
    return hit;
  };
  this.updateDefaultHit = function(element, gfx) {
    var hit = query(".djs-hit", gfx);
    if (!hit) {
      return;
    }
    if (element.waypoints) {
      updateLine(hit, element.waypoints);
    } else {
      attr(hit, {
        width: element.width,
        height: element.height
      });
    }
    return hit;
  };
  this.fire = fire;
  this.triggerMouseEvent = triggerMouseEvent;
  this.mouseHandler = mouseHandler;
  this.registerEvent = registerEvent;
  this.unregisterEvent = unregisterEvent;
}
InteractionEvents.$inject = [
  "eventBus",
  "elementRegistry",
  "styles"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/interaction-events/index.js
var interaction_events_default = {
  __init__: ["interactionEvents"],
  interactionEvents: ["type", InteractionEvents]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/selection/Selection.js
function Selection(eventBus, canvas) {
  this._eventBus = eventBus;
  this._canvas = canvas;
  this._selectedElements = /* @__PURE__ */ new Set();
  var self = this;
  eventBus.on(["shape.remove", "connection.remove"], function(e2) {
    var element = e2.element;
    self.deselect(element);
  });
  eventBus.on(["diagram.clear", "root.set"], function(e2) {
    self.select(null);
  });
}
Selection.$inject = ["eventBus", "canvas"];
Selection.prototype.deselect = function(element) {
  if (!this._selectedElements.has(element)) {
    return;
  }
  var oldSelection = this.get();
  this._selectedElements.delete(element);
  this._eventBus.fire("selection.changed", {
    oldSelection,
    newSelection: this.get()
  });
};
Selection.prototype.get = function() {
  return Array.from(this._selectedElements);
};
Selection.prototype.isSelected = function(element) {
  return this._selectedElements.has(element);
};
Selection.prototype.select = function(elements, add2) {
  var oldSelection = this.get();
  if (!isArray2(elements)) {
    elements = elements ? [elements] : [];
  }
  var canvas = this._canvas;
  var rootElement = canvas.getRootElement();
  elements = elements.filter(function(element) {
    var elementRoot = canvas.findRoot(element);
    return rootElement === elementRoot;
  });
  if (add2) {
    forEach(elements, (element) => {
      this._selectedElements.add(element);
    });
  } else {
    this._selectedElements = new Set(elements);
  }
  this._eventBus.fire("selection.changed", {
    oldSelection,
    newSelection: this.get()
  });
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/selection/SelectionVisuals.js
var MARKER_HOVER = "hover";
var MARKER_SELECTED = "selected";
function SelectionVisuals(canvas, eventBus) {
  this._canvas = canvas;
  function addMarker(e2, cls) {
    canvas.addMarker(e2, cls);
  }
  function removeMarker(e2, cls) {
    canvas.removeMarker(e2, cls);
  }
  eventBus.on("element.hover", function(event2) {
    addMarker(event2.element, MARKER_HOVER);
  });
  eventBus.on("element.out", function(event2) {
    removeMarker(event2.element, MARKER_HOVER);
  });
  eventBus.on("selection.changed", function(event2) {
    function deselect(s) {
      removeMarker(s, MARKER_SELECTED);
    }
    function select(s) {
      addMarker(s, MARKER_SELECTED);
    }
    var oldSelection = new Set(event2.oldSelection), newSelection = new Set(event2.newSelection);
    for (let e2 of oldSelection) {
      if (!newSelection.has(e2)) {
        deselect(e2);
      }
    }
    for (let e2 of newSelection) {
      if (!oldSelection.has(e2)) {
        select(e2);
      }
    }
  });
}
SelectionVisuals.$inject = [
  "canvas",
  "eventBus"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/selection/SelectionBehavior.js
function SelectionBehavior(eventBus, selection, canvas, elementRegistry) {
  eventBus.on("create.end", 500, function(event2) {
    var context = event2.context, canExecute = context.canExecute, elements = context.elements, hints = context.hints || {}, autoSelect = hints.autoSelect;
    if (canExecute) {
      if (autoSelect === false) {
        return;
      }
      if (isArray2(autoSelect)) {
        selection.select(autoSelect);
      } else {
        selection.select(elements.filter(isShown));
      }
    }
  });
  eventBus.on("connect.end", 500, function(event2) {
    var context = event2.context, connection = context.connection;
    if (connection) {
      selection.select(connection);
    }
  });
  eventBus.on("shape.move.end", 500, function(event2) {
    var previousSelection = event2.previousSelection || [];
    var shape = elementRegistry.get(event2.context.shape.id);
    var isSelected = find(previousSelection, function(selectedShape) {
      return shape.id === selectedShape.id;
    });
    if (!isSelected) {
      selection.select(shape);
    }
  });
  eventBus.on("element.click", function(event2) {
    if (!isPrimaryButton(event2)) {
      return;
    }
    var element = event2.element;
    if (element === canvas.getRootElement()) {
      element = null;
    }
    var isSelected = selection.isSelected(element), isMultiSelect = selection.get().length > 1;
    var add2 = hasSecondaryModifier(event2);
    if (isSelected && isMultiSelect) {
      if (add2) {
        return selection.deselect(element);
      } else {
        return selection.select(element);
      }
    } else if (!isSelected) {
      selection.select(element, add2);
    } else {
      selection.deselect(element);
    }
  });
}
SelectionBehavior.$inject = [
  "eventBus",
  "selection",
  "canvas",
  "elementRegistry"
];
function isShown(element) {
  return !element.hidden;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/selection/index.js
var selection_default = {
  __init__: ["selectionVisuals", "selectionBehavior"],
  __depends__: [
    interaction_events_default
  ],
  selection: ["type", Selection],
  selectionVisuals: ["type", SelectionVisuals],
  selectionBehavior: ["type", SelectionBehavior]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/rules/Rules.js
function Rules(injector) {
  this._commandStack = injector.get("commandStack", false);
}
Rules.$inject = ["injector"];
Rules.prototype.allowed = function(action, context) {
  var allowed = true;
  var commandStack = this._commandStack;
  if (commandStack) {
    allowed = commandStack.canExecute(action, context);
  }
  return allowed === void 0 ? true : allowed;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/rules/index.js
var rules_default = {
  __init__: ["rules"],
  rules: ["type", Rules]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/AlignElementsHandler.js
function AlignElements(modeling, canvas) {
  this._modeling = modeling;
  this._canvas = canvas;
}
AlignElements.$inject = ["modeling", "canvas"];
AlignElements.prototype.preExecute = function(context) {
  var modeling = this._modeling;
  var elements = context.elements, alignment = context.alignment;
  forEach(elements, function(element) {
    var delta2 = {
      x: 0,
      y: 0
    };
    if (isDefined(alignment.left)) {
      delta2.x = alignment.left - element.x;
    } else if (isDefined(alignment.right)) {
      delta2.x = alignment.right - element.width - element.x;
    } else if (isDefined(alignment.center)) {
      delta2.x = alignment.center - Math.round(element.width / 2) - element.x;
    } else if (isDefined(alignment.top)) {
      delta2.y = alignment.top - element.y;
    } else if (isDefined(alignment.bottom)) {
      delta2.y = alignment.bottom - element.height - element.y;
    } else if (isDefined(alignment.middle)) {
      delta2.y = alignment.middle - Math.round(element.height / 2) - element.y;
    }
    modeling.moveElements([element], delta2, element.parent);
  });
};
AlignElements.prototype.postExecute = function(context) {
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/AppendShapeHandler.js
function AppendShapeHandler(modeling) {
  this._modeling = modeling;
}
AppendShapeHandler.$inject = ["modeling"];
AppendShapeHandler.prototype.preExecute = function(context) {
  var source = context.source;
  if (!source) {
    throw new Error("source required");
  }
  var target = context.target || source.parent, shape = context.shape, hints = context.hints || {};
  shape = context.shape = this._modeling.createShape(
    shape,
    context.position,
    target,
    { attach: hints.attach }
  );
  context.shape = shape;
};
AppendShapeHandler.prototype.postExecute = function(context) {
  var hints = context.hints || {};
  if (!existsConnection(context.source, context.shape)) {
    if (hints.connectionTarget === context.source) {
      this._modeling.connect(context.shape, context.source, context.connection);
    } else {
      this._modeling.connect(context.source, context.shape, context.connection);
    }
  }
};
function existsConnection(source, target) {
  return some(source.outgoing, function(c) {
    return c.target === target;
  });
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/CreateConnectionHandler.js
function CreateConnectionHandler(canvas, layouter) {
  this._canvas = canvas;
  this._layouter = layouter;
}
CreateConnectionHandler.$inject = ["canvas", "layouter"];
CreateConnectionHandler.prototype.execute = function(context) {
  var connection = context.connection, source = context.source, target = context.target, parent = context.parent, parentIndex = context.parentIndex, hints = context.hints;
  if (!source || !target) {
    throw new Error("source and target required");
  }
  if (!parent) {
    throw new Error("parent required");
  }
  connection.source = source;
  connection.target = target;
  if (!connection.waypoints) {
    connection.waypoints = this._layouter.layoutConnection(connection, hints);
  }
  this._canvas.addConnection(connection, parent, parentIndex);
  return connection;
};
CreateConnectionHandler.prototype.revert = function(context) {
  var connection = context.connection;
  this._canvas.removeConnection(connection);
  connection.source = null;
  connection.target = null;
  return connection;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/CreateElementsHandler.js
var round2 = Math.round;
function CreateElementsHandler(modeling) {
  this._modeling = modeling;
}
CreateElementsHandler.$inject = [
  "modeling"
];
CreateElementsHandler.prototype.preExecute = function(context) {
  var elements = context.elements, parent = context.parent, parentIndex = context.parentIndex, position = context.position, hints = context.hints;
  var modeling = this._modeling;
  forEach(elements, function(element) {
    if (!isNumber(element.x)) {
      element.x = 0;
    }
    if (!isNumber(element.y)) {
      element.y = 0;
    }
  });
  var visibleElements = filter(elements, function(element) {
    return !element.hidden;
  });
  var bbox = getBBox(visibleElements);
  forEach(elements, function(element) {
    if (isConnection(element)) {
      element.waypoints = map(element.waypoints, function(waypoint) {
        return {
          x: round2(waypoint.x - bbox.x - bbox.width / 2 + position.x),
          y: round2(waypoint.y - bbox.y - bbox.height / 2 + position.y)
        };
      });
    }
    assign(element, {
      x: round2(element.x - bbox.x - bbox.width / 2 + position.x),
      y: round2(element.y - bbox.y - bbox.height / 2 + position.y)
    });
  });
  var parentsSet = new Set(getParents(elements));
  var cache = {};
  forEach(elements, function(element) {
    if (isConnection(element)) {
      cache[element.id] = isNumber(parentIndex) ? modeling.createConnection(
        cache[element.source.id],
        cache[element.target.id],
        parentIndex,
        element,
        element.parent || parent,
        hints
      ) : modeling.createConnection(
        cache[element.source.id],
        cache[element.target.id],
        element,
        element.parent || parent,
        hints
      );
      return;
    }
    var createShapeHints = assign({}, hints);
    if (!parentsSet.has(element)) {
      createShapeHints.autoResize = false;
    }
    if (isLabel(element)) {
      createShapeHints = omit(createShapeHints, ["attach"]);
    }
    cache[element.id] = isNumber(parentIndex) ? modeling.createShape(
      element,
      pick(element, ["x", "y", "width", "height"]),
      element.parent || parent,
      parentIndex,
      createShapeHints
    ) : modeling.createShape(
      element,
      pick(element, ["x", "y", "width", "height"]),
      element.parent || parent,
      createShapeHints
    );
  });
  context.elements = values(cache);
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/CreateShapeHandler.js
var round3 = Math.round;
function CreateShapeHandler(canvas) {
  this._canvas = canvas;
}
CreateShapeHandler.$inject = ["canvas"];
CreateShapeHandler.prototype.execute = function(context) {
  var shape = context.shape, positionOrBounds = context.position, parent = context.parent, parentIndex = context.parentIndex;
  if (!parent) {
    throw new Error("parent required");
  }
  if (!positionOrBounds) {
    throw new Error("position required");
  }
  if (positionOrBounds.width !== void 0) {
    assign(shape, positionOrBounds);
  } else {
    assign(shape, {
      x: positionOrBounds.x - round3(shape.width / 2),
      y: positionOrBounds.y - round3(shape.height / 2)
    });
  }
  this._canvas.addShape(shape, parent, parentIndex);
  return shape;
};
CreateShapeHandler.prototype.revert = function(context) {
  var shape = context.shape;
  this._canvas.removeShape(shape);
  return shape;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/CreateLabelHandler.js
function CreateLabelHandler(canvas) {
  CreateShapeHandler.call(this, canvas);
}
e(CreateLabelHandler, CreateShapeHandler);
CreateLabelHandler.$inject = ["canvas"];
var originalExecute = CreateShapeHandler.prototype.execute;
CreateLabelHandler.prototype.execute = function(context) {
  var label = context.shape;
  ensureValidDimensions(label);
  label.labelTarget = context.labelTarget;
  return originalExecute.call(this, context);
};
var originalRevert = CreateShapeHandler.prototype.revert;
CreateLabelHandler.prototype.revert = function(context) {
  context.shape.labelTarget = null;
  return originalRevert.call(this, context);
};
function ensureValidDimensions(label) {
  ["width", "height"].forEach(function(prop) {
    if (typeof label[prop] === "undefined") {
      label[prop] = 0;
    }
  });
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Removal.js
function saveClear(collection, removeFn) {
  if (typeof removeFn !== "function") {
    throw new Error("removeFn iterator must be a function");
  }
  if (!collection) {
    return [];
  }
  var e2;
  while (e2 = collection[0]) {
    removeFn(e2);
  }
  return collection;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/DeleteConnectionHandler.js
function DeleteConnectionHandler(canvas, modeling) {
  this._canvas = canvas;
  this._modeling = modeling;
}
DeleteConnectionHandler.$inject = [
  "canvas",
  "modeling"
];
DeleteConnectionHandler.prototype.preExecute = function(context) {
  var modeling = this._modeling;
  var connection = context.connection;
  saveClear(connection.incoming, function(connection2) {
    modeling.removeConnection(connection2, { nested: true });
  });
  saveClear(connection.outgoing, function(connection2) {
    modeling.removeConnection(connection2, { nested: true });
  });
};
DeleteConnectionHandler.prototype.execute = function(context) {
  var connection = context.connection, parent = connection.parent;
  context.parent = parent;
  context.parentIndex = indexOf(parent.children, connection);
  context.source = connection.source;
  context.target = connection.target;
  this._canvas.removeConnection(connection);
  connection.source = null;
  connection.target = null;
  return connection;
};
DeleteConnectionHandler.prototype.revert = function(context) {
  var connection = context.connection, parent = context.parent, parentIndex = context.parentIndex;
  connection.source = context.source;
  connection.target = context.target;
  add(parent.children, connection, parentIndex);
  this._canvas.addConnection(connection, parent);
  return connection;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/DeleteElementsHandler.js
function DeleteElementsHandler(modeling, elementRegistry) {
  this._modeling = modeling;
  this._elementRegistry = elementRegistry;
}
DeleteElementsHandler.$inject = [
  "modeling",
  "elementRegistry"
];
DeleteElementsHandler.prototype.postExecute = function(context) {
  var modeling = this._modeling, elementRegistry = this._elementRegistry, elements = context.elements;
  forEach(elements, function(element) {
    if (!elementRegistry.get(element.id)) {
      return;
    }
    if (element.waypoints) {
      modeling.removeConnection(element);
    } else {
      modeling.removeShape(element);
    }
  });
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/DeleteShapeHandler.js
function DeleteShapeHandler(canvas, modeling) {
  this._canvas = canvas;
  this._modeling = modeling;
}
DeleteShapeHandler.$inject = ["canvas", "modeling"];
DeleteShapeHandler.prototype.preExecute = function(context) {
  var modeling = this._modeling;
  var shape = context.shape;
  saveClear(shape.incoming, function(connection) {
    modeling.removeConnection(connection, { nested: true });
  });
  saveClear(shape.outgoing, function(connection) {
    modeling.removeConnection(connection, { nested: true });
  });
  saveClear(shape.children, function(child) {
    if (isConnection(child)) {
      modeling.removeConnection(child, { nested: true });
    } else {
      modeling.removeShape(child, { nested: true });
    }
  });
};
DeleteShapeHandler.prototype.execute = function(context) {
  var canvas = this._canvas;
  var shape = context.shape, oldParent = shape.parent;
  context.oldParent = oldParent;
  context.oldParentIndex = indexOf(oldParent.children, shape);
  canvas.removeShape(shape);
  return shape;
};
DeleteShapeHandler.prototype.revert = function(context) {
  var canvas = this._canvas;
  var shape = context.shape, oldParent = context.oldParent, oldParentIndex = context.oldParentIndex;
  add(oldParent.children, shape, oldParentIndex);
  canvas.addShape(shape, oldParent);
  return shape;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/DistributeElementsHandler.js
function DistributeElements(modeling) {
  this._modeling = modeling;
}
DistributeElements.$inject = ["modeling"];
var OFF_AXIS = {
  x: "y",
  y: "x"
};
DistributeElements.prototype.preExecute = function(context) {
  var modeling = this._modeling;
  var groups = context.groups, axis = context.axis, dimension = context.dimension;
  function updateRange(group, element) {
    group.range.min = Math.min(element[axis], group.range.min);
    group.range.max = Math.max(element[axis] + element[dimension], group.range.max);
  }
  function center2(element) {
    return element[axis] + element[dimension] / 2;
  }
  function lastIdx(arr) {
    return arr.length - 1;
  }
  function rangeDiff(range) {
    return range.max - range.min;
  }
  function centerElement(refCenter, element) {
    var delta2 = { y: 0 };
    delta2[axis] = refCenter - center2(element);
    if (delta2[axis]) {
      delta2[OFF_AXIS[axis]] = 0;
      modeling.moveElements([element], delta2, element.parent);
    }
  }
  var firstGroup = groups[0], lastGroupIdx = lastIdx(groups), lastGroup = groups[lastGroupIdx];
  var margin, spaceInBetween, groupsSize = 0;
  forEach(groups, function(group, idx) {
    var sortedElements, refElem, refCenter;
    if (group.elements.length < 2) {
      if (idx && idx !== groups.length - 1) {
        updateRange(group, group.elements[0]);
        groupsSize += rangeDiff(group.range);
      }
      return;
    }
    sortedElements = sortBy(group.elements, axis);
    refElem = sortedElements[0];
    if (idx === lastGroupIdx) {
      refElem = sortedElements[lastIdx(sortedElements)];
    }
    refCenter = center2(refElem);
    group.range = null;
    forEach(sortedElements, function(element) {
      centerElement(refCenter, element);
      if (group.range === null) {
        group.range = {
          min: element[axis],
          max: element[axis] + element[dimension]
        };
        return;
      }
      updateRange(group, element);
    });
    if (idx && idx !== groups.length - 1) {
      groupsSize += rangeDiff(group.range);
    }
  });
  spaceInBetween = Math.abs(lastGroup.range.min - firstGroup.range.max);
  margin = Math.round((spaceInBetween - groupsSize) / (groups.length - 1));
  if (margin < groups.length - 1) {
    return;
  }
  forEach(groups, function(group, groupIdx) {
    var delta2 = {}, prevGroup;
    if (group === firstGroup || group === lastGroup) {
      return;
    }
    prevGroup = groups[groupIdx - 1];
    group.range.max = 0;
    forEach(group.elements, function(element, idx) {
      delta2[OFF_AXIS[axis]] = 0;
      delta2[axis] = prevGroup.range.max - element[axis] + margin;
      if (group.range.min !== element[axis]) {
        delta2[axis] += element[axis] - group.range.min;
      }
      if (delta2[axis]) {
        modeling.moveElements([element], delta2, element.parent);
      }
      group.range.max = Math.max(element[axis] + element[dimension], idx ? group.range.max : 0);
    });
  });
};
DistributeElements.prototype.postExecute = function(context) {
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/LayoutConnectionHandler.js
function LayoutConnectionHandler(layouter, canvas) {
  this._layouter = layouter;
  this._canvas = canvas;
}
LayoutConnectionHandler.$inject = ["layouter", "canvas"];
LayoutConnectionHandler.prototype.execute = function(context) {
  var connection = context.connection;
  var oldWaypoints = connection.waypoints;
  assign(context, {
    oldWaypoints
  });
  connection.waypoints = this._layouter.layoutConnection(connection, context.hints);
  return connection;
};
LayoutConnectionHandler.prototype.revert = function(context) {
  var connection = context.connection;
  connection.waypoints = context.oldWaypoints;
  return connection;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/MoveConnectionHandler.js
function MoveConnectionHandler() {
}
MoveConnectionHandler.prototype.execute = function(context) {
  var connection = context.connection, delta2 = context.delta;
  var newParent = context.newParent || connection.parent, newParentIndex = context.newParentIndex, oldParent = connection.parent;
  context.oldParent = oldParent;
  context.oldParentIndex = remove3(oldParent.children, connection);
  add(newParent.children, connection, newParentIndex);
  connection.parent = newParent;
  forEach(connection.waypoints, function(p) {
    p.x += delta2.x;
    p.y += delta2.y;
    if (p.original) {
      p.original.x += delta2.x;
      p.original.y += delta2.y;
    }
  });
  return connection;
};
MoveConnectionHandler.prototype.revert = function(context) {
  var connection = context.connection, newParent = connection.parent, oldParent = context.oldParent, oldParentIndex = context.oldParentIndex, delta2 = context.delta;
  remove3(newParent.children, connection);
  add(oldParent.children, connection, oldParentIndex);
  connection.parent = oldParent;
  forEach(connection.waypoints, function(p) {
    p.x -= delta2.x;
    p.y -= delta2.y;
    if (p.original) {
      p.original.x -= delta2.x;
      p.original.y -= delta2.y;
    }
  });
  return connection;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/PositionUtil.js
function center(bounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
}
function delta(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/AttachUtil.js
function getNewAttachPoint(point, oldBounds, newBounds) {
  var oldCenter = center(oldBounds), newCenter = center(newBounds), oldDelta = delta(point, oldCenter);
  var newDelta = {
    x: oldDelta.x * (newBounds.width / oldBounds.width),
    y: oldDelta.y * (newBounds.height / oldBounds.height)
  };
  return roundPoint({
    x: newCenter.x + newDelta.x,
    y: newCenter.y + newDelta.y
  });
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/helper/AnchorsHelper.js
function getResizedSourceAnchor(connection, shape, oldBounds) {
  var waypoints = safeGetWaypoints(connection), waypointsInsideNewBounds = getWaypointsInsideBounds(waypoints, shape), oldAnchor = waypoints[0];
  if (waypointsInsideNewBounds.length) {
    return waypointsInsideNewBounds[waypointsInsideNewBounds.length - 1];
  }
  return getNewAttachPoint(oldAnchor.original || oldAnchor, oldBounds, shape);
}
function getResizedTargetAnchor(connection, shape, oldBounds) {
  var waypoints = safeGetWaypoints(connection), waypointsInsideNewBounds = getWaypointsInsideBounds(waypoints, shape), oldAnchor = waypoints[waypoints.length - 1];
  if (waypointsInsideNewBounds.length) {
    return waypointsInsideNewBounds[0];
  }
  return getNewAttachPoint(oldAnchor.original || oldAnchor, oldBounds, shape);
}
function getMovedSourceAnchor(connection, source, moveDelta) {
  var waypoints = safeGetWaypoints(connection), oldBounds = subtract(source, moveDelta), oldAnchor = waypoints[0];
  return getNewAttachPoint(oldAnchor.original || oldAnchor, oldBounds, source);
}
function getMovedTargetAnchor(connection, target, moveDelta) {
  var waypoints = safeGetWaypoints(connection), oldBounds = subtract(target, moveDelta), oldAnchor = waypoints[waypoints.length - 1];
  return getNewAttachPoint(oldAnchor.original || oldAnchor, oldBounds, target);
}
function subtract(bounds, delta2) {
  return {
    x: bounds.x - delta2.x,
    y: bounds.y - delta2.y,
    width: bounds.width,
    height: bounds.height
  };
}
function safeGetWaypoints(connection) {
  var waypoints = connection.waypoints;
  if (!waypoints.length) {
    throw new Error("connection#" + connection.id + ": no waypoints");
  }
  return waypoints;
}
function getWaypointsInsideBounds(waypoints, bounds) {
  var originalWaypoints = map(waypoints, getOriginal2);
  return filter(originalWaypoints, function(waypoint) {
    return isInsideBounds(waypoint, bounds);
  });
}
function isInsideBounds(point, bounds) {
  return getOrientation(bounds, point, 1) === "intersect";
}
function getOriginal2(point) {
  return point.original || point;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/helper/MoveClosure.js
function MoveClosure() {
  this.allShapes = {};
  this.allConnections = {};
  this.enclosedElements = {};
  this.enclosedConnections = {};
  this.topLevel = {};
}
MoveClosure.prototype.add = function(element, isTopLevel) {
  return this.addAll([element], isTopLevel);
};
MoveClosure.prototype.addAll = function(elements, isTopLevel) {
  var newClosure = getClosure(elements, !!isTopLevel, this);
  assign(this, newClosure);
  return this;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/helper/MoveHelper.js
function MoveHelper(modeling) {
  this._modeling = modeling;
}
MoveHelper.prototype.moveRecursive = function(elements, delta2, newParent) {
  if (!elements) {
    return [];
  } else {
    return this.moveClosure(this.getClosure(elements), delta2, newParent);
  }
};
MoveHelper.prototype.moveClosure = function(closure, delta2, newParent, newHost, primaryShape) {
  var modeling = this._modeling;
  var allShapes = closure.allShapes, allConnections = closure.allConnections, enclosedConnections = closure.enclosedConnections, topLevel = closure.topLevel, keepParent = false;
  if (primaryShape && primaryShape.parent === newParent) {
    keepParent = true;
  }
  forEach(allShapes, function(shape) {
    modeling.moveShape(shape, delta2, topLevel[shape.id] && !keepParent && newParent, {
      recurse: false,
      layout: false
    });
  });
  forEach(allConnections, function(c) {
    var sourceMoved = !!allShapes[c.source.id], targetMoved = !!allShapes[c.target.id];
    if (enclosedConnections[c.id] && sourceMoved && targetMoved) {
      modeling.moveConnection(c, delta2, topLevel[c.id] && !keepParent && newParent);
    } else {
      modeling.layoutConnection(c, {
        connectionStart: sourceMoved && getMovedSourceAnchor(c, c.source, delta2),
        connectionEnd: targetMoved && getMovedTargetAnchor(c, c.target, delta2)
      });
    }
  });
};
MoveHelper.prototype.getClosure = function(elements) {
  return new MoveClosure().addAll(elements, true);
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/MoveElementsHandler.js
function MoveElementsHandler(modeling) {
  this._helper = new MoveHelper(modeling);
}
MoveElementsHandler.$inject = ["modeling"];
MoveElementsHandler.prototype.preExecute = function(context) {
  context.closure = this._helper.getClosure(context.shapes);
};
MoveElementsHandler.prototype.postExecute = function(context) {
  var hints = context.hints, primaryShape;
  if (hints && hints.primaryShape) {
    primaryShape = hints.primaryShape;
    hints.oldParent = primaryShape.parent;
  }
  this._helper.moveClosure(
    context.closure,
    context.delta,
    context.newParent,
    context.newHost,
    primaryShape
  );
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/MoveShapeHandler.js
function MoveShapeHandler(modeling) {
  this._modeling = modeling;
  this._helper = new MoveHelper(modeling);
}
MoveShapeHandler.$inject = ["modeling"];
MoveShapeHandler.prototype.execute = function(context) {
  var shape = context.shape, delta2 = context.delta, newParent = context.newParent || shape.parent, newParentIndex = context.newParentIndex, oldParent = shape.parent;
  context.oldBounds = pick(shape, ["x", "y", "width", "height"]);
  context.oldParent = oldParent;
  context.oldParentIndex = remove3(oldParent.children, shape);
  add(newParent.children, shape, newParentIndex);
  assign(shape, {
    parent: newParent,
    x: shape.x + delta2.x,
    y: shape.y + delta2.y
  });
  return shape;
};
MoveShapeHandler.prototype.postExecute = function(context) {
  var shape = context.shape, delta2 = context.delta, hints = context.hints;
  var modeling = this._modeling;
  if (hints.layout !== false) {
    forEach(shape.incoming, function(c) {
      modeling.layoutConnection(c, {
        connectionEnd: getMovedTargetAnchor(c, shape, delta2)
      });
    });
    forEach(shape.outgoing, function(c) {
      modeling.layoutConnection(c, {
        connectionStart: getMovedSourceAnchor(c, shape, delta2)
      });
    });
  }
  if (hints.recurse !== false) {
    this.moveChildren(context);
  }
};
MoveShapeHandler.prototype.revert = function(context) {
  var shape = context.shape, oldParent = context.oldParent, oldParentIndex = context.oldParentIndex, delta2 = context.delta;
  add(oldParent.children, shape, oldParentIndex);
  assign(shape, {
    parent: oldParent,
    x: shape.x - delta2.x,
    y: shape.y - delta2.y
  });
  return shape;
};
MoveShapeHandler.prototype.moveChildren = function(context) {
  var delta2 = context.delta, shape = context.shape;
  this._helper.moveRecursive(shape.children, delta2, null);
};
MoveShapeHandler.prototype.getNewParent = function(context) {
  return context.newParent || context.shape.parent;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/ReconnectConnectionHandler.js
function ReconnectConnectionHandler(modeling) {
  this._modeling = modeling;
}
ReconnectConnectionHandler.$inject = ["modeling"];
ReconnectConnectionHandler.prototype.execute = function(context) {
  var newSource = context.newSource, newTarget = context.newTarget, connection = context.connection, dockingOrPoints = context.dockingOrPoints;
  if (!newSource && !newTarget) {
    throw new Error("newSource or newTarget required");
  }
  if (isArray2(dockingOrPoints)) {
    context.oldWaypoints = connection.waypoints;
    connection.waypoints = dockingOrPoints;
  }
  if (newSource) {
    context.oldSource = connection.source;
    connection.source = newSource;
  }
  if (newTarget) {
    context.oldTarget = connection.target;
    connection.target = newTarget;
  }
  return connection;
};
ReconnectConnectionHandler.prototype.postExecute = function(context) {
  var connection = context.connection, newSource = context.newSource, newTarget = context.newTarget, dockingOrPoints = context.dockingOrPoints, hints = context.hints || {};
  var layoutConnectionHints = {};
  if (hints.connectionStart) {
    layoutConnectionHints.connectionStart = hints.connectionStart;
  }
  if (hints.connectionEnd) {
    layoutConnectionHints.connectionEnd = hints.connectionEnd;
  }
  if (hints.layoutConnection === false) {
    return;
  }
  if (newSource && (!newTarget || hints.docking === "source")) {
    layoutConnectionHints.connectionStart = layoutConnectionHints.connectionStart || getDocking(isArray2(dockingOrPoints) ? dockingOrPoints[0] : dockingOrPoints);
  }
  if (newTarget && (!newSource || hints.docking === "target")) {
    layoutConnectionHints.connectionEnd = layoutConnectionHints.connectionEnd || getDocking(isArray2(dockingOrPoints) ? dockingOrPoints[dockingOrPoints.length - 1] : dockingOrPoints);
  }
  if (hints.newWaypoints) {
    layoutConnectionHints.waypoints = hints.newWaypoints;
  }
  this._modeling.layoutConnection(connection, layoutConnectionHints);
};
ReconnectConnectionHandler.prototype.revert = function(context) {
  var oldSource = context.oldSource, oldTarget = context.oldTarget, oldWaypoints = context.oldWaypoints, connection = context.connection;
  if (oldSource) {
    connection.source = oldSource;
  }
  if (oldTarget) {
    connection.target = oldTarget;
  }
  if (oldWaypoints) {
    connection.waypoints = oldWaypoints;
  }
  return connection;
};
function getDocking(point) {
  return point.original || point;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/ReplaceShapeHandler.js
function ReplaceShapeHandler(modeling, rules) {
  this._modeling = modeling;
  this._rules = rules;
}
ReplaceShapeHandler.$inject = ["modeling", "rules"];
ReplaceShapeHandler.prototype.preExecute = function(context) {
  var self = this, modeling = this._modeling, rules = this._rules;
  var oldShape = context.oldShape, newData = context.newData, hints = context.hints || {}, newShape;
  function canReconnect(source, target, connection) {
    return rules.allowed("connection.reconnect", {
      connection,
      source,
      target
    });
  }
  var position = {
    x: newData.x,
    y: newData.y
  };
  var oldBounds = {
    x: oldShape.x,
    y: oldShape.y,
    width: oldShape.width,
    height: oldShape.height
  };
  newShape = context.newShape = context.newShape || self.createShape(newData, position, oldShape.parent, hints);
  if (oldShape.host) {
    modeling.updateAttachment(newShape, oldShape.host);
  }
  var children;
  if (hints.moveChildren !== false) {
    children = oldShape.children.slice();
    modeling.moveElements(children, { x: 0, y: 0 }, newShape, hints);
  }
  var incoming = oldShape.incoming.slice(), outgoing = oldShape.outgoing.slice();
  forEach(incoming, function(connection) {
    var source = connection.source, allowed = canReconnect(source, newShape, connection);
    if (allowed) {
      self.reconnectEnd(
        connection,
        newShape,
        getResizedTargetAnchor(connection, newShape, oldBounds),
        hints
      );
    }
  });
  forEach(outgoing, function(connection) {
    var target = connection.target, allowed = canReconnect(newShape, target, connection);
    if (allowed) {
      self.reconnectStart(
        connection,
        newShape,
        getResizedSourceAnchor(connection, newShape, oldBounds),
        hints
      );
    }
  });
};
ReplaceShapeHandler.prototype.postExecute = function(context) {
  var oldShape = context.oldShape;
  this._modeling.removeShape(oldShape);
};
ReplaceShapeHandler.prototype.execute = function(context) {
};
ReplaceShapeHandler.prototype.revert = function(context) {
};
ReplaceShapeHandler.prototype.createShape = function(shape, position, target, hints) {
  return this._modeling.createShape(shape, position, target, hints);
};
ReplaceShapeHandler.prototype.reconnectStart = function(connection, newSource, dockingPoint, hints) {
  this._modeling.reconnectStart(connection, newSource, dockingPoint, hints);
};
ReplaceShapeHandler.prototype.reconnectEnd = function(connection, newTarget, dockingPoint, hints) {
  this._modeling.reconnectEnd(connection, newTarget, dockingPoint, hints);
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/ResizeShapeHandler.js
function ResizeShapeHandler(modeling) {
  this._modeling = modeling;
}
ResizeShapeHandler.$inject = ["modeling"];
ResizeShapeHandler.prototype.execute = function(context) {
  var shape = context.shape, newBounds = context.newBounds, minBounds = context.minBounds;
  if (newBounds.x === void 0 || newBounds.y === void 0 || newBounds.width === void 0 || newBounds.height === void 0) {
    throw new Error("newBounds must have {x, y, width, height} properties");
  }
  if (minBounds && (newBounds.width < minBounds.width || newBounds.height < minBounds.height)) {
    throw new Error("width and height cannot be less than minimum height and width");
  } else if (!minBounds && newBounds.width < 10 || newBounds.height < 10) {
    throw new Error("width and height cannot be less than 10px");
  }
  context.oldBounds = {
    width: shape.width,
    height: shape.height,
    x: shape.x,
    y: shape.y
  };
  assign(shape, {
    width: newBounds.width,
    height: newBounds.height,
    x: newBounds.x,
    y: newBounds.y
  });
  return shape;
};
ResizeShapeHandler.prototype.postExecute = function(context) {
  var modeling = this._modeling;
  var shape = context.shape, oldBounds = context.oldBounds, hints = context.hints || {};
  if (hints.layout === false) {
    return;
  }
  forEach(shape.incoming, function(c) {
    modeling.layoutConnection(c, {
      connectionEnd: getResizedTargetAnchor(c, shape, oldBounds)
    });
  });
  forEach(shape.outgoing, function(c) {
    modeling.layoutConnection(c, {
      connectionStart: getResizedSourceAnchor(c, shape, oldBounds)
    });
  });
};
ResizeShapeHandler.prototype.revert = function(context) {
  var shape = context.shape, oldBounds = context.oldBounds;
  assign(shape, {
    width: oldBounds.width,
    height: oldBounds.height,
    x: oldBounds.x,
    y: oldBounds.y
  });
  return shape;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/space-tool/SpaceUtil.js
function getWaypointsUpdatingConnections(movingShapes, resizingShapes) {
  var waypointsUpdatingConnections = [];
  var adjustedShapes = new Set(movingShapes);
  forEach(resizingShapes, function(shape) {
    adjustedShapes.add(shape);
  });
  var seenConnections = /* @__PURE__ */ new Set();
  adjustedShapes.forEach(function(shape) {
    var incoming = shape.incoming, outgoing = shape.outgoing;
    forEach(incoming.concat(outgoing), function(connection) {
      var source = connection.source, target = connection.target;
      if (adjustedShapes.has(source) || adjustedShapes.has(target)) {
        if (!seenConnections.has(connection)) {
          seenConnections.add(connection);
          waypointsUpdatingConnections.push(connection);
        }
      }
    });
  });
  return waypointsUpdatingConnections;
}
function resizeBounds(bounds, direction, delta2) {
  var x = bounds.x, y = bounds.y, width = bounds.width, height = bounds.height, dx = delta2.x, dy = delta2.y;
  switch (direction) {
    case "n":
      return {
        x,
        y: y + dy,
        width,
        height: height - dy
      };
    case "s":
      return {
        x,
        y,
        width,
        height: height + dy
      };
    case "w":
      return {
        x: x + dx,
        y,
        width: width - dx,
        height
      };
    case "e":
      return {
        x,
        y,
        width: width + dx,
        height
      };
    default:
      throw new Error("unknown direction: " + direction);
  }
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/SpaceToolHandler.js
function SpaceToolHandler(modeling) {
  this._modeling = modeling;
}
SpaceToolHandler.$inject = ["modeling"];
SpaceToolHandler.prototype.preExecute = function(context) {
  var delta2 = context.delta, direction = context.direction, movingShapes = context.movingShapes, resizingShapes = context.resizingShapes, start = context.start, oldBounds = {};
  this.moveShapes(movingShapes, delta2);
  forEach(resizingShapes, function(shape) {
    oldBounds[shape.id] = getBounds(shape);
  });
  this.resizeShapes(resizingShapes, delta2, direction);
  this.updateConnectionWaypoints(
    getWaypointsUpdatingConnections(movingShapes, resizingShapes),
    delta2,
    direction,
    start,
    movingShapes,
    resizingShapes,
    oldBounds
  );
};
SpaceToolHandler.prototype.execute = function() {
};
SpaceToolHandler.prototype.revert = function() {
};
SpaceToolHandler.prototype.moveShapes = function(shapes, delta2) {
  var self = this;
  forEach(shapes, function(element) {
    self._modeling.moveShape(element, delta2, null, {
      autoResize: false,
      layout: false,
      recurse: false
    });
  });
};
SpaceToolHandler.prototype.resizeShapes = function(shapes, delta2, direction) {
  var self = this;
  forEach(shapes, function(shape) {
    var newBounds = resizeBounds(shape, direction, delta2);
    self._modeling.resizeShape(shape, newBounds, null, {
      attachSupport: false,
      autoResize: false,
      layout: false
    });
  });
};
SpaceToolHandler.prototype.updateConnectionWaypoints = function(connections, delta2, direction, start, movingShapes, resizingShapes, oldBounds) {
  var self = this, movingShapesSet = new Set(movingShapes), resizingShapesSet = new Set(resizingShapes);
  forEach(connections, function(connection) {
    var source = connection.source, target = connection.target, waypoints = copyWaypoints(connection), axis = getAxisFromDirection(direction), layoutHints = {};
    var sourceAffected = movingShapesSet.has(source) || resizingShapesSet.has(source), targetAffected = movingShapesSet.has(target) || resizingShapesSet.has(target);
    if (sourceAffected && targetAffected) {
      waypoints = map(waypoints, function(waypoint) {
        if (shouldMoveWaypoint(waypoint, start, direction)) {
          waypoint[axis] = waypoint[axis] + delta2[axis];
        }
        if (waypoint.original && shouldMoveWaypoint(waypoint.original, start, direction)) {
          waypoint.original[axis] = waypoint.original[axis] + delta2[axis];
        }
        return waypoint;
      });
      self._modeling.updateWaypoints(connection, waypoints, {
        labelBehavior: false
      });
    } else if (sourceAffected || targetAffected) {
      if (movingShapesSet.has(source)) {
        layoutHints.connectionStart = getMovedSourceAnchor(connection, source, delta2);
      } else if (movingShapesSet.has(target)) {
        layoutHints.connectionEnd = getMovedTargetAnchor(connection, target, delta2);
      } else if (resizingShapesSet.has(source)) {
        layoutHints.connectionStart = getResizedSourceAnchor(
          connection,
          source,
          oldBounds[source.id]
        );
      } else if (resizingShapesSet.has(target)) {
        layoutHints.connectionEnd = getResizedTargetAnchor(
          connection,
          target,
          oldBounds[target.id]
        );
      }
      self._modeling.layoutConnection(connection, layoutHints);
    }
  });
};
function copyWaypoint(waypoint) {
  return assign({}, waypoint);
}
function copyWaypoints(connection) {
  return map(connection.waypoints, function(waypoint) {
    waypoint = copyWaypoint(waypoint);
    if (waypoint.original) {
      waypoint.original = copyWaypoint(waypoint.original);
    }
    return waypoint;
  });
}
function getAxisFromDirection(direction) {
  switch (direction) {
    case "n":
      return "y";
    case "w":
      return "x";
    case "s":
      return "y";
    case "e":
      return "x";
  }
}
function shouldMoveWaypoint(waypoint, start, direction) {
  var relevantAxis = getAxisFromDirection(direction);
  if (/e|s/.test(direction)) {
    return waypoint[relevantAxis] > start;
  } else if (/n|w/.test(direction)) {
    return waypoint[relevantAxis] < start;
  }
}
function getBounds(shape) {
  return {
    x: shape.x,
    y: shape.y,
    height: shape.height,
    width: shape.width
  };
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/ToggleShapeCollapseHandler.js
function ToggleShapeCollapseHandler(modeling) {
  this._modeling = modeling;
}
ToggleShapeCollapseHandler.$inject = ["modeling"];
ToggleShapeCollapseHandler.prototype.execute = function(context) {
  var shape = context.shape, children = shape.children;
  context.oldChildrenVisibility = getElementsVisibilityRecursive(children);
  shape.collapsed = !shape.collapsed;
  var result = setHiddenRecursive(children, shape.collapsed);
  return [shape].concat(result);
};
ToggleShapeCollapseHandler.prototype.revert = function(context) {
  var shape = context.shape, oldChildrenVisibility = context.oldChildrenVisibility;
  var children = shape.children;
  var result = restoreVisibilityRecursive(children, oldChildrenVisibility);
  shape.collapsed = !shape.collapsed;
  return [shape].concat(result);
};
function getElementsVisibilityRecursive(elements) {
  var result = {};
  forEach(elements, function(element) {
    result[element.id] = element.hidden;
    if (element.children) {
      result = assign({}, result, getElementsVisibilityRecursive(element.children));
    }
  });
  return result;
}
function setHiddenRecursive(elements, newHidden) {
  var result = [];
  forEach(elements, function(element) {
    element.hidden = newHidden;
    result = result.concat(element);
    if (element.children) {
      result = result.concat(setHiddenRecursive(element.children, element.collapsed || newHidden));
    }
  });
  return result;
}
function restoreVisibilityRecursive(elements, lastState) {
  var result = [];
  forEach(elements, function(element) {
    element.hidden = lastState[element.id];
    result = result.concat(element);
    if (element.children) {
      result = result.concat(restoreVisibilityRecursive(element.children, lastState));
    }
  });
  return result;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/UpdateAttachmentHandler.js
function UpdateAttachmentHandler(modeling) {
  this._modeling = modeling;
}
UpdateAttachmentHandler.$inject = ["modeling"];
UpdateAttachmentHandler.prototype.execute = function(context) {
  var shape = context.shape, newHost = context.newHost, oldHost = shape.host;
  context.oldHost = oldHost;
  context.attacherIdx = removeAttacher(oldHost, shape);
  addAttacher(newHost, shape);
  shape.host = newHost;
  return shape;
};
UpdateAttachmentHandler.prototype.revert = function(context) {
  var shape = context.shape, newHost = context.newHost, oldHost = context.oldHost, attacherIdx = context.attacherIdx;
  shape.host = oldHost;
  removeAttacher(newHost, shape);
  addAttacher(oldHost, shape, attacherIdx);
  return shape;
};
function removeAttacher(host, attacher) {
  return remove3(host && host.attachers, attacher);
}
function addAttacher(host, attacher, idx) {
  if (!host) {
    return;
  }
  var attachers = host.attachers;
  if (!attachers) {
    host.attachers = attachers = [];
  }
  add(attachers, attacher, idx);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/cmd/UpdateWaypointsHandler.js
function UpdateWaypointsHandler() {
}
UpdateWaypointsHandler.prototype.execute = function(context) {
  var connection = context.connection, newWaypoints = context.newWaypoints;
  context.oldWaypoints = connection.waypoints;
  connection.waypoints = newWaypoints;
  return connection;
};
UpdateWaypointsHandler.prototype.revert = function(context) {
  var connection = context.connection, oldWaypoints = context.oldWaypoints;
  connection.waypoints = oldWaypoints;
  return connection;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/Modeling.js
function Modeling(eventBus, elementFactory, commandStack) {
  this._eventBus = eventBus;
  this._elementFactory = elementFactory;
  this._commandStack = commandStack;
  var self = this;
  eventBus.on("diagram.init", function() {
    self.registerHandlers(commandStack);
  });
}
Modeling.$inject = ["eventBus", "elementFactory", "commandStack"];
Modeling.prototype.getHandlers = function() {
  return {
    "shape.append": AppendShapeHandler,
    "shape.create": CreateShapeHandler,
    "shape.delete": DeleteShapeHandler,
    "shape.move": MoveShapeHandler,
    "shape.resize": ResizeShapeHandler,
    "shape.replace": ReplaceShapeHandler,
    "shape.toggleCollapse": ToggleShapeCollapseHandler,
    "spaceTool": SpaceToolHandler,
    "label.create": CreateLabelHandler,
    "connection.create": CreateConnectionHandler,
    "connection.delete": DeleteConnectionHandler,
    "connection.move": MoveConnectionHandler,
    "connection.layout": LayoutConnectionHandler,
    "connection.updateWaypoints": UpdateWaypointsHandler,
    "connection.reconnect": ReconnectConnectionHandler,
    "elements.create": CreateElementsHandler,
    "elements.move": MoveElementsHandler,
    "elements.delete": DeleteElementsHandler,
    "elements.distribute": DistributeElements,
    "elements.align": AlignElements,
    "element.updateAttachment": UpdateAttachmentHandler
  };
};
Modeling.prototype.registerHandlers = function(commandStack) {
  forEach(this.getHandlers(), function(handler, id) {
    commandStack.registerHandler(id, handler);
  });
};
Modeling.prototype.moveShape = function(shape, delta2, newParent, newParentIndex, hints) {
  if (typeof newParentIndex === "object") {
    hints = newParentIndex;
    newParentIndex = null;
  }
  var context = {
    shape,
    delta: delta2,
    newParent,
    newParentIndex,
    hints: hints || {}
  };
  this._commandStack.execute("shape.move", context);
};
Modeling.prototype.updateAttachment = function(shape, newHost) {
  var context = {
    shape,
    newHost
  };
  this._commandStack.execute("element.updateAttachment", context);
};
Modeling.prototype.moveElements = function(shapes, delta2, target, hints) {
  hints = hints || {};
  var attach = hints.attach;
  var newParent = target, newHost;
  if (attach === true) {
    newHost = target;
    newParent = target.parent;
  } else if (attach === false) {
    newHost = null;
  }
  var context = {
    shapes,
    delta: delta2,
    newParent,
    newHost,
    hints
  };
  this._commandStack.execute("elements.move", context);
};
Modeling.prototype.moveConnection = function(connection, delta2, newParent, newParentIndex, hints) {
  if (typeof newParentIndex === "object") {
    hints = newParentIndex;
    newParentIndex = void 0;
  }
  var context = {
    connection,
    delta: delta2,
    newParent,
    newParentIndex,
    hints: hints || {}
  };
  this._commandStack.execute("connection.move", context);
};
Modeling.prototype.layoutConnection = function(connection, hints) {
  var context = {
    connection,
    hints: hints || {}
  };
  this._commandStack.execute("connection.layout", context);
};
Modeling.prototype.createConnection = function(source, target, parentIndex, connection, parent, hints) {
  if (typeof parentIndex === "object") {
    hints = parent;
    parent = connection;
    connection = parentIndex;
    parentIndex = void 0;
  }
  connection = this._create("connection", connection);
  var context = {
    source,
    target,
    parent,
    parentIndex,
    connection,
    hints
  };
  this._commandStack.execute("connection.create", context);
  return context.connection;
};
Modeling.prototype.createShape = function(shape, position, target, parentIndex, hints) {
  if (typeof parentIndex !== "number") {
    hints = parentIndex;
    parentIndex = void 0;
  }
  hints = hints || {};
  var attach = hints.attach, parent, host;
  shape = this._create("shape", shape);
  if (attach) {
    parent = target.parent;
    host = target;
  } else {
    parent = target;
  }
  var context = {
    position,
    shape,
    parent,
    parentIndex,
    host,
    hints
  };
  this._commandStack.execute("shape.create", context);
  return context.shape;
};
Modeling.prototype.createElements = function(elements, position, parent, parentIndex, hints) {
  if (!isArray2(elements)) {
    elements = [elements];
  }
  if (typeof parentIndex !== "number") {
    hints = parentIndex;
    parentIndex = void 0;
  }
  hints = hints || {};
  var context = {
    position,
    elements,
    parent,
    parentIndex,
    hints
  };
  this._commandStack.execute("elements.create", context);
  return context.elements;
};
Modeling.prototype.createLabel = function(labelTarget, position, label, parent) {
  label = this._create("label", label);
  var context = {
    labelTarget,
    position,
    parent: parent || labelTarget.parent,
    shape: label
  };
  this._commandStack.execute("label.create", context);
  return context.shape;
};
Modeling.prototype.appendShape = function(source, shape, position, target, hints) {
  hints = hints || {};
  shape = this._create("shape", shape);
  var context = {
    source,
    position,
    target,
    shape,
    connection: hints.connection,
    connectionParent: hints.connectionParent,
    hints
  };
  this._commandStack.execute("shape.append", context);
  return context.shape;
};
Modeling.prototype.removeElements = function(elements) {
  var context = {
    elements
  };
  this._commandStack.execute("elements.delete", context);
};
Modeling.prototype.distributeElements = function(groups, axis, dimension) {
  var context = {
    groups,
    axis,
    dimension
  };
  this._commandStack.execute("elements.distribute", context);
};
Modeling.prototype.removeShape = function(shape, hints) {
  var context = {
    shape,
    hints: hints || {}
  };
  this._commandStack.execute("shape.delete", context);
};
Modeling.prototype.removeConnection = function(connection, hints) {
  var context = {
    connection,
    hints: hints || {}
  };
  this._commandStack.execute("connection.delete", context);
};
Modeling.prototype.replaceShape = function(oldShape, newShape, hints) {
  var context = {
    oldShape,
    newData: newShape,
    hints: hints || {}
  };
  this._commandStack.execute("shape.replace", context);
  return context.newShape;
};
Modeling.prototype.alignElements = function(elements, alignment) {
  var context = {
    elements,
    alignment
  };
  this._commandStack.execute("elements.align", context);
};
Modeling.prototype.resizeShape = function(shape, newBounds, minBounds, hints) {
  var context = {
    shape,
    newBounds,
    minBounds,
    hints
  };
  this._commandStack.execute("shape.resize", context);
};
Modeling.prototype.createSpace = function(movingShapes, resizingShapes, delta2, direction, start) {
  var context = {
    delta: delta2,
    direction,
    movingShapes,
    resizingShapes,
    start
  };
  this._commandStack.execute("spaceTool", context);
};
Modeling.prototype.updateWaypoints = function(connection, newWaypoints, hints) {
  var context = {
    connection,
    newWaypoints,
    hints: hints || {}
  };
  this._commandStack.execute("connection.updateWaypoints", context);
};
Modeling.prototype.reconnect = function(connection, source, target, dockingOrPoints, hints) {
  var context = {
    connection,
    newSource: source,
    newTarget: target,
    dockingOrPoints,
    hints: hints || {}
  };
  this._commandStack.execute("connection.reconnect", context);
};
Modeling.prototype.reconnectStart = function(connection, newSource, dockingOrPoints, hints) {
  if (!hints) {
    hints = {};
  }
  this.reconnect(connection, newSource, connection.target, dockingOrPoints, assign(hints, {
    docking: "source"
  }));
};
Modeling.prototype.reconnectEnd = function(connection, newTarget, dockingOrPoints, hints) {
  if (!hints) {
    hints = {};
  }
  this.reconnect(connection, connection.source, newTarget, dockingOrPoints, assign(hints, {
    docking: "target"
  }));
};
Modeling.prototype.connect = function(source, target, attrs, hints) {
  return this.createConnection(source, target, attrs || {}, source.parent, hints);
};
Modeling.prototype._create = function(type, attrs) {
  if (isModelElement(attrs)) {
    return attrs;
  } else {
    return this._elementFactory.create(type, attrs);
  }
};
Modeling.prototype.toggleCollapse = function(shape, hints) {
  var context = {
    shape,
    hints: hints || {}
  };
  this._commandStack.execute("shape.toggleCollapse", context);
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/layout/BaseLayouter.js
function BaseLayouter() {
}
BaseLayouter.prototype.layoutConnection = function(connection, hints) {
  hints = hints || {};
  return [
    hints.connectionStart || getMid(hints.source || connection.source),
    hints.connectionEnd || getMid(hints.target || connection.target)
  ];
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/modeling/index.js
var modeling_default = {
  __depends__: [
    command_default,
    change_support_default,
    selection_default,
    rules_default
  ],
  __init__: ["modeling"],
  modeling: ["type", Modeling],
  layouter: ["type", BaseLayouter]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/outline/Outline.js
var LOW_PRIORITY2 = 500;
var DEFAULT_PRIORITY2 = 1e3;
function Outline(eventBus, styles, elementRegistry) {
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._outlineOffset = 5;
  this._outlineStyle = styles.cls("djs-outline", ["no-fill"]);
  var self = this;
  function createElementOutline(element) {
    if (isRoot(element)) {
      return;
    }
    self.createOutline(element);
  }
  eventBus.on("element.hover", function(event2) {
    createElementOutline(event2.element);
  });
  eventBus.on("selection.changed", function(event2) {
    forEach(event2.newSelection, createElementOutline);
  });
  eventBus.on(["shape.changed", "connection.changed"], LOW_PRIORITY2, function(event2) {
    var element = event2.element, gfx = event2.gfx;
    var outline = query(".djs-outline", gfx);
    if (outline) {
      self.updateOutline(element, outline);
    }
  });
}
Outline.prototype.createOutline = function(element) {
  var gfx = this._elementRegistry.getGraphics(element);
  if (!gfx) {
    throw new Error("cannot create outline for non-rendered element");
  }
  var outline = query(".djs-outline", gfx);
  if (!outline) {
    outline = this.getOutline(element) || this._createOutlineGfx();
    append(gfx, outline);
    this.updateOutline(element, outline);
  }
  return outline;
};
Outline.prototype._createOutlineGfx = function() {
  var outline = create("rect");
  attr(outline, assign({
    x: 0,
    y: 0,
    rx: 4,
    width: 100,
    height: 100
  }, this._outlineStyle));
  return outline;
};
Outline.prototype.updateOutline = function(element, outline) {
  if (element.waypoints) {
    this.updateConnectionOutline(outline, element);
  } else {
    this.updateShapeOutline(outline, element);
  }
};
Outline.prototype.updateShapeOutline = function(outline, element) {
  var updated = false;
  var providers = this._getProviders();
  if (providers.length) {
    forEach(providers, function(provider) {
      updated = updated || provider.updateOutline(element, outline);
    });
  }
  if (!updated) {
    attr(outline, {
      x: -this._outlineOffset,
      y: -this._outlineOffset,
      width: element.width + this._outlineOffset * 2,
      height: element.height + this._outlineOffset * 2
    });
  }
};
Outline.prototype.updateConnectionOutline = function(outline, connection) {
  var bbox = getBBox(connection);
  attr(outline, {
    x: bbox.x - this._outlineOffset,
    y: bbox.y - this._outlineOffset,
    width: bbox.width + this._outlineOffset * 2,
    height: bbox.height + this._outlineOffset * 2
  });
};
Outline.prototype.registerProvider = function(priority, provider) {
  if (!provider) {
    provider = priority;
    priority = DEFAULT_PRIORITY2;
  }
  this._eventBus.on("outline.getProviders", priority, function(event2) {
    event2.providers.push(provider);
  });
};
Outline.prototype._getProviders = function() {
  var event2 = this._eventBus.createEvent({
    type: "outline.getProviders",
    providers: []
  });
  this._eventBus.fire(event2);
  return event2.providers;
};
Outline.prototype.getOutline = function(element) {
  var outline;
  var providers = this._getProviders();
  forEach(providers, function(provider) {
    if (!isFunction(provider.getOutline)) {
      return;
    }
    outline = outline || provider.getOutline(element);
  });
  return outline;
};
Outline.$inject = ["eventBus", "styles", "elementRegistry"];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/outline/MultiSelectionOutline.js
var SELECTION_OUTLINE_PADDING = 6;
function MultiSelectionOutline(eventBus, canvas, selection) {
  this._canvas = canvas;
  var self = this;
  eventBus.on("element.changed", function(event2) {
    if (selection.isSelected(event2.element)) {
      self._updateMultiSelectionOutline(selection.get());
    }
  });
  eventBus.on("selection.changed", function(event2) {
    var newSelection = event2.newSelection;
    self._updateMultiSelectionOutline(newSelection);
  });
}
MultiSelectionOutline.prototype._updateMultiSelectionOutline = function(selection) {
  var layer = this._canvas.getLayer("selectionOutline");
  clear(layer);
  var enabled = selection.length > 1;
  var container = this._canvas.getContainer();
  classes(container)[enabled ? "add" : "remove"]("djs-multi-select");
  if (!enabled) {
    return;
  }
  var bBox = addSelectionOutlinePadding(getBBox(selection));
  var rect = create("rect");
  attr(rect, assign({
    rx: 3
  }, bBox));
  classes(rect).add("djs-selection-outline");
  append(layer, rect);
};
MultiSelectionOutline.$inject = ["eventBus", "canvas", "selection"];
function addSelectionOutlinePadding(bBox) {
  return {
    x: bBox.x - SELECTION_OUTLINE_PADDING,
    y: bBox.y - SELECTION_OUTLINE_PADDING,
    width: bBox.width + SELECTION_OUTLINE_PADDING * 2,
    height: bBox.height + SELECTION_OUTLINE_PADDING * 2
  };
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/outline/index.js
var outline_default = {
  __depends__: [
    selection_default
  ],
  __init__: ["outline", "multiSelectionOutline"],
  outline: ["type", Outline],
  multiSelectionOutline: ["type", MultiSelectionOutline]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/hover-fix/HoverFix.js
var HIGH_PRIORITY = 1500;
function HoverFix(elementRegistry, eventBus, injector) {
  var self = this;
  var dragging = injector.get("dragging", false);
  function ensureHover(event2) {
    if (event2.hover) {
      return;
    }
    var originalEvent = event2.originalEvent;
    var gfx = self._findTargetGfx(originalEvent);
    var element = gfx && elementRegistry.get(gfx);
    if (gfx && element) {
      event2.stopPropagation();
      dragging.hover({ element, gfx });
      dragging.move(originalEvent);
    }
  }
  if (dragging) {
    eventBus.on("drag.start", function(event2) {
      eventBus.once("drag.move", HIGH_PRIORITY, function(event3) {
        ensureHover(event3);
      });
    });
  }
  (function() {
    var hoverGfx;
    var hover;
    eventBus.on("element.hover", function(event2) {
      hoverGfx = event2.gfx;
      hover = event2.element;
    });
    eventBus.on("element.hover", HIGH_PRIORITY, function(event2) {
      if (hover) {
        eventBus.fire("element.out", {
          element: hover,
          gfx: hoverGfx
        });
      }
    });
    eventBus.on("element.out", function() {
      hoverGfx = null;
      hover = null;
    });
  })();
  this._findTargetGfx = function(event2) {
    var position, target;
    if (!(event2 instanceof MouseEvent)) {
      return;
    }
    position = toPoint(event2);
    target = document.elementFromPoint(position.x, position.y);
    return getGfx(target);
  };
}
HoverFix.$inject = [
  "elementRegistry",
  "eventBus",
  "injector"
];
function getGfx(target) {
  return closest(target, "svg, .djs-element", true);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/hover-fix/index.js
var hover_fix_default = {
  __init__: [
    "hoverFix"
  ],
  hoverFix: ["type", HoverFix]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Cursor.js
var CURSOR_CLS_PATTERN = /^djs-cursor-.*$/;
function set(mode) {
  var classes3 = classes2(document.body);
  classes3.removeMatching(CURSOR_CLS_PATTERN);
  if (mode) {
    classes3.add("djs-cursor-" + mode);
  }
}
function unset() {
  set(null);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/ClickTrap.js
var TRAP_PRIORITY = 5e3;
function install(eventBus, eventName) {
  eventName = eventName || "element.click";
  function trap() {
    return false;
  }
  eventBus.once(eventName, TRAP_PRIORITY, trap);
  return function() {
    eventBus.off(eventName, trap);
  };
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/keyboard/KeyboardUtil.js
var KEYS_COPY = ["c", "C"];
var KEYS_PASTE = ["v", "V"];
var KEYS_DUPLICATE = ["d", "D"];
var KEYS_CUT = ["x", "X"];
var KEYS_REDO = ["y", "Y"];
var KEYS_UNDO = ["z", "Z"];
function hasModifier(event2) {
  return event2.ctrlKey || event2.metaKey || event2.shiftKey || event2.altKey;
}
function isCmd(event2) {
  if (event2.altKey) {
    return false;
  }
  return event2.ctrlKey || event2.metaKey;
}
function isKey(keys2, event2) {
  keys2 = isArray2(keys2) ? keys2 : [keys2];
  return keys2.indexOf(event2.key) !== -1 || keys2.indexOf(event2.code) !== -1 || keys2.indexOf(getPhysicalLetter(event2)) !== -1;
}
var NON_LATIN_LETTER = /^(?!\p{Script_Extensions=Latin}|\p{Script=Common})\p{Letter}$/u;
var NON_LETTER = /^\P{Letter}$/u;
function getPhysicalLetter(event2) {
  var key = event2.key, match = /^Key([A-Z])$/.exec(event2.code || "");
  if (!match || typeof key !== "string") {
    return null;
  }
  var letter = match[1];
  if (NON_LATIN_LETTER.test(key)) {
    return event2.shiftKey ? letter : letter.toLowerCase();
  }
  if (event2.shiftKey && NON_LETTER.test(key) && event2.keyCode === letter.charCodeAt(0)) {
    return letter;
  }
  return null;
}
function isShift(event2) {
  return event2.shiftKey;
}
function isCopy(event2) {
  return isCmd(event2) && isKey(KEYS_COPY, event2);
}
function isPaste(event2) {
  return isCmd(event2) && isKey(KEYS_PASTE, event2);
}
function isDuplicate(event2) {
  return isCmd(event2) && isKey(KEYS_DUPLICATE, event2);
}
function isCut(event2) {
  return isCmd(event2) && isKey(KEYS_CUT, event2);
}
function isUndo(event2) {
  return isCmd(event2) && !isShift(event2) && isKey(KEYS_UNDO, event2);
}
function isRedo(event2) {
  return isCmd(event2) && (isKey(KEYS_REDO, event2) || isKey(KEYS_UNDO, event2) && isShift(event2));
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/dragging/Dragging.js
var round4 = Math.round;
var DRAG_ACTIVE_CLS = "djs-drag-active";
var LOW_PRIORITY3 = 500;
function preventDefault(event2) {
  event2.preventDefault();
}
function isTouchEvent(event2) {
  return typeof TouchEvent !== "undefined" && event2 instanceof TouchEvent;
}
function getLength(point) {
  return Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));
}
function Dragging(eventBus, canvas, selection, elementRegistry) {
  var defaultOptions = {
    threshold: 5,
    trapClick: true
  };
  var context;
  function toLocalPoint(globalPosition) {
    var viewbox = canvas.viewbox();
    var clientRect = canvas._container.getBoundingClientRect();
    return {
      x: viewbox.x + (globalPosition.x - clientRect.left) / viewbox.scale,
      y: viewbox.y + (globalPosition.y - clientRect.top) / viewbox.scale
    };
  }
  function fire(type, dragContext) {
    dragContext = dragContext || context;
    var event2 = eventBus.createEvent(
      assign(
        {},
        dragContext.payload,
        dragContext.data,
        { isTouch: dragContext.isTouch }
      )
    );
    if (eventBus.fire("drag." + type, event2) === false) {
      return false;
    }
    return eventBus.fire(dragContext.prefix + "." + type, event2);
  }
  function restoreSelection(previousSelection) {
    var existingSelection = previousSelection.filter(function(element) {
      return elementRegistry.get(element.id);
    });
    existingSelection.length && selection.select(existingSelection);
  }
  function move2(event2, activate) {
    var payload = context.payload, displacement = context.displacement;
    var globalStart = context.globalStart, globalCurrent = toPoint(event2), globalDelta = delta(globalCurrent, globalStart);
    var localStart = context.localStart, localCurrent = toLocalPoint(globalCurrent), localDelta = delta(localCurrent, localStart);
    if (!context.active && (activate || getLength(globalDelta) > context.threshold)) {
      assign(payload, {
        x: round4(localStart.x + displacement.x),
        y: round4(localStart.y + displacement.y),
        dx: 0,
        dy: 0
      }, { originalEvent: event2 });
      if (false === fire("start")) {
        return cancel();
      }
      context.active = true;
      if (!context.keepSelection) {
        payload.previousSelection = selection.get();
        selection.select(null);
      }
      if (context.cursor) {
        set(context.cursor);
      }
      canvas.addMarker(canvas.getRootElement(), DRAG_ACTIVE_CLS);
    }
    stopPropagation(event2);
    if (context.active) {
      assign(payload, {
        x: round4(localCurrent.x + displacement.x),
        y: round4(localCurrent.y + displacement.y),
        dx: round4(localDelta.x),
        dy: round4(localDelta.y)
      }, { originalEvent: event2 });
      fire("move");
    }
  }
  function end(event2) {
    var previousContext, returnValue = true;
    if (context.active) {
      if (event2) {
        context.payload.originalEvent = event2;
        stopPropagation(event2);
      }
      returnValue = fire("end");
    }
    if (returnValue === false) {
      fire("rejected");
    }
    previousContext = cleanup(returnValue !== true);
    fire("ended", previousContext);
  }
  function cancelOnError() {
    cancel();
  }
  function checkCancel(event2) {
    if (isKey("Escape", event2)) {
      preventDefault(event2);
      cancel();
    }
  }
  function trapClickAndEnd(event2) {
    var untrap;
    if (context.active) {
      untrap = install(eventBus);
      setTimeout(untrap, 400);
      preventDefault(event2);
    }
    end(event2);
  }
  function trapTouch(event2) {
    move2(event2);
  }
  function hover(event2) {
    var payload = context.payload;
    payload.hoverGfx = event2.gfx;
    payload.hover = event2.element;
    fire("hover");
  }
  function out(event2) {
    fire("out");
    var payload = context.payload;
    payload.hoverGfx = null;
    payload.hover = null;
  }
  function cancel(restore) {
    var previousContext;
    if (!context) {
      return;
    }
    var wasActive = context.active;
    eventBus.off("error", cancelOnError);
    try {
      if (wasActive) {
        fire("cancel");
      }
    } finally {
      previousContext = cleanup(restore);
    }
    if (wasActive) {
      fire("canceled", previousContext);
    }
  }
  function cleanup(restore) {
    var previousContext;
    eventBus.off("error", cancelOnError);
    try {
      fire("cleanup");
    } finally {
      previousContext = finishCleanup(restore);
    }
    return previousContext;
  }
  function finishCleanup(restore) {
    var previousContext, endDrag;
    unset();
    if (context.trapClick) {
      endDrag = trapClickAndEnd;
    } else {
      endDrag = end;
    }
    event.unbind(document, "mousemove", move2);
    event.unbind(document, "dragstart", preventDefault);
    event.unbind(document, "selectstart", preventDefault);
    event.unbind(document, "mousedown", endDrag, true);
    event.unbind(document, "mouseup", endDrag, true);
    event.unbind(document, "keyup", checkCancel);
    event.unbind(document, "touchstart", trapTouch, true);
    event.unbind(document, "touchcancel", cancel, true);
    event.unbind(document, "touchmove", move2, true);
    event.unbind(document, "touchend", end, true);
    eventBus.off("element.hover", hover);
    eventBus.off("element.out", out);
    canvas.removeMarker(canvas.getRootElement(), DRAG_ACTIVE_CLS);
    var previousSelection = context.payload.previousSelection;
    previousContext = context;
    context = null;
    if (restore !== false && previousSelection && !selection.get().length) {
      restoreSelection(previousSelection);
    }
    return previousContext;
  }
  function init(event2, relativeTo, prefix, options) {
    if (context) {
      cancel(false);
    }
    if (typeof relativeTo === "string") {
      options = prefix;
      prefix = relativeTo;
      relativeTo = null;
    }
    options = assign({}, defaultOptions, options || {});
    var data = options.data || {}, originalEvent, globalStart, localStart, endDrag, isTouch;
    if (options.trapClick) {
      endDrag = trapClickAndEnd;
    } else {
      endDrag = end;
    }
    if (event2) {
      originalEvent = getOriginal(event2) || event2;
      globalStart = toPoint(event2);
      stopPropagation(event2);
      if (originalEvent.type === "dragstart") {
        preventDefault(originalEvent);
      }
    } else {
      originalEvent = null;
      globalStart = { x: 0, y: 0 };
    }
    localStart = toLocalPoint(globalStart);
    if (!relativeTo) {
      relativeTo = localStart;
    }
    isTouch = isTouchEvent(originalEvent);
    context = assign({
      prefix,
      data,
      payload: {},
      globalStart,
      displacement: delta(relativeTo, localStart),
      localStart,
      isTouch
    }, options);
    eventBus.once("error", LOW_PRIORITY3, cancelOnError);
    if (!options.manual) {
      if (isTouch) {
        event.bind(document, "touchstart", trapTouch, true);
        event.bind(document, "touchcancel", cancel, true);
        event.bind(document, "touchmove", move2, true);
        event.bind(document, "touchend", end, true);
      } else {
        event.bind(document, "mousemove", move2);
        event.bind(document, "dragstart", preventDefault);
        event.bind(document, "selectstart", preventDefault);
        event.bind(document, "mousedown", endDrag, true);
        event.bind(document, "mouseup", endDrag, true);
      }
      event.bind(document, "keyup", checkCancel);
      eventBus.on("element.hover", hover);
      eventBus.on("element.out", out);
    }
    if (fire("init") === false) {
      cancel();
      return false;
    }
    if (options.autoActivate) {
      move2(event2, true);
    }
  }
  eventBus.on("diagram.destroy", cancel);
  this.init = init;
  this.move = move2;
  this.hover = hover;
  this.out = out;
  this.end = end;
  this.cancel = cancel;
  this.context = function() {
    return context;
  };
  this.setOptions = function(options) {
    assign(defaultOptions, options);
  };
}
Dragging.$inject = [
  "eventBus",
  "canvas",
  "selection",
  "elementRegistry"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/dragging/index.js
var dragging_default = {
  __depends__: [
    hover_fix_default,
    selection_default
  ],
  dragging: ["type", Dragging]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/IdGenerator.js
function IdGenerator(prefix) {
  this._counter = 0;
  this._prefix = (prefix ? prefix + "-" : "") + Math.floor(Math.random() * 1e9) + "-";
}
IdGenerator.prototype.next = function() {
  return this._prefix + ++this._counter;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/preview-support/PreviewSupport.js
var cloneIds = new IdGenerator("ps");
var MARKER_TYPES = [
  "marker-start",
  "marker-mid",
  "marker-end"
];
var NODES_CAN_HAVE_MARKER = [
  "circle",
  "ellipse",
  "line",
  "path",
  "polygon",
  "polyline",
  "path",
  "rect"
];
function PreviewSupport(elementRegistry, eventBus, canvas, styles) {
  this._elementRegistry = elementRegistry;
  this._canvas = canvas;
  this._styles = styles;
}
PreviewSupport.$inject = [
  "elementRegistry",
  "eventBus",
  "canvas",
  "styles"
];
PreviewSupport.prototype.cleanUp = function() {
  console.warn("PreviewSupport#cleanUp is deprecated and will be removed in future versions. You do not need to manually clean up previews anymore. cf. https://github.com/bpmn-io/diagram-js/pull/906");
};
PreviewSupport.prototype.getGfx = function(element) {
  return this._elementRegistry.getGraphics(element);
};
PreviewSupport.prototype.addDragger = function(element, group, gfx, className = "djs-dragger") {
  gfx = gfx || this.getGfx(element);
  var dragger = clone(gfx);
  this._cloneMarkers(getVisual(dragger), className);
  attr(dragger, this._styles.cls(className, []));
  append(group, dragger);
  attr(dragger, "data-preview-support-element-id", element.id);
  return dragger;
};
PreviewSupport.prototype.addFrame = function(shape, group) {
  var frame = create("rect", {
    class: "djs-resize-overlay",
    width: shape.width,
    height: shape.height,
    x: shape.x,
    y: shape.y
  });
  append(group, frame);
  attr(frame, "data-preview-support-element-id", shape.id);
  return frame;
};
PreviewSupport.prototype._cloneMarkers = function(gfx, className = "djs-dragger", rootGfx = gfx) {
  var self = this;
  if (gfx.childNodes) {
    gfx.childNodes.forEach((childNode) => {
      self._cloneMarkers(childNode, className, rootGfx);
    });
  }
  if (!canHaveMarker(gfx)) {
    return;
  }
  MARKER_TYPES.forEach(function(markerType) {
    if (attr(gfx, markerType)) {
      var marker = getMarker(gfx, markerType, self._canvas.getContainer());
      marker && self._cloneMarker(rootGfx, gfx, marker, markerType, className);
    }
  });
};
PreviewSupport.prototype._cloneMarker = function(parentGfx, gfx, marker, markerType, className = "djs-dragger") {
  var clonedMarkerId = [marker.id, className, cloneIds.next()].join("-");
  var copiedMarker = query("marker#" + marker.id, parentGfx);
  parentGfx = parentGfx || this._canvas._svg;
  var clonedMarker = copiedMarker || clone(marker);
  clonedMarker.id = clonedMarkerId;
  classes(clonedMarker).add(className);
  var defs = query(":scope > defs", parentGfx);
  if (!defs) {
    defs = create("defs");
    append(parentGfx, defs);
  }
  append(defs, clonedMarker);
  var reference = idToReference(clonedMarker.id);
  attr(gfx, markerType, reference);
};
function getMarker(node2, markerType, parentNode) {
  var id = referenceToId(attr(node2, markerType));
  return query("marker#" + id, parentNode || document);
}
function referenceToId(reference) {
  return reference.match(/url\(['"]?#([^'"]*)['"]?\)/)[1];
}
function idToReference(id) {
  return "url(#" + id + ")";
}
function canHaveMarker(node2) {
  return NODES_CAN_HAVE_MARKER.indexOf(node2.nodeName) !== -1;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/preview-support/index.js
var preview_support_default = {
  __init__: ["previewSupport"],
  previewSupport: ["type", PreviewSupport]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/move/Move.js
var LOW_PRIORITY4 = 500;
var MEDIUM_PRIORITY = 1250;
var HIGH_PRIORITY2 = 1500;
var round5 = Math.round;
function mid(element) {
  return {
    x: element.x + round5(element.width / 2),
    y: element.y + round5(element.height / 2)
  };
}
function MoveEvents(eventBus, dragging, modeling, selection, rules) {
  function canMove(shapes, delta2, position, target) {
    return rules.allowed("elements.move", {
      shapes,
      delta: delta2,
      position,
      target
    });
  }
  eventBus.on("shape.move.start", HIGH_PRIORITY2, function(event2) {
    var context = event2.context, shape = event2.shape, shapes = selection.get().slice();
    if (shapes.indexOf(shape) === -1) {
      shapes = [shape];
    }
    shapes = removeNested(shapes);
    assign(context, {
      shapes,
      validatedShapes: shapes,
      shape
    });
  });
  eventBus.on("shape.move.start", MEDIUM_PRIORITY, function(event2) {
    var context = event2.context, validatedShapes = context.validatedShapes, canExecute;
    canExecute = context.canExecute = canMove(validatedShapes);
    if (!canExecute) {
      return false;
    }
  });
  eventBus.on("shape.move.move", LOW_PRIORITY4, function(event2) {
    var context = event2.context, validatedShapes = context.validatedShapes, hover = event2.hover, delta2 = { x: event2.dx, y: event2.dy }, position = { x: event2.x, y: event2.y }, canExecute;
    canExecute = canMove(validatedShapes, delta2, position, hover);
    context.delta = delta2;
    context.canExecute = canExecute;
    if (canExecute === null) {
      context.target = null;
      return;
    }
    context.target = hover;
  });
  eventBus.on("shape.move.end", function(event2) {
    var context = event2.context;
    var delta2 = context.delta, canExecute = context.canExecute, isAttach = canExecute === "attach", shapes = context.shapes;
    if (canExecute === false) {
      return false;
    }
    delta2.x = round5(delta2.x);
    delta2.y = round5(delta2.y);
    if (delta2.x === 0 && delta2.y === 0) {
      return;
    }
    modeling.moveElements(shapes, delta2, context.target, {
      primaryShape: context.shape,
      attach: isAttach
    });
  });
  eventBus.on("element.mousedown", function(event2) {
    if (!isPrimaryButton(event2)) {
      return;
    }
    var originalEvent = getOriginal(event2);
    if (!originalEvent) {
      throw new Error("must supply DOM mousedown event");
    }
    return start(originalEvent, event2.element);
  });
  function start(event2, element, activate, context) {
    if (isObject(activate)) {
      context = activate;
      activate = false;
    }
    if (element.waypoints || !element.parent) {
      return;
    }
    if (classes(event2.target).has("djs-hit-no-move")) {
      return;
    }
    var referencePoint = mid(element);
    var result = dragging.init(event2, referencePoint, "shape.move", {
      cursor: "grabbing",
      autoActivate: activate,
      data: {
        shape: element,
        context: context || {}
      }
    });
    if (result !== false) {
      return true;
    }
  }
  this.start = start;
}
MoveEvents.$inject = [
  "eventBus",
  "dragging",
  "modeling",
  "selection",
  "rules"
];
function removeNested(elements) {
  var ids2 = groupBy(elements, "id");
  return filter(elements, function(element) {
    while (element = element.parent) {
      if (ids2[element.id]) {
        return false;
      }
    }
    return true;
  });
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/move/MovePreview.js
var LOW_PRIORITY5 = 499;
var MARKER_DRAGGING = "djs-dragging";
var MARKER_OK = "drop-ok";
var MARKER_NOT_OK = "drop-not-ok";
var MARKER_NEW_PARENT = "new-parent";
var MARKER_ATTACH = "attach-ok";
function MovePreview(eventBus, canvas, styles, previewSupport) {
  function getVisualDragShapes(shapes) {
    var elements = getAllDraggedElements(shapes);
    var filteredElements = removeEdges(elements);
    return filteredElements;
  }
  function getAllDraggedElements(shapes) {
    var allShapes = selfAndAllChildren(shapes);
    var allConnections = allShapes.flatMap(
      (shape) => (shape.incoming || []).concat(shape.outgoing || [])
    );
    var allElements = allShapes.concat(allConnections);
    var uniqueElements = [...new Set(allElements)];
    return uniqueElements;
  }
  function setMarker(element, marker) {
    [MARKER_ATTACH, MARKER_OK, MARKER_NOT_OK, MARKER_NEW_PARENT].forEach(function(m) {
      if (m === marker) {
        canvas.addMarker(element, m);
      } else {
        canvas.removeMarker(element, m);
      }
    });
  }
  function makeDraggable(context, element, addMarker) {
    previewSupport.addDragger(element, context.dragGroup);
    if (addMarker) {
      canvas.addMarker(element, MARKER_DRAGGING);
    }
    if (context.allDraggedElements) {
      context.allDraggedElements.push(element);
    } else {
      context.allDraggedElements = [element];
    }
  }
  eventBus.on("shape.move.start", LOW_PRIORITY5, function(event2) {
    var context = event2.context, dragShapes = context.shapes, allDraggedElements = context.allDraggedElements;
    var visuallyDraggedShapes = getVisualDragShapes(dragShapes);
    if (!context.dragGroup) {
      var dragGroup = create("g");
      attr(dragGroup, styles.cls("djs-drag-group", ["no-events"]));
      var activeLayer = canvas.getActiveLayer();
      append(activeLayer, dragGroup);
      context.dragGroup = dragGroup;
    }
    visuallyDraggedShapes.forEach(function(shape) {
      previewSupport.addDragger(shape, context.dragGroup);
    });
    if (!allDraggedElements) {
      allDraggedElements = getAllDraggedElements(dragShapes);
    } else {
      allDraggedElements = flatten([
        allDraggedElements,
        getAllDraggedElements(dragShapes)
      ]);
    }
    forEach(allDraggedElements, function(e2) {
      canvas.addMarker(e2, MARKER_DRAGGING);
    });
    context.allDraggedElements = allDraggedElements;
    context.differentParents = haveDifferentParents(dragShapes);
  });
  eventBus.on("shape.move.move", LOW_PRIORITY5, function(event2) {
    var context = event2.context, dragGroup = context.dragGroup, target = context.target, parent = context.shape.parent, canExecute = context.canExecute;
    if (target) {
      if (canExecute === "attach") {
        setMarker(target, MARKER_ATTACH);
      } else if (context.canExecute && parent && target.id !== parent.id) {
        setMarker(target, MARKER_NEW_PARENT);
      } else {
        setMarker(target, context.canExecute ? MARKER_OK : MARKER_NOT_OK);
      }
    }
    translate(dragGroup, event2.dx, event2.dy);
  });
  eventBus.on(["shape.move.out", "shape.move.cleanup"], function(event2) {
    var context = event2.context, target = context.target;
    if (target) {
      setMarker(target, null);
    }
  });
  eventBus.on("shape.move.cleanup", function(event2) {
    var context = event2.context, allDraggedElements = context.allDraggedElements, dragGroup = context.dragGroup;
    forEach(allDraggedElements, function(e2) {
      canvas.removeMarker(e2, MARKER_DRAGGING);
    });
    if (dragGroup) {
      remove(dragGroup);
    }
  });
  this.makeDraggable = makeDraggable;
}
MovePreview.$inject = [
  "eventBus",
  "canvas",
  "styles",
  "previewSupport"
];
function removeEdges(elements) {
  var elementIds = /* @__PURE__ */ new Set();
  elements.forEach(function(element) {
    elementIds.add(element.id);
  });
  var filteredElements = filter(elements, function(element) {
    if (!isConnection(element)) {
      return true;
    } else {
      return elementIds.has(element.source.id) && elementIds.has(element.target.id);
    }
  });
  return filteredElements;
}
function haveDifferentParents(elements) {
  return size(groupBy(elements, function(e2) {
    return e2.parent && e2.parent.id;
  })) !== 1;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/move/index.js
var move_default = {
  __depends__: [
    interaction_events_default,
    selection_default,
    outline_default,
    rules_default,
    dragging_default,
    preview_support_default
  ],
  __init__: [
    "move",
    "movePreview"
  ],
  move: ["type", MoveEvents],
  movePreview: ["type", MovePreview]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/connect/Connect.js
function Connect(eventBus, dragging, modeling, rules) {
  function canConnect(source, target) {
    return rules.allowed("connection.create", {
      source,
      target
    });
  }
  function canConnectReverse(source, target) {
    return canConnect(target, source);
  }
  eventBus.on("connect.hover", function(event2) {
    var context = event2.context, start = context.start, hover = event2.hover, canExecute;
    context.hover = hover;
    canExecute = context.canExecute = canConnect(start, hover);
    if (isNil(canExecute)) {
      return;
    }
    if (canExecute !== false) {
      context.source = start;
      context.target = hover;
      return;
    }
    canExecute = context.canExecute = canConnectReverse(start, hover);
    if (isNil(canExecute)) {
      return;
    }
    if (canExecute !== false) {
      context.source = hover;
      context.target = start;
    }
  });
  eventBus.on(["connect.out", "connect.cleanup"], function(event2) {
    var context = event2.context;
    context.hover = null;
    context.source = null;
    context.target = null;
    context.canExecute = false;
  });
  eventBus.on("connect.end", function(event2) {
    var context = event2.context, canExecute = context.canExecute, connectionStart = context.connectionStart, connectionEnd = {
      x: event2.x,
      y: event2.y
    }, source = context.source, target = context.target;
    if (!canExecute) {
      return false;
    }
    var attrs = null, hints = {
      connectionStart: isReverse(context) ? connectionEnd : connectionStart,
      connectionEnd: isReverse(context) ? connectionStart : connectionEnd
    };
    if (isObject(canExecute)) {
      attrs = canExecute;
    }
    context.connection = modeling.connect(source, target, attrs, hints);
  });
  this.start = function(event2, start, connectionStart, autoActivate) {
    if (!isObject(connectionStart)) {
      autoActivate = connectionStart;
      connectionStart = getMid(start);
    }
    dragging.init(event2, "connect", {
      autoActivate,
      data: {
        shape: start,
        context: {
          start,
          connectionStart
        }
      }
    });
  };
}
Connect.$inject = [
  "eventBus",
  "dragging",
  "modeling",
  "rules"
];
function isReverse(context) {
  var hover = context.hover, source = context.source, target = context.target;
  return hover && source && hover === source && source !== target;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/connect/ConnectPreview.js
var HIGH_PRIORITY3 = 1100;
var LOW_PRIORITY6 = 900;
var MARKER_OK2 = "connect-ok";
var MARKER_NOT_OK2 = "connect-not-ok";
function ConnectPreview(injector, eventBus, canvas) {
  var connectionPreview = injector.get("connectionPreview", false);
  connectionPreview && eventBus.on("connect.move", function(event2) {
    var context = event2.context, canConnect = context.canExecute, hover = context.hover, source = context.source, start = context.start, startPosition = context.startPosition, target = context.target, connectionStart = context.connectionStart || startPosition, connectionEnd = context.connectionEnd || {
      x: event2.x,
      y: event2.y
    }, previewStart = connectionStart, previewEnd = connectionEnd;
    if (isReverse(context)) {
      previewStart = connectionEnd;
      previewEnd = connectionStart;
    }
    connectionPreview.drawPreview(context, canConnect, {
      source: source || start,
      target: target || hover,
      connectionStart: previewStart,
      connectionEnd: previewEnd
    });
  });
  eventBus.on("connect.hover", LOW_PRIORITY6, function(event2) {
    var context = event2.context, hover = event2.hover, canExecute = context.canExecute;
    if (canExecute === null) {
      return;
    }
    canvas.addMarker(hover, canExecute ? MARKER_OK2 : MARKER_NOT_OK2);
  });
  eventBus.on([
    "connect.out",
    "connect.cleanup"
  ], HIGH_PRIORITY3, function(event2) {
    var hover = event2.hover;
    if (hover) {
      canvas.removeMarker(hover, MARKER_OK2);
      canvas.removeMarker(hover, MARKER_NOT_OK2);
    }
  });
  connectionPreview && eventBus.on("connect.cleanup", function(event2) {
    connectionPreview.cleanUp(event2.context);
  });
}
ConnectPreview.$inject = [
  "injector",
  "eventBus",
  "canvas"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/connect/index.js
var connect_default = {
  __depends__: [
    selection_default,
    rules_default,
    dragging_default
  ],
  __init__: [
    "connectPreview"
  ],
  connect: ["type", Connect],
  connectPreview: ["type", ConnectPreview]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/create/Create.js
var MARKER_OK3 = "drop-ok";
var MARKER_NOT_OK3 = "drop-not-ok";
var MARKER_ATTACH2 = "attach-ok";
var MARKER_NEW_PARENT2 = "new-parent";
var PREFIX = "create";
var HIGH_PRIORITY4 = 2e3;
function Create(canvas, dragging, eventBus, modeling, rules) {
  function canCreate(elements, target, position, source, hints) {
    if (!target) {
      return false;
    }
    elements = filter(elements, function(element) {
      var labelTarget = element.labelTarget;
      return !element.parent && !(isLabel(element) && elements.indexOf(labelTarget) !== -1);
    });
    var shape = find(elements, function(element) {
      return !isConnection(element);
    });
    var attach = false, connect = false, create3 = false;
    if (isSingleShape(elements)) {
      attach = rules.allowed("shape.attach", {
        position,
        shape,
        target
      });
    }
    if (!attach) {
      if (isSingleShape(elements)) {
        create3 = rules.allowed("shape.create", {
          position,
          shape,
          source,
          target
        });
      } else {
        create3 = rules.allowed("elements.create", {
          elements,
          position,
          target
        });
      }
    }
    var connectionTarget = hints.connectionTarget;
    if (create3 || attach) {
      if (shape && source) {
        connect = rules.allowed("connection.create", {
          source: connectionTarget === source ? shape : source,
          target: connectionTarget === source ? source : shape,
          hints: {
            targetParent: target,
            targetAttach: attach
          }
        });
      }
      return {
        attach,
        connect
      };
    }
    if (create3 === null || attach === null) {
      return null;
    }
    return false;
  }
  function setMarker(element, marker) {
    [MARKER_ATTACH2, MARKER_OK3, MARKER_NOT_OK3, MARKER_NEW_PARENT2].forEach(function(m) {
      if (m === marker) {
        canvas.addMarker(element, m);
      } else {
        canvas.removeMarker(element, m);
      }
    });
  }
  eventBus.on(["create.move", "create.hover"], function(event2) {
    var context = event2.context, elements = context.elements, hover = event2.hover, source = context.source, hints = context.hints || {};
    if (!hover) {
      context.canExecute = false;
      context.target = null;
      return;
    }
    ensureConstraints(event2);
    var position = {
      x: event2.x,
      y: event2.y
    };
    var canExecute = context.canExecute = hover && canCreate(elements, hover, position, source, hints);
    if (hover && canExecute !== null) {
      context.target = hover;
      if (canExecute && canExecute.attach) {
        setMarker(hover, MARKER_ATTACH2);
      } else {
        setMarker(hover, canExecute ? MARKER_NEW_PARENT2 : MARKER_NOT_OK3);
      }
    }
  });
  eventBus.on(["create.end", "create.out", "create.cleanup"], function(event2) {
    var hover = event2.hover;
    if (hover) {
      setMarker(hover, null);
    }
  });
  eventBus.on("create.end", function(event2) {
    var context = event2.context, source = context.source, shape = context.shape, elements = context.elements, target = context.target, canExecute = context.canExecute, attach = canExecute && canExecute.attach, connect = canExecute && canExecute.connect, hints = context.hints || {};
    if (canExecute === false || !target) {
      return false;
    }
    ensureConstraints(event2);
    var position = {
      x: event2.x,
      y: event2.y
    };
    if (connect) {
      shape = modeling.appendShape(source, shape, position, target, {
        attach,
        connection: connect === true ? {} : connect,
        connectionTarget: hints.connectionTarget
      });
    } else {
      elements = modeling.createElements(elements, position, target, assign({}, hints, {
        attach
      }));
      shape = find(elements, function(element) {
        return !isConnection(element);
      });
    }
    assign(context, {
      elements,
      shape
    });
    assign(event2, {
      elements,
      shape
    });
  });
  function cancel() {
    var context = dragging.context();
    if (context && context.prefix === PREFIX) {
      dragging.cancel();
    }
  }
  eventBus.on("create.init", function() {
    eventBus.on("elements.changed", cancel);
    eventBus.once(["create.cancel", "create.end"], HIGH_PRIORITY4, function() {
      eventBus.off("elements.changed", cancel);
    });
  });
  this.start = function(event2, elements, context) {
    if (!isArray2(elements)) {
      elements = [elements];
    }
    var shape = find(elements, function(element) {
      return !isConnection(element);
    });
    if (!shape) {
      return;
    }
    context = assign({
      elements,
      hints: {},
      shape
    }, context || {});
    forEach(elements, function(element) {
      if (!isNumber(element.x)) {
        element.x = 0;
      }
      if (!isNumber(element.y)) {
        element.y = 0;
      }
    });
    var visibleElements = filter(elements, function(element) {
      return !element.hidden;
    });
    var bbox = getBBox(visibleElements);
    forEach(elements, function(element) {
      if (isConnection(element)) {
        element.waypoints = map(element.waypoints, function(waypoint) {
          return {
            x: waypoint.x - bbox.x - bbox.width / 2,
            y: waypoint.y - bbox.y - bbox.height / 2
          };
        });
      }
      assign(element, {
        x: element.x - bbox.x - bbox.width / 2,
        y: element.y - bbox.y - bbox.height / 2
      });
    });
    dragging.init(event2, PREFIX, {
      cursor: "grabbing",
      autoActivate: true,
      data: {
        shape,
        elements,
        context
      }
    });
  };
}
Create.$inject = [
  "canvas",
  "dragging",
  "eventBus",
  "modeling",
  "rules"
];
function ensureConstraints(event2) {
  var context = event2.context, createConstraints = context.createConstraints;
  if (!createConstraints) {
    return;
  }
  if (createConstraints.left) {
    event2.x = Math.max(event2.x, createConstraints.left);
  }
  if (createConstraints.right) {
    event2.x = Math.min(event2.x, createConstraints.right);
  }
  if (createConstraints.top) {
    event2.y = Math.max(event2.y, createConstraints.top);
  }
  if (createConstraints.bottom) {
    event2.y = Math.min(event2.y, createConstraints.bottom);
  }
}
function isSingleShape(elements) {
  return elements && elements.length === 1 && !isConnection(elements[0]);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/create/CreatePreview.js
var LOW_PRIORITY7 = 750;
function CreatePreview(canvas, eventBus, graphicsFactory, previewSupport, styles) {
  function createDragGroup(elements) {
    var dragGroup = create("g");
    attr(dragGroup, styles.cls("djs-drag-group", ["no-events"]));
    var childrenGfx = create("g");
    elements.forEach(function(element) {
      var gfx;
      if (element.hidden) {
        return;
      }
      if (element.waypoints) {
        gfx = graphicsFactory._createContainer("connection", childrenGfx);
        graphicsFactory.drawConnection(getVisual(gfx), element);
      } else {
        gfx = graphicsFactory._createContainer("shape", childrenGfx);
        graphicsFactory.drawShape(getVisual(gfx), element);
        translate(gfx, element.x, element.y);
      }
      previewSupport.addDragger(element, dragGroup, gfx);
    });
    return dragGroup;
  }
  eventBus.on("create.move", LOW_PRIORITY7, function(event2) {
    var hover = event2.hover, context = event2.context, elements = context.elements, dragGroup = context.dragGroup;
    if (!dragGroup) {
      dragGroup = context.dragGroup = createDragGroup(elements);
    }
    var activeLayer;
    if (hover) {
      if (!dragGroup.parentNode) {
        activeLayer = canvas.getActiveLayer();
        append(activeLayer, dragGroup);
      }
      translate(dragGroup, event2.x, event2.y);
    } else {
      remove(dragGroup);
    }
  });
  eventBus.on("create.cleanup", function(event2) {
    var context = event2.context, dragGroup = context.dragGroup;
    if (dragGroup) {
      remove(dragGroup);
    }
  });
}
CreatePreview.$inject = [
  "canvas",
  "eventBus",
  "graphicsFactory",
  "previewSupport",
  "styles"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/create/index.js
var create_default = {
  __depends__: [
    dragging_default,
    preview_support_default,
    rules_default,
    selection_default
  ],
  __init__: [
    "create",
    "createPreview"
  ],
  create: ["type", Create],
  createPreview: ["type", CreatePreview]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/LineIntersection.js
var round6 = Math.round;
var max = Math.max;
function circlePath(center2, r) {
  var x = center2.x, y = center2.y;
  return [
    ["M", x, y],
    ["m", 0, -r],
    ["a", r, r, 0, 1, 1, 0, 2 * r],
    ["a", r, r, 0, 1, 1, 0, -2 * r],
    ["z"]
  ];
}
function linePath(points) {
  var segments = [];
  points.forEach(function(p, idx) {
    segments.push([idx === 0 ? "M" : "L", p.x, p.y]);
  });
  return segments;
}
var INTERSECTION_THRESHOLD = 10;
function getBendpointIntersection(waypoints, reference) {
  var i, w;
  for (i = 0; w = waypoints[i]; i++) {
    if (pointDistance(w, reference) <= INTERSECTION_THRESHOLD) {
      return {
        point: waypoints[i],
        bendpoint: true,
        index: i
      };
    }
  }
  return null;
}
function getPathIntersection(waypoints, reference) {
  var intersections = findPathIntersections(circlePath(reference, INTERSECTION_THRESHOLD), linePath(waypoints));
  var a = intersections[0], b = intersections[intersections.length - 1], idx;
  if (!a) {
    return null;
  }
  if (a !== b) {
    if (a.segment2 !== b.segment2) {
      idx = max(a.segment2, b.segment2) - 1;
      return {
        point: waypoints[idx],
        bendpoint: true,
        index: idx
      };
    }
    return {
      point: {
        x: round6(a.x + b.x) / 2,
        y: round6(a.y + b.y) / 2
      },
      index: a.segment2
    };
  }
  return {
    point: {
      x: round6(a.x),
      y: round6(a.y)
    },
    index: a.segment2
  };
}
function getApproxIntersection(waypoints, reference) {
  return getBendpointIntersection(waypoints, reference) || getPathIntersection(waypoints, reference);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/GeometricUtil.js
function vectorLength2(vector) {
  return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}
function solveLambaSystem(a, b, c) {
  var system = [
    { n: a[0] - c[0], lambda: b[0] },
    { n: a[1] - c[1], lambda: b[1] }
  ];
  var n = system[0].n * b[0] + system[1].n * b[1], l = system[0].lambda * b[0] + system[1].lambda * b[1];
  return -n / l;
}
function perpendicularFoot(point, line) {
  var a = line[0], b = line[1];
  var bd = { x: b.x - a.x, y: b.y - a.y };
  var r = solveLambaSystem([a.x, a.y], [bd.x, bd.y], [point.x, point.y]);
  return { x: a.x + r * bd.x, y: a.y + r * bd.y };
}
function getDistancePointLine(point, line) {
  var pfPoint = perpendicularFoot(point, line);
  var connectionVector = {
    x: pfPoint.x - point.x,
    y: pfPoint.y - point.y
  };
  return vectorLength2(connectionVector);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/BendpointUtil.js
var BENDPOINT_CLS = "djs-bendpoint";
var SEGMENT_DRAGGER_CLS = "djs-segment-dragger";
function toCanvasCoordinates(canvas, event2) {
  var position = toPoint(event2), clientRect = canvas._container.getBoundingClientRect(), offset;
  offset = {
    x: clientRect.left,
    y: clientRect.top
  };
  var viewbox = canvas.viewbox();
  return {
    x: viewbox.x + (position.x - offset.x) / viewbox.scale,
    y: viewbox.y + (position.y - offset.y) / viewbox.scale
  };
}
function getConnectionIntersection(canvas, waypoints, event2) {
  var localPosition = toCanvasCoordinates(canvas, event2), intersection = getApproxIntersection(waypoints, localPosition);
  return intersection;
}
function addBendpoint(parentGfx, cls) {
  var groupGfx = create("g");
  classes(groupGfx).add(BENDPOINT_CLS);
  append(parentGfx, groupGfx);
  var visual = create("circle");
  attr(visual, {
    cx: 0,
    cy: 0,
    r: 4
  });
  classes(visual).add("djs-visual");
  append(groupGfx, visual);
  var hit = create("circle");
  attr(hit, {
    cx: 0,
    cy: 0,
    r: 10
  });
  classes(hit).add("djs-hit");
  append(groupGfx, hit);
  if (cls) {
    classes(groupGfx).add(cls);
  }
  return groupGfx;
}
function createParallelDragger(parentGfx, segmentStart, segmentEnd, alignment) {
  var draggerGfx = create("g");
  append(parentGfx, draggerGfx);
  var width = 18, height = 6, padding = 11, hitWidth = calculateHitWidth(segmentStart, segmentEnd, alignment), hitHeight = height + padding;
  var visual = create("rect");
  attr(visual, {
    x: -width / 2,
    y: -height / 2,
    rx: 3,
    width,
    height
  });
  classes(visual).add("djs-visual");
  append(draggerGfx, visual);
  var hit = create("rect");
  attr(hit, {
    x: -hitWidth / 2,
    y: -hitHeight / 2,
    width: hitWidth,
    height: hitHeight
  });
  classes(hit).add("djs-hit");
  append(draggerGfx, hit);
  rotate(draggerGfx, alignment === "v" ? 90 : 0, 0, 0);
  return draggerGfx;
}
function addSegmentDragger(parentGfx, segmentStart, segmentEnd) {
  var groupGfx = create("g"), mid3 = getMidPoint(segmentStart, segmentEnd), alignment = pointsAligned(segmentStart, segmentEnd);
  append(parentGfx, groupGfx);
  createParallelDragger(groupGfx, segmentStart, segmentEnd, alignment);
  classes(groupGfx).add(SEGMENT_DRAGGER_CLS);
  classes(groupGfx).add(alignment === "h" ? "horizontal" : "vertical");
  translate(groupGfx, mid3.x, mid3.y);
  return groupGfx;
}
function calculateSegmentMoveRegion(segmentLength) {
  return Math.abs(Math.round(segmentLength * 2 / 3));
}
function getClosestPointOnConnection(position, connection) {
  var segment = getClosestSegment(position, connection);
  return perpendicularFoot(position, segment);
}
function calculateHitWidth(segmentStart, segmentEnd, alignment) {
  var segmentLengthXAxis = segmentEnd.x - segmentStart.x, segmentLengthYAxis = segmentEnd.y - segmentStart.y;
  return alignment === "h" ? calculateSegmentMoveRegion(segmentLengthXAxis) : calculateSegmentMoveRegion(segmentLengthYAxis);
}
function getClosestSegment(position, connection) {
  var waypoints = connection.waypoints;
  var minDistance = Infinity, segmentIndex;
  for (var i = 0; i < waypoints.length - 1; i++) {
    var start = waypoints[i], end = waypoints[i + 1], distance2 = getDistancePointLine(position, [start, end]);
    if (distance2 < minDistance) {
      minDistance = distance2;
      segmentIndex = i;
    }
  }
  return [waypoints[segmentIndex], waypoints[segmentIndex + 1]];
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/EscapeUtil.js
function escapeCSS(str) {
  return CSS.escape(str);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/Bendpoints.js
function Bendpoints(eventBus, canvas, interactionEvents, bendpointMove, connectionSegmentMove) {
  function isIntersectionMiddle(intersection, waypoints, treshold) {
    var idx = intersection.index, p = intersection.point, p0, p1, mid3, aligned, xDelta, yDelta;
    if (idx <= 0 || intersection.bendpoint) {
      return false;
    }
    p0 = waypoints[idx - 1];
    p1 = waypoints[idx];
    mid3 = getMidPoint(p0, p1), aligned = pointsAligned(p0, p1);
    xDelta = Math.abs(p.x - mid3.x);
    yDelta = Math.abs(p.y - mid3.y);
    return aligned && xDelta <= treshold && yDelta <= treshold;
  }
  function calculateIntersectionThreshold(connection, intersection) {
    var waypoints = connection.waypoints, relevantSegment, alignment, segmentLength, threshold;
    if (intersection.index <= 0 || intersection.bendpoint) {
      return null;
    }
    relevantSegment = {
      start: waypoints[intersection.index - 1],
      end: waypoints[intersection.index]
    };
    alignment = pointsAligned(relevantSegment.start, relevantSegment.end);
    if (!alignment) {
      return null;
    }
    if (alignment === "h") {
      segmentLength = relevantSegment.end.x - relevantSegment.start.x;
    } else {
      segmentLength = relevantSegment.end.y - relevantSegment.start.y;
    }
    threshold = calculateSegmentMoveRegion(segmentLength) / 2;
    return threshold;
  }
  function activateBendpointMove(event2, connection) {
    var waypoints = connection.waypoints, intersection = getConnectionIntersection(canvas, waypoints, event2), threshold;
    if (!intersection) {
      return;
    }
    threshold = calculateIntersectionThreshold(connection, intersection);
    var result;
    if (isIntersectionMiddle(intersection, waypoints, threshold)) {
      result = connectionSegmentMove.start(event2, connection, intersection.index);
    } else {
      result = bendpointMove.start(event2, connection, intersection.index, !intersection.bendpoint);
    }
    if (result !== false) {
      return true;
    }
  }
  function bindInteractionEvents(node2, eventName, element) {
    event.bind(node2, eventName, function(event2) {
      interactionEvents.triggerMouseEvent(eventName, event2, element);
      event2.stopPropagation();
    });
  }
  function getBendpointsContainer(element, create3) {
    var layer = canvas.getLayer("overlays"), gfx = query('.djs-bendpoints[data-element-id="' + escapeCSS(element.id) + '"]', layer);
    if (!gfx && create3) {
      gfx = create("g");
      attr(gfx, { "data-element-id": element.id });
      classes(gfx).add("djs-bendpoints");
      append(layer, gfx);
      bindInteractionEvents(gfx, "mousedown", element);
      bindInteractionEvents(gfx, "click", element);
      bindInteractionEvents(gfx, "dblclick", element);
    }
    return gfx;
  }
  function getSegmentDragger(idx, parentGfx) {
    return query(
      '.djs-segment-dragger[data-segment-idx="' + idx + '"]',
      parentGfx
    );
  }
  function createBendpoints(gfx, connection) {
    connection.waypoints.forEach(function(p, idx) {
      var bendpoint = addBendpoint(gfx);
      append(gfx, bendpoint);
      translate(bendpoint, p.x, p.y);
    });
    addBendpoint(gfx, "floating");
  }
  function createSegmentDraggers(gfx, connection) {
    var waypoints = connection.waypoints;
    var segmentStart, segmentEnd, segmentDraggerGfx;
    for (var i = 1; i < waypoints.length; i++) {
      segmentStart = waypoints[i - 1];
      segmentEnd = waypoints[i];
      if (pointsAligned(segmentStart, segmentEnd)) {
        segmentDraggerGfx = addSegmentDragger(gfx, segmentStart, segmentEnd);
        attr(segmentDraggerGfx, { "data-segment-idx": i });
        bindInteractionEvents(segmentDraggerGfx, "mousemove", connection);
      }
    }
  }
  function clearBendpoints(gfx) {
    forEach(all("." + BENDPOINT_CLS, gfx), function(node2) {
      remove(node2);
    });
  }
  function clearSegmentDraggers(gfx) {
    forEach(all("." + SEGMENT_DRAGGER_CLS, gfx), function(node2) {
      remove(node2);
    });
  }
  function addHandles(connection) {
    var gfx = getBendpointsContainer(connection);
    if (!gfx) {
      gfx = getBendpointsContainer(connection, true);
      createBendpoints(gfx, connection);
      createSegmentDraggers(gfx, connection);
    }
    return gfx;
  }
  function updateHandles(connection) {
    var gfx = getBendpointsContainer(connection);
    if (gfx) {
      clearSegmentDraggers(gfx);
      clearBendpoints(gfx);
      createSegmentDraggers(gfx, connection);
      createBendpoints(gfx, connection);
    }
  }
  function updateFloatingBendpointPosition(parentGfx, intersection) {
    var floating = query(".floating", parentGfx), point = intersection.point;
    if (!floating) {
      return;
    }
    translate(floating, point.x, point.y);
    classes(floating).add("positioned");
  }
  function updateSegmentDraggerPosition(parentGfx, intersection, waypoints) {
    var draggerGfx = getSegmentDragger(intersection.index, parentGfx), segmentStart = waypoints[intersection.index - 1], segmentEnd = waypoints[intersection.index], point = intersection.point, mid3 = getMidPoint(segmentStart, segmentEnd), alignment = pointsAligned(segmentStart, segmentEnd), draggerVisual, relativePosition;
    if (!draggerGfx) {
      return;
    }
    draggerVisual = getDraggerVisual(draggerGfx);
    relativePosition = {
      x: point.x - mid3.x,
      y: point.y - mid3.y
    };
    if (alignment === "v") {
      relativePosition = {
        x: relativePosition.y,
        y: relativePosition.x
      };
    }
    translate(draggerVisual, relativePosition.x, relativePosition.y);
  }
  eventBus.on("connection.changed", function(event2) {
    updateHandles(event2.element);
  });
  eventBus.on("connection.remove", function(event2) {
    var gfx = getBendpointsContainer(event2.element);
    if (gfx) {
      remove(gfx);
    }
  });
  eventBus.on("element.marker.update", function(event2) {
    var element = event2.element, bendpointsGfx;
    if (!element.waypoints) {
      return;
    }
    bendpointsGfx = addHandles(element);
    if (event2.add) {
      classes(bendpointsGfx).add(event2.marker);
    } else {
      classes(bendpointsGfx).remove(event2.marker);
    }
  });
  eventBus.on("element.mousemove", function(event2) {
    var element = event2.element, waypoints = element.waypoints, bendpointsGfx, intersection;
    if (waypoints) {
      bendpointsGfx = getBendpointsContainer(element, true);
      intersection = getConnectionIntersection(canvas, waypoints, event2.originalEvent);
      if (!intersection) {
        return;
      }
      updateFloatingBendpointPosition(bendpointsGfx, intersection);
      if (!intersection.bendpoint) {
        updateSegmentDraggerPosition(bendpointsGfx, intersection, waypoints);
      }
    }
  });
  eventBus.on("element.mousedown", function(event2) {
    if (!isPrimaryButton(event2)) {
      return;
    }
    var originalEvent = event2.originalEvent, element = event2.element;
    if (!element.waypoints) {
      return;
    }
    return activateBendpointMove(originalEvent, element);
  });
  eventBus.on("selection.changed", function(event2) {
    var newSelection = event2.newSelection, primary = newSelection[0];
    if (primary && primary.waypoints) {
      addHandles(primary);
    }
  });
  eventBus.on("element.hover", function(event2) {
    var element = event2.element;
    if (element.waypoints) {
      addHandles(element);
    }
  });
  eventBus.on("element.out", function(event2) {
    var element = event2.element;
    if (!element.waypoints) {
      return;
    }
    var bendpointsGfx = getBendpointsContainer(element);
    if (!bendpointsGfx) {
      return;
    }
    var floating = query(".floating", bendpointsGfx);
    if (floating) {
      classes(floating).remove("positioned");
    }
  });
  eventBus.on("element.updateId", function(context) {
    var element = context.element, newId = context.newId;
    if (element.waypoints) {
      var bendpointContainer = getBendpointsContainer(element);
      if (bendpointContainer) {
        attr(bendpointContainer, { "data-element-id": newId });
      }
    }
  });
  this.addHandles = addHandles;
  this.updateHandles = updateHandles;
  this.getBendpointsContainer = getBendpointsContainer;
  this.getSegmentDragger = getSegmentDragger;
}
Bendpoints.$inject = [
  "eventBus",
  "canvas",
  "interactionEvents",
  "bendpointMove",
  "connectionSegmentMove"
];
function getDraggerVisual(draggerGfx) {
  return query(".djs-visual", draggerGfx);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/BendpointMove.js
var round7 = Math.round;
var RECONNECT_START = "reconnectStart";
var RECONNECT_END = "reconnectEnd";
var UPDATE_WAYPOINTS = "updateWaypoints";
function BendpointMove(injector, eventBus, canvas, dragging, rules, modeling) {
  this._injector = injector;
  this.start = function(event2, connection, bendpointIndex, insert) {
    var gfx = canvas.getGraphics(connection), source = connection.source, target = connection.target, waypoints = connection.waypoints, type;
    if (!insert && bendpointIndex === 0) {
      type = RECONNECT_START;
    } else if (!insert && bendpointIndex === waypoints.length - 1) {
      type = RECONNECT_END;
    } else {
      type = UPDATE_WAYPOINTS;
    }
    var command = type === UPDATE_WAYPOINTS ? "connection.updateWaypoints" : "connection.reconnect";
    var allowed = rules.allowed(command, {
      connection,
      source,
      target
    });
    if (allowed === false) {
      allowed = rules.allowed(command, {
        connection,
        source: target,
        target: source
      });
    }
    if (allowed === false) {
      return;
    }
    return dragging.init(event2, "bendpoint.move", {
      data: {
        connection,
        connectionGfx: gfx,
        context: {
          allowed,
          bendpointIndex,
          connection,
          source,
          target,
          insert,
          type
        }
      }
    });
  };
  eventBus.on("bendpoint.move.hover", function(event2) {
    var context = event2.context, connection = context.connection, source = connection.source, target = connection.target, hover = event2.hover, type = context.type;
    context.hover = hover;
    var allowed;
    if (!hover) {
      return;
    }
    var command = type === UPDATE_WAYPOINTS ? "connection.updateWaypoints" : "connection.reconnect";
    allowed = context.allowed = rules.allowed(command, {
      connection,
      source: type === RECONNECT_START ? hover : source,
      target: type === RECONNECT_END ? hover : target
    });
    if (allowed) {
      context.source = type === RECONNECT_START ? hover : source;
      context.target = type === RECONNECT_END ? hover : target;
      return;
    }
    if (allowed === false) {
      allowed = context.allowed = rules.allowed(command, {
        connection,
        source: type === RECONNECT_END ? hover : target,
        target: type === RECONNECT_START ? hover : source
      });
    }
    if (allowed) {
      context.source = type === RECONNECT_END ? hover : target;
      context.target = type === RECONNECT_START ? hover : source;
    }
  });
  eventBus.on(["bendpoint.move.out", "bendpoint.move.cleanup"], function(event2) {
    var context = event2.context, type = context.type;
    context.hover = null;
    context.source = null;
    context.target = null;
    if (type !== UPDATE_WAYPOINTS) {
      context.allowed = false;
    }
  });
  eventBus.on("bendpoint.move.end", function(event2) {
    var context = event2.context, allowed = context.allowed, bendpointIndex = context.bendpointIndex, connection = context.connection, insert = context.insert, newWaypoints = connection.waypoints.slice(), source = context.source, target = context.target, type = context.type, hints = context.hints || {};
    var docking = {
      x: round7(event2.x),
      y: round7(event2.y)
    };
    if (!allowed) {
      return false;
    }
    if (type === UPDATE_WAYPOINTS) {
      if (insert) {
        newWaypoints.splice(bendpointIndex, 0, docking);
      } else {
        newWaypoints[bendpointIndex] = docking;
      }
      hints.bendpointMove = {
        insert,
        bendpointIndex
      };
      newWaypoints = this.cropWaypoints(connection, newWaypoints);
      modeling.updateWaypoints(connection, filterRedundantWaypoints(newWaypoints), hints);
    } else {
      if (type === RECONNECT_START) {
        hints.docking = "source";
        if (isReverse2(context)) {
          hints.docking = "target";
          hints.newWaypoints = newWaypoints.reverse();
        }
      } else if (type === RECONNECT_END) {
        hints.docking = "target";
        if (isReverse2(context)) {
          hints.docking = "source";
          hints.newWaypoints = newWaypoints.reverse();
        }
      }
      modeling.reconnect(connection, source, target, docking, hints);
    }
  }, this);
}
BendpointMove.$inject = [
  "injector",
  "eventBus",
  "canvas",
  "dragging",
  "rules",
  "modeling"
];
BendpointMove.prototype.cropWaypoints = function(connection, newWaypoints) {
  var connectionDocking = this._injector.get("connectionDocking", false);
  if (!connectionDocking) {
    return newWaypoints;
  }
  var waypoints = connection.waypoints;
  connection.waypoints = newWaypoints;
  connection.waypoints = connectionDocking.getCroppedWaypoints(connection);
  newWaypoints = connection.waypoints;
  connection.waypoints = waypoints;
  return newWaypoints;
};
function isReverse2(context) {
  var hover = context.hover, source = context.source, target = context.target, type = context.type;
  if (type === RECONNECT_START) {
    return hover && target && hover === target && source !== target;
  }
  if (type === RECONNECT_END) {
    return hover && source && hover === source && source !== target;
  }
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/BendpointMovePreview.js
var RECONNECT_START2 = "reconnectStart";
var RECONNECT_END2 = "reconnectEnd";
var UPDATE_WAYPOINTS2 = "updateWaypoints";
var MARKER_OK4 = "connect-ok";
var MARKER_NOT_OK4 = "connect-not-ok";
var MARKER_CONNECT_HOVER = "connect-hover";
var MARKER_CONNECT_UPDATING = "djs-updating";
var MARKER_DRAGGER = "djs-dragging";
var HIGH_PRIORITY5 = 1100;
function BendpointMovePreview(bendpointMove, injector, eventBus, canvas) {
  this._injector = injector;
  var connectionPreview = injector.get("connectionPreview", false);
  eventBus.on("bendpoint.move.start", function(event2) {
    var context = event2.context, bendpointIndex = context.bendpointIndex, connection = context.connection, insert = context.insert, waypoints = connection.waypoints, newWaypoints = waypoints.slice();
    context.waypoints = waypoints;
    if (insert) {
      newWaypoints.splice(bendpointIndex, 0, { x: event2.x, y: event2.y });
    }
    connection.waypoints = newWaypoints;
    var draggerGfx = context.draggerGfx = addBendpoint(canvas.getLayer("overlays"));
    classes(draggerGfx).add("djs-dragging");
    canvas.addMarker(connection, MARKER_DRAGGER);
    canvas.addMarker(connection, MARKER_CONNECT_UPDATING);
  });
  eventBus.on("bendpoint.move.hover", function(event2) {
    var context = event2.context, allowed = context.allowed, hover = context.hover, type = context.type;
    if (hover) {
      canvas.addMarker(hover, MARKER_CONNECT_HOVER);
      if (type === UPDATE_WAYPOINTS2) {
        return;
      }
      if (allowed) {
        canvas.removeMarker(hover, MARKER_NOT_OK4);
        canvas.addMarker(hover, MARKER_OK4);
      } else if (allowed === false) {
        canvas.removeMarker(hover, MARKER_OK4);
        canvas.addMarker(hover, MARKER_NOT_OK4);
      }
    }
  });
  eventBus.on([
    "bendpoint.move.out",
    "bendpoint.move.cleanup"
  ], HIGH_PRIORITY5, function(event2) {
    var context = event2.context, hover = context.hover, target = context.target;
    if (hover) {
      canvas.removeMarker(hover, MARKER_CONNECT_HOVER);
      canvas.removeMarker(hover, target ? MARKER_OK4 : MARKER_NOT_OK4);
    }
  });
  eventBus.on("bendpoint.move.move", function(event2) {
    var context = event2.context, allowed = context.allowed, bendpointIndex = context.bendpointIndex, draggerGfx = context.draggerGfx, hover = context.hover, type = context.type, connection = context.connection, source = connection.source, target = connection.target, newWaypoints = connection.waypoints.slice(), bendpoint = { x: event2.x, y: event2.y }, hints = context.hints || {}, drawPreviewHints = {};
    if (connectionPreview) {
      if (hints.connectionStart) {
        drawPreviewHints.connectionStart = hints.connectionStart;
      }
      if (hints.connectionEnd) {
        drawPreviewHints.connectionEnd = hints.connectionEnd;
      }
      if (type === RECONNECT_START2) {
        if (isReverse2(context)) {
          drawPreviewHints.connectionEnd = drawPreviewHints.connectionEnd || bendpoint;
          drawPreviewHints.source = target;
          drawPreviewHints.target = hover || source;
          newWaypoints = newWaypoints.reverse();
        } else {
          drawPreviewHints.connectionStart = drawPreviewHints.connectionStart || bendpoint;
          drawPreviewHints.source = hover || source;
          drawPreviewHints.target = target;
        }
      } else if (type === RECONNECT_END2) {
        if (isReverse2(context)) {
          drawPreviewHints.connectionStart = drawPreviewHints.connectionStart || bendpoint;
          drawPreviewHints.source = hover || target;
          drawPreviewHints.target = source;
          newWaypoints = newWaypoints.reverse();
        } else {
          drawPreviewHints.connectionEnd = drawPreviewHints.connectionEnd || bendpoint;
          drawPreviewHints.source = source;
          drawPreviewHints.target = hover || target;
        }
      } else {
        drawPreviewHints.noCropping = true;
        drawPreviewHints.noLayout = true;
        newWaypoints[bendpointIndex] = bendpoint;
      }
      if (type === UPDATE_WAYPOINTS2) {
        newWaypoints = bendpointMove.cropWaypoints(connection, newWaypoints);
      }
      drawPreviewHints.waypoints = newWaypoints;
      connectionPreview.drawPreview(context, allowed, drawPreviewHints);
    }
    translate(draggerGfx, event2.x, event2.y);
  }, this);
  eventBus.on([
    "bendpoint.move.end",
    "bendpoint.move.cancel"
  ], HIGH_PRIORITY5, function(event2) {
    var context = event2.context, connection = context.connection, draggerGfx = context.draggerGfx, hover = context.hover, target = context.target, waypoints = context.waypoints;
    connection.waypoints = waypoints;
    remove(draggerGfx);
    canvas.removeMarker(connection, MARKER_CONNECT_UPDATING);
    canvas.removeMarker(connection, MARKER_DRAGGER);
    if (hover) {
      canvas.removeMarker(hover, MARKER_OK4);
      canvas.removeMarker(hover, target ? MARKER_OK4 : MARKER_NOT_OK4);
    }
    if (connectionPreview) {
      connectionPreview.cleanUp(context);
    }
  });
}
BendpointMovePreview.$inject = [
  "bendpointMove",
  "injector",
  "eventBus",
  "canvas"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/ConnectionSegmentMove.js
var MARKER_CONNECT_HOVER2 = "connect-hover";
var MARKER_CONNECT_UPDATING2 = "djs-updating";
function axisAdd(point, axis, delta2) {
  return axisSet(point, axis, point[axis] + delta2);
}
function axisSet(point, axis, value) {
  return {
    x: axis === "x" ? value : point.x,
    y: axis === "y" ? value : point.y
  };
}
function axisFenced(position, segmentStart, segmentEnd, axis) {
  var maxValue = Math.max(segmentStart[axis], segmentEnd[axis]), minValue = Math.min(segmentStart[axis], segmentEnd[axis]);
  var padding = 20;
  var fencedValue = Math.min(Math.max(minValue + padding, position[axis]), maxValue - padding);
  return axisSet(segmentStart, axis, fencedValue);
}
function flipAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getDocking2(point, referenceElement, moveAxis) {
  var referenceMid, inverseAxis;
  if (point.original) {
    return point.original;
  } else {
    referenceMid = getMid(referenceElement);
    inverseAxis = flipAxis(moveAxis);
    return axisSet(point, inverseAxis, referenceMid[inverseAxis]);
  }
}
function ConnectionSegmentMove(injector, eventBus, canvas, dragging, graphicsFactory, modeling) {
  var connectionDocking = injector.get("connectionDocking", false);
  this.start = function(event2, connection, idx) {
    var context, gfx = canvas.getGraphics(connection), segmentStartIndex = idx - 1, segmentEndIndex = idx, waypoints = connection.waypoints, segmentStart = waypoints[segmentStartIndex], segmentEnd = waypoints[segmentEndIndex], intersection = getConnectionIntersection(canvas, waypoints, event2), direction, axis, dragPosition;
    direction = pointsAligned(segmentStart, segmentEnd);
    if (!direction) {
      return;
    }
    axis = direction === "v" ? "x" : "y";
    if (segmentStartIndex === 0) {
      segmentStart = getDocking2(segmentStart, connection.source, axis);
    }
    if (segmentEndIndex === waypoints.length - 1) {
      segmentEnd = getDocking2(segmentEnd, connection.target, axis);
    }
    if (intersection) {
      dragPosition = intersection.point;
    } else {
      dragPosition = {
        x: (segmentStart.x + segmentEnd.x) / 2,
        y: (segmentStart.y + segmentEnd.y) / 2
      };
    }
    context = {
      connection,
      segmentStartIndex,
      segmentEndIndex,
      segmentStart,
      segmentEnd,
      axis,
      dragPosition
    };
    return dragging.init(event2, dragPosition, "connectionSegment.move", {
      cursor: axis === "x" ? "resize-ew" : "resize-ns",
      data: {
        connection,
        connectionGfx: gfx,
        context
      }
    });
  };
  function cropConnection(connection, newWaypoints) {
    if (!connectionDocking) {
      return newWaypoints;
    }
    var oldWaypoints = connection.waypoints, croppedWaypoints;
    connection.waypoints = newWaypoints;
    croppedWaypoints = connectionDocking.getCroppedWaypoints(connection);
    connection.waypoints = oldWaypoints;
    return croppedWaypoints;
  }
  function redrawConnection(data) {
    graphicsFactory.update("connection", data.connection, data.connectionGfx);
  }
  function updateDragger(context, segmentOffset, event2) {
    var newWaypoints = context.newWaypoints, segmentStartIndex = context.segmentStartIndex + segmentOffset, segmentStart = newWaypoints[segmentStartIndex], segmentEndIndex = context.segmentEndIndex + segmentOffset, segmentEnd = newWaypoints[segmentEndIndex], axis = flipAxis(context.axis);
    var draggerPosition = axisFenced(event2, segmentStart, segmentEnd, axis);
    translate(context.draggerGfx, draggerPosition.x, draggerPosition.y);
  }
  function filterRedundantWaypoints2(waypoints, segmentStartIndex) {
    var segmentOffset = 0;
    var filteredWaypoints = waypoints.filter(function(r, idx) {
      if (pointsOnLine(waypoints[idx - 1], waypoints[idx + 1], r)) {
        segmentOffset = idx <= segmentStartIndex ? segmentOffset - 1 : segmentOffset;
        return false;
      }
      return true;
    });
    return {
      waypoints: filteredWaypoints,
      segmentOffset
    };
  }
  eventBus.on("connectionSegment.move.start", function(event2) {
    var context = event2.context, connection = event2.connection, layer = canvas.getLayer("overlays");
    context.originalWaypoints = connection.waypoints.slice();
    context.draggerGfx = addSegmentDragger(layer, context.segmentStart, context.segmentEnd);
    classes(context.draggerGfx).add("djs-dragging");
    canvas.addMarker(connection, MARKER_CONNECT_UPDATING2);
  });
  eventBus.on("connectionSegment.move.move", function(event2) {
    var context = event2.context, connection = context.connection, segmentStartIndex = context.segmentStartIndex, segmentEndIndex = context.segmentEndIndex, segmentStart = context.segmentStart, segmentEnd = context.segmentEnd, axis = context.axis;
    var newWaypoints = context.originalWaypoints.slice(), newSegmentStart = axisAdd(segmentStart, axis, event2["d" + axis]), newSegmentEnd = axisAdd(segmentEnd, axis, event2["d" + axis]);
    var waypointCount = newWaypoints.length, segmentOffset = 0;
    newWaypoints[segmentStartIndex] = newSegmentStart;
    newWaypoints[segmentEndIndex] = newSegmentEnd;
    var sourceToSegmentOrientation, targetToSegmentOrientation;
    if (segmentStartIndex < 2) {
      sourceToSegmentOrientation = getOrientation(connection.source, newSegmentStart);
      if (segmentStartIndex === 1) {
        if (sourceToSegmentOrientation === "intersect") {
          newWaypoints.shift();
          newWaypoints[0] = newSegmentStart;
          segmentOffset--;
        }
      } else {
        if (sourceToSegmentOrientation !== "intersect") {
          newWaypoints.unshift(segmentStart);
          segmentOffset++;
        }
      }
    }
    if (segmentEndIndex > waypointCount - 3) {
      targetToSegmentOrientation = getOrientation(connection.target, newSegmentEnd);
      if (segmentEndIndex === waypointCount - 2) {
        if (targetToSegmentOrientation === "intersect") {
          newWaypoints.pop();
          newWaypoints[newWaypoints.length - 1] = newSegmentEnd;
        }
      } else {
        if (targetToSegmentOrientation !== "intersect") {
          newWaypoints.push(segmentEnd);
        }
      }
    }
    context.newWaypoints = connection.waypoints = cropConnection(connection, newWaypoints);
    updateDragger(context, segmentOffset, event2);
    context.newSegmentStartIndex = segmentStartIndex + segmentOffset;
    redrawConnection(event2);
  });
  eventBus.on("connectionSegment.move.hover", function(event2) {
    event2.context.hover = event2.hover;
    canvas.addMarker(event2.hover, MARKER_CONNECT_HOVER2);
  });
  eventBus.on([
    "connectionSegment.move.out",
    "connectionSegment.move.cleanup"
  ], function(event2) {
    var hover = event2.context.hover;
    if (hover) {
      canvas.removeMarker(hover, MARKER_CONNECT_HOVER2);
    }
  });
  eventBus.on("connectionSegment.move.cleanup", function(event2) {
    var context = event2.context, connection = context.connection;
    if (context.draggerGfx) {
      remove(context.draggerGfx);
    }
    canvas.removeMarker(connection, MARKER_CONNECT_UPDATING2);
  });
  eventBus.on([
    "connectionSegment.move.cancel",
    "connectionSegment.move.end"
  ], function(event2) {
    var context = event2.context, connection = context.connection;
    connection.waypoints = context.originalWaypoints;
    redrawConnection(event2);
  });
  eventBus.on("connectionSegment.move.end", function(event2) {
    var context = event2.context, connection = context.connection, newWaypoints = context.newWaypoints, newSegmentStartIndex = context.newSegmentStartIndex;
    newWaypoints = newWaypoints.map(function(p) {
      return {
        original: p.original,
        x: Math.round(p.x),
        y: Math.round(p.y)
      };
    });
    var filtered = filterRedundantWaypoints2(newWaypoints, newSegmentStartIndex);
    var filteredWaypoints = filtered.waypoints, croppedWaypoints = cropConnection(connection, filteredWaypoints), segmentOffset = filtered.segmentOffset;
    var hints = {
      segmentMove: {
        segmentStartIndex: context.segmentStartIndex,
        newSegmentStartIndex: newSegmentStartIndex + segmentOffset
      }
    };
    modeling.updateWaypoints(connection, croppedWaypoints, hints);
  });
}
ConnectionSegmentMove.$inject = [
  "injector",
  "eventBus",
  "canvas",
  "dragging",
  "graphicsFactory",
  "modeling"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/snapping/SnapUtil.js
var abs2 = Math.abs;
var round8 = Math.round;
function snapTo(value, values2, tolerance) {
  tolerance = tolerance === void 0 ? 10 : tolerance;
  var idx, snapValue;
  for (idx = 0; idx < values2.length; idx++) {
    snapValue = values2[idx];
    if (abs2(snapValue - value) <= tolerance) {
      return snapValue;
    }
  }
}
function topLeft(bounds) {
  return {
    x: bounds.x,
    y: bounds.y
  };
}
function bottomRight(bounds) {
  return {
    x: bounds.x + bounds.width,
    y: bounds.y + bounds.height
  };
}
function mid2(bounds, defaultValue) {
  if (!bounds || isNaN(bounds.x) || isNaN(bounds.y)) {
    return defaultValue;
  }
  return {
    x: round8(bounds.x + bounds.width / 2),
    y: round8(bounds.y + bounds.height / 2)
  };
}
function isSnapped(event2, axis) {
  var snapped = event2.snapped;
  if (!snapped) {
    return false;
  }
  if (typeof axis === "string") {
    return snapped[axis];
  }
  return snapped.x && snapped.y;
}
function setSnapped(event2, axis, value) {
  if (typeof axis !== "string") {
    throw new Error("axis must be in [x, y]");
  }
  if (typeof value !== "number" && value !== false) {
    throw new Error("value must be Number or false");
  }
  var delta2, previousValue = event2[axis];
  var snapped = event2.snapped = event2.snapped || {};
  if (value === false) {
    snapped[axis] = false;
  } else {
    snapped[axis] = true;
    delta2 = value - previousValue;
    event2[axis] += delta2;
    event2["d" + axis] += delta2;
  }
  return previousValue;
}
function getChildren2(parent) {
  return parent.children || [];
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/BendpointSnapping.js
var abs3 = Math.abs;
var round9 = Math.round;
var TOLERANCE = 10;
function BendpointSnapping(eventBus) {
  function snapTo2(values2, value) {
    if (isArray2(values2)) {
      var i = values2.length;
      while (i--) if (abs3(values2[i] - value) <= TOLERANCE) {
        return values2[i];
      }
    } else {
      values2 = +values2;
      var rem = value % values2;
      if (rem < TOLERANCE) {
        return value - rem;
      }
      if (rem > values2 - TOLERANCE) {
        return value - rem + values2;
      }
    }
    return value;
  }
  function getSnapPoint(element, event2) {
    if (element.waypoints) {
      return getClosestPointOnConnection(event2, element);
    }
    if (element.width) {
      return {
        x: round9(element.width / 2 + element.x),
        y: round9(element.height / 2 + element.y)
      };
    }
  }
  function getConnectionSegmentSnaps(event2) {
    var context = event2.context, snapPoints = context.snapPoints, connection = context.connection, waypoints = connection.waypoints, segmentStart = context.segmentStart, segmentStartIndex = context.segmentStartIndex, segmentEnd = context.segmentEnd, segmentEndIndex = context.segmentEndIndex, axis = context.axis;
    if (snapPoints) {
      return snapPoints;
    }
    var referenceWaypoints = [
      waypoints[segmentStartIndex - 1],
      segmentStart,
      segmentEnd,
      waypoints[segmentEndIndex + 1]
    ];
    if (segmentStartIndex < 2) {
      referenceWaypoints.unshift(getSnapPoint(connection.source, event2));
    }
    if (segmentEndIndex > waypoints.length - 3) {
      referenceWaypoints.unshift(getSnapPoint(connection.target, event2));
    }
    context.snapPoints = snapPoints = { horizontal: [], vertical: [] };
    forEach(referenceWaypoints, function(p) {
      if (p) {
        p = p.original || p;
        if (axis === "y") {
          snapPoints.horizontal.push(p.y);
        }
        if (axis === "x") {
          snapPoints.vertical.push(p.x);
        }
      }
    });
    return snapPoints;
  }
  eventBus.on("connectionSegment.move.move", 1500, function(event2) {
    var snapPoints = getConnectionSegmentSnaps(event2), x = event2.x, y = event2.y, sx, sy;
    if (!snapPoints) {
      return;
    }
    sx = snapTo2(snapPoints.vertical, x);
    sy = snapTo2(snapPoints.horizontal, y);
    var cx = x - sx, cy = y - sy;
    assign(event2, {
      dx: event2.dx - cx,
      dy: event2.dy - cy,
      x: sx,
      y: sy
    });
    if (cx || snapPoints.vertical.indexOf(x) !== -1) {
      setSnapped(event2, "x", sx);
    }
    if (cy || snapPoints.horizontal.indexOf(y) !== -1) {
      setSnapped(event2, "y", sy);
    }
  });
  function getBendpointSnaps(context) {
    var snapPoints = context.snapPoints, waypoints = context.connection.waypoints, bendpointIndex = context.bendpointIndex;
    if (snapPoints) {
      return snapPoints;
    }
    var referenceWaypoints = [waypoints[bendpointIndex - 1], waypoints[bendpointIndex + 1]];
    context.snapPoints = snapPoints = { horizontal: [], vertical: [] };
    forEach(referenceWaypoints, function(p) {
      if (p) {
        p = p.original || p;
        snapPoints.horizontal.push(p.y);
        snapPoints.vertical.push(p.x);
      }
    });
    return snapPoints;
  }
  eventBus.on([
    "connect.hover",
    "connect.move",
    "connect.end"
  ], 1500, function(event2) {
    var context = event2.context, hover = context.hover, hoverMid = hover && getSnapPoint(hover, event2);
    if (!isConnection(hover) || !hoverMid || !hoverMid.x || !hoverMid.y) {
      return;
    }
    setSnapped(event2, "x", hoverMid.x);
    setSnapped(event2, "y", hoverMid.y);
  });
  eventBus.on(["bendpoint.move.move", "bendpoint.move.end"], 1500, function(event2) {
    var context = event2.context, snapPoints = getBendpointSnaps(context), hover = context.hover, hoverMid = hover && getSnapPoint(hover, event2), x = event2.x, y = event2.y, sx, sy;
    if (!snapPoints) {
      return;
    }
    sx = snapTo2(hoverMid ? snapPoints.vertical.concat([hoverMid.x]) : snapPoints.vertical, x);
    sy = snapTo2(hoverMid ? snapPoints.horizontal.concat([hoverMid.y]) : snapPoints.horizontal, y);
    var cx = x - sx, cy = y - sy;
    assign(event2, {
      dx: event2.dx - cx,
      dy: event2.dy - cy,
      x: event2.x - cx,
      y: event2.y - cy
    });
    if (cx || snapPoints.vertical.indexOf(x) !== -1) {
      setSnapped(event2, "x", sx);
    }
    if (cy || snapPoints.horizontal.indexOf(y) !== -1) {
      setSnapped(event2, "y", sy);
    }
  });
}
BendpointSnapping.$inject = ["eventBus"];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/bendpoints/index.js
var bendpoints_default = {
  __depends__: [
    dragging_default,
    rules_default
  ],
  __init__: ["bendpoints", "bendpointSnapping", "bendpointMovePreview"],
  bendpoints: ["type", Bendpoints],
  bendpointMove: ["type", BendpointMove],
  bendpointMovePreview: ["type", BendpointMovePreview],
  connectionSegmentMove: ["type", ConnectionSegmentMove],
  bendpointSnapping: ["type", BendpointSnapping]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/resize/ResizeUtil.js
var max2 = Math.max;
var min = Math.min;
var DEFAULT_CHILD_BOX_PADDING = 20;
function resizeBounds2(bounds, direction, delta2) {
  var dx = delta2.x, dy = delta2.y;
  var newBounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };
  if (direction.indexOf("n") !== -1) {
    newBounds.y = bounds.y + dy;
    newBounds.height = bounds.height - dy;
  } else if (direction.indexOf("s") !== -1) {
    newBounds.height = bounds.height + dy;
  }
  if (direction.indexOf("e") !== -1) {
    newBounds.width = bounds.width + dx;
  } else if (direction.indexOf("w") !== -1) {
    newBounds.x = bounds.x + dx;
    newBounds.width = bounds.width - dx;
  }
  return newBounds;
}
function applyConstraints(attr3, trbl, resizeConstraints) {
  var value = trbl[attr3], minValue = resizeConstraints.min && resizeConstraints.min[attr3], maxValue = resizeConstraints.max && resizeConstraints.max[attr3];
  if (isNumber(minValue)) {
    value = (/top|left/.test(attr3) ? min : max2)(value, minValue);
  }
  if (isNumber(maxValue)) {
    value = (/top|left/.test(attr3) ? max2 : min)(value, maxValue);
  }
  return value;
}
function ensureConstraints2(currentBounds, resizeConstraints) {
  if (!resizeConstraints) {
    return currentBounds;
  }
  var currentTrbl = asTRBL(currentBounds);
  return asBounds({
    top: applyConstraints("top", currentTrbl, resizeConstraints),
    right: applyConstraints("right", currentTrbl, resizeConstraints),
    bottom: applyConstraints("bottom", currentTrbl, resizeConstraints),
    left: applyConstraints("left", currentTrbl, resizeConstraints)
  });
}
function getMinResizeBounds(direction, currentBounds, minDimensions, childrenBounds) {
  var currentBox = asTRBL(currentBounds);
  var minBox = {
    top: /n/.test(direction) ? currentBox.bottom - minDimensions.height : currentBox.top,
    left: /w/.test(direction) ? currentBox.right - minDimensions.width : currentBox.left,
    bottom: /s/.test(direction) ? currentBox.top + minDimensions.height : currentBox.bottom,
    right: /e/.test(direction) ? currentBox.left + minDimensions.width : currentBox.right
  };
  var childrenBox = childrenBounds ? asTRBL(childrenBounds) : minBox;
  var combinedBox = {
    top: min(minBox.top, childrenBox.top),
    left: min(minBox.left, childrenBox.left),
    bottom: max2(minBox.bottom, childrenBox.bottom),
    right: max2(minBox.right, childrenBox.right)
  };
  return asBounds(combinedBox);
}
function asPadding(mayBePadding, defaultValue) {
  if (typeof mayBePadding !== "undefined") {
    return mayBePadding;
  } else {
    return DEFAULT_CHILD_BOX_PADDING;
  }
}
function addPadding(bbox, padding) {
  var left, right, top, bottom;
  if (typeof padding === "object") {
    left = asPadding(padding.left);
    right = asPadding(padding.right);
    top = asPadding(padding.top);
    bottom = asPadding(padding.bottom);
  } else {
    left = right = top = bottom = asPadding(padding);
  }
  return {
    x: bbox.x - left,
    y: bbox.y - top,
    width: bbox.width + left + right,
    height: bbox.height + top + bottom
  };
}
function isBBoxChild(element) {
  if (element.waypoints) {
    return false;
  }
  if (element.type === "label") {
    return false;
  }
  return true;
}
function computeChildrenBBox(shapeOrChildren, padding) {
  var elements;
  if (shapeOrChildren.length === void 0) {
    elements = filter(shapeOrChildren.children, isBBoxChild);
  } else {
    elements = shapeOrChildren;
  }
  if (elements.length) {
    return addPadding(getBBox(elements), padding);
  }
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/resize/Resize.js
var DEFAULT_MIN_WIDTH = 10;
function Resize(eventBus, rules, modeling, dragging) {
  this._dragging = dragging;
  this._rules = rules;
  var self = this;
  function handleMove(context, delta2) {
    var shape = context.shape, direction = context.direction, resizeConstraints = context.resizeConstraints, newBounds;
    context.delta = delta2;
    newBounds = resizeBounds2(shape, direction, delta2);
    context.newBounds = ensureConstraints2(newBounds, resizeConstraints);
    context.canExecute = self.canResize(context);
  }
  function handleStart(context) {
    var resizeConstraints = context.resizeConstraints, minBounds = context.minBounds;
    if (resizeConstraints !== void 0) {
      return;
    }
    if (minBounds === void 0) {
      minBounds = self.computeMinResizeBox(context);
    }
    context.resizeConstraints = {
      min: asTRBL(minBounds)
    };
  }
  function handleEnd(context) {
    var shape = context.shape, canExecute = context.canExecute, newBounds = context.newBounds;
    if (canExecute) {
      newBounds = roundBounds(newBounds);
      if (!boundsChanged(shape, newBounds)) {
        return;
      }
      modeling.resizeShape(shape, newBounds);
    }
  }
  eventBus.on("resize.start", function(event2) {
    handleStart(event2.context);
  });
  eventBus.on("resize.move", function(event2) {
    var delta2 = {
      x: event2.dx,
      y: event2.dy
    };
    handleMove(event2.context, delta2);
  });
  eventBus.on("resize.end", function(event2) {
    handleEnd(event2.context);
  });
}
Resize.prototype.canResize = function(context) {
  var rules = this._rules;
  var ctx = pick(context, ["newBounds", "shape", "delta", "direction"]);
  return rules.allowed("shape.resize", ctx);
};
Resize.prototype.activate = function(event2, shape, contextOrDirection) {
  var dragging = this._dragging, context, direction;
  if (typeof contextOrDirection === "string") {
    contextOrDirection = {
      direction: contextOrDirection
    };
  }
  context = assign({ shape }, contextOrDirection);
  direction = context.direction;
  if (!direction) {
    throw new Error("must provide a direction (n|w|s|e|nw|se|ne|sw)");
  }
  dragging.init(event2, getReferencePoint(shape, direction), "resize", {
    autoActivate: true,
    cursor: getCursor(direction),
    data: {
      shape,
      context
    }
  });
};
Resize.prototype.computeMinResizeBox = function(context) {
  var shape = context.shape, direction = context.direction, minDimensions, childrenBounds;
  minDimensions = context.minDimensions || {
    width: DEFAULT_MIN_WIDTH,
    height: DEFAULT_MIN_WIDTH
  };
  childrenBounds = computeChildrenBBox(shape, context.childrenBoxPadding);
  return getMinResizeBounds(direction, shape, minDimensions, childrenBounds);
};
Resize.$inject = [
  "eventBus",
  "rules",
  "modeling",
  "dragging"
];
function boundsChanged(shape, newBounds) {
  return shape.x !== newBounds.x || shape.y !== newBounds.y || shape.width !== newBounds.width || shape.height !== newBounds.height;
}
function getReferencePoint(shape, direction) {
  var mid3 = getMid(shape), trbl = asTRBL(shape);
  var referencePoint = {
    x: mid3.x,
    y: mid3.y
  };
  if (direction.indexOf("n") !== -1) {
    referencePoint.y = trbl.top;
  } else if (direction.indexOf("s") !== -1) {
    referencePoint.y = trbl.bottom;
  }
  if (direction.indexOf("e") !== -1) {
    referencePoint.x = trbl.right;
  } else if (direction.indexOf("w") !== -1) {
    referencePoint.x = trbl.left;
  }
  return referencePoint;
}
function getCursor(direction) {
  var prefix = "resize-";
  if (direction === "n" || direction === "s") {
    return prefix + "ns";
  } else if (direction === "e" || direction === "w") {
    return prefix + "ew";
  } else if (direction === "nw" || direction === "se") {
    return prefix + "nwse";
  } else {
    return prefix + "nesw";
  }
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/resize/ResizePreview.js
var MARKER_RESIZING = "djs-resizing";
var MARKER_RESIZE_NOT_OK = "resize-not-ok";
var LOW_PRIORITY8 = 500;
function ResizePreview(eventBus, canvas, previewSupport) {
  function updateFrame(context) {
    var shape = context.shape, bounds = context.newBounds, frame = context.frame;
    if (!frame) {
      frame = context.frame = previewSupport.addFrame(shape, canvas.getActiveLayer());
      canvas.addMarker(shape, MARKER_RESIZING);
    }
    if (bounds.width > 5) {
      attr(frame, { x: bounds.x, width: bounds.width });
    }
    if (bounds.height > 5) {
      attr(frame, { y: bounds.y, height: bounds.height });
    }
    if (context.canExecute) {
      classes(frame).remove(MARKER_RESIZE_NOT_OK);
    } else {
      classes(frame).add(MARKER_RESIZE_NOT_OK);
    }
  }
  function removeFrame(context) {
    var shape = context.shape, frame = context.frame;
    if (frame) {
      remove(context.frame);
    }
    canvas.removeMarker(shape, MARKER_RESIZING);
  }
  eventBus.on("resize.move", LOW_PRIORITY8, function(event2) {
    updateFrame(event2.context);
  });
  eventBus.on("resize.cleanup", function(event2) {
    removeFrame(event2.context);
  });
}
ResizePreview.$inject = [
  "eventBus",
  "canvas",
  "previewSupport"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/resize/ResizeHandles.js
var HANDLE_OFFSET = -6;
var HANDLE_SIZE = 8;
var HANDLE_HIT_SIZE = 20;
var CLS_RESIZER = "djs-resizer";
var directions = ["n", "w", "s", "e", "nw", "ne", "se", "sw"];
function ResizeHandles(eventBus, canvas, selection, resize) {
  this._resize = resize;
  this._canvas = canvas;
  var self = this;
  eventBus.on("selection.changed", function(e2) {
    var newSelection = e2.newSelection;
    self.removeResizers();
    if (newSelection.length === 1) {
      forEach(newSelection, bind(self.addResizer, self));
    }
  });
  eventBus.on("shape.changed", function(e2) {
    var shape = e2.element;
    if (selection.isSelected(shape)) {
      self.removeResizers();
      self.addResizer(shape);
    }
  });
}
ResizeHandles.prototype.makeDraggable = function(element, gfx, direction) {
  var resize = this._resize;
  function startResize(event2) {
    if (isPrimaryButton(event2)) {
      resize.activate(event2, element, direction);
    }
  }
  event.bind(gfx, "mousedown", startResize);
  event.bind(gfx, "touchstart", startResize);
};
ResizeHandles.prototype._createResizer = function(element, x, y, direction) {
  var resizersParent = this._getResizersParent();
  var offset = getHandleOffset(direction);
  var group = create("g");
  classes(group).add(CLS_RESIZER);
  classes(group).add(CLS_RESIZER + "-" + element.id);
  classes(group).add(CLS_RESIZER + "-" + direction);
  append(resizersParent, group);
  var visual = create("rect");
  attr(visual, {
    x: -HANDLE_SIZE / 2 + offset.x,
    y: -HANDLE_SIZE / 2 + offset.y,
    rx: 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE
  });
  classes(visual).add(CLS_RESIZER + "-visual");
  append(group, visual);
  var hit = create("rect");
  attr(hit, {
    x: -HANDLE_HIT_SIZE / 2 + offset.x,
    y: -HANDLE_HIT_SIZE / 2 + offset.y,
    width: HANDLE_HIT_SIZE,
    height: HANDLE_HIT_SIZE
  });
  classes(hit).add(CLS_RESIZER + "-hit");
  append(group, hit);
  transform2(group, x, y);
  return group;
};
ResizeHandles.prototype.createResizer = function(element, direction) {
  var point = getReferencePoint(element, direction);
  var resizer = this._createResizer(element, point.x, point.y, direction);
  this.makeDraggable(element, resizer, direction);
};
ResizeHandles.prototype.addResizer = function(element) {
  var self = this;
  if (isConnection(element)) {
    return;
  }
  forEach(directions, function(direction) {
    if (self._resize.canResize({ shape: element, direction })) {
      self.createResizer(element, direction);
    }
  });
};
ResizeHandles.prototype.removeResizers = function() {
  var resizersParent = this._getResizersParent();
  clear(resizersParent);
};
ResizeHandles.prototype._getResizersParent = function() {
  return this._canvas.getLayer("resizers");
};
ResizeHandles.$inject = [
  "eventBus",
  "canvas",
  "selection",
  "resize"
];
function getHandleOffset(direction) {
  var offset = {
    x: 0,
    y: 0
  };
  if (direction.indexOf("e") !== -1) {
    offset.x = -HANDLE_OFFSET;
  } else if (direction.indexOf("w") !== -1) {
    offset.x = HANDLE_OFFSET;
  }
  if (direction.indexOf("s") !== -1) {
    offset.y = -HANDLE_OFFSET;
  } else if (direction.indexOf("n") !== -1) {
    offset.y = HANDLE_OFFSET;
  }
  return offset;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/resize/index.js
var resize_default = {
  __depends__: [
    rules_default,
    dragging_default,
    preview_support_default
  ],
  __init__: [
    "resize",
    "resizePreview",
    "resizeHandles"
  ],
  resize: ["type", Resize],
  resizePreview: ["type", ResizePreview],
  resizeHandles: ["type", ResizeHandles]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/snapping/SnapContext.js
function SnapContext() {
  this._targets = {};
  this._snapOrigins = {};
  this._snapLocations = [];
  this._defaultSnaps = {};
}
SnapContext.prototype.getSnapOrigin = function(snapLocation) {
  return this._snapOrigins[snapLocation];
};
SnapContext.prototype.setSnapOrigin = function(snapLocation, snapOrigin) {
  this._snapOrigins[snapLocation] = snapOrigin;
  if (this._snapLocations.indexOf(snapLocation) === -1) {
    this._snapLocations.push(snapLocation);
  }
};
SnapContext.prototype.addDefaultSnap = function(snapLocation, point) {
  var snapValues = this._defaultSnaps[snapLocation];
  if (!snapValues) {
    snapValues = this._defaultSnaps[snapLocation] = [];
  }
  snapValues.push(point);
};
SnapContext.prototype.getSnapLocations = function() {
  return this._snapLocations;
};
SnapContext.prototype.setSnapLocations = function(snapLocations) {
  this._snapLocations = snapLocations;
};
SnapContext.prototype.pointsForTarget = function(target) {
  var targetId = target.id || target;
  var snapPoints = this._targets[targetId];
  if (!snapPoints) {
    snapPoints = this._targets[targetId] = new SnapPoints();
    snapPoints.initDefaults(this._defaultSnaps);
  }
  return snapPoints;
};
function SnapPoints() {
  this._snapValues = {};
}
SnapPoints.prototype.add = function(snapLocation, point) {
  var snapValues = this._snapValues[snapLocation];
  if (!snapValues) {
    snapValues = this._snapValues[snapLocation] = { x: [], y: [] };
  }
  if (snapValues.x.indexOf(point.x) === -1) {
    snapValues.x.push(point.x);
  }
  if (snapValues.y.indexOf(point.y) === -1) {
    snapValues.y.push(point.y);
  }
};
SnapPoints.prototype.snap = function(point, snapLocation, axis, tolerance) {
  var snappingValues = this._snapValues[snapLocation];
  return snappingValues && snapTo(point[axis], snappingValues[axis], tolerance);
};
SnapPoints.prototype.initDefaults = function(defaultSnaps) {
  var self = this;
  forEach(defaultSnaps || {}, function(snapPoints, snapLocation) {
    forEach(snapPoints, function(point) {
      self.add(snapLocation, point);
    });
  });
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/snapping/CreateMoveSnapping.js
var HIGHER_PRIORITY = 1250;
function CreateMoveSnapping(elementRegistry, eventBus, snapping) {
  var self = this;
  this._elementRegistry = elementRegistry;
  eventBus.on([
    "create.start",
    "shape.move.start"
  ], function(event2) {
    self.initSnap(event2);
  });
  eventBus.on([
    "create.move",
    "create.end",
    "shape.move.move",
    "shape.move.end"
  ], HIGHER_PRIORITY, function(event2) {
    var context = event2.context, shape = context.shape, snapContext = context.snapContext, target = context.target;
    if (event2.originalEvent && isCmd(event2.originalEvent)) {
      return;
    }
    if (isSnapped(event2) || !target) {
      return;
    }
    var snapPoints = snapContext.pointsForTarget(target);
    if (!snapPoints.initialized) {
      snapPoints = self.addSnapTargetPoints(snapPoints, shape, target);
      snapPoints.initialized = true;
    }
    snapping.snap(event2, snapPoints);
  });
  eventBus.on([
    "create.cleanup",
    "shape.move.cleanup"
  ], function() {
    snapping.hide();
  });
}
CreateMoveSnapping.$inject = [
  "elementRegistry",
  "eventBus",
  "snapping"
];
CreateMoveSnapping.prototype.initSnap = function(event2) {
  var elementRegistry = this._elementRegistry;
  var context = event2.context, shape = context.shape, snapContext = context.snapContext;
  if (!snapContext) {
    snapContext = context.snapContext = new SnapContext();
  }
  var shapeMid;
  if (elementRegistry.get(shape.id)) {
    shapeMid = mid2(shape, event2);
  } else {
    shapeMid = {
      x: event2.x + mid2(shape).x,
      y: event2.y + mid2(shape).y
    };
  }
  var shapeTopLeft = {
    x: shapeMid.x - shape.width / 2,
    y: shapeMid.y - shape.height / 2
  }, shapeBottomRight = {
    x: shapeMid.x + shape.width / 2,
    y: shapeMid.y + shape.height / 2
  };
  snapContext.setSnapOrigin("mid", {
    x: shapeMid.x - event2.x,
    y: shapeMid.y - event2.y
  });
  if (isLabel(shape)) {
    return snapContext;
  }
  snapContext.setSnapOrigin("top-left", {
    x: shapeTopLeft.x - event2.x,
    y: shapeTopLeft.y - event2.y
  });
  snapContext.setSnapOrigin("bottom-right", {
    x: shapeBottomRight.x - event2.x,
    y: shapeBottomRight.y - event2.y
  });
  return snapContext;
};
CreateMoveSnapping.prototype.addSnapTargetPoints = function(snapPoints, shape, target) {
  var snapTargets = this.getSnapTargets(shape, target);
  forEach(snapTargets, function(snapTarget) {
    if (isLabel(snapTarget)) {
      if (isLabel(shape)) {
        snapPoints.add("mid", mid2(snapTarget));
      }
      return;
    }
    if (isConnection(snapTarget)) {
      if (snapTarget.waypoints.length < 3) {
        return;
      }
      var waypoints = snapTarget.waypoints.slice(1, -1);
      forEach(waypoints, function(waypoint) {
        snapPoints.add("mid", waypoint);
      });
      return;
    }
    snapPoints.add("mid", mid2(snapTarget));
  });
  if (!isNumber(shape.x) || !isNumber(shape.y)) {
    return snapPoints;
  }
  if (this._elementRegistry.get(shape.id)) {
    snapPoints.add("mid", mid2(shape));
  }
  return snapPoints;
};
CreateMoveSnapping.prototype.getSnapTargets = function(shape, target) {
  return getChildren2(target).filter(function(child) {
    return !isHidden(child);
  });
};
function isHidden(element) {
  return !!element.hidden;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/snapping/ResizeSnapping.js
var HIGHER_PRIORITY2 = 1250;
function ResizeSnapping(eventBus, snapping) {
  var self = this;
  eventBus.on(["resize.start"], function(event2) {
    self.initSnap(event2);
  });
  eventBus.on([
    "resize.move",
    "resize.end"
  ], HIGHER_PRIORITY2, function(event2) {
    var context = event2.context, shape = context.shape, parent = shape.parent, direction = context.direction, snapContext = context.snapContext;
    if (event2.originalEvent && isCmd(event2.originalEvent)) {
      return;
    }
    if (isSnapped(event2)) {
      return;
    }
    var snapPoints = snapContext.pointsForTarget(parent);
    if (!snapPoints.initialized) {
      snapPoints = self.addSnapTargetPoints(snapPoints, shape, parent, direction);
      snapPoints.initialized = true;
    }
    if (isHorizontal(direction)) {
      setSnapped(event2, "x", event2.x);
    }
    if (isVertical(direction)) {
      setSnapped(event2, "y", event2.y);
    }
    snapping.snap(event2, snapPoints);
  });
  eventBus.on(["resize.cleanup"], function() {
    snapping.hide();
  });
}
ResizeSnapping.prototype.initSnap = function(event2) {
  var context = event2.context, shape = context.shape, direction = context.direction, snapContext = context.snapContext;
  if (!snapContext) {
    snapContext = context.snapContext = new SnapContext();
  }
  var snapOrigin = getSnapOrigin(shape, direction);
  snapContext.setSnapOrigin("corner", {
    x: snapOrigin.x - event2.x,
    y: snapOrigin.y - event2.y
  });
  return snapContext;
};
ResizeSnapping.prototype.addSnapTargetPoints = function(snapPoints, shape, target, direction) {
  var snapTargets = this.getSnapTargets(shape, target);
  forEach(snapTargets, function(snapTarget) {
    snapPoints.add("corner", bottomRight(snapTarget));
    snapPoints.add("corner", topLeft(snapTarget));
  });
  snapPoints.add("corner", getSnapOrigin(shape, direction));
  return snapPoints;
};
ResizeSnapping.$inject = [
  "eventBus",
  "snapping"
];
ResizeSnapping.prototype.getSnapTargets = function(shape, target) {
  return getChildren2(target).filter(function(child) {
    return !isAttached(child, shape) && !isConnection(child) && !isHidden2(child) && !isLabel(child);
  });
};
function getSnapOrigin(shape, direction) {
  var mid3 = getMid(shape), trbl = asTRBL(shape);
  var snapOrigin = {
    x: mid3.x,
    y: mid3.y
  };
  if (direction.indexOf("n") !== -1) {
    snapOrigin.y = trbl.top;
  } else if (direction.indexOf("s") !== -1) {
    snapOrigin.y = trbl.bottom;
  }
  if (direction.indexOf("e") !== -1) {
    snapOrigin.x = trbl.right;
  } else if (direction.indexOf("w") !== -1) {
    snapOrigin.x = trbl.left;
  }
  return snapOrigin;
}
function isAttached(element, host) {
  return element.host === host;
}
function isHidden2(element) {
  return !!element.hidden;
}
function isHorizontal(direction) {
  return direction === "n" || direction === "s";
}
function isVertical(direction) {
  return direction === "e" || direction === "w";
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/snapping/Snapping.js
var SNAP_TOLERANCE = 7;
var SNAP_LINE_HIDE_DELAY = 1e3;
function Snapping(canvas) {
  this._canvas = canvas;
  this._asyncHide = debounce(bind(this.hide, this), SNAP_LINE_HIDE_DELAY);
}
Snapping.$inject = ["canvas"];
Snapping.prototype.snap = function(event2, snapPoints) {
  var context = event2.context, snapContext = context.snapContext, snapLocations = snapContext.getSnapLocations();
  var snapping = {
    x: isSnapped(event2, "x"),
    y: isSnapped(event2, "y")
  };
  forEach(snapLocations, function(location) {
    var snapOrigin = snapContext.getSnapOrigin(location);
    var snapCurrent = {
      x: event2.x + snapOrigin.x,
      y: event2.y + snapOrigin.y
    };
    forEach(["x", "y"], function(axis) {
      var locationSnapping;
      if (!snapping[axis]) {
        locationSnapping = snapPoints.snap(snapCurrent, location, axis, SNAP_TOLERANCE);
        if (locationSnapping !== void 0) {
          snapping[axis] = {
            value: locationSnapping,
            originValue: locationSnapping - snapOrigin[axis]
          };
        }
      }
    });
    if (snapping.x && snapping.y) {
      return false;
    }
  });
  this.showSnapLine("vertical", snapping.x && snapping.x.value);
  this.showSnapLine("horizontal", snapping.y && snapping.y.value);
  forEach(["x", "y"], function(axis) {
    var axisSnapping = snapping[axis];
    if (isObject(axisSnapping)) {
      setSnapped(event2, axis, axisSnapping.originValue);
    }
  });
};
Snapping.prototype._createLine = function(orientation) {
  var root = this._canvas.getLayer("snap");
  var line = create("path");
  attr(line, { d: "M0,0 L0,0" });
  classes(line).add("djs-snap-line");
  append(root, line);
  return {
    update: function(position) {
      if (!isNumber(position)) {
        attr(line, { display: "none" });
      } else {
        if (orientation === "horizontal") {
          attr(line, {
            d: "M-100000," + position + " L+100000," + position,
            display: ""
          });
        } else {
          attr(line, {
            d: "M " + position + ",-100000 L " + position + ", +100000",
            display: ""
          });
        }
      }
    }
  };
};
Snapping.prototype._createSnapLines = function() {
  this._snapLines = {
    horizontal: this._createLine("horizontal"),
    vertical: this._createLine("vertical")
  };
};
Snapping.prototype.showSnapLine = function(orientation, position) {
  var line = this.getSnapLine(orientation);
  if (line) {
    line.update(position);
  }
  this._asyncHide();
};
Snapping.prototype.getSnapLine = function(orientation) {
  if (!this._snapLines) {
    this._createSnapLines();
  }
  return this._snapLines[orientation];
};
Snapping.prototype.hide = function() {
  forEach(this._snapLines, function(snapLine) {
    snapLine.update();
  });
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/snapping/index.js
var snapping_default = {
  __init__: [
    "createMoveSnapping",
    "resizeSnapping",
    "snapping"
  ],
  createMoveSnapping: ["type", CreateMoveSnapping],
  resizeSnapping: ["type", ResizeSnapping],
  snapping: ["type", Snapping]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/command/CommandInterceptor.js
var DEFAULT_PRIORITY3 = 1e3;
function CommandInterceptor(eventBus) {
  this._eventBus = eventBus;
}
CommandInterceptor.$inject = ["eventBus"];
function unwrapEvent(fn, that) {
  return function(event2) {
    return fn.call(that || null, event2.context, event2.command, event2);
  };
}
CommandInterceptor.prototype.on = function(events, hook, priority, handlerFn, unwrap, that) {
  if (isFunction(hook) || isNumber(hook)) {
    that = unwrap;
    unwrap = handlerFn;
    handlerFn = priority;
    priority = hook;
    hook = null;
  }
  if (isFunction(priority)) {
    that = unwrap;
    unwrap = handlerFn;
    handlerFn = priority;
    priority = DEFAULT_PRIORITY3;
  }
  if (isObject(unwrap)) {
    that = unwrap;
    unwrap = false;
  }
  if (!isFunction(handlerFn)) {
    throw new Error("handlerFn must be a function");
  }
  if (!isArray2(events)) {
    events = [events];
  }
  var eventBus = this._eventBus;
  forEach(events, function(event2) {
    var fullEvent = ["commandStack", event2, hook].filter(function(e2) {
      return e2;
    }).join(".");
    eventBus.on(fullEvent, priority, unwrap ? unwrapEvent(handlerFn, that) : handlerFn, that);
  });
};
CommandInterceptor.prototype.canExecute = createHook("canExecute");
CommandInterceptor.prototype.preExecute = createHook("preExecute");
CommandInterceptor.prototype.preExecuted = createHook("preExecuted");
CommandInterceptor.prototype.execute = createHook("execute");
CommandInterceptor.prototype.executed = createHook("executed");
CommandInterceptor.prototype.postExecute = createHook("postExecute");
CommandInterceptor.prototype.postExecuted = createHook("postExecuted");
CommandInterceptor.prototype.revert = createHook("revert");
CommandInterceptor.prototype.reverted = createHook("reverted");
function createHook(hook) {
  const hookFn = function(events, priority, handlerFn, unwrap, that) {
    if (isFunction(events) || isNumber(events)) {
      that = unwrap;
      unwrap = handlerFn;
      handlerFn = priority;
      priority = events;
      events = null;
    }
    this.on(events, hook, priority, handlerFn, unwrap, that);
  };
  return hookFn;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/grid-snapping/behavior/ResizeBehavior.js
function ResizeBehavior(eventBus, gridSnapping) {
  CommandInterceptor.call(this, eventBus);
  this._gridSnapping = gridSnapping;
  var self = this;
  this.preExecute("shape.resize", function(event2) {
    var context = event2.context, hints = context.hints || {}, autoResize = hints.autoResize;
    if (!autoResize) {
      return;
    }
    var shape = context.shape, newBounds = context.newBounds;
    if (isString(autoResize)) {
      context.newBounds = self.snapComplex(newBounds, autoResize);
    } else {
      context.newBounds = self.snapSimple(shape, newBounds);
    }
  });
}
ResizeBehavior.$inject = [
  "eventBus",
  "gridSnapping",
  "modeling"
];
e(ResizeBehavior, CommandInterceptor);
ResizeBehavior.prototype.snapSimple = function(shape, newBounds) {
  var gridSnapping = this._gridSnapping;
  newBounds.width = gridSnapping.snapValue(newBounds.width, {
    min: newBounds.width
  });
  newBounds.height = gridSnapping.snapValue(newBounds.height, {
    min: newBounds.height
  });
  newBounds.x = shape.x + shape.width / 2 - newBounds.width / 2;
  newBounds.y = shape.y + shape.height / 2 - newBounds.height / 2;
  return newBounds;
};
ResizeBehavior.prototype.snapComplex = function(newBounds, directions2) {
  if (/w|e/.test(directions2)) {
    newBounds = this.snapHorizontally(newBounds, directions2);
  }
  if (/n|s/.test(directions2)) {
    newBounds = this.snapVertically(newBounds, directions2);
  }
  return newBounds;
};
ResizeBehavior.prototype.snapHorizontally = function(newBounds, directions2) {
  var gridSnapping = this._gridSnapping, west = /w/.test(directions2), east = /e/.test(directions2);
  var snappedNewBounds = {};
  snappedNewBounds.width = gridSnapping.snapValue(newBounds.width, {
    min: newBounds.width
  });
  if (east) {
    if (west) {
      snappedNewBounds.x = gridSnapping.snapValue(newBounds.x, {
        max: newBounds.x
      });
      snappedNewBounds.width += gridSnapping.snapValue(newBounds.x - snappedNewBounds.x, {
        min: newBounds.x - snappedNewBounds.x
      });
    } else {
      newBounds.x = newBounds.x + newBounds.width - snappedNewBounds.width;
    }
  }
  assign(newBounds, snappedNewBounds);
  return newBounds;
};
ResizeBehavior.prototype.snapVertically = function(newBounds, directions2) {
  var gridSnapping = this._gridSnapping, north = /n/.test(directions2), south = /s/.test(directions2);
  var snappedNewBounds = {};
  snappedNewBounds.height = gridSnapping.snapValue(newBounds.height, {
    min: newBounds.height
  });
  if (north) {
    if (south) {
      snappedNewBounds.y = gridSnapping.snapValue(newBounds.y, {
        max: newBounds.y
      });
      snappedNewBounds.height += gridSnapping.snapValue(newBounds.y - snappedNewBounds.y, {
        min: newBounds.y - snappedNewBounds.y
      });
    } else {
      newBounds.y = newBounds.y + newBounds.height - snappedNewBounds.height;
    }
  }
  assign(newBounds, snappedNewBounds);
  return newBounds;
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/grid-snapping/behavior/SpaceToolBehavior.js
var HIGH_PRIORITY6 = 2e3;
function SpaceToolBehavior(eventBus, gridSnapping) {
  eventBus.on([
    "spaceTool.move",
    "spaceTool.end"
  ], HIGH_PRIORITY6, function(event2) {
    var context = event2.context;
    if (!context.initialized) {
      return;
    }
    var axis = context.axis;
    var snapped;
    if (axis === "x") {
      snapped = gridSnapping.snapValue(event2.dx);
      event2.x = event2.x + snapped - event2.dx;
      event2.dx = snapped;
    } else {
      snapped = gridSnapping.snapValue(event2.dy);
      event2.y = event2.y + snapped - event2.dy;
      event2.dy = snapped;
    }
  });
}
SpaceToolBehavior.$inject = [
  "eventBus",
  "gridSnapping"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/grid-snapping/behavior/index.js
var behavior_default = {
  __init__: [
    "gridSnappingResizeBehavior",
    "gridSnappingSpaceToolBehavior"
  ],
  gridSnappingResizeBehavior: ["type", ResizeBehavior],
  gridSnappingSpaceToolBehavior: ["type", SpaceToolBehavior]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/grid-snapping/GridUtil.js
var SPACING = 10;
function quantize(value, quantum, fn) {
  if (!fn) {
    fn = "round";
  }
  return Math[fn](value / quantum) * quantum;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/grid-snapping/GridSnapping.js
var LOWER_PRIORITY = 1200;
var LOW_PRIORITY9 = 800;
function GridSnapping(elementRegistry, eventBus, config) {
  var active = !config || config.active !== false;
  this._eventBus = eventBus;
  var self = this;
  eventBus.on("diagram.init", LOW_PRIORITY9, function() {
    self.setActive(active);
  });
  eventBus.on([
    "create.move",
    "create.end",
    "bendpoint.move.move",
    "bendpoint.move.end",
    "connect.move",
    "connect.end",
    "connectionSegment.move.move",
    "connectionSegment.move.end",
    "resize.move",
    "resize.end",
    "shape.move.move",
    "shape.move.end"
  ], LOWER_PRIORITY, function(event2) {
    var originalEvent = event2.originalEvent;
    if (!self.active || originalEvent && isCmd(originalEvent)) {
      return;
    }
    var context = event2.context, gridSnappingContext = context.gridSnappingContext;
    if (!gridSnappingContext) {
      gridSnappingContext = context.gridSnappingContext = {};
    }
    ["x", "y"].forEach(function(axis) {
      var options = {};
      var snapOffset = getSnapOffset(event2, axis, elementRegistry);
      if (snapOffset) {
        options.offset = snapOffset;
      }
      var snapConstraints = getSnapConstraints(event2, axis);
      if (snapConstraints) {
        assign(options, snapConstraints);
      }
      if (!isSnapped(event2, axis)) {
        self.snapEvent(event2, axis, options);
      }
    });
  });
}
GridSnapping.prototype.snapEvent = function(event2, axis, options) {
  var snappedValue = this.snapValue(event2[axis], options);
  setSnapped(event2, axis, snappedValue);
};
GridSnapping.prototype.getGridSpacing = function() {
  return SPACING;
};
GridSnapping.prototype.snapValue = function(value, options) {
  var offset = 0;
  if (options && options.offset) {
    offset = options.offset;
  }
  value += offset;
  value = quantize(value, SPACING);
  var min2, max3;
  if (options && options.min) {
    min2 = options.min;
    if (isNumber(min2)) {
      min2 = quantize(min2 + offset, SPACING, "ceil");
      value = Math.max(value, min2);
    }
  }
  if (options && options.max) {
    max3 = options.max;
    if (isNumber(max3)) {
      max3 = quantize(max3 + offset, SPACING, "floor");
      value = Math.min(value, max3);
    }
  }
  value -= offset;
  return value;
};
GridSnapping.prototype.isActive = function() {
  return this.active;
};
GridSnapping.prototype.setActive = function(active) {
  this.active = active;
  this._eventBus.fire("gridSnapping.toggle", { active });
};
GridSnapping.prototype.toggleActive = function() {
  this.setActive(!this.active);
};
GridSnapping.$inject = [
  "elementRegistry",
  "eventBus",
  "config.gridSnapping"
];
function getSnapConstraints(event2, axis) {
  var context = event2.context, createConstraints = context.createConstraints, resizeConstraints = context.resizeConstraints || {}, gridSnappingContext = context.gridSnappingContext, snapConstraints = gridSnappingContext.snapConstraints;
  if (snapConstraints && snapConstraints[axis]) {
    return snapConstraints[axis];
  }
  if (!snapConstraints) {
    snapConstraints = gridSnappingContext.snapConstraints = {};
  }
  if (!snapConstraints[axis]) {
    snapConstraints[axis] = {};
  }
  var direction = context.direction;
  if (createConstraints) {
    if (isHorizontal2(axis)) {
      snapConstraints.x.min = createConstraints.left;
      snapConstraints.x.max = createConstraints.right;
    } else {
      snapConstraints.y.min = createConstraints.top;
      snapConstraints.y.max = createConstraints.bottom;
    }
  }
  var minResizeConstraints = resizeConstraints.min, maxResizeConstraints = resizeConstraints.max;
  if (minResizeConstraints) {
    if (isHorizontal2(axis)) {
      if (isWest(direction)) {
        snapConstraints.x.max = minResizeConstraints.left;
      } else {
        snapConstraints.x.min = minResizeConstraints.right;
      }
    } else {
      if (isNorth(direction)) {
        snapConstraints.y.max = minResizeConstraints.top;
      } else {
        snapConstraints.y.min = minResizeConstraints.bottom;
      }
    }
  }
  if (maxResizeConstraints) {
    if (isHorizontal2(axis)) {
      if (isWest(direction)) {
        snapConstraints.x.min = maxResizeConstraints.left;
      } else {
        snapConstraints.x.max = maxResizeConstraints.right;
      }
    } else {
      if (isNorth(direction)) {
        snapConstraints.y.min = maxResizeConstraints.top;
      } else {
        snapConstraints.y.max = maxResizeConstraints.bottom;
      }
    }
  }
  return snapConstraints[axis];
}
function getSnapOffset(event2, axis, elementRegistry) {
  var context = event2.context, shape = event2.shape, gridSnappingContext = context.gridSnappingContext, snapLocation = gridSnappingContext.snapLocation, snapOffset = gridSnappingContext.snapOffset;
  if (snapOffset && isNumber(snapOffset[axis])) {
    return snapOffset[axis];
  }
  if (!snapOffset) {
    snapOffset = gridSnappingContext.snapOffset = {};
  }
  if (!isNumber(snapOffset[axis])) {
    snapOffset[axis] = 0;
  }
  if (!shape) {
    return snapOffset[axis];
  }
  if (!elementRegistry.get(shape.id)) {
    if (isHorizontal2(axis)) {
      snapOffset[axis] += shape[axis] + shape.width / 2;
    } else {
      snapOffset[axis] += shape[axis] + shape.height / 2;
    }
  }
  if (!snapLocation) {
    return snapOffset[axis];
  }
  if (axis === "x") {
    if (/left/.test(snapLocation)) {
      snapOffset[axis] -= shape.width / 2;
    } else if (/right/.test(snapLocation)) {
      snapOffset[axis] += shape.width / 2;
    }
  } else {
    if (/top/.test(snapLocation)) {
      snapOffset[axis] -= shape.height / 2;
    } else if (/bottom/.test(snapLocation)) {
      snapOffset[axis] += shape.height / 2;
    }
  }
  return snapOffset[axis];
}
function isHorizontal2(axis) {
  return axis === "x";
}
function isNorth(direction) {
  return direction.indexOf("n") !== -1;
}
function isWest(direction) {
  return direction.indexOf("w") !== -1;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/grid-snapping/index.js
var grid_snapping_default = {
  __depends__: [behavior_default],
  __init__: ["gridSnapping"],
  gridSnapping: ["type", GridSnapping]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/keyboard/Keyboard.js
var KEYDOWN_EVENT = "keyboard.keydown";
var KEYUP_EVENT = "keyboard.keyup";
var DEFAULT_PRIORITY4 = 1e3;
var compatMessage = "Keyboard binding is now implicit; explicit binding to an element got removed. For more information, see https://github.com/bpmn-io/diagram-js/issues/661";
function Keyboard(config, eventBus) {
  var self = this;
  this._config = config = config || {};
  this._eventBus = eventBus;
  this._keydownHandler = this._keydownHandler.bind(this);
  this._keyupHandler = this._keyupHandler.bind(this);
  eventBus.on("diagram.destroy", function() {
    self._fire("destroy");
    self.unbind();
  });
  if (config.bindTo) {
    console.error("unsupported configuration <keyboard.bindTo>", new Error(compatMessage));
  }
  var bind3 = config && config.bind !== false;
  eventBus.on("canvas.init", function(event2) {
    self._target = event2.svg;
    if (bind3) {
      self.bind();
    }
    self._fire("init");
  });
}
Keyboard.$inject = [
  "config.keyboard",
  "eventBus"
];
Keyboard.prototype._keydownHandler = function(event2) {
  this._keyHandler(event2, KEYDOWN_EVENT);
};
Keyboard.prototype._keyupHandler = function(event2) {
  this._keyHandler(event2, KEYUP_EVENT);
};
Keyboard.prototype._keyHandler = function(event2, type) {
  var eventBusResult;
  if (this._isEventIgnored(event2)) {
    return;
  }
  var context = {
    keyEvent: event2
  };
  eventBusResult = this._eventBus.fire(type || KEYDOWN_EVENT, context);
  if (eventBusResult) {
    event2.preventDefault();
  }
};
Keyboard.prototype._isEventIgnored = function(event2) {
  return false;
};
Keyboard.prototype.bind = function(node2) {
  if (node2) {
    console.error("unsupported argument <node>", new Error(compatMessage));
  }
  this.unbind();
  node2 = this._node = this._target;
  event.bind(node2, "keydown", this._keydownHandler);
  event.bind(node2, "keyup", this._keyupHandler);
  this._fire("bind");
};
Keyboard.prototype.getBinding = function() {
  return this._node;
};
Keyboard.prototype.unbind = function() {
  var node2 = this._node;
  if (node2) {
    this._fire("unbind");
    event.unbind(node2, "keydown", this._keydownHandler);
    event.unbind(node2, "keyup", this._keyupHandler);
  }
  this._node = null;
};
Keyboard.prototype._fire = function(event2) {
  this._eventBus.fire("keyboard." + event2, { node: this._node });
};
Keyboard.prototype.addListener = function(priority, listener, type) {
  if (isFunction(priority)) {
    type = listener;
    listener = priority;
    priority = DEFAULT_PRIORITY4;
  }
  this._eventBus.on(type || KEYDOWN_EVENT, priority, listener);
};
Keyboard.prototype.removeListener = function(listener, type) {
  this._eventBus.off(type || KEYDOWN_EVENT, listener);
};
Keyboard.prototype.hasModifier = hasModifier;
Keyboard.prototype.isCmd = isCmd;
Keyboard.prototype.isShift = isShift;
Keyboard.prototype.isKey = isKey;

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/keyboard/KeyboardBindings.js
var LOW_PRIORITY10 = 500;
function KeyboardBindings(eventBus, keyboard) {
  var self = this;
  eventBus.on("editorActions.init", LOW_PRIORITY10, function(event2) {
    var editorActions = event2.editorActions;
    self.registerBindings(keyboard, editorActions);
  });
}
KeyboardBindings.$inject = [
  "eventBus",
  "keyboard"
];
KeyboardBindings.prototype.registerBindings = function(keyboard, editorActions) {
  function addListener(action, fn) {
    if (editorActions.isRegistered(action)) {
      keyboard.addListener(fn);
    }
  }
  addListener("undo", function(context) {
    var event2 = context.keyEvent;
    if (isUndo(event2)) {
      editorActions.trigger("undo");
      return true;
    }
  });
  addListener("redo", function(context) {
    var event2 = context.keyEvent;
    if (isRedo(event2)) {
      editorActions.trigger("redo");
      return true;
    }
  });
  addListener("copy", function(context) {
    var event2 = context.keyEvent;
    if (isCopy(event2)) {
      editorActions.trigger("copy");
      return true;
    }
  });
  addListener("paste", function(context) {
    var event2 = context.keyEvent;
    if (isPaste(event2)) {
      editorActions.trigger("paste");
      return true;
    }
  });
  addListener("duplicate", function(context) {
    var event2 = context.keyEvent;
    if (isDuplicate(event2)) {
      editorActions.trigger("duplicate");
      return true;
    }
  });
  addListener("cut", function(context) {
    var event2 = context.keyEvent;
    if (isCut(event2)) {
      editorActions.trigger("cut");
      return true;
    }
  });
  addListener("stepZoom", function(context) {
    var event2 = context.keyEvent;
    if (isKey(["+", "="], event2) && isCmd(event2)) {
      editorActions.trigger("stepZoom", { value: 1 });
      return true;
    }
  });
  addListener("stepZoom", function(context) {
    var event2 = context.keyEvent;
    if (isKey("-", event2) && isCmd(event2)) {
      editorActions.trigger("stepZoom", { value: -1 });
      return true;
    }
  });
  addListener("zoom", function(context) {
    var event2 = context.keyEvent;
    if (isKey("0", event2) && isCmd(event2)) {
      editorActions.trigger("zoom", { value: 1 });
      return true;
    }
  });
  addListener("removeSelection", function(context) {
    var event2 = context.keyEvent;
    if (isKey(["Backspace", "Delete"], event2)) {
      editorActions.trigger("removeSelection");
      return true;
    }
  });
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/keyboard/index.js
var keyboard_default = {
  __init__: ["keyboard", "keyboardBindings"],
  keyboard: ["type", Keyboard],
  keyboardBindings: ["type", KeyboardBindings]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/keyboard-move-selection/KeyboardMoveSelection.js
var DEFAULT_CONFIG = {
  moveSpeed: 1,
  moveSpeedAccelerated: 10
};
var HIGHER_PRIORITY3 = 1500;
var LEFT = "left";
var UP = "up";
var RIGHT = "right";
var DOWN = "down";
var KEY_TO_DIRECTION = {
  ArrowLeft: LEFT,
  ArrowUp: UP,
  ArrowRight: RIGHT,
  ArrowDown: DOWN
};
var DIRECTIONS_DELTA = {
  left: function(speed) {
    return {
      x: -speed,
      y: 0
    };
  },
  up: function(speed) {
    return {
      x: 0,
      y: -speed
    };
  },
  right: function(speed) {
    return {
      x: speed,
      y: 0
    };
  },
  down: function(speed) {
    return {
      x: 0,
      y: speed
    };
  }
};
function KeyboardMoveSelection(config, keyboard, modeling, rules, selection) {
  var self = this;
  this._config = assign({}, DEFAULT_CONFIG, config || {});
  keyboard.addListener(HIGHER_PRIORITY3, function(event2) {
    var keyEvent = event2.keyEvent;
    var direction = KEY_TO_DIRECTION[keyEvent.key];
    if (!direction) {
      return;
    }
    if (keyboard.isCmd(keyEvent)) {
      return;
    }
    var accelerated = keyboard.isShift(keyEvent);
    self.moveSelection(direction, accelerated);
    return true;
  });
  this.moveSelection = function(direction, accelerated) {
    var selectedElements = selection.get();
    if (!selectedElements.length) {
      return;
    }
    var speed = this._config[accelerated ? "moveSpeedAccelerated" : "moveSpeed"];
    var delta2 = DIRECTIONS_DELTA[direction](speed);
    var canMove = rules.allowed("elements.move", {
      shapes: selectedElements,
      hints: {
        keyboardMove: true
      }
    });
    if (canMove) {
      modeling.moveElements(selectedElements, delta2);
    }
  };
}
KeyboardMoveSelection.$inject = [
  "config.keyboardMoveSelection",
  "keyboard",
  "modeling",
  "rules",
  "selection"
];

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/keyboard-move-selection/index.js
var keyboard_move_selection_default = {
  __depends__: [
    keyboard_default,
    selection_default
  ],
  __init__: [
    "keyboardMoveSelection"
  ],
  keyboardMoveSelection: ["type", KeyboardMoveSelection]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/overlays/Overlays.js
var ids = new IdGenerator("ov");
var LOW_PRIORITY11 = 500;
function Overlays(config, eventBus, canvas, elementRegistry) {
  this._eventBus = eventBus;
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._ids = ids;
  this._overlayDefaults = assign({
    // no show constraints
    show: null,
    // always scale
    scale: true
  }, config && config.defaults);
  this._overlays = {};
  this._overlayContainers = [];
  this._overlayRoot = createRoot(canvas.getContainer());
  this._init();
}
Overlays.$inject = [
  "config.overlays",
  "eventBus",
  "canvas",
  "elementRegistry"
];
Overlays.prototype.get = function(search) {
  if (isString(search)) {
    search = { id: search };
  }
  if (isString(search.element)) {
    search.element = this._elementRegistry.get(search.element);
  }
  if (search.element) {
    var container = this._getOverlayContainer(search.element, true);
    if (container) {
      return search.type ? filter(container.overlays, matchPattern({ type: search.type })) : container.overlays.slice();
    } else {
      return [];
    }
  } else if (search.type) {
    return filter(this._overlays, matchPattern({ type: search.type }));
  } else {
    return search.id ? this._overlays[search.id] : null;
  }
};
Overlays.prototype.add = function(element, type, overlay) {
  if (isObject(type)) {
    overlay = type;
    type = null;
  }
  if (!element.id) {
    element = this._elementRegistry.get(element);
  }
  if (!overlay.position) {
    throw new Error("must specifiy overlay position");
  }
  if (!overlay.html) {
    throw new Error("must specifiy overlay html");
  }
  if (!element) {
    throw new Error("invalid element specified");
  }
  var id = this._ids.next();
  overlay = assign({}, this._overlayDefaults, overlay, {
    id,
    type,
    element,
    html: overlay.html
  });
  this._addOverlay(overlay);
  return id;
};
Overlays.prototype.remove = function(filter2) {
  var overlays = this.get(filter2) || [];
  if (!isArray2(overlays)) {
    overlays = [overlays];
  }
  var self = this;
  forEach(overlays, function(overlay) {
    var container = self._getOverlayContainer(overlay.element, true);
    if (overlay) {
      remove2(overlay.html);
      remove2(overlay.htmlContainer);
      delete overlay.htmlContainer;
      delete overlay.element;
      delete self._overlays[overlay.id];
    }
    if (container) {
      var idx = container.overlays.indexOf(overlay);
      if (idx !== -1) {
        container.overlays.splice(idx, 1);
      }
    }
  });
};
Overlays.prototype.isShown = function() {
  return this._overlayRoot.style.display !== "none";
};
Overlays.prototype.show = function() {
  setVisible(this._overlayRoot);
};
Overlays.prototype.hide = function() {
  setVisible(this._overlayRoot, false);
};
Overlays.prototype.clear = function() {
  this._overlays = {};
  this._overlayContainers = [];
  clear2(this._overlayRoot);
};
Overlays.prototype._updateOverlayContainer = function(container) {
  var element = container.element, html = container.html;
  var x = element.x, y = element.y;
  if (element.waypoints) {
    var bbox = getBBox(element);
    x = bbox.x;
    y = bbox.y;
  }
  setPosition(html, x, y);
  attr2(container.html, "data-container-id", element.id);
};
Overlays.prototype._updateOverlay = function(overlay) {
  var position = overlay.position, htmlContainer = overlay.htmlContainer, element = overlay.element;
  var left = position.left, top = position.top;
  if (position.right !== void 0) {
    var width;
    if (element.waypoints) {
      width = getBBox(element).width;
    } else {
      width = element.width;
    }
    left = position.right * -1 + width;
  }
  if (position.bottom !== void 0) {
    var height;
    if (element.waypoints) {
      height = getBBox(element).height;
    } else {
      height = element.height;
    }
    top = position.bottom * -1 + height;
  }
  setPosition(htmlContainer, left || 0, top || 0);
  this._updateOverlayVisibilty(overlay, this._canvas.viewbox());
};
Overlays.prototype._createOverlayContainer = function(element) {
  var html = domify('<div class="djs-overlays" />');
  assign2(html, { position: "absolute" });
  this._overlayRoot.appendChild(html);
  var container = {
    html,
    element,
    overlays: []
  };
  this._updateOverlayContainer(container);
  this._overlayContainers.push(container);
  return container;
};
Overlays.prototype._updateRoot = function(viewbox) {
  var scale = viewbox.scale || 1;
  var matrix = "matrix(" + [
    scale,
    0,
    0,
    scale,
    -1 * viewbox.x * scale,
    -1 * viewbox.y * scale
  ].join(",") + ")";
  setTransform(this._overlayRoot, matrix);
};
Overlays.prototype._getOverlayContainer = function(element, raw) {
  var container = find(this._overlayContainers, function(c) {
    return c.element === element;
  });
  if (!container && !raw) {
    return this._createOverlayContainer(element);
  }
  return container;
};
Overlays.prototype._addOverlay = function(overlay) {
  var id = overlay.id, element = overlay.element, html = overlay.html, htmlContainer, overlayContainer;
  if (html.get && html.constructor.prototype.jquery) {
    html = html.get(0);
  }
  if (isString(html)) {
    html = domify(html);
  }
  overlayContainer = this._getOverlayContainer(element);
  htmlContainer = domify('<div class="djs-overlay" data-overlay-id="' + id + '">');
  assign2(htmlContainer, { position: "absolute" });
  htmlContainer.appendChild(html);
  if (overlay.type) {
    classes2(htmlContainer).add("djs-overlay-" + overlay.type);
  }
  var elementRoot = this._canvas.findRoot(element);
  var activeRoot = this._canvas.getRootElement();
  setVisible(htmlContainer, elementRoot === activeRoot);
  overlay.htmlContainer = htmlContainer;
  overlayContainer.overlays.push(overlay);
  overlayContainer.html.appendChild(htmlContainer);
  this._overlays[id] = overlay;
  this._updateOverlay(overlay);
  this._updateOverlayVisibilty(overlay, this._canvas.viewbox());
};
Overlays.prototype._updateOverlayVisibilty = function(overlay, viewbox) {
  var show = overlay.show, rootElement = this._canvas.findRoot(overlay.element), minZoom = show && show.minZoom, maxZoom = show && show.maxZoom, htmlContainer = overlay.htmlContainer, activeRootElement = this._canvas.getRootElement(), visible = true;
  if (rootElement !== activeRootElement) {
    visible = false;
  } else if (show) {
    if (isDefined(minZoom) && minZoom > viewbox.scale || isDefined(maxZoom) && maxZoom < viewbox.scale) {
      visible = false;
    }
  }
  setVisible(htmlContainer, visible);
  this._updateOverlayScale(overlay, viewbox);
};
Overlays.prototype._updateOverlayScale = function(overlay, viewbox) {
  var shouldScale = overlay.scale, minScale, maxScale, htmlContainer = overlay.htmlContainer;
  var scale, transform3 = "";
  if (shouldScale !== true) {
    if (shouldScale === false) {
      minScale = 1;
      maxScale = 1;
    } else {
      minScale = shouldScale.min;
      maxScale = shouldScale.max;
    }
    if (isDefined(minScale) && viewbox.scale < minScale) {
      scale = (1 / viewbox.scale || 1) * minScale;
    }
    if (isDefined(maxScale) && viewbox.scale > maxScale) {
      scale = (1 / viewbox.scale || 1) * maxScale;
    }
  }
  if (isDefined(scale)) {
    transform3 = "scale(" + scale + "," + scale + ")";
  }
  setTransform(htmlContainer, transform3);
};
Overlays.prototype._updateOverlaysVisibilty = function(viewbox) {
  var self = this;
  forEach(this._overlays, function(overlay) {
    self._updateOverlayVisibilty(overlay, viewbox);
  });
};
Overlays.prototype._init = function() {
  var eventBus = this._eventBus;
  var self = this;
  function updateViewbox(viewbox) {
    self._updateRoot(viewbox);
    self._updateOverlaysVisibilty(viewbox);
    self.show();
  }
  eventBus.on("canvas.viewbox.changing", function(event2) {
    self.hide();
  });
  eventBus.on("canvas.viewbox.changed", function(event2) {
    updateViewbox(event2.viewbox);
  });
  eventBus.on(["shape.remove", "connection.remove"], function(e2) {
    var element = e2.element;
    var overlays = self.get({ element });
    forEach(overlays, function(o) {
      self.remove(o.id);
    });
    var container = self._getOverlayContainer(element);
    if (container) {
      remove2(container.html);
      var i = self._overlayContainers.indexOf(container);
      if (i !== -1) {
        self._overlayContainers.splice(i, 1);
      }
    }
  });
  eventBus.on("element.changed", LOW_PRIORITY11, function(e2) {
    var element = e2.element;
    var container = self._getOverlayContainer(element, true);
    if (container) {
      forEach(container.overlays, function(overlay) {
        self._updateOverlay(overlay);
      });
      self._updateOverlayContainer(container);
    }
  });
  eventBus.on("element.marker.update", function(e2) {
    var container = self._getOverlayContainer(e2.element, true);
    if (container) {
      classes2(container.html)[e2.add ? "add" : "remove"](e2.marker);
    }
  });
  eventBus.on("root.set", function() {
    self._updateOverlaysVisibilty(self._canvas.viewbox());
  });
  eventBus.on("diagram.clear", this.clear, this);
};
function createRoot(parentNode) {
  var root = domify(
    '<div class="djs-overlay-container" />'
  );
  assign2(root, {
    position: "absolute",
    width: 0,
    height: 0
  });
  parentNode.insertBefore(root, parentNode.firstChild);
  return root;
}
function setPosition(el, x, y) {
  assign2(el, { left: x + "px", top: y + "px" });
}
function setVisible(el, visible) {
  el.style.display = visible === false ? "none" : "";
}
function setTransform(el, transform3) {
  el.style["transform-origin"] = "top left";
  ["", "-ms-", "-webkit-"].forEach(function(prefix) {
    el.style[prefix + "transform"] = transform3;
  });
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/overlays/index.js
var overlays_default = {
  __init__: ["overlays"],
  overlays: ["type", Overlays]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/scheduler/Scheduler.js
var Ids = new IdGenerator();
function Scheduler(eventBus) {
  this._scheduled = {};
  eventBus.on("diagram.destroy", () => {
    Object.keys(this._scheduled).forEach((id) => {
      this.cancel(id);
    });
  });
}
Scheduler.$inject = ["eventBus"];
Scheduler.prototype.schedule = function(taskFn, id = Ids.next()) {
  this.cancel(id);
  const newScheduled = this._schedule(taskFn, id);
  this._scheduled[id] = newScheduled;
  return newScheduled.promise;
};
Scheduler.prototype._schedule = function(taskFn, id) {
  const deferred = defer();
  const executionId = setTimeout(() => {
    try {
      this._scheduled[id] = null;
      try {
        deferred.resolve(taskFn());
      } catch (error) {
        deferred.reject(error);
      }
    } catch (error) {
      console.error("Scheduler#_schedule execution failed", error);
    }
  });
  return {
    executionId,
    promise: deferred.promise
  };
};
Scheduler.prototype.cancel = function(id) {
  const scheduled = this._scheduled[id];
  if (scheduled) {
    this._cancel(scheduled);
    this._scheduled[id] = null;
  }
};
Scheduler.prototype._cancel = function(scheduled) {
  clearTimeout(scheduled.executionId);
};
function defer() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/scheduler/index.js
var scheduler_default = {
  scheduler: ["type", Scheduler]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/context-pad/ContextPad.js
var MARKER_HIDDEN = "djs-element-hidden";
var entrySelector = ".entry";
var DEFAULT_PRIORITY5 = 1e3;
var CONTEXT_PAD_MARGIN = 8;
var HOVER_DELAY = 300;
function ContextPad(canvas, elementRegistry, eventBus, scheduler) {
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._eventBus = eventBus;
  this._scheduler = scheduler;
  this._current = null;
  this._init();
}
ContextPad.$inject = [
  "canvas",
  "elementRegistry",
  "eventBus",
  "scheduler"
];
ContextPad.prototype._init = function() {
  var self = this;
  this._eventBus.on("selection.changed", function(event2) {
    var selection = event2.newSelection;
    var target = selection.length ? selection.length === 1 ? selection[0] : selection : null;
    if (target) {
      self.open(target, true);
    } else {
      self.close();
    }
  });
  this._eventBus.on("elements.changed", function(event2) {
    var elements = event2.elements, current = self._current;
    if (!current) {
      return;
    }
    var target = current.target;
    var targets = isArray2(target) ? target : [target];
    var targetsChanged = targets.filter(function(element) {
      return elements.includes(element);
    });
    if (targetsChanged.length) {
      self.close();
      var targetsNew = targets.filter(function(element) {
        return self._elementRegistry.get(element.id);
      });
      if (targetsNew.length) {
        self._updateAndOpen(targetsNew.length > 1 ? targetsNew : targetsNew[0]);
      }
    }
  });
  this._eventBus.on("canvas.viewbox.changed", function() {
    self._updatePosition();
  });
  this._eventBus.on("element.marker.update", function(event2) {
    if (!self.isOpen()) {
      return;
    }
    var element = event2.element;
    var current = self._current;
    var targets = isArray2(current.target) ? current.target : [current.target];
    if (!targets.includes(element)) {
      return;
    }
    self._updateVisibility();
  });
  this._container = this._createContainer();
};
ContextPad.prototype._createContainer = function() {
  var container = domify('<div class="djs-context-pad-parent"></div>');
  this._canvas.getContainer().appendChild(container);
  return container;
};
ContextPad.prototype.registerProvider = function(priority, provider) {
  if (!provider) {
    provider = priority;
    priority = DEFAULT_PRIORITY5;
  }
  this._eventBus.on("contextPad.getProviders", priority, function(event2) {
    event2.providers.push(provider);
  });
};
ContextPad.prototype.getEntries = function(target) {
  var providers = this._getProviders();
  var provideFn = isArray2(target) ? "getMultiElementContextPadEntries" : "getContextPadEntries";
  var entries = {};
  forEach(providers, function(provider) {
    if (!isFunction(provider[provideFn])) {
      return;
    }
    var entriesOrUpdater = provider[provideFn](target);
    if (isFunction(entriesOrUpdater)) {
      entries = entriesOrUpdater(entries);
    } else {
      forEach(entriesOrUpdater, function(entry, id) {
        entries[id] = entry;
      });
    }
  });
  return entries;
};
ContextPad.prototype.trigger = function(action, event2, autoActivate) {
  var self = this;
  var entry, originalEvent, button = event2.delegateTarget || event2.target;
  if (!button) {
    return event2.preventDefault();
  }
  entry = attr2(button, "data-action");
  originalEvent = event2.originalEvent || event2;
  if (action === "mouseover") {
    this._timeout = setTimeout(function() {
      self._mouseout = self.triggerEntry(entry, "hover", originalEvent, autoActivate);
    }, HOVER_DELAY);
    return;
  } else if (action === "mouseout") {
    clearTimeout(this._timeout);
    if (this._mouseout) {
      this._mouseout();
      this._mouseout = null;
    }
    return;
  }
  return this.triggerEntry(entry, action, originalEvent, autoActivate);
};
ContextPad.prototype.triggerEntry = function(entryId, action, event2, autoActivate) {
  if (!this.isShown()) {
    return;
  }
  var target = this._current.target, entries = this._current.entries;
  var entry = entries[entryId];
  if (!entry) {
    return;
  }
  var handler = entry.action;
  if (this._eventBus.fire("contextPad.trigger", { entry, event: event2 }) === false) {
    return;
  }
  if (isFunction(handler)) {
    if (action === "click") {
      return handler(event2, target, autoActivate);
    }
  } else {
    if (handler[action]) {
      return handler[action](event2, target, autoActivate);
    }
  }
  event2.preventDefault();
};
ContextPad.prototype.open = function(target, force) {
  if (!force && this.isOpen(target)) {
    return;
  }
  var allowed = this._eventBus.fire("contextPad.open.allowed", { target });
  if (allowed === false) {
    return;
  }
  this.close();
  this._updateAndOpen(target);
};
ContextPad.prototype._getProviders = function() {
  var event2 = this._eventBus.createEvent({
    type: "contextPad.getProviders",
    providers: []
  });
  this._eventBus.fire(event2);
  return event2.providers;
};
ContextPad.prototype._updateAndOpen = function(target) {
  var entries = this.getEntries(target), html = this._createHtml(target), image;
  forEach(entries, function(entry, id) {
    var grouping = entry.group || "default", control = domify(entry.html || '<div class="entry" draggable="true"></div>'), container;
    attr2(control, "data-action", id);
    container = query("[data-group=" + escapeCSS(grouping) + "]", html);
    if (!container) {
      container = domify('<div class="group"></div>');
      attr2(container, "data-group", grouping);
      html.appendChild(container);
    }
    container.appendChild(control);
    if (entry.className) {
      addClasses(control, entry.className);
    }
    if (entry.title) {
      attr2(control, "title", entry.title);
    }
    if (entry.imageUrl) {
      image = domify("<img>");
      attr2(image, "src", entry.imageUrl);
      image.style.width = "100%";
      image.style.height = "100%";
      control.appendChild(image);
    }
  });
  classes2(html).add("open");
  this._current = {
    entries,
    html,
    target
  };
  this._updatePosition();
  this._updateVisibility();
  this._eventBus.fire("contextPad.open", { current: this._current });
};
ContextPad.prototype._createHtml = function(target) {
  var self = this;
  var html = domify('<div class="djs-context-pad"></div>');
  delegate.bind(html, entrySelector, "click", function(event2) {
    self.trigger("click", event2);
  });
  delegate.bind(html, entrySelector, "dragstart", function(event2) {
    self.trigger("dragstart", event2);
  });
  delegate.bind(html, entrySelector, "mouseover", function(event2) {
    self.trigger("mouseover", event2);
  });
  delegate.bind(html, entrySelector, "mouseout", function(event2) {
    self.trigger("mouseout", event2);
  });
  event.bind(html, "mousedown", function(event2) {
    event2.stopPropagation();
  });
  this._container.appendChild(html);
  this._eventBus.fire("contextPad.create", {
    target,
    pad: html
  });
  return html;
};
ContextPad.prototype.getPad = function(target) {
  console.warn(new Error("ContextPad#getPad is deprecated and will be removed in future library versions, cf. https://github.com/bpmn-io/diagram-js/pull/888"));
  let html;
  if (this.isOpen() && targetsEqual(this._current.target, target)) {
    html = this._current.html;
  } else {
    html = this._createHtml(target);
  }
  return { html };
};
ContextPad.prototype.close = function() {
  if (!this.isOpen()) {
    return;
  }
  clearTimeout(this._timeout);
  this._container.innerHTML = "";
  this._eventBus.fire("contextPad.close", { current: this._current });
  this._current = null;
};
ContextPad.prototype.isOpen = function(target) {
  var current = this._current;
  if (!current) {
    return false;
  }
  if (!target) {
    return true;
  }
  var currentTarget = current.target;
  if (isArray2(target) !== isArray2(currentTarget)) {
    return false;
  }
  if (isArray2(target)) {
    return target.length === currentTarget.length && every(target, function(element) {
      return currentTarget.includes(element);
    });
  } else {
    return currentTarget === target;
  }
};
ContextPad.prototype.isShown = function() {
  return this.isOpen() && classes2(this._current.html).has("open");
};
ContextPad.prototype.show = function() {
  if (!this.isOpen()) {
    return;
  }
  classes2(this._current.html).add("open");
  this._updatePosition();
  this._eventBus.fire("contextPad.show", { current: this._current });
};
ContextPad.prototype.hide = function() {
  if (!this.isOpen()) {
    return;
  }
  classes2(this._current.html).remove("open");
  this._eventBus.fire("contextPad.hide", { current: this._current });
};
ContextPad.prototype._getPosition = function(target) {
  if (!isArray2(target) && isConnection(target)) {
    var viewbox = this._canvas.viewbox();
    var lastWaypoint = getLastWaypoint(target);
    var x = lastWaypoint.x * viewbox.scale - viewbox.x * viewbox.scale, y = lastWaypoint.y * viewbox.scale - viewbox.y * viewbox.scale;
    return {
      left: x + CONTEXT_PAD_MARGIN * this._canvas.zoom(),
      top: y
    };
  }
  var container = this._canvas.getContainer();
  var containerBounds = container.getBoundingClientRect();
  var targetBounds = this._getTargetBounds(target);
  return {
    left: targetBounds.right - containerBounds.left + CONTEXT_PAD_MARGIN * this._canvas.zoom(),
    top: targetBounds.top - containerBounds.top
  };
};
ContextPad.prototype._updatePosition = function() {
  const updateFn = () => {
    if (!this.isOpen()) {
      return;
    }
    var html = this._current.html;
    var position = this._getPosition(this._current.target);
    if ("x" in position && "y" in position) {
      html.style.left = position.x + "px";
      html.style.top = position.y + "px";
    } else {
      [
        "top",
        "right",
        "bottom",
        "left"
      ].forEach(function(key) {
        if (key in position) {
          html.style[key] = position[key] + "px";
        }
      });
    }
  };
  this._scheduler.schedule(updateFn, "ContextPad#_updatePosition");
};
ContextPad.prototype._updateVisibility = function() {
  const updateFn = () => {
    if (!this.isOpen()) {
      return;
    }
    var self = this;
    var target = this._current.target;
    var targets = isArray2(target) ? target : [target];
    var isHidden3 = targets.some(function(target2) {
      return self._canvas.hasMarker(target2, MARKER_HIDDEN);
    });
    if (isHidden3) {
      self.hide();
    } else {
      self.show();
    }
  };
  this._scheduler.schedule(updateFn, "ContextPad#_updateVisibility");
};
ContextPad.prototype._getTargetBounds = function(target) {
  var self = this;
  var elements = isArray2(target) ? target : [target];
  var elementsGfx = elements.map(function(element) {
    return self._canvas.getGraphics(element);
  });
  return elementsGfx.reduce(function(bounds, elementGfx) {
    const elementBounds = elementGfx.getBoundingClientRect();
    bounds.top = Math.min(bounds.top, elementBounds.top);
    bounds.right = Math.max(bounds.right, elementBounds.right);
    bounds.bottom = Math.max(bounds.bottom, elementBounds.bottom);
    bounds.left = Math.min(bounds.left, elementBounds.left);
    bounds.x = bounds.left;
    bounds.y = bounds.top;
    bounds.width = bounds.right - bounds.left;
    bounds.height = bounds.bottom - bounds.top;
    return bounds;
  }, {
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
    left: Infinity
  });
};
function addClasses(element, classNames) {
  var classes3 = classes2(element);
  classNames = isArray2(classNames) ? classNames : classNames.split(/\s+/g);
  classNames.forEach(function(cls) {
    classes3.add(cls);
  });
}
function getLastWaypoint(connection) {
  return connection.waypoints[connection.waypoints.length - 1];
}
function targetsEqual(target, otherTarget) {
  target = isArray2(target) ? target : [target];
  otherTarget = isArray2(otherTarget) ? otherTarget : [otherTarget];
  return target.length === otherTarget.length && every(target, function(element) {
    return otherTarget.includes(element);
  });
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/context-pad/index.js
var context_pad_default = {
  __depends__: [
    interaction_events_default,
    scheduler_default,
    overlays_default
  ],
  contextPad: ["type", ContextPad]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/util/Math.js
function log10(x) {
  return Math.log(x) / Math.log(10);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/navigation/zoomscroll/ZoomUtil.js
function getStepSize(range, steps) {
  var minLinearRange = log10(range.min), maxLinearRange = log10(range.max);
  var absoluteLinearRange = Math.abs(minLinearRange) + Math.abs(maxLinearRange);
  return absoluteLinearRange / steps;
}
function cap(range, scale) {
  return Math.max(range.min, Math.min(range.max, scale));
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/navigation/zoomscroll/ZoomScroll.js
var sign = Math.sign || function(n) {
  return n >= 0 ? 1 : -1;
};
var RANGE = { min: 0.2, max: 4 };
var NUM_STEPS = 10;
var DELTA_THRESHOLD = 0.1;
var DEFAULT_SCALE = 0.75;
function ZoomScroll(config, eventBus, canvas) {
  config = config || {};
  this._enabled = false;
  this._canvas = canvas;
  this._container = canvas._container;
  this._handleWheel = bind(this._handleWheel, this);
  this._totalDelta = 0;
  this._scale = config.scale || DEFAULT_SCALE;
  var self = this;
  eventBus.on("canvas.mouseover", function() {
    self._init(config.enabled !== false);
  });
  eventBus.on("canvas.mouseout", function() {
    self._init(false);
  });
}
ZoomScroll.$inject = [
  "config.zoomScroll",
  "eventBus",
  "canvas"
];
ZoomScroll.prototype.scroll = function scroll(delta2) {
  this._canvas.scroll(delta2);
};
ZoomScroll.prototype.reset = function reset() {
  this._canvas.zoom("fit-viewport");
};
ZoomScroll.prototype.zoom = function zoom(delta2, position) {
  var stepSize = getStepSize(RANGE, NUM_STEPS * 2);
  this._totalDelta += delta2;
  if (Math.abs(this._totalDelta) > DELTA_THRESHOLD) {
    this._zoom(delta2, position, stepSize);
    this._totalDelta = 0;
  }
};
ZoomScroll.prototype._handleWheel = function handleWheel(event2) {
  if (!this._enabled) {
    return;
  }
  var element = this._container;
  event2.preventDefault();
  var isZoom = event2.ctrlKey || isMac() && event2.metaKey;
  var isHorizontalScroll = event2.shiftKey;
  var factor = -1 * this._scale, delta2;
  if (isZoom) {
    factor *= event2.deltaMode === 0 ? 0.02 : 0.32;
  } else {
    factor *= event2.deltaMode === 0 ? 1 : 16;
  }
  if (isZoom) {
    var elementRect = element.getBoundingClientRect();
    var offset = {
      x: event2.clientX - elementRect.left,
      y: event2.clientY - elementRect.top
    };
    delta2 = Math.sqrt(
      Math.pow(event2.deltaY, 2) + Math.pow(event2.deltaX, 2)
    ) * sign(event2.deltaY) * factor;
    this.zoom(delta2, offset);
  } else {
    if (isHorizontalScroll) {
      delta2 = {
        dx: factor * event2.deltaY,
        dy: 0
      };
    } else {
      delta2 = {
        dx: factor * event2.deltaX,
        dy: factor * event2.deltaY
      };
    }
    this.scroll(delta2);
  }
};
ZoomScroll.prototype.stepZoom = function stepZoom(delta2, position) {
  var stepSize = getStepSize(RANGE, NUM_STEPS);
  this._zoom(delta2, position, stepSize);
};
ZoomScroll.prototype._zoom = function(delta2, position, stepSize) {
  var canvas = this._canvas;
  var direction = delta2 > 0 ? 1 : -1;
  var currentLinearZoomLevel = log10(canvas.zoom());
  var newLinearZoomLevel = Math.round(currentLinearZoomLevel / stepSize) * stepSize;
  newLinearZoomLevel += stepSize * direction;
  var newLogZoomLevel = Math.pow(10, newLinearZoomLevel);
  canvas.zoom(cap(RANGE, newLogZoomLevel), position);
};
ZoomScroll.prototype.toggle = function toggle(newEnabled) {
  var element = this._container;
  var handleWheel2 = this._handleWheel;
  var oldEnabled = this._enabled;
  if (typeof newEnabled === "undefined") {
    newEnabled = !oldEnabled;
  }
  if (oldEnabled !== newEnabled) {
    event[newEnabled ? "bind" : "unbind"](element, "wheel", handleWheel2, false);
  }
  this._enabled = newEnabled;
  return newEnabled;
};
ZoomScroll.prototype._init = function(newEnabled) {
  this.toggle(newEnabled);
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/navigation/zoomscroll/index.js
var zoomscroll_default = {
  __init__: ["zoomScroll"],
  zoomScroll: ["type", ZoomScroll]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/navigation/movecanvas/MoveCanvas.js
var THRESHOLD = 15;
function MoveCanvas(eventBus, canvas) {
  var context;
  function handleMousedown(event2) {
    return handleStart(event2.originalEvent);
  }
  eventBus.on("canvas.focus.changed", function(event2) {
    if (event2.focused) {
      eventBus.on("element.mousedown", 500, handleMousedown);
    } else {
      eventBus.off("element.mousedown", handleMousedown);
    }
  });
  eventBus.on("diagram.destroy", function() {
    if (context) {
      handleEnd();
    }
  });
  function handleMove(event2) {
    var start = context.start, button = context.button, position = toPoint(event2), delta2 = delta(position, start);
    if (!context.dragging && length(delta2) > THRESHOLD) {
      context.dragging = true;
      if (button === 0) {
        install(eventBus);
      }
      set("grab");
    }
    if (context.dragging) {
      var lastPosition = context.last || context.start;
      delta2 = delta(position, lastPosition);
      canvas.scroll({
        dx: delta2.x,
        dy: delta2.y
      });
      context.last = position;
    }
    event2.preventDefault();
  }
  function handleEnd(event2) {
    event.unbind(document, "mousemove", handleMove);
    event.unbind(document, "mouseup", handleEnd);
    context = null;
    unset();
  }
  function handleStart(event2) {
    if (closest(event2.target, ".djs-draggable")) {
      return;
    }
    var button = event2.button;
    if (button >= 2 || event2.ctrlKey || event2.shiftKey || event2.altKey) {
      return;
    }
    context = {
      button,
      start: toPoint(event2)
    };
    event.bind(document, "mousemove", handleMove);
    event.bind(document, "mouseup", handleEnd);
    return true;
  }
  this.isActive = function() {
    return !!context;
  };
}
MoveCanvas.$inject = [
  "eventBus",
  "canvas"
];
function length(point) {
  return Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/navigation/movecanvas/index.js
var movecanvas_default = {
  __init__: ["moveCanvas"],
  moveCanvas: ["type", MoveCanvas]
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/features/rules/RuleProvider.js
function RuleProvider(eventBus) {
  CommandInterceptor.call(this, eventBus);
  this.init();
}
RuleProvider.$inject = ["eventBus"];
e(RuleProvider, CommandInterceptor);
RuleProvider.prototype.addRule = function(actions, priority, fn) {
  var self = this;
  if (typeof actions === "string") {
    actions = [actions];
  }
  actions.forEach(function(action) {
    self.canExecute(action, priority, function(context, action2, event2) {
      return fn(context);
    }, true);
  });
};
RuleProvider.prototype.init = function() {
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/node_modules/diagram-js/lib/layout/ManhattanLayout.js
var MIN_SEGMENT_LENGTH = 20;
var POINT_ORIENTATION_PADDING = 5;
var round10 = Math.round;
var INTERSECTION_THRESHOLD2 = 20;
var ORIENTATION_THRESHOLD = {
  "h:h": 20,
  "v:v": 20,
  "h:v": -10,
  "v:h": -10
};
function needsTurn(orientation, startDirection) {
  return !{
    t: /top/,
    r: /right/,
    b: /bottom/,
    l: /left/,
    h: /./,
    v: /./
  }[startDirection].test(orientation);
}
function canLayoutStraight(direction, targetOrientation) {
  return {
    t: /top/,
    r: /right/,
    b: /bottom/,
    l: /left/,
    h: /left|right/,
    v: /top|bottom/
  }[direction].test(targetOrientation);
}
function getSegmentBendpoints(a, b, directions2) {
  var orientation = getOrientation(b, a, POINT_ORIENTATION_PADDING);
  var startDirection = directions2.split(":")[0];
  var xmid = round10((b.x - a.x) / 2 + a.x), ymid = round10((b.y - a.y) / 2 + a.y);
  var segmentEnd, segmentDirections;
  var layoutStraight = canLayoutStraight(startDirection, orientation), layoutHorizontal = /h|r|l/.test(startDirection), layoutTurn = false;
  var turnNextDirections = false;
  if (layoutStraight) {
    segmentEnd = layoutHorizontal ? { x: xmid, y: a.y } : { x: a.x, y: ymid };
    segmentDirections = layoutHorizontal ? "h:h" : "v:v";
  } else {
    layoutTurn = needsTurn(orientation, startDirection);
    segmentDirections = layoutHorizontal ? "h:v" : "v:h";
    if (layoutTurn) {
      if (layoutHorizontal) {
        turnNextDirections = ymid === a.y;
        segmentEnd = {
          x: a.x + MIN_SEGMENT_LENGTH * (/l/.test(startDirection) ? -1 : 1),
          y: turnNextDirections ? ymid + MIN_SEGMENT_LENGTH : ymid
        };
      } else {
        turnNextDirections = xmid === a.x;
        segmentEnd = {
          x: turnNextDirections ? xmid + MIN_SEGMENT_LENGTH : xmid,
          y: a.y + MIN_SEGMENT_LENGTH * (/t/.test(startDirection) ? -1 : 1)
        };
      }
    } else {
      segmentEnd = {
        x: xmid,
        y: ymid
      };
    }
  }
  return {
    waypoints: getBendpoints(a, segmentEnd, segmentDirections).concat(segmentEnd),
    directions: segmentDirections,
    turnNextDirections
  };
}
function getStartSegment(a, b, directions2) {
  return getSegmentBendpoints(a, b, directions2);
}
function getEndSegment(a, b, directions2) {
  var invertedSegment = getSegmentBendpoints(b, a, invertDirections(directions2));
  return {
    waypoints: invertedSegment.waypoints.slice().reverse(),
    directions: invertDirections(invertedSegment.directions),
    turnNextDirections: invertedSegment.turnNextDirections
  };
}
function getMidSegment(startSegment, endSegment) {
  var startDirection = startSegment.directions.split(":")[1], endDirection = endSegment.directions.split(":")[0];
  if (startSegment.turnNextDirections) {
    startDirection = startDirection == "h" ? "v" : "h";
  }
  if (endSegment.turnNextDirections) {
    endDirection = endDirection == "h" ? "v" : "h";
  }
  var directions2 = startDirection + ":" + endDirection;
  var bendpoints = getBendpoints(
    startSegment.waypoints[startSegment.waypoints.length - 1],
    endSegment.waypoints[0],
    directions2
  );
  return {
    waypoints: bendpoints,
    directions: directions2
  };
}
function invertDirections(directions2) {
  return directions2.split(":").reverse().join(":");
}
function getSimpleBendpoints(a, b, directions2) {
  var xmid = round10((b.x - a.x) / 2 + a.x), ymid = round10((b.y - a.y) / 2 + a.y);
  if (directions2 === "h:v") {
    return [{ x: b.x, y: a.y }];
  }
  if (directions2 === "v:h") {
    return [{ x: a.x, y: b.y }];
  }
  if (directions2 === "h:h") {
    return [
      { x: xmid, y: a.y },
      { x: xmid, y: b.y }
    ];
  }
  if (directions2 === "v:v") {
    return [
      { x: a.x, y: ymid },
      { x: b.x, y: ymid }
    ];
  }
  throw new Error("invalid directions: can only handle varians of [hv]:[hv]");
}
function getBendpoints(a, b, directions2) {
  directions2 = directions2 || "h:h";
  if (!isValidDirections(directions2)) {
    throw new Error(
      "unknown directions: <" + directions2 + ">: must be specified as <start>:<end> with start/end in { h,v,t,r,b,l }"
    );
  }
  if (isExplicitDirections(directions2)) {
    var startSegment = getStartSegment(a, b, directions2), endSegment = getEndSegment(a, b, directions2), midSegment = getMidSegment(startSegment, endSegment);
    return [].concat(
      startSegment.waypoints,
      midSegment.waypoints,
      endSegment.waypoints
    );
  }
  return getSimpleBendpoints(a, b, directions2);
}
function connectPoints(a, b, directions2) {
  var points = getBendpoints(a, b, directions2);
  points.unshift(a);
  points.push(b);
  return withoutRedundantPoints(points);
}
function connectRectangles(source, target, start, end, hints) {
  var preferredLayouts = hints && hints.preferredLayouts || [];
  var preferredLayout = without(preferredLayouts, "straight")[0] || "h:h";
  var threshold = ORIENTATION_THRESHOLD[preferredLayout] || 0;
  var orientation = getOrientation(source, target, threshold);
  var directions2 = getDirections(orientation, preferredLayout);
  start = start || getMid(source);
  end = end || getMid(target);
  var directionSplit = directions2.split(":");
  var startDocking = getDockingPoint(start, source, directionSplit[0], invertOrientation(orientation)), endDocking = getDockingPoint(end, target, directionSplit[1], orientation);
  return connectPoints(startDocking, endDocking, directions2);
}
function repairConnection(source, target, start, end, waypoints, hints) {
  if (isArray2(start)) {
    waypoints = start;
    hints = end;
    start = getMid(source);
    end = getMid(target);
  }
  hints = assign({ preferredLayouts: [] }, hints);
  waypoints = waypoints || [];
  var preferredLayouts = hints.preferredLayouts, preferStraight = preferredLayouts.indexOf("straight") !== -1, repairedWaypoints;
  repairedWaypoints = preferStraight && tryLayoutStraight(source, target, start, end, hints);
  if (repairedWaypoints) {
    return repairedWaypoints;
  }
  repairedWaypoints = hints.connectionEnd && tryRepairConnectionEnd(target, source, end, waypoints);
  if (repairedWaypoints) {
    return repairedWaypoints;
  }
  repairedWaypoints = hints.connectionStart && tryRepairConnectionStart(source, target, start, waypoints);
  if (repairedWaypoints) {
    return repairedWaypoints;
  }
  if (!hints.connectionStart && !hints.connectionEnd && waypoints && waypoints.length) {
    return waypoints;
  }
  return connectRectangles(source, target, start, end, hints);
}
function inRange(a, start, end) {
  return a >= start && a <= end;
}
function isInRange(axis, a, b) {
  var size2 = {
    x: "width",
    y: "height"
  };
  return inRange(a[axis], b[axis], b[axis] + b[size2[axis]]);
}
function tryLayoutStraight(source, target, start, end, hints) {
  var axis = {}, primaryAxis, orientation;
  orientation = getOrientation(source, target);
  if (!/^(top|bottom|left|right)$/.test(orientation)) {
    return null;
  }
  if (/top|bottom/.test(orientation)) {
    primaryAxis = "x";
  }
  if (/left|right/.test(orientation)) {
    primaryAxis = "y";
  }
  if (hints.preserveDocking === "target") {
    if (!isInRange(primaryAxis, end, source)) {
      return null;
    }
    axis[primaryAxis] = end[primaryAxis];
    return [
      {
        x: axis.x !== void 0 ? axis.x : start.x,
        y: axis.y !== void 0 ? axis.y : start.y,
        original: {
          x: axis.x !== void 0 ? axis.x : start.x,
          y: axis.y !== void 0 ? axis.y : start.y
        }
      },
      {
        x: end.x,
        y: end.y
      }
    ];
  } else {
    if (!isInRange(primaryAxis, start, target)) {
      return null;
    }
    axis[primaryAxis] = start[primaryAxis];
    return [
      {
        x: start.x,
        y: start.y
      },
      {
        x: axis.x !== void 0 ? axis.x : end.x,
        y: axis.y !== void 0 ? axis.y : end.y,
        original: {
          x: axis.x !== void 0 ? axis.x : end.x,
          y: axis.y !== void 0 ? axis.y : end.y
        }
      }
    ];
  }
}
function tryRepairConnectionStart(moved, other, newDocking, points) {
  return _tryRepairConnectionSide(moved, other, newDocking, points);
}
function tryRepairConnectionEnd(moved, other, newDocking, points) {
  var waypoints = points.slice().reverse();
  waypoints = _tryRepairConnectionSide(moved, other, newDocking, waypoints);
  return waypoints ? waypoints.reverse() : null;
}
function _tryRepairConnectionSide(moved, other, newDocking, points) {
  function needsRelayout(points2) {
    if (points2.length < 3) {
      return true;
    }
    if (points2.length > 4) {
      return false;
    }
    return !!find(points2, function(p, idx) {
      var q = points2[idx - 1];
      return q && pointDistance(p, q) < 3;
    });
  }
  function repairBendpoint(candidate, oldPeer, newPeer) {
    var alignment = pointsAligned(oldPeer, candidate);
    switch (alignment) {
      case "v":
        return { x: newPeer.x, y: candidate.y };
      case "h":
        return { x: candidate.x, y: newPeer.y };
    }
    return { x: candidate.x, y: candidate.y };
  }
  function removeOverlapping(points2, a, b) {
    var i;
    for (i = points2.length - 2; i !== 0; i--) {
      if (pointInRect(points2[i], a, INTERSECTION_THRESHOLD2) || pointInRect(points2[i], b, INTERSECTION_THRESHOLD2)) {
        return points2.slice(i);
      }
    }
    return points2;
  }
  if (needsRelayout(points)) {
    return null;
  }
  var oldDocking = points[0], newPoints = points.slice(), slicedPoints;
  newPoints[0] = newDocking;
  newPoints[1] = repairBendpoint(newPoints[1], oldDocking, newDocking);
  slicedPoints = removeOverlapping(newPoints, moved, other);
  if (slicedPoints !== newPoints) {
    newPoints = _tryRepairConnectionSide(moved, other, newDocking, slicedPoints);
  }
  if (newPoints && pointsAligned(newPoints)) {
    return null;
  }
  return newPoints;
}
function getDirections(orientation, defaultLayout) {
  if (isExplicitDirections(defaultLayout)) {
    return defaultLayout;
  }
  switch (orientation) {
    case "intersect":
      return "t:t";
    case "top":
    case "bottom":
      return "v:v";
    case "left":
    case "right":
      return "h:h";
    // 'top-left'
    // 'top-right'
    // 'bottom-left'
    // 'bottom-right'
    default:
      return defaultLayout;
  }
}
function isValidDirections(directions2) {
  return directions2 && /^h|v|t|r|b|l:h|v|t|r|b|l$/.test(directions2);
}
function isExplicitDirections(directions2) {
  return directions2 && /t|r|b|l/.test(directions2);
}
function invertOrientation(orientation) {
  return {
    "top": "bottom",
    "bottom": "top",
    "left": "right",
    "right": "left",
    "top-left": "bottom-right",
    "bottom-right": "top-left",
    "top-right": "bottom-left",
    "bottom-left": "top-right"
  }[orientation];
}
function getDockingPoint(point, rectangle, dockingDirection, targetOrientation) {
  if (dockingDirection === "h") {
    dockingDirection = /left/.test(targetOrientation) ? "l" : "r";
  }
  if (dockingDirection === "v") {
    dockingDirection = /top/.test(targetOrientation) ? "t" : "b";
  }
  if (dockingDirection === "t") {
    return { original: point, x: point.x, y: rectangle.y };
  }
  if (dockingDirection === "r") {
    return { original: point, x: rectangle.x + rectangle.width, y: point.y };
  }
  if (dockingDirection === "b") {
    return { original: point, x: point.x, y: rectangle.y + rectangle.height };
  }
  if (dockingDirection === "l") {
    return { original: point, x: rectangle.x, y: point.y };
  }
  throw new Error("unexpected dockingDirection: <" + dockingDirection + ">");
}
function withoutRedundantPoints(waypoints) {
  return waypoints.reduce(function(points, p, idx) {
    var previous = points[points.length - 1], next = waypoints[idx + 1];
    if (!pointsOnLine(previous, next, p, 0)) {
      points.push(p);
    }
    return points;
  }, []);
}

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/entry.js
var THEMES = {
  slate: {
    fill: "#ffffff",
    headerFill: "#f1f5f9",
    stroke: "#475569",
    badgeText: "#475569",
    titleText: "#0f172a"
  },
  blue: {
    fill: "#ffffff",
    headerFill: "#eff6ff",
    stroke: "#2563eb",
    badgeText: "#1d4ed8",
    titleText: "#0f172a"
  },
  emerald: {
    fill: "#ffffff",
    headerFill: "#ecfdf5",
    stroke: "#059669",
    badgeText: "#047857",
    titleText: "#0f172a"
  },
  amber: {
    fill: "#ffffff",
    headerFill: "#fffbeb",
    stroke: "#d97706",
    badgeText: "#b45309",
    titleText: "#0f172a"
  },
  rose: {
    fill: "#ffffff",
    headerFill: "#fff1f2",
    stroke: "#C21057",
    badgeText: "#C21057",
    titleText: "#0f172a"
  }
};
var FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
function ensureMarkerDefs(svgRoot) {
  if (!svgRoot) return;
  let defs = svgRoot.querySelector("defs");
  if (!defs) {
    defs = create("defs");
    append(svgRoot, defs);
  }
  if (!defs.querySelector("#cq-arrow-end")) {
    const marker = create("marker");
    attr(marker, {
      id: "cq-arrow-end",
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "6.5",
      markerHeight: "6.5",
      orient: "auto-start-reverse"
    });
    const path = create("path");
    attr(path, {
      d: "M 0 1.5 L 8.5 5 L 0 8.5 z",
      fill: "#475569"
    });
    append(marker, path);
    append(defs, marker);
  }
}
function wrapLines(text, maxCharsPerLine = 20) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    if ((current + " " + words[i]).length <= maxCharsPerLine) {
      current += " " + words[i];
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, 3);
}
var CloudQubesRenderer = class extends BaseRenderer {
  constructor(eventBus, canvas) {
    super(eventBus, 1500);
    this._canvas = canvas;
  }
  canRender(element) {
    return !element.labelTarget;
  }
  drawShape(parentGfx, element) {
    ensureMarkerDefs(this._canvas.getContainer().querySelector("svg"));
    const w = element.width || 168;
    const h = element.height || 76;
    const shapeType = element.shapeType || "service";
    const theme = THEMES[element.theme] || THEMES.slate;
    const label = element.nodeTitle !== void 0 ? element.nodeTitle : "Service";
    const subtitle = element.subtitle !== void 0 ? element.subtitle : "";
    if (shapeType === "group") {
      const rect = create("rect");
      attr(rect, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        rx: 14,
        ry: 14,
        fill: "rgba(248, 250, 252, 0.55)",
        stroke: theme.stroke,
        "stroke-width": 1.75,
        "stroke-dasharray": "7 5"
      });
      append(parentGfx, rect);
      const badgeW = Math.min(w - 20, Math.max(90, label.length * 7.5 + 24));
      const badgeRect = create("rect");
      attr(badgeRect, {
        x: 12,
        y: 10,
        width: badgeW,
        height: 24,
        rx: 6,
        ry: 6,
        fill: theme.headerFill,
        stroke: theme.stroke,
        "stroke-width": 1
      });
      append(parentGfx, badgeRect);
      const titleEl = create("text");
      attr(titleEl, {
        x: 22,
        y: 26,
        fill: theme.titleText,
        "font-family": FONT_STACK,
        "font-size": "11px",
        "font-weight": "700"
      });
      titleEl.textContent = label;
      append(parentGfx, titleEl);
      return rect;
    }
    if (shapeType === "database") {
      const ry = 11;
      const bodyPath = create("path");
      const d = [
        `M 0 ${ry}`,
        `L 0 ${h - ry}`,
        `A ${w / 2} ${ry} 0 0 0 ${w} ${h - ry}`,
        `L ${w} ${ry}`,
        `A ${w / 2} ${ry} 0 0 0 0 ${ry}`,
        "Z"
      ].join(" ");
      attr(bodyPath, {
        d,
        fill: theme.fill,
        stroke: theme.stroke,
        "stroke-width": 2
      });
      append(parentGfx, bodyPath);
      const topEllipse = create("ellipse");
      attr(topEllipse, {
        cx: w / 2,
        cy: ry,
        rx: w / 2,
        ry,
        fill: theme.headerFill,
        stroke: theme.stroke,
        "stroke-width": 2
      });
      append(parentGfx, topEllipse);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 8);
      return bodyPath;
    }
    if (shapeType === "queue") {
      const rx = 12;
      const bodyPath = create("path");
      const d = [
        `M ${rx} 0`,
        `L ${w - rx} 0`,
        `A ${rx} ${h / 2} 0 0 1 ${w - rx} ${h}`,
        `L ${rx} ${h}`,
        `A ${rx} ${h / 2} 0 0 1 ${rx} 0`,
        "Z"
      ].join(" ");
      attr(bodyPath, {
        d,
        fill: theme.fill,
        stroke: theme.stroke,
        "stroke-width": 2
      });
      append(parentGfx, bodyPath);
      const rightCap = create("ellipse");
      attr(rightCap, {
        cx: w - rx,
        cy: h / 2,
        rx,
        ry: h / 2,
        fill: theme.headerFill,
        stroke: theme.stroke,
        "stroke-width": 1.75
      });
      append(parentGfx, rightCap);
      this._renderTextBlock(parentGfx, w - 10, h, label, subtitle, theme, 0);
      return bodyPath;
    }
    if (shapeType === "client") {
      const r2 = Math.min(34, h / 2);
      const rect = create("rect");
      attr(rect, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        rx: r2,
        ry: r2,
        fill: theme.headerFill,
        stroke: theme.stroke,
        "stroke-width": 2
      });
      append(parentGfx, rect);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 0);
      return rect;
    }
    if (shapeType === "gateway") {
      const polygon = create("polygon");
      const pts = [
        `${w / 2},0`,
        `${w},${h / 2}`,
        `${w / 2},${h}`,
        `0,${h / 2}`
      ].join(" ");
      attr(polygon, {
        points: pts,
        fill: theme.headerFill,
        stroke: theme.stroke,
        "stroke-width": 2,
        "stroke-linejoin": "round"
      });
      append(parentGfx, polygon);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 0, 14);
      return polygon;
    }
    const card = create("rect");
    attr(card, {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 12,
      ry: 12,
      fill: theme.fill,
      stroke: theme.stroke,
      "stroke-width": 2
    });
    append(parentGfx, card);
    const accentStrip = create("path");
    const r = 11;
    const stripH = 22;
    const stripPath = [
      `M 1 ${stripH}`,
      `L 1 ${r}`,
      `Q 1 1 ${r} 1`,
      `L ${w - r} 1`,
      `Q ${w - 1} 1 ${w - 1} ${r}`,
      `L ${w - 1} ${stripH}`,
      "Z"
    ].join(" ");
    attr(accentStrip, {
      d: stripPath,
      fill: theme.headerFill
    });
    append(parentGfx, accentStrip);
    const divider = create("line");
    attr(divider, {
      x1: 1,
      y1: stripH,
      x2: w - 1,
      y2: stripH,
      stroke: theme.stroke,
      "stroke-width": 1,
      "stroke-opacity": 0.25
    });
    append(parentGfx, divider);
    if (subtitle) {
      const subText = create("text");
      attr(subText, {
        x: w / 2,
        y: 15,
        "text-anchor": "middle",
        fill: theme.badgeText,
        "font-family": FONT_STACK,
        "font-size": "9.5px",
        "font-weight": "700",
        "letter-spacing": "0.06em"
      });
      subText.textContent = String(subtitle).toUpperCase();
      append(parentGfx, subText);
    }
    this._renderMainLabel(parentGfx, w, h, label, theme, subtitle ? 11 : 0, 20);
    return card;
  }
  _renderTextBlock(parentGfx, w, h, label, subtitle, theme, yOffset = 0, maxChars = 19) {
    if (subtitle) {
      const subText = create("text");
      attr(subText, {
        x: w / 2,
        y: h / 2 - 8 + yOffset,
        "text-anchor": "middle",
        fill: theme.badgeText,
        "font-family": FONT_STACK,
        "font-size": "9.5px",
        "font-weight": "700",
        "letter-spacing": "0.05em"
      });
      subText.textContent = String(subtitle).toUpperCase();
      append(parentGfx, subText);
    }
    this._renderMainLabel(parentGfx, w, h, label, theme, yOffset + (subtitle ? 8 : 0), maxChars);
  }
  _renderMainLabel(parentGfx, w, h, label, theme, yShift = 0, maxChars = 20) {
    const lines = wrapLines(label, maxChars);
    const lineHeight = 15;
    const totalH = (lines.length - 1) * lineHeight;
    const startY = h / 2 + yShift - totalH / 2 + 4;
    lines.forEach((lineStr, idx) => {
      const t = create("text");
      attr(t, {
        x: w / 2,
        y: startY + idx * lineHeight,
        "text-anchor": "middle",
        fill: theme.titleText,
        "font-family": FONT_STACK,
        "font-size": "12.5px",
        "font-weight": "700"
      });
      t.textContent = lineStr;
      append(parentGfx, t);
    });
  }
  drawConnection(parentGfx, connection) {
    ensureMarkerDefs(this._canvas.getContainer().querySelector("svg"));
    const waypoints = connection.waypoints || [];
    if (waypoints.length < 2) return create("g");
    const d = this._buildRoundedPath(waypoints, 8);
    const path = create("path");
    attr(path, {
      d,
      fill: "none",
      stroke: "#475569",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "marker-end": "url(#cq-arrow-end)"
    });
    append(parentGfx, path);
    if (connection.nodeTitle && String(connection.nodeTitle).trim().length > 0) {
      const mid3 = this._getConnectionMidpoint(waypoints);
      const labelText = String(connection.nodeTitle).trim();
      const pillW = Math.max(40, labelText.length * 6.5 + 16);
      const pillH = 20;
      const bg = create("rect");
      attr(bg, {
        x: mid3.x - pillW / 2,
        y: mid3.y - pillH / 2,
        width: pillW,
        height: pillH,
        rx: 6,
        ry: 6,
        fill: "#ffffff",
        stroke: "#cbd5e1",
        "stroke-width": 1.25
      });
      append(parentGfx, bg);
      const textEl = create("text");
      attr(textEl, {
        x: mid3.x,
        y: mid3.y + 3.5,
        "text-anchor": "middle",
        fill: "#334155",
        "font-family": FONT_STACK,
        "font-size": "10.5px",
        "font-weight": "600"
      });
      textEl.textContent = labelText;
      append(parentGfx, textEl);
    }
    return path;
  }
  _buildRoundedPath(pts, radius = 8) {
    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.hypot(dx1, dy1);
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.hypot(dx2, dy2);
      const r = Math.min(radius, len1 / 2, len2 / 2);
      if (r < 1) {
        d += ` L ${curr.x} ${curr.y}`;
      } else {
        const p1x = curr.x - dx1 / len1 * r;
        const p1y = curr.y - dy1 / len1 * r;
        const p2x = curr.x + dx2 / len2 * r;
        const p2y = curr.y + dy2 / len2 * r;
        d += ` L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y}`;
      }
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }
  _getConnectionMidpoint(pts) {
    const midIdx = Math.floor((pts.length - 1) / 2);
    const a = pts[midIdx];
    const b = pts[midIdx + 1] || a;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }
  getShapePath(shape) {
    const x = shape.x || 0;
    const y = shape.y || 0;
    const width = shape.width || 168;
    const height = shape.height || 76;
    return componentsToPath([
      ["M", x, y],
      ["l", width, 0],
      ["l", 0, height],
      ["l", -width, 0],
      ["z"]
    ]);
  }
  getConnectionPath(connection) {
    const waypoints = connection.waypoints || [];
    const connectionPath = [];
    for (let idx = 0; idx < waypoints.length; idx++) {
      let point = waypoints[idx];
      point = point.original || point;
      connectionPath.push([idx === 0 ? "M" : "L", point.x, point.y]);
    }
    return componentsToPath(connectionPath);
  }
};
CloudQubesRenderer.$inject = ["eventBus", "canvas"];
var CloudQubesLayouter = class extends BaseLayouter {
  layoutConnection(connection, hints = {}) {
    const source = hints.source || connection.source;
    const target = hints.target || connection.target;
    const start = hints.connectionStart || getMid(source);
    const end = hints.connectionEnd || getMid(target);
    const waypoints = repairConnection(
      source,
      target,
      start,
      end,
      connection.waypoints,
      Object.assign({ preferredLayouts: ["h:h"] }, hints)
    );
    return waypoints;
  }
};
CloudQubesLayouter.$inject = [];
var CloudQubesRules = class extends RuleProvider {
  init() {
    this.addRule("elements.move", () => true);
    this.addRule("shape.create", () => true);
    this.addRule("shape.resize", (context) => {
      if (!context.newBounds) return true;
      return context.newBounds.width >= 90 && context.newBounds.height >= 48;
    });
    this.addRule("connection.create", (context) => {
      const { source, target } = context;
      if (!source || !target || source === target) return false;
      if (!source.parent || !target.parent) return false;
      if (source.waypoints || target.waypoints) return false;
      return true;
    });
    this.addRule("connection.reconnect", () => true);
    this.addRule("connection.updateWaypoints", () => true);
  }
};
CloudQubesRules.$inject = ["eventBus"];
var CloudQubesContextPadProvider = class {
  constructor(contextPad, connect, modeling, elementFactory, canvas, selection) {
    this._connect = connect;
    this._modeling = modeling;
    this._elementFactory = elementFactory;
    this._canvas = canvas;
    this._selection = selection;
    contextPad.registerProvider(this);
  }
  getContextPadEntries(element) {
    const connect = this._connect;
    const modeling = this._modeling;
    const elementFactory = this._elementFactory;
    const canvas = this._canvas;
    const selection = this._selection;
    const entries = {};
    if (!element.waypoints) {
      entries["connect"] = {
        group: "connect",
        className: "cq-pad-connect",
        title: "Drag or click to connect arrow to another node",
        html: '<div class="entry" title="Connect Arrow">\u2192</div>',
        action: {
          click: (event2, el) => {
            connect.start(event2, el);
          },
          dragstart: (event2, el) => {
            connect.start(event2, el);
          }
        }
      };
      entries["append"] = {
        group: "edit",
        className: "cq-pad-append",
        title: "Append connected node to the right",
        html: '<div class="entry" title="Append Connected Node">+</div>',
        action: {
          click: (_event, el) => {
            const root = canvas.getRootElement();
            const newShape = elementFactory.createShape({
              width: el.width || 168,
              height: el.height || 76,
              shapeType: el.shapeType === "group" ? "service" : el.shapeType || "service",
              nodeTitle: "New Service",
              subtitle: "Compute",
              theme: el.theme || "slate"
            });
            const pos = {
              x: el.x + (el.width || 168) + 160,
              y: el.y + (el.height || 76) / 2
            };
            const created = modeling.createShape(newShape, pos, root);
            modeling.connect(el, created, { nodeTitle: "" });
            selection.select(created);
          }
        }
      };
    }
    entries["delete"] = {
      group: "edit",
      className: "cq-pad-delete",
      title: "Delete element",
      html: '<div class="entry cq-pad-danger" title="Delete">\xD7</div>',
      action: {
        click: (_event, el) => {
          modeling.removeElements([el]);
        }
      }
    };
    return entries;
  }
};
CloudQubesContextPadProvider.$inject = [
  "contextPad",
  "connect",
  "modeling",
  "elementFactory",
  "canvas",
  "selection"
];
var CloudQubesCustomModule = {
  __init__: ["cloudQubesRenderer", "cloudQubesRules", "cloudQubesContextPadProvider"],
  cloudQubesRenderer: ["type", CloudQubesRenderer],
  cloudQubesRules: ["type", CloudQubesRules],
  cloudQubesContextPadProvider: ["type", CloudQubesContextPadProvider],
  layouter: ["type", CloudQubesLayouter]
};
var CloudQubesDiagramStudio = class {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.diagram = new Diagram({
      canvas: { container },
      modules: [
        modeling_default,
        move_default,
        selection_default,
        connect_default,
        create_default,
        bendpoints_default,
        resize_default,
        snapping_default,
        grid_snapping_default,
        keyboard_default,
        keyboard_move_selection_default,
        outline_default,
        context_pad_default,
        rules_default,
        zoomscroll_default,
        movecanvas_default,
        CloudQubesCustomModule
      ]
    });
    this.canvas = this.diagram.get("canvas");
    this.modeling = this.diagram.get("modeling");
    this.elementFactory = this.diagram.get("elementFactory");
    this.elementRegistry = this.diagram.get("elementRegistry");
    this.selection = this.diagram.get("selection");
    this.commandStack = this.diagram.get("commandStack");
    this.eventBus = this.diagram.get("eventBus");
    this.root = this.elementFactory.createRoot({ id: "cq-root" });
    this.canvas.setRootElement(this.root);
    this.pendingConnectSource = null;
    this._bindEvents();
  }
  _bindEvents() {
    this.eventBus.on("selection.changed", (e2) => {
      const selected = e2.newSelection && e2.newSelection[0] ? e2.newSelection[0] : null;
      if (this.callbacks.onSelectionChange) {
        this.callbacks.onSelectionChange(selected);
      }
    });
    this.eventBus.on("element.click", (e2) => {
      const el = e2.element;
      if (!el || el === this.root || el.waypoints) return;
      if (this.pendingConnectSource !== void 0 && this.pendingConnectSource !== false) {
        if (this.pendingConnectSource === null) {
          this.pendingConnectSource = el;
          if (this.callbacks.onConnectStep) {
            this.callbacks.onConnectStep("target", el);
          }
        } else if (this.pendingConnectSource !== el) {
          const src = this.pendingConnectSource;
          this.pendingConnectSource = false;
          const conn = this.modeling.connect(src, el, { nodeTitle: "" });
          this.selection.select(conn);
          if (this.callbacks.onConnectStep) {
            this.callbacks.onConnectStep("done", conn);
          }
        }
      }
    });
    this.eventBus.on("element.dblclick", (e2) => {
      const el = e2.element;
      if (!el || el === this.root) return;
      if (this.callbacks.onElementDoubleClick) {
        this.callbacks.onElementDoubleClick(el);
      }
    });
  }
  startTwoClickConnect() {
    this.pendingConnectSource = null;
  }
  cancelTwoClickConnect() {
    this.pendingConnectSource = false;
  }
  addNode({ shapeType = "service", label = "Service", subtitle = "Compute", theme = "slate", x, y, width, height }) {
    const isGroup = shapeType === "group";
    const isGateway = shapeType === "gateway";
    const w = width || (isGroup ? 440 : isGateway ? 156 : 172);
    const h = height || (isGroup ? 240 : isGateway ? 86 : 76);
    const existingShapes = this.elementRegistry.filter((el) => el !== this.root && !el.waypoints);
    const posX = x !== void 0 ? x : 160 + existingShapes.length % 3 * 230;
    const posY = y !== void 0 ? y : 140 + Math.floor(existingShapes.length / 3) * 135;
    const shape = this.elementFactory.createShape({
      width: w,
      height: h,
      shapeType,
      nodeTitle: label,
      subtitle,
      theme
    });
    const created = this.modeling.createShape(shape, { x: posX + w / 2, y: posY + h / 2 }, this.root);
    if (isGroup) {
      const gfx = this.canvas.getGraphics(created);
      if (gfx && gfx.parentNode) {
        gfx.parentNode.insertBefore(gfx, gfx.parentNode.firstChild);
      }
    }
    this.selection.select(created);
    return created;
  }
  connectNodes(source, target, label = "") {
    return this.modeling.connect(source, target, { nodeTitle: label });
  }
  updateElement(element, props = {}) {
    if (!element || element === this.root) return;
    if (props.label !== void 0) {
      element.nodeTitle = props.label;
    }
    if (props.subtitle !== void 0) {
      element.subtitle = props.subtitle;
    }
    if (props.theme !== void 0) {
      element.theme = props.theme;
    }
    const gfx = this.canvas.getGraphics(element);
    if (gfx) {
      const visual = gfx.querySelector(".djs-visual");
      if (visual) {
        while (visual.firstChild) visual.removeChild(visual.firstChild);
        const renderer = this.diagram.get("cloudQubesRenderer");
        if (element.waypoints) {
          renderer.drawConnection(visual, element);
        } else {
          renderer.drawShape(visual, element);
        }
      }
    }
  }
  duplicateElement(element) {
    if (!element || element === this.root || element.waypoints) return null;
    return this.addNode({
      shapeType: element.shapeType,
      label: element.nodeTitle,
      subtitle: element.subtitle,
      theme: element.theme,
      width: element.width,
      height: element.height,
      x: element.x + 36,
      y: element.y + 36
    });
  }
  deleteElement(element) {
    if (!element || element === this.root) return;
    this.modeling.removeElements([element]);
  }
  clear() {
    const all2 = this.elementRegistry.filter((el) => el !== this.root);
    if (all2.length > 0) {
      this.modeling.removeElements(all2);
    }
    this.commandStack.clear();
  }
  undo() {
    if (this.commandStack.canUndo()) this.commandStack.undo();
  }
  redo() {
    if (this.commandStack.canRedo()) this.commandStack.redo();
  }
  zoomIn() {
    const current = this.canvas.zoom();
    this.canvas.zoom(Math.min(2.5, current * 1.2));
  }
  zoomOut() {
    const current = this.canvas.zoom();
    this.canvas.zoom(Math.max(0.3, current / 1.2));
  }
  zoomFit() {
    this.canvas.zoom("fit-viewport", "auto");
  }
  loadTemplate(templateName) {
    this.clear();
    if (templateName === "blank") {
      return;
    }
    if (templateName === "event_driven") {
      const client2 = this.addNode({ shapeType: "client", label: "Producer API", subtitle: "Ingress", theme: "rose", x: 70, y: 170 });
      const bus = this.addNode({ shapeType: "queue", label: "Cloud Pub/Sub", subtitle: "Event Stream", theme: "amber", x: 310, y: 170 });
      const workerA = this.addNode({ shapeType: "service", label: "Billing Worker", subtitle: "Cloud Run", theme: "emerald", x: 565, y: 95 });
      const workerB = this.addNode({ shapeType: "service", label: "Analytics Worker", subtitle: "Dataflow", theme: "blue", x: 565, y: 245 });
      const db2 = this.addNode({ shapeType: "database", label: "BigQuery Warehouse", subtitle: "OLAP Store", theme: "blue", x: 810, y: 170 });
      this.connectNodes(client2, bus, "Publish");
      this.connectNodes(bus, workerA, "Push");
      this.connectNodes(bus, workerB, "Pull");
      this.connectNodes(workerA, db2, "Write");
      this.connectNodes(workerB, db2, "Stream");
      this.selection.select([]);
      return;
    }
    if (templateName === "rag_pipeline") {
      const user = this.addNode({ shapeType: "client", label: "User Prompt", subtitle: "Client App", theme: "rose", x: 60, y: 170 });
      const orchestrator = this.addNode({ shapeType: "service", label: "RAG Orchestrator", subtitle: "API Service", theme: "slate", x: 295, y: 170 });
      const vectorDb = this.addNode({ shapeType: "database", label: "Vector Search DB", subtitle: "Embeddings", theme: "blue", x: 545, y: 90 });
      const llm = this.addNode({ shapeType: "service", label: "Foundation LLM", subtitle: "Vertex AI", theme: "emerald", x: 545, y: 250 });
      this.connectNodes(user, orchestrator, "Query");
      this.connectNodes(orchestrator, vectorDb, "Top-K Cosine");
      this.connectNodes(orchestrator, llm, "Augmented Prompt");
      this.selection.select([]);
      return;
    }
    this.addNode({ shapeType: "group", label: "Production VPC (us-central1)", subtitle: "Boundary", theme: "slate", x: 280, y: 55, width: 515, height: 315 });
    const client = this.addNode({ shapeType: "client", label: "Web & Mobile Clients", subtitle: "External", theme: "rose", x: 55, y: 175 });
    const lb = this.addNode({ shapeType: "gateway", label: "Cloud Load Balancer", subtitle: "Gateway", theme: "emerald", x: 310, y: 170 });
    const app = this.addNode({ shapeType: "service", label: "Cloud Run API", subtitle: "Stateless Compute", theme: "slate", x: 540, y: 105 });
    const cache = this.addNode({ shapeType: "queue", label: "Memorystore Redis", subtitle: "In-Memory Cache", theme: "amber", x: 540, y: 240 });
    const db = this.addNode({ shapeType: "database", label: "Cloud SQL Primary", subtitle: "PostgreSQL HA", theme: "blue", x: 830, y: 105 });
    this.connectNodes(client, lb, "HTTPS");
    this.connectNodes(lb, app, "Route");
    this.connectNodes(app, cache, "Cache Lookup");
    this.connectNodes(app, db, "Read / Write");
    this.selection.select([]);
  }
  /**
   * Exports the current diagram as a standalone SVG string and 2x Retina PNG Blob.
   */
  async exportToPngBlob(scale = 2) {
    this.selection.select([]);
    const elements = this.elementRegistry.filter((el) => el !== this.root);
    if (elements.length === 0) {
      throw new Error("Canvas is empty. Add at least one shape before exporting.");
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      if (el.waypoints) {
        el.waypoints.forEach((pt) => {
          minX = Math.min(minX, pt.x - 40);
          minY = Math.min(minY, pt.y - 24);
          maxX = Math.max(maxX, pt.x + 40);
          maxY = Math.max(maxY, pt.y + 24);
        });
      } else {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 160));
        maxY = Math.max(maxY, el.y + (el.height || 76));
      }
    });
    const pad = 36;
    const boxX = Math.floor(minX - pad);
    const boxY = Math.floor(minY - pad);
    const boxW = Math.ceil(maxX - minX + pad * 2);
    const boxH = Math.ceil(maxY - minY + pad * 2);
    const liveSvg = this.container.querySelector("svg");
    const viewport = liveSvg.querySelector("g.viewport");
    const cloneViewport = viewport.cloneNode(true);
    cloneViewport.setAttribute("transform", `translate(${-boxX}, ${-boxY})`);
    cloneViewport.querySelectorAll(".djs-outline, .djs-resizer, .djs-bendpoint, .djs-segment-dragger, .djs-hit").forEach((node2) => node2.remove());
    const exportSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    exportSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    exportSvg.setAttribute("width", String(boxW));
    exportSvg.setAttribute("height", String(boxH));
    exportSvg.setAttribute("viewBox", `0 0 ${boxW} ${boxH}`);
    const defs = liveSvg.querySelector("defs");
    if (defs) {
      exportSvg.appendChild(defs.cloneNode(true));
    }
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", String(boxW));
    bgRect.setAttribute("height", String(boxH));
    bgRect.setAttribute("rx", "16");
    bgRect.setAttribute("ry", "16");
    bgRect.setAttribute("fill", "#ffffff");
    exportSvg.appendChild(bgRect);
    exportSvg.appendChild(cloneViewport);
    const svgData = new XMLSerializer().serializeToString(exportSvg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement("canvas");
        offscreen.width = boxW * scale;
        offscreen.height = boxH * scale;
        const ctx = offscreen.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, boxW, boxH);
        URL.revokeObjectURL(url);
        offscreen.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error("Failed to encode diagram PNG"));
          }
        }, "image/png");
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }
  destroy() {
    if (this.diagram) {
      this.diagram.destroy();
      this.diagram = null;
    }
  }
};

// ../../../../.gemini/antigravity/brain/ce06b095-9b85-4c0e-891a-8452cdd5dfbe/scratch/diagram_build/zenmark_editor_controller_src.js
var zenmark_editor_controller_src_default = class extends Controller {
  static targets = [
    "mdtextarea",
    "textarea",
    "fileInput",
    "workspace",
    "editorPane",
    "previewPane",
    "previewArea",
    "wordCount",
    "charCount",
    "readingTime",
    "linkDialog",
    "linkText",
    "linkUrl",
    "imageMdDialog",
    "toast",
    "fullscreenBtn",
    "fullscreenIcon",
    "modeWriteBtn",
    "modeSplitBtn",
    "modePreviewBtn",
    "unsavedBadge",
    "saveBtn",
    "saveIcon",
    "saveLabel",
    "diagramDialog",
    "diagramCanvas",
    "diagramTemplateSelect",
    "diagramTitle",
    "diagramNoSelection",
    "diagramInspector",
    "diagramNodeLabel",
    "diagramNodeSub",
    "diagramNodeSubWrapper",
    "diagramNodeThemeWrapper",
    "diagramConnectModeBtn",
    "diagramConnectModeLabel",
    "diagramConnectHint",
    "diagramConnectHintText",
    "diagramStatusText",
    "diagramInsertBtn",
    "diagramInsertLabel"
  ];
  static values = {
    imageUploadUrl: String,
    saveUrl: String,
    sgid: String
  };
  connect() {
    this.currentMode = "write";
    this.isFullscreen = false;
    this.previewDebounceTimer = null;
    this.toastTimer = null;
    this.saveFeedbackTimer = null;
    this.initialValue = this.textarea ? this.textarea.value : "";
    this.boundKeydown = this.onKeydown.bind(this);
    this.textarea.addEventListener("keydown", this.boundKeydown);
    this.boundPaste = this.handlePaste.bind(this);
    this.textarea.addEventListener("paste", this.boundPaste);
    this.boundInput = this.onInput.bind(this);
    this.textarea.addEventListener("input", this.boundInput);
    this.updateStats();
    this.syncUnsavedState();
  }
  disconnect() {
    if (this.boundKeydown) this.textarea.removeEventListener("keydown", this.boundKeydown);
    if (this.boundPaste) this.textarea.removeEventListener("paste", this.boundPaste);
    if (this.boundInput) this.textarea.removeEventListener("input", this.boundInput);
    if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.saveFeedbackTimer) clearTimeout(this.saveFeedbackTimer);
    if (this.diagramStudio) {
      this.diagramStudio.destroy();
      this.diagramStudio = null;
    }
  }
  // Universal accessor for the textarea element
  get textarea() {
    if (this.hasMdtextareaTarget) return this.mdtextareaTarget;
    if (this.hasTextareaTarget) return this.textareaTarget;
    return this.element.querySelector("textarea");
  }
  // --- Statistics & Counting ---
  onInput() {
    this.updateStats();
    if (this.currentMode === "split") {
      this.scheduleLivePreview();
    }
  }
  updateStats() {
    const text = this.textarea.value || "";
    const trimmed = text.trim();
    const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
    if (this.hasWordCountTarget) {
      this.wordCountTarget.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
    }
    const chars = text.length;
    if (this.hasCharCountTarget) {
      this.charCountTarget.textContent = `${chars.toLocaleString()} chars`;
    }
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    if (this.hasReadingTimeTarget) {
      this.readingTimeTarget.textContent = words === 0 ? "0 min read" : `~${readMinutes} min read`;
    }
    this.syncUnsavedState();
  }
  syncUnsavedState() {
    if (!this.hasUnsavedBadgeTarget || !this.textarea) return;
    if (this.textarea.value !== this.initialValue) {
      this.unsavedBadgeTarget.classList.remove("hidden");
    } else {
      this.unsavedBadgeTarget.classList.add("hidden");
    }
  }
  // --- Keyboard Shortcuts & Smart Typing ---
  onKeydown(event2) {
    const isMetaOrCtrl = event2.metaKey || event2.ctrlKey;
    if (isMetaOrCtrl) {
      const key = event2.key.toLowerCase();
      if (key === "b" && !event2.shiftKey) {
        event2.preventDefault();
        this.bold(event2);
        return;
      }
      if (key === "i" && !event2.shiftKey) {
        event2.preventDefault();
        this.italic(event2);
        return;
      }
      if (key === "k" && !event2.shiftKey) {
        event2.preventDefault();
        this.link(event2);
        return;
      }
      if (key === "s" && !event2.shiftKey) {
        event2.preventDefault();
        this.saveForm(event2);
        return;
      }
      if (key === "x" && event2.shiftKey) {
        event2.preventDefault();
        this.strikethrough(event2);
        return;
      }
      if (key === "c" && event2.shiftKey) {
        event2.preventDefault();
        this.code(event2);
        return;
      }
      if (key === "h" && event2.shiftKey) {
        event2.preventDefault();
        this.heading2(event2);
        return;
      }
      if (key === "8" && event2.shiftKey) {
        event2.preventDefault();
        this.unorderedList(event2);
        return;
      }
      if (key === "7" && event2.shiftKey) {
        event2.preventDefault();
        this.orderedList(event2);
        return;
      }
    }
    if (event2.key === "Escape") {
      if (this.hasDiagramDialogTarget && !this.diagramDialogTarget.classList.contains("hidden")) {
        this.closeDiagramModal(event2);
        return;
      }
      if (this.hasLinkDialogTarget && !this.linkDialogTarget.classList.contains("hidden")) {
        this.closeLinkDialog(event2);
        return;
      }
      if (this.hasImageMdDialogTarget && !this.imageMdDialogTarget.classList.contains("hidden")) {
        this.closeImageDialog(event2);
        return;
      }
      if (this.isFullscreen) {
        this.toggleFullscreen(event2);
        return;
      }
    }
    if (event2.key === "Tab") {
      event2.preventDefault();
      this.handleTab(event2.shiftKey);
      return;
    }
    if (event2.key === "Enter" && !event2.shiftKey && !isMetaOrCtrl) {
      if (this.handleSmartEnter(event2)) {
        return;
      }
    }
    const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`", "*": "*" };
    if (pairs[event2.key]) {
      const textarea = this.textarea;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        event2.preventDefault();
        const selected = textarea.value.substring(start, end);
        const wrapped = `${event2.key}${selected}${pairs[event2.key]}`;
        textarea.setRangeText(wrapped, start, end, "select");
        this.updateStats();
        return;
      }
    }
  }
  handleSmartEnter(event2) {
    const textarea = this.textarea;
    const pos = textarea.selectionStart;
    const val = textarea.value;
    const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    const currentLine = val.substring(lineStart, pos);
    const taskMatch = currentLine.match(/^(\s*[-*]\s+\[[ xX]\]\s+)(.*)$/);
    if (taskMatch) {
      event2.preventDefault();
      if (taskMatch[2].trim() === "") {
        textarea.setRangeText("", lineStart, pos, "end");
      } else {
        this.insertAtCursor("\n- [ ] ");
      }
      this.updateStats();
      return true;
    }
    const bulletMatch = currentLine.match(/^(\s*[-*]\s+)(.*)$/);
    if (bulletMatch) {
      event2.preventDefault();
      if (bulletMatch[2].trim() === "") {
        textarea.setRangeText("", lineStart, pos, "end");
      } else {
        this.insertAtCursor(`
${bulletMatch[1]}`);
      }
      this.updateStats();
      return true;
    }
    const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      event2.preventDefault();
      if (numberedMatch[3].trim() === "") {
        textarea.setRangeText("", lineStart, pos, "end");
      } else {
        const nextNum = parseInt(numberedMatch[2], 10) + 1;
        this.insertAtCursor(`
${numberedMatch[1]}${nextNum}. `);
      }
      this.updateStats();
      return true;
    }
    const quoteMatch = currentLine.match(/^(\s*>\s*)(.*)$/);
    if (quoteMatch) {
      event2.preventDefault();
      if (quoteMatch[2].trim() === "") {
        textarea.setRangeText("", lineStart, pos, "end");
      } else {
        this.insertAtCursor("\n> ");
      }
      this.updateStats();
      return true;
    }
    return false;
  }
  handleTab(isShift2) {
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    if (start === end && !isShift2) {
      this.insertAtCursor("  ");
      this.updateStats();
      return;
    }
    const lineStart = val.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = val.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? val.length : nextNewline;
    const selectedText = val.substring(lineStart, lineEnd);
    const lines = selectedText.split("\n");
    let newText;
    if (isShift2) {
      newText = lines.map((line) => line.replace(/^ {1,2}/, "")).join("\n");
    } else {
      newText = lines.map((line) => "  " + line).join("\n");
    }
    textarea.setRangeText(newText, lineStart, lineEnd, "select");
    this.updateStats();
  }
  preserveSelection(event2) {
    if (this.textarea) {
      this.savedSelectionStart = this.textarea.selectionStart;
      this.savedSelectionEnd = this.textarea.selectionEnd;
      this.savedScrollTop = this.textarea.scrollTop;
    }
    event2?.preventDefault?.();
  }
  async saveForm(event2) {
    event2?.preventDefault?.();
    const form = this.element.closest("form");
    const targetUrl = form?.action || this.saveUrlValue || this.imageUploadUrlValue;
    if (!targetUrl && !form) return;
    const selectionStart = this.textarea ? this.textarea.selectionStart ?? this.savedSelectionStart : null;
    const selectionEnd = this.textarea ? this.textarea.selectionEnd ?? this.savedSelectionEnd : null;
    const scrollTop = this.textarea ? this.textarea.scrollTop ?? this.savedScrollTop : null;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (this.hasSaveBtnTarget) this.saveBtnTarget.disabled = true;
    if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Saving...";
    try {
      const formData = form ? new FormData(form) : new FormData();
      if (!form && this.textarea?.name) {
        formData.set(this.textarea.name, this.textarea.value);
        formData.set("_method", "patch");
      }
      if (!formData.has("commit")) {
        formData.set("commit", "Save");
      }
      const response = await fetch(targetUrl, {
        method: form?.method?.toUpperCase() || "POST",
        headers: {
          "X-CSRF-Token": csrfToken || "",
          "X-Zenmark-Save": "true",
          "Accept": "application/json, text/html"
        },
        body: formData
      });
      let data = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      }
      if (!response.ok || data && data.success === false) {
        const errMsg = data?.error || "Failed to save changes.";
        this.showToast(errMsg, "error");
        if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Save";
        return;
      }
      this.initialValue = this.textarea ? this.textarea.value : "";
      this.syncUnsavedState();
      this.showToast("Saved");
      if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Saved";
      if (this.hasSaveIconTarget) {
        this.saveIconTarget.classList.remove("text-slate-500");
        this.saveIconTarget.classList.add("text-emerald-600");
      }
      if (data?.rendered_html !== void 0) {
        const previewEl = document.getElementById("lesson_markdown");
        if (previewEl) {
          previewEl.innerHTML = data.rendered_html;
          const previewCard = document.getElementById("lesson_markdown_card");
          if (previewCard) previewCard.classList.remove("hidden");
          if (window.mermaid && typeof window.mermaid.run === "function") {
            const nodes = previewEl.querySelectorAll(".mermaid");
            if (nodes.length > 0) {
              window.mermaid.run({ nodes }).catch(() => {
              });
            }
          }
        }
      }
      this.element.dispatchEvent(new CustomEvent("zenmark:saved", { bubbles: true, detail: data }));
      if (this.saveFeedbackTimer) clearTimeout(this.saveFeedbackTimer);
      this.saveFeedbackTimer = setTimeout(() => {
        if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Save";
        if (this.hasSaveIconTarget) {
          this.saveIconTarget.classList.remove("text-emerald-600");
          this.saveIconTarget.classList.add("text-slate-500");
        }
      }, 2e3);
    } catch (error) {
      this.showToast(`Save error: ${error.message}`, "error");
      if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Save";
    } finally {
      if (this.hasSaveBtnTarget) this.saveBtnTarget.disabled = false;
      if (this.textarea && this.currentMode !== "preview") {
        this.textarea.focus({ preventScroll: true });
        if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
          this.textarea.setSelectionRange(selectionStart, selectionEnd);
        }
        if (typeof scrollTop === "number") {
          this.textarea.scrollTop = scrollTop;
        }
      }
    }
  }
  // --- Text Formatting Helpers ---
  bold(event2) {
    event2?.preventDefault?.();
    this.wrapText("**", "**", "bold text");
  }
  italic(event2) {
    event2?.preventDefault?.();
    this.wrapText("*", "*", "italic text");
  }
  strikethrough(event2) {
    event2?.preventDefault?.();
    this.wrapText("~~", "~~", "strikethrough text");
  }
  heading2(event2) {
    event2?.preventDefault?.();
    this.prefixText("## ", "Heading 2");
  }
  heading3(event2) {
    event2?.preventDefault?.();
    this.prefixText("### ", "Heading 3");
  }
  heading(event2) {
    this.heading2(event2);
  }
  blockquote(event2) {
    event2?.preventDefault?.();
    this.prefixText("> ", "Quote");
  }
  code(event2) {
    event2?.preventDefault?.();
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    if (selected.includes("\n") || selected.length > 50) {
      this.wrapText("\n```\n", "\n```\n", "code block");
    } else {
      this.wrapText("`", "`", "code");
    }
  }
  unorderedList(event2) {
    event2?.preventDefault?.();
    this.prefixText("- ", "List item");
  }
  orderedList(event2) {
    event2?.preventDefault?.();
    this.prefixText("1. ", "First item");
  }
  checklist(event2) {
    event2?.preventDefault?.();
    this.prefixText("- [ ] ", "Task item");
  }
  horizontalRule(event2) {
    event2?.preventDefault?.();
    this.insertAtCursor("\n\n---\n\n");
  }
  insertTable(event2) {
    event2?.preventDefault?.();
    const tableTemplate = "\n\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Item 1 | Details | Value |\n| Item 2 | Details | Value |\n\n";
    this.insertAtCursor(tableTemplate);
  }
  prefixText(prefix, defaultText = "") {
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || defaultText;
    const newText = `${prefix}${textToInsert}`;
    textarea.setRangeText(newText, start, end, "end");
    textarea.focus();
    this.updateStats();
    if (this.currentMode === "split") this.scheduleLivePreview();
  }
  wrapText(prefix, suffix, defaultText = "") {
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || defaultText;
    const newText = `${prefix}${textToInsert}${suffix}`;
    textarea.setRangeText(newText, start, end, "end");
    textarea.focus();
    this.updateStats();
    if (this.currentMode === "split") this.scheduleLivePreview();
  }
  insertAtCursor(text) {
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText(text, start, end, "end");
    textarea.focus();
    this.updateStats();
    if (this.currentMode === "split") this.scheduleLivePreview();
  }
  // --- Link Dialog ---
  link(event2) {
    event2?.preventDefault?.();
    const textarea = this.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    if (this.hasLinkTextTarget) {
      this.linkTextTarget.value = selectedText;
    }
    if (this.hasLinkUrlTarget) {
      this.linkUrlTarget.value = "";
    }
    if (this.hasLinkDialogTarget) {
      this.linkDialogTarget.classList.remove("hidden");
      if (this.hasLinkUrlTarget) {
        if (selectedText.length > 0) {
          this.linkUrlTarget.focus();
        } else if (this.hasLinkTextTarget) {
          this.linkTextTarget.focus();
        }
      }
    }
  }
  closeLinkDialog(event2) {
    event2?.preventDefault?.();
    if (this.hasLinkDialogTarget) {
      this.linkDialogTarget.classList.add("hidden");
      this.textarea.focus();
    }
  }
  closeLinkDialogOnBackdrop(event2) {
    if (event2.target === this.linkDialogTarget) {
      this.closeLinkDialog(event2);
    }
  }
  stopEventPropagation(event2) {
    event2.stopPropagation();
  }
  insertLink(event2) {
    event2?.preventDefault?.();
    const text = (this.hasLinkTextTarget ? this.linkTextTarget.value.trim() : "") || "Link";
    const url = (this.hasLinkUrlTarget ? this.linkUrlTarget.value.trim() : "") || "#";
    this.insertAtCursor(`[${text}](${url})`);
    this.closeLinkDialog(event2);
  }
  // --- Images: Picker, Paste & Drag-and-Drop ---
  image(event2) {
    event2?.preventDefault?.();
    if (this.hasFileInputTarget) {
      this.fileInputTarget.click();
    } else {
      let input = this.element.querySelector('input[type="file"]');
      if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        this.element.appendChild(input);
      }
      input.onchange = (e2) => this.uploadImageFile(e2);
      input.click();
    }
  }
  uploadImage(event2) {
    this.uploadImageFile(event2);
  }
  uploadImageFile(event2) {
    const files = event2.target.files;
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          this.uploadAndInsertImage(file);
        }
      }
      event2.target.value = "";
    }
  }
  handlePaste(event2) {
    const items = (event2.clipboardData || event2.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        event2.preventDefault();
        const file = item.getAsFile();
        if (file) {
          this.uploadAndInsertImage(file);
          return;
        }
      }
    }
  }
  handleDragOver(event2) {
    event2.preventDefault();
    this.element.classList.add("zenmark-dragover");
  }
  handleDragLeave(event2) {
    this.element.classList.remove("zenmark-dragover");
  }
  handleDrop(event2) {
    event2.preventDefault();
    this.element.classList.remove("zenmark-dragover");
    const files = event2.dataTransfer?.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        this.uploadAndInsertImage(file);
        return;
      }
    }
  }
  uploadAndInsertImage(file) {
    const textarea = this.textarea;
    const filename = file.name || "uploaded-image.png";
    const placeholder = `![Uploading ${filename}...]()`;
    this.insertAtCursor(`
${placeholder}
`);
    this.showToast(`Uploading ${filename}...`);
    const formData = new FormData();
    formData.append("file", file);
    if (this.hasSgidValue && this.sgidValue) {
      formData.append("sgid", this.sgidValue);
    }
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    fetch("/zenmark/images", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        ...csrfToken ? { "X-CSRF-Token": csrfToken } : {}
      },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        const errText = await response.text();
        console.error("Zenmark image upload failed with status:", response.status, errText);
        throw new Error(`Upload failed (${response.status})`);
      }
      return response.json();
    }).then((data) => {
      const imageUrl = data.url || `/rails/active_storage/blobs/${data.signed_id}/${filename}`;
      const mdImage = `![${data.filename || filename}](${imageUrl})`;
      textarea.value = textarea.value.replace(placeholder, mdImage);
      this.updateStats();
      this.showToast("Image inserted successfully");
      if (this.currentMode === "split") this.scheduleLivePreview();
    }).catch((err) => {
      console.error("Zenmark image upload failed:", err);
      textarea.value = textarea.value.replace(placeholder, `<!-- Image upload failed: ${filename} -->`);
      this.showToast("Image upload failed", true);
    });
  }
  closeImageDialog(event2) {
    event2?.preventDefault?.();
    if (this.hasImageMdDialogTarget) {
      this.imageMdDialogTarget.classList.add("hidden");
    }
  }
  copyImageMarkdown(event2) {
    event2?.preventDefault?.();
    const snippet = this.imageMdDialogTarget.querySelector("#image-md-text")?.textContent?.trim();
    if (snippet) {
      navigator.clipboard.writeText(snippet).then(() => {
        this.showToast("Copied to clipboard!");
        this.closeImageDialog(event2);
      });
    }
  }
  // --- View Modes: Write | Split | Preview ---
  setWriteMode(event2) {
    event2?.preventDefault?.();
    this.currentMode = "write";
    this.applyModeClasses("zenmark-mode-write");
    this.updateModeButtonStates(this.modeWriteBtnTarget);
    this.textarea.focus();
  }
  setSplitMode(event2) {
    event2?.preventDefault?.();
    this.currentMode = "split";
    this.applyModeClasses("zenmark-mode-split");
    this.updateModeButtonStates(this.modeSplitBtnTarget);
    this.fetchPreview();
  }
  setPreviewMode(event2) {
    event2?.preventDefault?.();
    this.currentMode = "preview";
    this.applyModeClasses("zenmark-mode-preview");
    this.updateModeButtonStates(this.modePreviewBtnTarget);
    this.fetchPreview();
  }
  applyModeClasses(modeClass) {
    if (this.hasWorkspaceTarget) {
      this.workspaceTarget.classList.remove("zenmark-mode-write", "zenmark-mode-split", "zenmark-mode-preview");
      this.workspaceTarget.classList.add(modeClass);
    }
  }
  updateModeButtonStates(activeBtn) {
    const buttons = [this.modeWriteBtnTarget, this.modeSplitBtnTarget, this.modePreviewBtnTarget].filter(Boolean);
    buttons.forEach((btn) => btn.classList.remove("active"));
    activeBtn.classList.add("active");
  }
  scheduleLivePreview() {
    if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer);
    this.previewDebounceTimer = setTimeout(() => {
      this.fetchPreview();
    }, 280);
  }
  fetchPreview() {
    const markdownContent = this.textarea.value;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    fetch("/zenmark/previews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/html",
        ...csrfToken ? { "X-CSRF-Token": csrfToken } : {}
      },
      body: JSON.stringify({ content: markdownContent })
    }).then((response) => response.text()).then((html) => {
      if (this.hasPreviewAreaTarget) {
        this.previewAreaTarget.innerHTML = html;
        this.renderMermaidInPreview();
      }
    }).catch((err) => {
      console.error("Zenmark preview fetch error:", err);
    });
  }
  renderMermaidInPreview() {
    if (!this.hasPreviewAreaTarget) return;
    const codeBlocks = this.previewAreaTarget.querySelectorAll("pre > code.mermaid, pre > code.language-mermaid");
    codeBlocks.forEach((codeEl) => {
      const pre = codeEl.parentElement;
      const div = document.createElement("div");
      div.className = "mermaid";
      div.setAttribute("data-controller", "mermaid");
      div.textContent = codeEl.textContent;
      pre.replaceWith(div);
    });
    if (window.mermaid && typeof window.mermaid.run === "function") {
      const standaloneNodes = Array.from(
        this.previewAreaTarget.querySelectorAll('.mermaid:not([data-controller="mermaid"]):not([data-processed])')
      );
      if (standaloneNodes.length > 0) {
        window.mermaid.run({ nodes: standaloneNodes }).catch(() => {
        });
      }
    }
  }
  preview(event2) {
    this.setPreviewMode(event2);
  }
  // --- Zen Mode (Fullscreen) ---
  toggleFullscreen(event2) {
    event2?.preventDefault?.();
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      this.element.classList.add("zenmark-fullscreen");
      if (this.hasFullscreenIconTarget) this.fullscreenIconTarget.textContent = "fullscreen_exit";
      if (this.hasFullscreenBtnTarget) this.fullscreenBtnTarget.setAttribute("title", "Exit Zen Mode (Esc)");
      this.showToast("Entered Zen Mode (Press Esc to exit)");
    } else {
      this.element.classList.remove("zenmark-fullscreen");
      if (this.hasFullscreenIconTarget) this.fullscreenIconTarget.textContent = "fullscreen";
      if (this.hasFullscreenBtnTarget) this.fullscreenBtnTarget.setAttribute("title", "Zen Mode (Esc)");
    }
    this.textarea.focus();
  }
  // --- Toast Notifications ---
  showToast(message, isError = false) {
    if (!this.hasToastTarget) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTarget.textContent = message;
    this.toastTarget.classList.remove("hidden");
    if (isError) {
      this.toastTarget.classList.add("zenmark-toast-error");
    } else {
      this.toastTarget.classList.remove("zenmark-toast-error");
    }
    this.toastTimer = setTimeout(() => {
      this.toastTarget.classList.add("hidden");
    }, 2600);
  }
  // --- Visual Architecture Diagram Studio (diagram-js) ---
  async openDiagramModal(event2) {
    event2?.preventDefault?.();
    if (!this.hasDiagramDialogTarget) return;
    this.preserveSelection();
    this.diagramDialogTarget.classList.remove("hidden");
    if (!this.diagramStudio && this.hasDiagramCanvasTarget) {
      if (this.hasDiagramStatusTextTarget) {
        this.diagramStatusTextTarget.textContent = "Loading diagram-js engine...";
      }
      try {
        this.diagramStudio = new CloudQubesDiagramStudio(this.diagramCanvasTarget, {
          onSelectionChange: (el) => this.handleDiagramSelectionChange(el),
          onConnectStep: (step) => this.handleDiagramConnectStep(step),
          onElementDoubleClick: (el) => {
            this.handleDiagramSelectionChange(el);
            if (this.hasDiagramNodeLabelTarget) {
              this.diagramNodeLabelTarget.focus();
              this.diagramNodeLabelTarget.select();
            }
          }
        });
        this.diagramStudio.loadTemplate("three_tier");
        if (this.hasDiagramStatusTextTarget) {
          this.diagramStatusTextTarget.textContent = "Ready \xB7 Powered by diagram-js (MIT)";
        }
      } catch (err) {
        console.error("Failed to initialize diagram-js studio:", err);
        if (this.hasDiagramStatusTextTarget) {
          this.diagramStatusTextTarget.textContent = `Error loading diagram engine: ${err.message || err}`;
        }
      }
    }
  }
  closeDiagramModal(event2) {
    event2?.preventDefault?.();
    if (this.hasDiagramDialogTarget) {
      this.diagramDialogTarget.classList.add("hidden");
    }
    if (this.diagramStudio) {
      this.diagramStudio.cancelTwoClickConnect();
      this.resetDiagramConnectUI();
    }
  }
  loadDiagramTemplate(event2) {
    if (!this.diagramStudio) return;
    const template = event2?.currentTarget?.value || "three_tier";
    this.diagramStudio.loadTemplate(template);
  }
  addDiagramNode(event2) {
    event2?.preventDefault?.();
    if (!this.diagramStudio) return;
    const btn = event2.currentTarget;
    const shapeType = btn.dataset.shapeType || "service";
    const label = btn.dataset.defaultLabel || "Service";
    const subtitle = btn.dataset.defaultSub || "Compute";
    const theme = btn.dataset.defaultTheme || "slate";
    this.diagramStudio.addNode({ shapeType, label, subtitle, theme });
  }
  startDiagramConnectMode(event2) {
    event2?.preventDefault?.();
    if (!this.diagramStudio) return;
    this.diagramStudio.startTwoClickConnect();
    if (this.hasDiagramConnectHintTarget) {
      this.diagramConnectHintTarget.classList.remove("hidden");
    }
    if (this.hasDiagramConnectHintTextTarget) {
      this.diagramConnectHintTextTarget.textContent = "Step 1: Click the source node on the canvas";
    }
    if (this.hasDiagramConnectModeBtnTarget) {
      this.diagramConnectModeBtnTarget.classList.add("border-[#C21057]", "text-[#C21057]", "bg-rose-50/40");
    }
  }
  handleDiagramConnectStep(step) {
    if (step === "target") {
      if (this.hasDiagramConnectHintTextTarget) {
        this.diagramConnectHintTextTarget.textContent = "Step 2: Now click the target node to complete the arrow";
      }
    } else {
      this.resetDiagramConnectUI();
    }
  }
  resetDiagramConnectUI() {
    if (this.hasDiagramConnectHintTarget) {
      this.diagramConnectHintTarget.classList.add("hidden");
    }
    if (this.hasDiagramConnectModeBtnTarget) {
      this.diagramConnectModeBtnTarget.classList.remove("border-[#C21057]", "text-[#C21057]", "bg-rose-50/40");
    }
  }
  handleDiagramSelectionChange(el) {
    this.selectedDiagramElement = el;
    if (!el) {
      if (this.hasDiagramNoSelectionTarget) this.diagramNoSelectionTarget.classList.remove("hidden");
      if (this.hasDiagramInspectorTarget) this.diagramInspectorTarget.classList.add("hidden");
      return;
    }
    if (this.hasDiagramNoSelectionTarget) this.diagramNoSelectionTarget.classList.add("hidden");
    if (this.hasDiagramInspectorTarget) this.diagramInspectorTarget.classList.remove("hidden");
    const isConnection2 = Boolean(el.waypoints);
    if (this.hasDiagramNodeLabelTarget) {
      this.diagramNodeLabelTarget.value = el.nodeTitle || "";
      this.diagramNodeLabelTarget.placeholder = isConnection2 ? "e.g. HTTPS / gRPC / Async" : "e.g. Cloud SQL Primary";
    }
    if (this.hasDiagramNodeSubWrapperTarget) {
      this.diagramNodeSubWrapperTarget.classList.toggle("hidden", isConnection2);
    }
    if (this.hasDiagramNodeThemeWrapperTarget) {
      this.diagramNodeThemeWrapperTarget.classList.toggle("hidden", isConnection2);
    }
    if (!isConnection2 && this.hasDiagramNodeSubTarget) {
      this.diagramNodeSubTarget.value = el.subtitle || "";
    }
  }
  updateSelectedDiagramElement() {
    if (!this.diagramStudio || !this.selectedDiagramElement) return;
    const label = this.hasDiagramNodeLabelTarget ? this.diagramNodeLabelTarget.value : "";
    const subtitle = this.hasDiagramNodeSubTarget ? this.diagramNodeSubTarget.value : "";
    if (this.selectedDiagramElement.waypoints) {
      this.diagramStudio.updateElement(this.selectedDiagramElement, { label });
    } else {
      this.diagramStudio.updateElement(this.selectedDiagramElement, { label, subtitle });
    }
  }
  setDiagramElementTheme(event2) {
    event2?.preventDefault?.();
    if (!this.diagramStudio || !this.selectedDiagramElement) return;
    const theme = event2.currentTarget.dataset.theme || "slate";
    this.diagramStudio.updateElement(this.selectedDiagramElement, { theme });
  }
  duplicateSelectedDiagramElement(event2) {
    event2?.preventDefault?.();
    if (!this.diagramStudio || !this.selectedDiagramElement) return;
    this.diagramStudio.duplicateElement(this.selectedDiagramElement);
  }
  deleteSelectedDiagramElement(event2) {
    event2?.preventDefault?.();
    if (!this.diagramStudio || !this.selectedDiagramElement) return;
    this.diagramStudio.deleteElement(this.selectedDiagramElement);
  }
  diagramUndo(event2) {
    event2?.preventDefault?.();
    this.diagramStudio?.undo();
  }
  diagramRedo(event2) {
    event2?.preventDefault?.();
    this.diagramStudio?.redo();
  }
  diagramZoomIn(event2) {
    event2?.preventDefault?.();
    this.diagramStudio?.zoomIn();
  }
  diagramZoomOut(event2) {
    event2?.preventDefault?.();
    this.diagramStudio?.zoomOut();
  }
  diagramZoomReset(event2) {
    event2?.preventDefault?.();
    this.diagramStudio?.zoomFit();
  }
  clearDiagramCanvas(event2) {
    event2?.preventDefault?.();
    this.diagramStudio?.clear();
  }
  async insertDiagramIntoMarkdown(event2) {
    event2?.preventDefault?.();
    if (!this.diagramStudio) return;
    const title = (this.hasDiagramTitleTarget ? this.diagramTitleTarget.value.trim() : "") || "Architecture Diagram";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture-diagram";
    const filename = `${slug}-${Date.now()}.png`;
    if (this.hasDiagramInsertBtnTarget) this.diagramInsertBtnTarget.disabled = true;
    if (this.hasDiagramInsertLabelTarget) this.diagramInsertLabelTarget.textContent = "Rendering & Uploading...";
    try {
      const pngBlob = await this.diagramStudio.exportToPngBlob(2);
      const file = new File([pngBlob], filename, { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      if (this.hasSgidValue && this.sgidValue) {
        formData.append("sgid", this.sgidValue);
      }
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
      const response = await fetch("/zenmark/images", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          ...csrfToken ? { "X-CSRF-Token": csrfToken } : {}
        },
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }
      const data = await response.json();
      const imageUrl = data.url || `/rails/active_storage/blobs/${data.signed_id}/${filename}`;
      const mdImage = `
![${title}](${imageUrl})
`;
      this.closeDiagramModal();
      this.restoreSelection();
      this.insertAtCursor(mdImage);
      this.updateStats();
      this.showToast("Architecture diagram inserted!");
      if (this.currentMode === "split") this.scheduleLivePreview();
    } catch (err) {
      console.error("Diagram export/upload failed:", err);
      this.showToast(err.message || "Failed to insert diagram", true);
    } finally {
      if (this.hasDiagramInsertBtnTarget) this.diagramInsertBtnTarget.disabled = false;
      if (this.hasDiagramInsertLabelTarget) this.diagramInsertLabelTarget.textContent = "Insert Diagram";
    }
  }
};
export {
  zenmark_editor_controller_src_default as default
};
