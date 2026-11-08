import {
  Diagram,
  ModelingModule,
  MoveModule,
  SelectionModule,
  ConnectModule,
  CreateModule,
  BendpointsModule,
  ResizeModule,
  SnappingModule,
  GridSnappingModule,
  KeyboardModule,
  KeyboardMoveSelectionModule,
  OutlineModule,
  ContextPadModule,
  RulesModule,
  ZoomScrollModule,
  MoveCanvasModule,
  BaseRenderer,
  componentsToPath,
  BaseLayouter,
  RuleProvider,
  repairConnection,
  getMid,
  svgAppend,
  svgAttr,
  svgCreate
} from "diagram_js_vendor";

const THEMES = {
  slate: {
    fill: '#ffffff',
    headerFill: '#f1f5f9',
    stroke: '#475569',
    badgeText: '#475569',
    titleText: '#0f172a'
  },
  blue: {
    fill: '#ffffff',
    headerFill: '#eff6ff',
    stroke: '#2563eb',
    badgeText: '#1d4ed8',
    titleText: '#0f172a'
  },
  emerald: {
    fill: '#ffffff',
    headerFill: '#ecfdf5',
    stroke: '#059669',
    badgeText: '#047857',
    titleText: '#0f172a'
  },
  amber: {
    fill: '#ffffff',
    headerFill: '#fffbeb',
    stroke: '#d97706',
    badgeText: '#b45309',
    titleText: '#0f172a'
  },
  rose: {
    fill: '#ffffff',
    headerFill: '#fff1f2',
    stroke: '#C21057',
    badgeText: '#C21057',
    titleText: '#0f172a'
  }
};

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function ensureMarkerDefs(svgRoot) {
  if (!svgRoot) return;
  let defs = svgRoot.querySelector('defs');
  if (!defs) {
    defs = svgCreate('defs');
    svgAppend(svgRoot, defs);
  }
  if (!defs.querySelector('#cq-arrow-end')) {
    const marker = svgCreate('marker');
    svgAttr(marker, {
      id: 'cq-arrow-end',
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '6.5',
      markerHeight: '6.5',
      orient: 'auto-start-reverse'
    });
    const path = svgCreate('path');
    svgAttr(path, {
      d: 'M 0 1.5 L 8.5 5 L 0 8.5 z',
      fill: '#475569'
    });
    svgAppend(marker, path);
    svgAppend(defs, marker);
  }
}

function wrapLines(text, maxCharsPerLine = 20) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    if ((current + ' ' + words[i]).length <= maxCharsPerLine) {
      current += ' ' + words[i];
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, 3);
}

/**
 * Custom Renderer for CloudQubes Architecture Shapes & Orthogonal Connections
 */
class CloudQubesRenderer extends BaseRenderer {
  constructor(eventBus, canvas) {
    super(eventBus, 1500);
    this._canvas = canvas;
  }

  canRender(element) {
    return !element.labelTarget;
  }

  drawShape(parentGfx, element) {
    ensureMarkerDefs(this._canvas.getContainer().querySelector('svg'));

    const w = element.width || 168;
    const h = element.height || 76;
    const shapeType = element.shapeType || 'service';
    const theme = THEMES[element.theme] || THEMES.slate;
    const label = element.nodeTitle !== undefined ? element.nodeTitle : 'Service';
    const subtitle = element.subtitle !== undefined ? element.subtitle : '';

    if (shapeType === 'group') {
      const rect = svgCreate('rect');
      svgAttr(rect, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        rx: 14,
        ry: 14,
        fill: 'rgba(248, 250, 252, 0.55)',
        stroke: theme.stroke,
        'stroke-width': 1.75,
        'stroke-dasharray': '7 5'
      });
      svgAppend(parentGfx, rect);

      // Top-left group badge
      const badgeW = Math.min(w - 20, Math.max(90, label.length * 7.5 + 24));
      const badgeRect = svgCreate('rect');
      svgAttr(badgeRect, {
        x: 12,
        y: 10,
        width: badgeW,
        height: 24,
        rx: 6,
        ry: 6,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 1
      });
      svgAppend(parentGfx, badgeRect);

      const titleEl = svgCreate('text');
      svgAttr(titleEl, {
        x: 22,
        y: 26,
        fill: theme.titleText,
        'font-family': FONT_STACK,
        'font-size': '11px',
        'font-weight': '700'
      });
      titleEl.textContent = label;
      svgAppend(parentGfx, titleEl);

      return rect;
    }

    if (shapeType === 'database') {
      const ry = 11;
      const bodyPath = svgCreate('path');
      const d = [
        `M 0 ${ry}`,
        `L 0 ${h - ry}`,
        `A ${w / 2} ${ry} 0 0 0 ${w} ${h - ry}`,
        `L ${w} ${ry}`,
        `A ${w / 2} ${ry} 0 0 0 0 ${ry}`,
        'Z'
      ].join(' ');
      svgAttr(bodyPath, {
        d,
        fill: theme.fill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, bodyPath);

      const topEllipse = svgCreate('ellipse');
      svgAttr(topEllipse, {
        cx: w / 2,
        cy: ry,
        rx: w / 2,
        ry: ry,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, topEllipse);

      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 8);
      return bodyPath;
    }

    if (shapeType === 'queue') {
      const rx = 12;
      const bodyPath = svgCreate('path');
      const d = [
        `M ${rx} 0`,
        `L ${w - rx} 0`,
        `A ${rx} ${h / 2} 0 0 1 ${w - rx} ${h}`,
        `L ${rx} ${h}`,
        `A ${rx} ${h / 2} 0 0 1 ${rx} 0`,
        'Z'
      ].join(' ');
      svgAttr(bodyPath, {
        d,
        fill: theme.fill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, bodyPath);

      const rightCap = svgCreate('ellipse');
      svgAttr(rightCap, {
        cx: w - rx,
        cy: h / 2,
        rx: rx,
        ry: h / 2,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 1.75
      });
      svgAppend(parentGfx, rightCap);

      this._renderTextBlock(parentGfx, w - 10, h, label, subtitle, theme, 0);
      return bodyPath;
    }

    if (shapeType === 'client') {
      const r = Math.min(34, h / 2);
      const rect = svgCreate('rect');
      svgAttr(rect, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        rx: r,
        ry: r,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, rect);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 0);
      return rect;
    }

    if (shapeType === 'gateway') {
      const polygon = svgCreate('polygon');
      const pts = [
        `${w / 2},0`,
        `${w},${h / 2}`,
        `${w / 2},${h}`,
        `0,${h / 2}`
      ].join(' ');
      svgAttr(polygon, {
        points: pts,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 2,
        'stroke-linejoin': 'round'
      });
      svgAppend(parentGfx, polygon);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 0, 14);
      return polygon;
    }

    // Default: 'service' card with subtle top accent strip
    const card = svgCreate('rect');
    svgAttr(card, {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 12,
      ry: 12,
      fill: theme.fill,
      stroke: theme.stroke,
      'stroke-width': 2
    });
    svgAppend(parentGfx, card);

    const accentStrip = svgCreate('path');
    const r = 11;
    const stripH = 22;
    const stripPath = [
      `M 1 ${stripH}`,
      `L 1 ${r}`,
      `Q 1 1 ${r} 1`,
      `L ${w - r} 1`,
      `Q ${w - 1} 1 ${w - 1} ${r}`,
      `L ${w - 1} ${stripH}`,
      'Z'
    ].join(' ');
    svgAttr(accentStrip, {
      d: stripPath,
      fill: theme.headerFill
    });
    svgAppend(parentGfx, accentStrip);

    const divider = svgCreate('line');
    svgAttr(divider, {
      x1: 1,
      y1: stripH,
      x2: w - 1,
      y2: stripH,
      stroke: theme.stroke,
      'stroke-width': 1,
      'stroke-opacity': 0.25
    });
    svgAppend(parentGfx, divider);

    if (subtitle) {
      const subText = svgCreate('text');
      svgAttr(subText, {
        x: w / 2,
        y: 15,
        'text-anchor': 'middle',
        fill: theme.badgeText,
        'font-family': FONT_STACK,
        'font-size': '9.5px',
        'font-weight': '700',
        'letter-spacing': '0.06em'
      });
      subText.textContent = String(subtitle).toUpperCase();
      svgAppend(parentGfx, subText);
    }

    this._renderMainLabel(parentGfx, w, h, label, theme, subtitle ? 11 : 0, 20);
    return card;
  }

  _renderTextBlock(parentGfx, w, h, label, subtitle, theme, yOffset = 0, maxChars = 19) {
    if (subtitle) {
      const subText = svgCreate('text');
      svgAttr(subText, {
        x: w / 2,
        y: h / 2 - 8 + yOffset,
        'text-anchor': 'middle',
        fill: theme.badgeText,
        'font-family': FONT_STACK,
        'font-size': '9.5px',
        'font-weight': '700',
        'letter-spacing': '0.05em'
      });
      subText.textContent = String(subtitle).toUpperCase();
      svgAppend(parentGfx, subText);
    }

    this._renderMainLabel(parentGfx, w, h, label, theme, yOffset + (subtitle ? 8 : 0), maxChars);
  }

  _renderMainLabel(parentGfx, w, h, label, theme, yShift = 0, maxChars = 20) {
    const lines = wrapLines(label, maxChars);
    const lineHeight = 15;
    const totalH = (lines.length - 1) * lineHeight;
    const startY = h / 2 + yShift - totalH / 2 + 4;

    lines.forEach((lineStr, idx) => {
      const t = svgCreate('text');
      svgAttr(t, {
        x: w / 2,
        y: startY + idx * lineHeight,
        'text-anchor': 'middle',
        fill: theme.titleText,
        'font-family': FONT_STACK,
        'font-size': '12.5px',
        'font-weight': '700'
      });
      t.textContent = lineStr;
      svgAppend(parentGfx, t);
    });
  }

  drawConnection(parentGfx, connection) {
    ensureMarkerDefs(this._canvas.getContainer().querySelector('svg'));

    const waypoints = connection.waypoints || [];
    if (waypoints.length < 2) return svgCreate('g');

    // Rounded orthogonal path
    const d = this._buildRoundedPath(waypoints, 8);
    const path = svgCreate('path');
    svgAttr(path, {
      d,
      fill: 'none',
      stroke: '#475569',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'marker-end': 'url(#cq-arrow-end)'
    });
    svgAppend(parentGfx, path);

    // Optional label pill at connection midpoint
    if (connection.nodeTitle && String(connection.nodeTitle).trim().length > 0) {
      const mid = this._getConnectionMidpoint(waypoints);
      const labelText = String(connection.nodeTitle).trim();
      const pillW = Math.max(40, labelText.length * 6.5 + 16);
      const pillH = 20;

      const bg = svgCreate('rect');
      svgAttr(bg, {
        x: mid.x - pillW / 2,
        y: mid.y - pillH / 2,
        width: pillW,
        height: pillH,
        rx: 6,
        ry: 6,
        fill: '#ffffff',
        stroke: '#cbd5e1',
        'stroke-width': 1.25
      });
      svgAppend(parentGfx, bg);

      const textEl = svgCreate('text');
      svgAttr(textEl, {
        x: mid.x,
        y: mid.y + 3.5,
        'text-anchor': 'middle',
        fill: '#334155',
        'font-family': FONT_STACK,
        'font-size': '10.5px',
        'font-weight': '600'
      });
      textEl.textContent = labelText;
      svgAppend(parentGfx, textEl);
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
        const p1x = curr.x - (dx1 / len1) * r;
        const p1y = curr.y - (dy1 / len1) * r;
        const p2x = curr.x + (dx2 / len2) * r;
        const p2y = curr.y + (dy2 / len2) * r;
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
      ['M', x, y],
      ['l', width, 0],
      ['l', 0, height],
      ['l', -width, 0],
      ['z']
    ]);
  }

  getConnectionPath(connection) {
    const waypoints = connection.waypoints || [];
    const connectionPath = [];

    for (let idx = 0; idx < waypoints.length; idx++) {
      let point = waypoints[idx];
      point = point.original || point;
      connectionPath.push([idx === 0 ? 'M' : 'L', point.x, point.y]);
    }

    return componentsToPath(connectionPath);
  }
}
CloudQubesRenderer.$inject = ['eventBus', 'canvas'];

/**
 * Orthogonal Manhattan Connection Layouter
 */
class CloudQubesLayouter extends BaseLayouter {
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
      Object.assign({ preferredLayouts: ['h:h'] }, hints)
    );

    return waypoints;
  }
}
CloudQubesLayouter.$inject = [];

/**
 * Modeling Rules for Moving, Resizing, Creating, and Connecting Nodes
 */
class CloudQubesRules extends RuleProvider {
  init() {
    this.addRule('elements.move', () => true);
    this.addRule('shape.create', () => true);
    this.addRule('shape.resize', (context) => {
      if (!context.newBounds) return true;
      return context.newBounds.width >= 90 && context.newBounds.height >= 48;
    });
    this.addRule('connection.create', (context) => {
      const { source, target } = context;
      if (!source || !target || source === target) return false;
      if (!source.parent || !target.parent) return false;
      if (source.waypoints || target.waypoints) return false;
      return true;
    });
    this.addRule('connection.reconnect', () => true);
    this.addRule('connection.updateWaypoints', () => true);
  }
}
CloudQubesRules.$inject = ['eventBus'];

/**
 * On-Canvas Context Pad Provider (Connect Arrow, Quick Append Node, Delete)
 */
class CloudQubesContextPadProvider {
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
      entries['connect'] = {
        group: 'connect',
        className: 'cq-pad-connect',
        title: 'Drag or click to connect arrow to another node',
        html: '<div class="entry" title="Connect Arrow">→</div>',
        action: {
          click: (event, el) => {
            connect.start(event, el);
          },
          dragstart: (event, el) => {
            connect.start(event, el);
          }
        }
      };

      entries['append'] = {
        group: 'edit',
        className: 'cq-pad-append',
        title: 'Append connected node to the right',
        html: '<div class="entry" title="Append Connected Node">+</div>',
        action: {
          click: (_event, el) => {
            const root = canvas.getRootElement();
            const newShape = elementFactory.createShape({
              width: el.width || 168,
              height: el.height || 76,
              shapeType: el.shapeType === 'group' ? 'service' : (el.shapeType || 'service'),
              nodeTitle: 'New Service',
              subtitle: 'Compute',
              theme: el.theme || 'slate'
            });
            const pos = {
              x: el.x + (el.width || 168) + 160,
              y: el.y + ((el.height || 76) / 2)
            };
            const created = modeling.createShape(newShape, pos, root);
            modeling.connect(el, created, { nodeTitle: '' });
            selection.select(created);
          }
        }
      };
    }

    entries['delete'] = {
      group: 'edit',
      className: 'cq-pad-delete',
      title: 'Delete element',
      html: '<div class="entry cq-pad-danger" title="Delete">×</div>',
      action: {
        click: (_event, el) => {
          modeling.removeElements([el]);
        }
      }
    };

    return entries;
  }
}
CloudQubesContextPadProvider.$inject = [
  'contextPad',
  'connect',
  'modeling',
  'elementFactory',
  'canvas',
  'selection'
];

const CloudQubesCustomModule = {
  __init__: ['cloudQubesRenderer', 'cloudQubesRules', 'cloudQubesContextPadProvider'],
  cloudQubesRenderer: ['type', CloudQubesRenderer],
  cloudQubesRules: ['type', CloudQubesRules],
  cloudQubesContextPadProvider: ['type', CloudQubesContextPadProvider],
  layouter: ['type', CloudQubesLayouter]
};

/**
 * High-level controller wrapping diagram-js for Zenmark Studio
 */
export class CloudQubesDiagramStudio {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.diagram = new Diagram({
      canvas: { container },
      modules: [
        ModelingModule,
        MoveModule,
        SelectionModule,
        ConnectModule,
        CreateModule,
        BendpointsModule,
        ResizeModule,
        SnappingModule,
        GridSnappingModule,
        KeyboardModule,
        KeyboardMoveSelectionModule,
        OutlineModule,
        ContextPadModule,
        RulesModule,
        ZoomScrollModule,
        MoveCanvasModule,
        CloudQubesCustomModule
      ]
    });

    this.canvas = this.diagram.get('canvas');
    this.modeling = this.diagram.get('modeling');
    this.elementFactory = this.diagram.get('elementFactory');
    this.elementRegistry = this.diagram.get('elementRegistry');
    this.selection = this.diagram.get('selection');
    this.commandStack = this.diagram.get('commandStack');
    this.eventBus = this.diagram.get('eventBus');

    this.root = this.elementFactory.createRoot({ id: 'cq-root' });
    this.canvas.setRootElement(this.root);

    this.pendingConnectSource = null;

    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('selection.changed', (e) => {
      const selected = e.newSelection && e.newSelection[0] ? e.newSelection[0] : null;
      if (this.callbacks.onSelectionChange) {
        this.callbacks.onSelectionChange(selected);
      }
    });

    this.eventBus.on('element.click', (e) => {
      const el = e.element;
      if (!el || el === this.root || el.waypoints) return;

      if (this.pendingConnectSource !== undefined && this.pendingConnectSource !== false) {
        if (this.pendingConnectSource === null) {
          this.pendingConnectSource = el;
          if (this.callbacks.onConnectStep) {
            this.callbacks.onConnectStep('target', el);
          }
        } else if (this.pendingConnectSource !== el) {
          const src = this.pendingConnectSource;
          this.pendingConnectSource = false;
          const conn = this.modeling.connect(src, el, { nodeTitle: '' });
          this.selection.select(conn);
          if (this.callbacks.onConnectStep) {
            this.callbacks.onConnectStep('done', conn);
          }
        }
      }
    });

    this.eventBus.on('element.dblclick', (e) => {
      const el = e.element;
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

  addNode({ shapeType = 'service', label = 'Service', subtitle = 'Compute', theme = 'slate', x, y, width, height }) {
    const isGroup = shapeType === 'group';
    const isGateway = shapeType === 'gateway';
    const w = width || (isGroup ? 440 : isGateway ? 156 : 172);
    const h = height || (isGroup ? 240 : isGateway ? 86 : 76);

    const existingShapes = this.elementRegistry.filter(el => el !== this.root && !el.waypoints);
    const posX = x !== undefined ? x : 160 + (existingShapes.length % 3) * 230;
    const posY = y !== undefined ? y : 140 + Math.floor(existingShapes.length / 3) * 135;

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
      // Send group behind normal shapes in SVG DOM order
      const gfx = this.canvas.getGraphics(created);
      if (gfx && gfx.parentNode) {
        gfx.parentNode.insertBefore(gfx, gfx.parentNode.firstChild);
      }
    }
    this.selection.select(created);
    return created;
  }

  connectNodes(source, target, label = '') {
    return this.modeling.connect(source, target, { nodeTitle: label });
  }

  updateElement(element, props = {}) {
    if (!element || element === this.root) return;
    if (props.label !== undefined) {
      element.nodeTitle = props.label;
    }
    if (props.subtitle !== undefined) {
      element.subtitle = props.subtitle;
    }
    if (props.theme !== undefined) {
      element.theme = props.theme;
    }
    const gfx = this.canvas.getGraphics(element);
    if (gfx) {
      const visual = gfx.querySelector('.djs-visual');
      if (visual) {
        while (visual.firstChild) visual.removeChild(visual.firstChild);
        const renderer = this.diagram.get('cloudQubesRenderer');
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
    const all = this.elementRegistry.filter(el => el !== this.root);
    if (all.length > 0) {
      this.modeling.removeElements(all);
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
    this.canvas.zoom('fit-viewport', 'auto');
  }

  loadTemplate(templateName) {
    this.clear();

    if (templateName === 'blank') {
      return;
    }

    if (templateName === 'event_driven') {
      const client = this.addNode({ shapeType: 'client', label: 'Producer API', subtitle: 'Ingress', theme: 'rose', x: 70, y: 170 });
      const bus = this.addNode({ shapeType: 'queue', label: 'Cloud Pub/Sub', subtitle: 'Event Stream', theme: 'amber', x: 310, y: 170 });
      const workerA = this.addNode({ shapeType: 'service', label: 'Billing Worker', subtitle: 'Cloud Run', theme: 'emerald', x: 565, y: 95 });
      const workerB = this.addNode({ shapeType: 'service', label: 'Analytics Worker', subtitle: 'Dataflow', theme: 'blue', x: 565, y: 245 });
      const db = this.addNode({ shapeType: 'database', label: 'BigQuery Warehouse', subtitle: 'OLAP Store', theme: 'blue', x: 810, y: 170 });

      this.connectNodes(client, bus, 'Publish');
      this.connectNodes(bus, workerA, 'Push');
      this.connectNodes(bus, workerB, 'Pull');
      this.connectNodes(workerA, db, 'Write');
      this.connectNodes(workerB, db, 'Stream');
      this.selection.select([]);
      return;
    }

    if (templateName === 'rag_pipeline') {
      const user = this.addNode({ shapeType: 'client', label: 'User Prompt', subtitle: 'Client App', theme: 'rose', x: 60, y: 170 });
      const orchestrator = this.addNode({ shapeType: 'service', label: 'RAG Orchestrator', subtitle: 'API Service', theme: 'slate', x: 295, y: 170 });
      const vectorDb = this.addNode({ shapeType: 'database', label: 'Vector Search DB', subtitle: 'Embeddings', theme: 'blue', x: 545, y: 90 });
      const llm = this.addNode({ shapeType: 'service', label: 'Foundation LLM', subtitle: 'Vertex AI', theme: 'emerald', x: 545, y: 250 });

      this.connectNodes(user, orchestrator, 'Query');
      this.connectNodes(orchestrator, vectorDb, 'Top-K Cosine');
      this.connectNodes(orchestrator, llm, 'Augmented Prompt');
      this.selection.select([]);
      return;
    }

    // Default: 'three_tier'
    this.addNode({ shapeType: 'group', label: 'Production VPC (us-central1)', subtitle: 'Boundary', theme: 'slate', x: 280, y: 55, width: 515, height: 315 });
    const client = this.addNode({ shapeType: 'client', label: 'Web & Mobile Clients', subtitle: 'External', theme: 'rose', x: 55, y: 175 });
    const lb = this.addNode({ shapeType: 'gateway', label: 'Cloud Load Balancer', subtitle: 'Gateway', theme: 'emerald', x: 310, y: 170 });
    const app = this.addNode({ shapeType: 'service', label: 'Cloud Run API', subtitle: 'Stateless Compute', theme: 'slate', x: 540, y: 105 });
    const cache = this.addNode({ shapeType: 'queue', label: 'Memorystore Redis', subtitle: 'In-Memory Cache', theme: 'amber', x: 540, y: 240 });
    const db = this.addNode({ shapeType: 'database', label: 'Cloud SQL Primary', subtitle: 'PostgreSQL HA', theme: 'blue', x: 830, y: 105 });

    this.connectNodes(client, lb, 'HTTPS');
    this.connectNodes(lb, app, 'Route');
    this.connectNodes(app, cache, 'Cache Lookup');
    this.connectNodes(app, db, 'Read / Write');
    this.selection.select([]);
  }

  /**
   * Exports the current diagram as a standalone SVG string and 2x Retina PNG Blob.
   */
  async exportToPngBlob(scale = 2) {
    // Clear selection so selection outlines and context pads aren't in the exported image
    this.selection.select([]);

    const elements = this.elementRegistry.filter(el => el !== this.root);
    if (elements.length === 0) {
      throw new Error('Canvas is empty. Add at least one shape before exporting.');
    }

    // Calculate bounding box across all shapes and connection waypoints
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      if (el.waypoints) {
        el.waypoints.forEach(pt => {
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

    const liveSvg = this.container.querySelector('svg');
    const viewport = liveSvg.querySelector('g.viewport');

    const cloneViewport = viewport.cloneNode(true);
    cloneViewport.setAttribute('transform', `translate(${-boxX}, ${-boxY})`);

    // Strip interactive hit boxes, outlines, and resizers from the export clone
    cloneViewport.querySelectorAll('.djs-outline, .djs-resizer, .djs-bendpoint, .djs-segment-dragger, .djs-hit').forEach(node => node.remove());

    const exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    exportSvg.setAttribute('width', String(boxW));
    exportSvg.setAttribute('height', String(boxH));
    exportSvg.setAttribute('viewBox', `0 0 ${boxW} ${boxH}`);

    const defs = liveSvg.querySelector('defs');
    if (defs) {
      exportSvg.appendChild(defs.cloneNode(true));
    }

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', String(boxW));
    bgRect.setAttribute('height', String(boxH));
    bgRect.setAttribute('rx', '16');
    bgRect.setAttribute('ry', '16');
    bgRect.setAttribute('fill', '#ffffff');
    exportSvg.appendChild(bgRect);

    exportSvg.appendChild(cloneViewport);

    const svgData = new XMLSerializer().serializeToString(exportSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = boxW * scale;
        offscreen.height = boxH * scale;
        const ctx = offscreen.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, boxW, boxH);
        URL.revokeObjectURL(url);

        offscreen.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Failed to encode diagram PNG'));
          }
        }, 'image/png');
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
}

export default CloudQubesDiagramStudio;
