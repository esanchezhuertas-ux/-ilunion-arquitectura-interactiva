"use strict";

const COLORS = {
  corporate: "#253D88",
  servicios: "#075985",
  consultoria: "#9A3412",
  bienestar: "#006D77",
  textilcare: "#6D28A0",
  tutienda: "#9D2862",
  circular: "#805500",
  hoteles: "#2D653E",
  nosotros: "#4659A1",
  compromiso: "#426B2F",
  contacto: "#A13336",
  comunicacion: "#7A3E78",
  sedes: "#356777",
  empleo: "#68641B",
  documentacion: "#746245",
  legal: "#59616D"
};

const BUSINESS_KEY = [
  ["ILUNION Servicios", COLORS.servicios, "servicios"],
  ["ILUNION Consultoría", COLORS.consultoria, "consultoria"],
  ["Bienestar y VidaSénior", COLORS.bienestar, "bienestar"],
  ["ILUNION TextilCare", COLORS.textilcare, "textilcare"],
  ["ILUNION Retail", COLORS.tutienda, "retail"],
  ["Economía Circular", COLORS.circular, "circular"],
  ["ILUNION Hoteles ↗", COLORS.hoteles, "hoteles"]
];

const BUSINESS_ICONS = {
  servicios: { icon: "servicios", color: COLORS.servicios },
  consultoria: { icon: "consultoria", color: COLORS.consultoria },
  bienestar: { icon: "bienestar", color: COLORS.bienestar },
  textilcare: { icon: "textilcare", color: COLORS.textilcare },
  tutienda: { icon: "retail", color: COLORS.tutienda },
  circular: { icon: "circular", color: COLORS.circular },
  hoteles: { icon: "hoteles", color: COLORS.hoteles }
};

const THEME_KEY = [
  ["Nosotros", COLORS.nosotros],
  ["Compromiso", COLORS.compromiso],
  ["Contacto", COLORS.contacto],
  ["Blog / noticias", COLORS.comunicacion],
  ["Sedes", COLORS.sedes],
  ["Empleo", COLORS.empleo],
  ["Documentación", COLORS.documentacion],
  ["Legal / footer", COLORS.legal]
];

const MOBILE_QUERY = "(max-width: 840px), (pointer: coarse) and (max-width: 1024px)";
const MINIMAP_QUERY = "(min-width: 841px) and (hover: hover) and (pointer: fine)";
const MINIMAP_VIEWPORT_FILL = "#0071E3";

const dom = {
  header: document.querySelector(".app-header"),
  viewport: document.querySelector("#mapViewport"),
  scene: document.querySelector("#scene"),
  svg: document.querySelector("#connectors"),
  connections: document.querySelector("#connectionLayer"),
  nodes: document.querySelector("#nodes"),
  visibleCount: document.querySelector("#visibleCount"),
  totalCount: document.querySelector("#totalCount"),
  minimap: document.querySelector("#minimap"),
  minimapStage: document.querySelector("#minimapStage"),
  minimapNavigator: document.querySelector("#minimapNavigator"),
  minimapCanvas: document.querySelector("#minimapCanvas"),
  minimapZoom: document.querySelector("#minimapZoom"),
  minimapZoomSlider: document.querySelector("#minimapZoomSlider"),
  minimapZoomOutButton: document.querySelector("#minimapZoomOutButton"),
  minimapZoomInButton: document.querySelector("#minimapZoomInButton"),
  minimapFitButton: document.querySelector("#minimapFitButton"),
  minimapToggleButton: document.querySelector("#minimapToggleButton"),
  minimapLocation: document.querySelector("#minimapLocation"),
  zoomValue: document.querySelector("#zoomValue"),
  search: document.querySelector("#nodeSearch"),
  searchResults: document.querySelector("#searchResults"),
  searchStatus: document.querySelector("#searchStatus"),
  legend: document.querySelector("#legendPanel"),
  legendButton: document.querySelector("#legendButton"),
  closeLegendButton: document.querySelector("#closeLegendButton"),
  businessColorKey: document.querySelector("#businessColorKey"),
  themeColorKey: document.querySelector("#themeColorKey"),
  summaryButton: document.querySelector("#summaryButton"),
  expandButton: document.querySelector("#expandButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  fitButton: document.querySelector("#fitButton"),
  hint: document.querySelector("#interactionHint"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toastMessage"),
  toastDismissButton: document.querySelector("#toastDismissButton"),
  poweredBy: document.querySelector(".powered-by")
};

const state = {
  root: null,
  allNodes: [],
  visibleNodes: [],
  transform: { x: 0, y: 0, scale: 1 },
  sceneWidth: 1200,
  sceneHeight: 900,
  mobile: window.matchMedia(MOBILE_QUERY).matches,
  searchIndex: -1,
  highlightedId: null,
  focusedId: null,
  focusOrigin: null,
  focusPathIds: new Set(),
  focusTimer: null,
  hoverFocusTimer: null,
  toastTimer: null,
  pointers: new Map(),
  panOrigin: null,
  pinchOrigin: null,
  didDrag: false,
  suppressClick: false,
  suppressClickTimer: null,
  minimapMetrics: null,
  minimapFrame: null,
  minimapViewportRect: null,
  minimapPointerId: null,
  minimapDragOrigin: null,
  minimapCollapsed: false,
  viewportWidth: window.innerWidth,
  elasticDrag: null
};

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_PORT_OFFSET = 12;
const NODE_DRAG_THRESHOLD = 7;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const EXTERNAL_HOSTS = new Set([
  "ilunionhotels.com",
  "jobsolutions.ilunionservicios.com",
  "gestiontextil.iluniontextilcare.com",
  "citafisioterapia.ilunionbienestaryvidasenior.com",
  "empleo.ilunion.com",
  "ilunion.integrityline.com",
  "iluniontextilcare.ofertas-trabajo.infojobs.net",
  "gruposocialonce.com",
  "dondedormiresdespertar.es"
]);
const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/↗/g, "")
  .trim();

function appendHighlightedText(container, value, query) {
  const source = String(value || "");
  const needle = normalize(query);
  if (!needle) {
    container.textContent = source;
    return;
  }

  let searchable = "";
  const sourceIndexBySearchIndex = [];
  [...source].forEach((character, sourceIndex) => {
    const folded = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    [...folded].forEach((part) => {
      searchable += part;
      sourceIndexBySearchIndex.push(sourceIndex);
    });
  });

  let searchCursor = 0;
  let sourceCursor = 0;
  let matchStart = searchable.indexOf(needle, searchCursor);
  if (matchStart < 0) {
    container.textContent = source;
    return;
  }

  while (matchStart >= 0) {
    const start = sourceIndexBySearchIndex[matchStart];
    const end = sourceIndexBySearchIndex[matchStart + needle.length - 1] + 1;
    if (start > sourceCursor) container.append(document.createTextNode(source.slice(sourceCursor, start)));
    const highlight = document.createElement("mark");
    highlight.className = "result-match";
    highlight.textContent = source.slice(start, end);
    container.append(highlight);
    sourceCursor = end;
    searchCursor = matchStart + needle.length;
    matchStart = searchable.indexOf(needle, searchCursor);
  }
  if (sourceCursor < source.length) container.append(document.createTextNode(source.slice(sourceCursor)));
}

function pathKey(path) {
  return JSON.stringify(path);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function colorWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isExternal(node) {
  if (typeof node.external === "boolean") return node.external;
  if (node.method === "annotation-link" || /↗/.test(`${node.title} ${node.label || ""}`)) return true;
  if (!node.url) return false;
  try {
    const hostname = new URL(node.url, "https://www.ilunion.com/")
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
    return EXTERNAL_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function isPdf(node) {
  return Boolean(node.url && /\.pdf(?:$|[?#])/i.test(node.url));
}

function lineType(node) {
  if (isExternal(node)) return "dashed";
  if (node.method === "current-parent-module") return "dotted";
  if (node.method === "template-example") return "detail";
  return "solid";
}

function isModuleNode(node) {
  return node.method === "current-parent-module";
}

function isSearchNode(node) {
  return /^buscador\b/.test(normalize(node.title));
}

function isRestrictedAccessNode(node) {
  if (node.parent?.title !== "Accesos y pie de página") return false;
  const title = normalize(node.title);
  return title === "portal del proveedor" || title === "portal del empleado";
}

function connectorType(node) {
  if (isModuleNode(node)) return "dotted";
  if (node.isAnnotation && !node.url) return "dotted";
  return lineType(node);
}

function themeFor(node) {
  if (!node) return COLORS.corporate;
  if (node.isAnnotation && node.parent) return themeFor(node.parent);

  const pathText = node.path.join(" / ");
  const title = normalize(node.title);
  const pathLevelOne = node.path[1] || "";

  if (node.depth === 0 || node.title === "Qué hacemos") return COLORS.corporate;
  if (/ILUNION Hoteles/.test(pathText)) return COLORS.hoteles;
  if (node.method === "current-business-blog" || /^(blog|noticias|actualidad)$/.test(title)) return COLORS.comunicacion;
  if (node.method === "current-business-docs" || /(documentacion|documentación|catalogos|catálogos|descargas)/i.test(node.title)) return COLORS.documentacion;
  if (/(contacto|recursos y contacto)/i.test(node.title)) return COLORS.contacto;
  if (/(trabaja con nosotros|unete al equipo|únete al equipo|empleo)/i.test(node.title)) return COLORS.empleo;
  if (/sedes/i.test(node.title) || pathLevelOne === "Sedes") return COLORS.sedes;
  if (/(informacion legal|información legal|politica de|política de|aviso legal|cookies|canal de denuncias)/i.test(node.title) || pathLevelOne === "Accesos y pie de página") return COLORS.legal;
  if (/compromiso/i.test(node.title) || node.path.includes("Compromiso")) return COLORS.compromiso;
  if (pathLevelOne === "Nosotros") return COLORS.nosotros;
  if (pathLevelOne === "Contacto") return COLORS.contacto;
  if (pathLevelOne === "Comunicación") return COLORS.comunicacion;
  if (pathLevelOne === "Únete al equipo") return COLORS.empleo;

  return COLORS[node.business] || (node.parent ? themeFor(node.parent) : COLORS.corporate);
}

function businessIconFor(node) {
  if (!node) return null;
  if (node.path.some((segment) => /ILUNION Hoteles/i.test(segment))) return BUSINESS_ICONS.hoteles;
  return BUSINESS_ICONS[node.business] || null;
}

function buildTree(records) {
  const byPath = new Map();
  let serial = 0;

  records.forEach((record, recordOrder) => {
    record.path.forEach((segment, index) => {
      const path = record.path.slice(0, index + 1);
      const key = pathKey(path);
      let node = byPath.get(key);

      if (!node) {
        node = {
          id: `node-${serial++}`,
          key,
          title: segment,
          label: segment,
          subtitle: "",
          path,
          depth: index,
          order: recordOrder,
          parent: null,
          children: [],
          collapsed: false,
          url: null,
          method: null,
          business: record.business || "corporate",
          sourceId: null,
          descendantCount: 0,
          isAnnotation: false
        };
        byPath.set(key, node);

        if (index > 0) {
          const parent = byPath.get(pathKey(path.slice(0, -1)));
          if (parent) {
            node.parent = parent;
            parent.children.push(node);
          }
        }
      }

      node.order = Math.min(node.order, recordOrder);

      if (index === record.path.length - 1) {
        const labelParts = String(record.label || segment).split("\n");
        node.label = record.label || segment;
        node.title = labelParts[0];
        node.subtitle = labelParts.slice(1).join(" · ");
        node.url = record.url;
        node.method = record.method;
        node.business = record.business || node.business;
        node.sourceId = record.id;
      }
    });
  });

  const root = byPath.get(pathKey(["ILUNION"]));
  if (!root) throw new Error("No se ha encontrado la raíz ILUNION.");

  function addAnnotation(parent, { title, pathTitle, keySuffix, url = null, order = Number.MAX_SAFE_INTEGER }) {
    if (!parent) return;
    const annotation = {
      id: `annotation-${serial++}`,
      key: `${parent.key}:${keySuffix}`,
      title,
      label: title,
      subtitle: "",
      path: [...parent.path, pathTitle || title.replace(/^\*\s*/, "")],
      depth: parent.depth + 1,
      order,
      parent,
      children: [],
      collapsed: false,
      url,
      method: url ? "annotation-link" : "annotation",
      business: parent.business,
      sourceId: null,
      descendantCount: 0,
      isAnnotation: true
    };
    parent.children.push(annotation);
  }

  const fisioterapia = [...byPath.values()].find((node) =>
    node.title === "Fisioterapia" && node.path.some((part) => /VidaSénior/.test(part))
  );
  addAnnotation(fisioterapia, {
    title: "* Landings de Fisio For All",
    keySuffix: "fisio-for-all"
  });

  const corporateBlog = byPath.get(pathKey(["ILUNION", "Comunicación", "Blog Punto ILUNION"]));
  addAnnotation(corporateBlog, {
    title: "* Donde el dormir es despertar (pendiente de aprobación)",
    keySuffix: "donde-el-dormir-es-despertar",
    url: "https://dondedormiresdespertar.es/",
    order: Number.MAX_SAFE_INTEGER - 1
  });

  const hoteles = [...byPath.values()].find((node) =>
    /^ILUNION Hoteles(?:\s*↗)?$/.test(node.title) && node.path.length === 3
  );
  addAnnotation(hoteles, {
    title: "* Landings informacionales (pendiente de aprobación)",
    keySuffix: "landings-informacionales"
  });

  const topOrder = ["Qué hacemos", "Nosotros", "Sedes", "Contacto", "Únete al equipo", "Comunicación", "Accesos y pie de página"];
  const businessOrder = ["ILUNION Servicios", "ILUNION TextilCare", "ILUNION Retail", "ILUNION Bienestar y VidaSénior", "ILUNION Economía Circular", "ILUNION Consultoría", "ILUNION Hoteles ↗"];
  const footerOrder = ["Buscador global", "Portal del proveedor", "Portal del empleado", "Accesibilidad", "Canal de denuncias ↗", "Documentos corporativos", "Información legal", "Redes sociales"];
  const legalOrder = ["Política de privacidad", "Aviso legal", "Política de cookies", "Privacidad por WhatsApp"];

  function sortChildren(node) {
    node.children.sort((a, b) => {
      if (node === root) {
        const ai = topOrder.indexOf(a.title);
        const bi = topOrder.indexOf(b.title);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      if (node.title === "Qué hacemos") {
        const ai = businessOrder.indexOf(a.title);
        const bi = businessOrder.indexOf(b.title);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      if (node.title === "Accesos y pie de página") {
        const ai = footerOrder.indexOf(a.title);
        const bi = footerOrder.indexOf(b.title);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      if (node.title === "Información legal") {
        const ai = legalOrder.indexOf(a.title);
        const bi = legalOrder.indexOf(b.title);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      return a.order - b.order || a.title.localeCompare(b.title, "es");
    });
    node.children.forEach(sortChildren);
  }

  function countDescendants(node) {
    node.descendantCount = node.children.reduce(
      (total, child) => total + (child.isAnnotation ? 0 : 1) + countDescendants(child),
      0
    );
    return node.descendantCount;
  }

  sortChildren(root);
  countDescendants(root);

  const allNodes = [];
  (function walk(node) {
    allNodes.push(node);
    node.children.forEach(walk);
  })(root);

  allNodes.forEach((node) => {
    if (!node.children.length) return;
    node.collapsed = !(node.depth === 0 || node.title === "Qué hacemos");
  });

  return { root, allNodes };
}

function nodeDimensions(node, mobile) {
  if (mobile) {
    const viewportWidth = dom.viewport.clientWidth || window.innerWidth;
    const baseWidth = Math.max(272, Math.min(320, viewportWidth - 56));
    const width = Math.max(252, baseWidth - Math.min(node.depth, 4) * 4);
    const heights = [92, 80, 72, 66, 60];
    const minimumHeight = node.isAnnotation ? 42 : heights[Math.min(node.depth, 4)];
    return {
      width: node.isAnnotation ? Math.max(272, width) : width,
      height: Math.max(minimumHeight, node.measuredHeight || 0)
    };
  }

  const sizes = [
    { width: 260, height: 104 },
    { width: 244, height: 82 },
    { width: 226, height: 72 },
    { width: 210, height: 64 },
    { width: 194, height: 56 }
  ];
  const size = sizes[Math.min(node.depth, 4)];
  const width = node.isAnnotation ? Math.max(268, size.width) : size.width;
  return { width, height: Math.max(node.isAnnotation ? 42 : size.height, node.measuredHeight || 0) };
}

function getVisibleNodes() {
  const result = [];
  function walk(node) {
    result.push(node);
    if (!node.collapsed) node.children.forEach(walk);
  }
  walk(state.root);
  return result;
}

function layoutDesktop(visible) {
  const visibleSet = new Set(visible.map((node) => node.id));
  let leafCursor = 92;
  const columnSpacing = 80;
  const dimensionsById = new Map();
  const columnWidths = [];

  visible.forEach((node) => {
    const dimensions = nodeDimensions(node, false);
    dimensionsById.set(node.id, dimensions);
    columnWidths[node.depth] = Math.max(columnWidths[node.depth] || 0, dimensions.width);
  });

  const columnX = [64];
  for (let depth = 1; depth < columnWidths.length; depth += 1) {
    columnX[depth] = columnX[depth - 1] + columnWidths[depth - 1] + columnSpacing;
  }

  function place(node) {
    const dimensions = dimensionsById.get(node.id);
    node.layout = { ...dimensions, x: columnX[node.depth], y: 0 };
    const children = node.collapsed ? [] : node.children.filter((child) => visibleSet.has(child.id));

    if (!children.length) {
      node.layout.y = leafCursor;
      leafCursor += Math.max(84, dimensions.height + 24);
      return;
    }

    children.forEach(place);
    node.layout.y = (children[0].layout.y + children[children.length - 1].layout.y) / 2;
  }

  place(state.root);
  const maxRight = Math.max(...visible.map((node) => node.layout.x + node.layout.width));
  const maxBottom = Math.max(...visible.map((node) => node.layout.y + node.layout.height / 2));
  state.sceneWidth = maxRight + 120;
  state.sceneHeight = Math.max(maxBottom + 90, 640);
}

function layoutMobile(visible) {
  let cursor = 68;
  let maxRight = 0;

  visible.forEach((node) => {
    const dimensions = nodeDimensions(node, true);
    const indent = Math.min(node.depth, 6) * 124;
    node.layout = {
      ...dimensions,
      x: 28 + indent,
      y: cursor + dimensions.height / 2
    };
    cursor += dimensions.height + (node.isAnnotation ? 28 : 48);
    maxRight = Math.max(maxRight, node.layout.x + dimensions.width);
  });

  state.sceneWidth = Math.max(maxRight + 96, dom.viewport.clientWidth + 240);
  state.sceneHeight = Math.max(cursor + 160, dom.viewport.clientHeight + 120);
}

function createSvgPath(className, d, color, delay, focusChildId, connectorMeta = null) {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", className);
  path.setAttribute("d", d);
  path.setAttribute("stroke", color);
  if (delay !== undefined) path.style.animationDelay = `${delay}s`;
  if (focusChildId) path.dataset.focusChildId = focusChildId;
  if (connectorMeta) {
    path.connectorMeta = { ...connectorMeta, restD: d };
    if (connectorMeta.parent) path.dataset.connectorParentId = connectorMeta.parent.id;
    if (connectorMeta.child) path.dataset.connectorChildId = connectorMeta.child.id;
  }
  return path;
}

function roundedOrthogonalPath(points, radius = 16) {
  const clean = [];

  points.forEach((point) => {
    const previous = clean[clean.length - 1];
    if (!previous || previous.x !== point.x || previous.y !== point.y) clean.push(point);
  });

  if (clean.length < 2) return "";
  if (clean.length === 2) return `M ${clean[0].x} ${clean[0].y} L ${clean[1].x} ${clean[1].y}`;

  const simplified = [clean[0]];
  for (let index = 1; index < clean.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1];
    const current = clean[index];
    const next = clean[index + 1];
    const sameHorizontal = previous.y === current.y && current.y === next.y;
    const sameVertical = previous.x === current.x && current.x === next.x;
    if (!sameHorizontal && !sameVertical) simplified.push(current);
  }
  simplified.push(clean[clean.length - 1]);

  let path = `M ${simplified[0].x} ${simplified[0].y}`;
  for (let index = 1; index < simplified.length - 1; index += 1) {
    const previous = simplified[index - 1];
    const corner = simplified[index];
    const next = simplified[index + 1];
    const incomingLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const incomingX = (corner.x - previous.x) / incomingLength;
    const incomingY = (corner.y - previous.y) / incomingLength;
    const outgoingX = (next.x - corner.x) / outgoingLength;
    const outgoingY = (next.y - corner.y) / outgoingLength;
    const before = {
      x: corner.x - incomingX * cornerRadius,
      y: corner.y - incomingY * cornerRadius
    };
    const after = {
      x: corner.x + outgoingX * cornerRadius,
      y: corner.y + outgoingY * cornerRadius
    };
    const cross = incomingX * outgoingY - incomingY * outgoingX;
    const sweep = cross > 0 ? 1 : 0;
    path += ` L ${before.x} ${before.y} A ${cornerRadius} ${cornerRadius} 0 0 ${sweep} ${after.x} ${after.y}`;
  }

  const last = simplified[simplified.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function desktopStepPath(parent, child, parentLayout = parent.layout, childLayout = child.layout) {
  const p = parentLayout;
  const c = childLayout;
  const startX = p.x + p.width;
  const startY = p.y;
  const endX = c.x - NODE_PORT_OFFSET;
  const endY = c.y;
  const railX = startX + (endX - startX) / 2;
  const verticalDistance = Math.abs(endY - startY);

  if (verticalDistance < 1) return `M ${startX} ${startY} L ${endX} ${endY}`;

  const radius = Math.max(1, Math.min(24, (endX - startX) / 2 - 8, verticalDistance / 2));
  const direction = Math.sign(endY - startY);
  const firstSweep = direction > 0 ? 1 : 0;
  const secondSweep = direction > 0 ? 0 : 1;
  return [
    `M ${startX} ${startY}`,
    `L ${railX - radius} ${startY}`,
    `A ${radius} ${radius} 0 0 ${firstSweep} ${railX} ${startY + direction * radius}`,
    `L ${railX} ${endY - direction * radius}`,
    `A ${radius} ${radius} 0 0 ${secondSweep} ${railX + radius} ${endY}`,
    `L ${endX} ${endY}`
  ].join(" ");
}

function connectorPath(parent, child, parentLayout = parent.layout, childLayout = child.layout) {
  const p = parentLayout;
  const c = childLayout;

  if (state.mobile) {
    const startX = p.x + 24;
    const startY = p.y + p.height / 2;
    const railX = c.x - 28;
    return roundedOrthogonalPath([
      { x: startX, y: startY },
      { x: startX, y: startY + 32 },
      { x: railX, y: startY + 32 },
      { x: railX, y: c.y },
      { x: c.x - NODE_PORT_OFFSET, y: c.y }
    ], 16);
  }

  return desktopStepPath(parent, child, p, c);
}

function desktopConnectorFlowPaths(parent, child) {
  return [connectorPath(parent, child)];
}

function renderConnectors(visible) {
  dom.connections.replaceChildren();
  const visibleSet = new Set(visible.map((node) => node.id));
  const fragment = document.createDocumentFragment();

  if (state.mobile) {
    let connectionIndex = 0;

    visible.forEach((parent) => {
      const children = parent.collapsed
        ? []
        : parent.children.filter((child) => visibleSet.has(child.id));
      if (!children.length) return;

      if (children.length === 1) {
        const child = children[0];
        const color = themeFor(child);
        const type = connectorType(child);
        const d = connectorPath(parent, child);
        const connectorMeta = { role: "direct", parent, child };
        const baseClass = `connector connector-base${type === "solid" ? "" : ` base-${type}`}`;
        const flowClass = `connector connector-flow${type === "solid" ? "" : ` flow-${type}`}`;
        fragment.append(createSvgPath(baseClass, d, color, undefined, child.id, connectorMeta));
        if (type !== "dotted") {
          fragment.append(createSvgPath(flowClass, d, color, -((connectionIndex % 9) * 0.13), child.id, connectorMeta));
        }
        connectionIndex += 1;
        return;
      }

      const parentLayout = parent.layout;
      const railX = Math.min(...children.map((child) => child.layout.x)) - 28;
      const startX = parentLayout.x + 24;
      const startY = parentLayout.y + parentLayout.height / 2;
      const lastY = children[children.length - 1].layout.y;
      const spine = roundedOrthogonalPath([
        { x: startX, y: startY },
        { x: startX, y: startY + 32 },
        { x: railX, y: startY + 32 },
        { x: railX, y: lastY }
      ], 16);
      fragment.append(createSvgPath(
        "connector connector-base mobile-spine",
        spine,
        themeFor(parent),
        undefined,
        undefined,
        { role: "mobile-spine", parent, railX, endY: lastY }
      ));

      const flowingChildren = children.filter((child) => connectorType(child) !== "dotted");
      if (flowingChildren.length) {
        const lastFlowY = flowingChildren[flowingChildren.length - 1].layout.y;
        const allDetails = flowingChildren.every((child) => connectorType(child) === "detail");
        const flowSpine = roundedOrthogonalPath([
          { x: startX, y: startY },
          { x: startX, y: startY + 32 },
          { x: railX, y: startY + 32 },
          { x: railX, y: lastFlowY }
        ], 16);
        fragment.append(createSvgPath(
          `connector connector-flow mobile-spine-flow${allDetails ? " flow-detail" : ""}`,
          flowSpine,
          themeFor(parent),
          -((connectionIndex % 9) * 0.13),
          undefined,
          { role: "mobile-spine", parent, railX, endY: lastFlowY }
        ));
      }

      children.forEach((child) => {
        const color = themeFor(child);
        const type = connectorType(child);
        const d = roundedOrthogonalPath([
          { x: railX, y: child.layout.y },
          { x: child.layout.x - NODE_PORT_OFFSET, y: child.layout.y }
        ]);
        const connectorMeta = {
          role: "mobile-branch",
          parent,
          child,
          railX,
          anchorY: child.layout.y
        };
        const baseClass = `connector connector-base${type === "solid" ? "" : ` base-${type}`}`;
        const flowClass = `connector connector-flow${type === "solid" ? "" : ` flow-${type}`}`;
        fragment.append(createSvgPath(baseClass, d, color, undefined, child.id, connectorMeta));
        if (type !== "dotted") {
          fragment.append(createSvgPath(flowClass, d, color, -((connectionIndex % 9) * 0.13), child.id, connectorMeta));
        }
        connectionIndex += 1;
      });
    });

    dom.connections.append(fragment);
    return;
  }

  visible.forEach((child, index) => {
    const parent = child.parent;
    if (!parent || !visibleSet.has(parent.id)) return;

    const color = themeFor(child);
    const type = connectorType(child);
    const d = connectorPath(parent, child);
    const connectorMeta = { role: "direct", parent, child };
    const baseClass = `connector connector-base${type === "solid" ? "" : ` base-${type}`}`;
    const flowClass = `connector connector-flow${type === "solid" ? "" : ` flow-${type}`}`;

    fragment.append(createSvgPath(baseClass, d, color, undefined, child.id, connectorMeta));
    if (type !== "dotted") {
      desktopConnectorFlowPaths(parent, child).forEach((flowPath, partIndex) => {
        const delay = -((index % 9) * 0.13) - partIndex * 0.21;
        fragment.append(createSvgPath(flowClass, flowPath, color, delay, child.id, connectorMeta));
      });
    }
  });

  dom.connections.append(fragment);
}

function elasticLayoutFor(node, drag) {
  if (!drag || drag.node !== node || drag.phase === "pending") return node.layout;
  const scale = Math.max(0.001, state.transform.scale);
  return {
    ...node.layout,
    x: node.layout.x + drag.offsetX / scale,
    y: node.layout.y + drag.offsetY / scale
  };
}

function isElasticConnectorForNode(path, node) {
  const meta = path.connectorMeta;
  if (!meta) return false;
  if (meta.role === "direct") return meta.parent === node || meta.child === node;
  if (meta.role === "mobile-branch") return meta.child === node;
  if (meta.role === "mobile-spine") return meta.parent === node;
  return false;
}

function elasticConnectorPath(path, drag) {
  const meta = path.connectorMeta;
  if (!meta) return path.getAttribute("d") || "";

  if (meta.role === "direct") {
    return connectorPath(
      meta.parent,
      meta.child,
      elasticLayoutFor(meta.parent, drag),
      elasticLayoutFor(meta.child, drag)
    );
  }

  if (meta.role === "mobile-branch") {
    const childLayout = elasticLayoutFor(meta.child, drag);
    return roundedOrthogonalPath([
      { x: meta.railX, y: meta.anchorY },
      { x: meta.railX, y: childLayout.y },
      { x: childLayout.x - NODE_PORT_OFFSET, y: childLayout.y }
    ], 16);
  }

  if (meta.role === "mobile-spine") {
    const parentLayout = elasticLayoutFor(meta.parent, drag);
    const startX = parentLayout.x + 24;
    const startY = parentLayout.y + parentLayout.height / 2;
    return roundedOrthogonalPath([
      { x: startX, y: startY },
      { x: startX, y: startY + 32 },
      { x: meta.railX, y: startY + 32 },
      { x: meta.railX, y: meta.endY }
    ], 16);
  }

  return meta.restD;
}

function paintElasticDrag(drag) {
  if (!drag?.element?.isConnected) return;
  const scale = Math.max(0.001, state.transform.scale);
  drag.element.style.setProperty("--elastic-x", `${drag.offsetX / scale}px`);
  drag.element.style.setProperty("--elastic-y", `${drag.offsetY / scale}px`);
  drag.paths.forEach((path) => {
    if (path.isConnected) path.setAttribute("d", elasticConnectorPath(path, drag));
  });
}

function scheduleElasticPaint(drag) {
  if (drag.paintRaf) return;
  drag.paintRaf = window.requestAnimationFrame(() => {
    drag.paintRaf = null;
    if (state.elasticDrag === drag) paintElasticDrag(drag);
  });
}

function finishElasticDrag(drag = state.elasticDrag) {
  if (!drag) return;
  drag.phase = "finished";
  if (drag.paintRaf) window.cancelAnimationFrame(drag.paintRaf);
  if (drag.springRaf) window.cancelAnimationFrame(drag.springRaf);
  drag.paintRaf = null;
  drag.springRaf = null;
  try {
    if (drag.element?.hasPointerCapture?.(drag.pointerId)) {
      drag.element.releasePointerCapture(drag.pointerId);
    }
  } catch {}
  drag.element?.style.removeProperty("--elastic-x");
  drag.element?.style.removeProperty("--elastic-y");
  drag.element?.classList.remove("is-elastic-dragging", "is-elastic-returning");
  drag.paths?.forEach((path) => {
    if (!path.isConnected || !path.connectorMeta) return;
    path.setAttribute("d", path.connectorMeta.restD);
    path.classList.remove("is-elastic");
  });
  dom.viewport.classList.remove("is-node-dragging");
  if (state.elasticDrag === drag) state.elasticDrag = null;
}

function cancelElasticDrag() {
  finishElasticDrag(state.elasticDrag);
}

function elasticLimitFor(node) {
  const scaledWidth = node.layout.width * state.transform.scale;
  const minimum = state.mobile ? 82 : 84;
  const maximum = state.mobile ? 112 : 144;
  return clamp(scaledWidth * 0.55, minimum, maximum);
}

function resistedElasticDelta(deltaX, deltaY, limit) {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 0.001) return { x: 0, y: 0 };
  const softStart = limit * 0.32;
  const effectiveDistance = distance <= softStart
    ? distance
    : softStart + (limit - softStart) * (1 - Math.exp(-(distance - softStart) / (limit - softStart)));
  const ratio = effectiveDistance / distance;
  return { x: deltaX * ratio, y: deltaY * ratio };
}

function beginElasticCandidate(event, element) {
  if (state.elasticDrag) finishElasticDrag(state.elasticDrag);
  const node = state.visibleNodes.find((candidate) => candidate.id === element.dataset.nodeId);
  if (!node) return false;
  window.clearTimeout(state.hoverFocusTimer);
  state.hoverFocusTimer = null;
  state.elasticDrag = {
    phase: "pending",
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    node,
    element,
    startClientX: event.clientX,
    startClientY: event.clientY,
    currentClientX: event.clientX,
    currentClientY: event.clientY,
    limit: elasticLimitFor(node),
    offsetX: 0,
    offsetY: 0,
    velocityX: 0,
    velocityY: 0,
    lastSampleX: 0,
    lastSampleY: 0,
    lastSampleTime: performance.now(),
    paths: [],
    paintRaf: null,
    springRaf: null
  };
  return true;
}

function activateElasticDrag(event, drag) {
  drag.phase = "dragging";
  drag.paths = [...dom.connections.querySelectorAll(".connector")]
    .filter((path) => isElasticConnectorForNode(path, drag.node));
  drag.paths.forEach((path) => path.classList.add("is-elastic"));
  drag.element.classList.add("is-elastic-dragging");
  dom.viewport.classList.add("is-node-dragging");
  clearNodeFocus();
  try { drag.element.setPointerCapture(event.pointerId); } catch {}
}

function updateElasticVelocity(drag, nextX, nextY, timestamp) {
  const elapsed = Math.max(1, timestamp - drag.lastSampleTime) / 1000;
  const instantaneousX = (nextX - drag.lastSampleX) / elapsed;
  const instantaneousY = (nextY - drag.lastSampleY) / elapsed;
  drag.velocityX = drag.velocityX * 0.62 + instantaneousX * 0.38;
  drag.velocityY = drag.velocityY * 0.62 + instantaneousY * 0.38;
  drag.lastSampleX = nextX;
  drag.lastSampleY = nextY;
  drag.lastSampleTime = timestamp;
}

function handleElasticPointerMove(event) {
  const drag = state.elasticDrag;
  if (!drag || drag.pointerId !== event.pointerId || drag.phase === "returning") return false;
  drag.currentClientX = event.clientX;
  drag.currentClientY = event.clientY;
  const rawX = event.clientX - drag.startClientX;
  const rawY = event.clientY - drag.startClientY;
  const rawDistance = Math.hypot(rawX, rawY);

  if (drag.phase === "pending") {
    if (rawDistance < NODE_DRAG_THRESHOLD) return true;
    activateElasticDrag(event, drag);
  }

  event.preventDefault();
  const resisted = resistedElasticDelta(rawX, rawY, drag.limit);
  updateElasticVelocity(drag, resisted.x, resisted.y, performance.now());
  drag.offsetX = resisted.x;
  drag.offsetY = resisted.y;
  scheduleElasticPaint(drag);
  return true;
}

function startElasticReturn(drag) {
  drag.phase = "returning";
  drag.element.classList.remove("is-elastic-dragging");
  drag.element.classList.add("is-elastic-returning");
  dom.viewport.classList.remove("is-node-dragging");
  try {
    if (drag.element.hasPointerCapture?.(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
  } catch {}

  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    finishElasticDrag(drag);
    return;
  }

  let velocityX = clamp(drag.velocityX, -850, 850);
  let velocityY = clamp(drag.velocityY, -850, 850);
  let previousTime = performance.now();
  const stiffness = 280;
  const damping = 24;

  const springStep = (timestamp) => {
    if (state.elasticDrag !== drag || drag.phase !== "returning") return;
    const deltaTime = Math.min(0.032, Math.max(0.001, (timestamp - previousTime) / 1000));
    previousTime = timestamp;
    velocityX += (-stiffness * drag.offsetX - damping * velocityX) * deltaTime;
    velocityY += (-stiffness * drag.offsetY - damping * velocityY) * deltaTime;
    drag.offsetX += velocityX * deltaTime;
    drag.offsetY += velocityY * deltaTime;
    paintElasticDrag(drag);

    if (Math.hypot(drag.offsetX, drag.offsetY) < 0.25 && Math.hypot(velocityX, velocityY) < 5) {
      finishElasticDrag(drag);
      return;
    }
    drag.springRaf = window.requestAnimationFrame(springStep);
  };

  if (drag.paintRaf) window.cancelAnimationFrame(drag.paintRaf);
  drag.paintRaf = null;
  paintElasticDrag(drag);
  drag.springRaf = window.requestAnimationFrame(springStep);
}

function handleElasticPointerRelease(event) {
  const drag = state.elasticDrag;
  if (!drag || drag.pointerId !== event.pointerId || drag.phase === "returning") return false;
  if (drag.phase === "pending") {
    finishElasticDrag(drag);
    return true;
  }

  state.suppressClick = true;
  window.clearTimeout(state.suppressClickTimer);
  state.suppressClickTimer = window.setTimeout(() => { state.suppressClick = false; }, 160);
  startElasticReturn(drag);
  return true;
}

function metaLabel(node) {
  if (node.method === "proposed-page-reference") return "Referencia actual · URL provisional";
  if (node.method === "template-example") return "Plantilla de ejemplo";
  if (node.method === "current-parent-module") return "Módulo o acceso";
  if (node.depth === 0) return "Ecosistema corporativo";
  if (isExternal(node)) return "Enlace externo";
  return "";
}

const CONTEXT_ICON_FILES = Object.freeze({
  global: "global.svg",
  description: "description.svg",
  navigation: "navigation.svg",
  module: "module.svg",
  template: "template.svg",
  link: "link.svg",
  external: "external.svg",
  ecosystem: "ecosystem.svg",
  pdf: "pdf.svg",
  location: "location.svg",
  form: "form.svg",
  archive: "archive.svg",
  briefcase: "briefcase.svg",
  mobile: "mobile.svg",
  article: "article.svg",
  business: "business.svg",
  layer: "layer.svg",
  window: "window.svg",
  search: "search.svg",
  lock: "lock.svg"
});

function isUrlOrNavigationDetail(value) {
  const raw = String(value || "");
  const text = normalize(raw);
  const containsUrlOrRoute = /https?:\/\/|www\.|(?:^|\s)[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|\s|$)|(?:^|[\s·])\/(?:[a-z0-9-]+\/?)+/i.test(raw);
  const containsBreadcrumb = /[›→]/.test(raw);
  const sharedNavigationCopy = /negocios? integrados? en (?:la corporativa|ilunion\.com)|acceso (?:a|al) empleo corporativo|empleo en la corporativa|referencia actual|url provisional/.test(text);
  return containsUrlOrRoute || containsBreadcrumb || sharedNavigationCopy;
}

function isPdfDetail(value) {
  return /^(?:\d+\s+documentos?\s+)?pdf$/.test(normalize(value));
}

function isPlainMetadataDetail(value) {
  return /^(?:modulo o acceso|plantilla de ejemplo)$/.test(normalize(value));
}

function contextualIconKind(value) {
  const text = normalize(value);
  if (isUrlOrNavigationDetail(value) || isPdfDetail(value) || isPlainMetadataDetail(value)) return null;
  if (/\bpdf\b/.test(text)) return "pdf";
  if (/plantilla/.test(text)) return "template";
  if (/app store|google play|descarga en|aplicacion movil|aplicación móvil/.test(text)) return "mobile";
  if (/^modulo\b|misma pagina|misma página/.test(text)) return "module";
  if (/formulario|negocio seleccionado/.test(text)) return "form";
  if (/repositorio|documentacion|documentación|catalogo|catálogo/.test(text)) return "archive";
  if (/blog|noticias|actualidad|contenido filtrado/.test(text)) return "article";
  if (/sede|mapa de|filtro|clinica|clínica|centro de dia|centro de día/.test(text)) return "location";
  if (/navegacion|navegación/.test(text)) return "navigation";
  if (/apertura en capa/.test(text)) return "window";
  if (/detalle en capa/.test(text)) return "layer";
  if (/ecosistema corporativo/.test(text)) return "ecosystem";
  return null;
}

function createContextIcon(kind) {
  const icon = document.createElement("span");
  const fileName = CONTEXT_ICON_FILES[kind] || CONTEXT_ICON_FILES.description;
  icon.className = "context-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.style.setProperty("--context-icon", `url("./icons/context/${fileName}")`);
  return icon;
}

function createDetailRow(tagName, className, value) {
  const row = document.createElement(tagName);
  row.className = `${className} node-detail-row`;
  const iconKind = contextualIconKind(value);
  if (iconKind) {
    row.append(createContextIcon(iconKind));
  } else {
    row.classList.add("without-context-icon");
  }
  if (isPdfDetail(value)) row.classList.add("pdf-detail");
  const text = document.createElement("span");
  text.className = "node-detail-text";
  text.textContent = value;
  row.append(text);
  return row;
}

function createNodeLeadingIcon(node) {
  const businessIcon = node.depth === 2 && node.parent?.title === "Qué hacemos"
    ? businessIconFor(node)
    : null;

  if (businessIcon) {
    const icon = document.createElement("span");
    icon.className = "node-business-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.setProperty("--node-business-icon", `url("./icons/business/${businessIcon.icon}.svg")`);
    return icon;
  }

  const icon = document.createElement("span");
  icon.className = "page-link-icon";
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function branchToggle(node) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "toggle-branch";
  button.setAttribute("aria-expanded", String(!node.collapsed));
  button.setAttribute("aria-label", `${node.collapsed ? "Ampliar" : "Minimizar"} rama ${node.title}`);
  button.title = node.collapsed ? `Mostrar ${node.descendantCount} elementos` : "Minimizar rama";
  const icon = document.createElement("span");
  icon.className = `toggle-icon ${node.collapsed ? "toggle-icon-add" : "toggle-icon-subtract"}`;
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);
  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    clearNodeFocus();
    state.suppressClick = false;
    window.clearTimeout(state.suppressClickTimer);
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearNodeFocus();
    node.collapsed = !node.collapsed;
    renderMap();
    requestAnimationFrame(() => centerNode(node, false));
  });
  return button;
}

function renderNode(node) {
  const color = themeFor(node);
  const hasCornerTag = isPdf(node) || isSearchNode(node) || isRestrictedAccessNode(node);
  const displayTitle = node.isAnnotation ? node.title.replace(/^\*\s*/, "") : node.title;
  const approvalMatch = node.isAnnotation
    ? displayTitle.match(/\s*(\(pendiente de aprobación\))\s*$/i)
    : null;
  const primaryTitle = approvalMatch
    ? displayTitle.slice(0, approvalMatch.index).trim()
    : displayTitle;
  const approvalStatus = approvalMatch ? approvalMatch[1] : "";
  const element = document.createElement("article");
  const visualDepth = Math.min(node.depth, 4);
  const isFocusTarget = state.focusedId === node.id;
  const isFocusPath = state.focusPathIds.has(node.id);
  element.className = `map-node depth-${visualDepth}${node.isAnnotation ? " annotation-node" : ""}${isModuleNode(node) ? " module-node" : ""}${hasCornerTag ? " has-corner-tag" : ""}${state.highlightedId === node.id ? " is-highlighted" : ""}${isFocusPath ? " is-focus-path" : ""}${isFocusTarget ? " is-focus-target" : ""}`;
  element.dataset.nodeId = node.id;
  element.style.setProperty("--node-color", color);
  element.style.left = `${node.layout.x}px`;
  element.style.top = `${node.layout.y - node.layout.height / 2}px`;
  element.style.width = `${node.layout.width}px`;
  element.style.height = `${node.layout.height}px`;
  if (node.isAnnotation) {
    const annotationNumber = Number(node.id.replace(/\D/g, "")) || 0;
    element.style.setProperty("--annotation-delay", `${(annotationNumber % 3) * 0.65}s`);
  }

  const body = document.createElement("div");
  body.className = "node-body";
  const topLine = document.createElement("div");
  topLine.className = "node-topline";

  if (node.isAnnotation) {
    const alert = document.createElement("span");
    alert.className = "annotation-alert-mark";
    alert.setAttribute("aria-hidden", "true");
    topLine.append(alert);
  }

  if (node.url) {
    const link = document.createElement("a");
    link.className = "node-link";
    link.href = node.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const cleanTitle = primaryTitle.replace(/\s*↗\s*$/, "");
    const icon = createNodeLeadingIcon(node);
    const label = document.createElement("span");
    label.className = "link-label";
    label.textContent = cleanTitle;
    link.append(icon, label);
    link.title = `Abrir en una pestaña nueva: ${cleanTitle}`;
    if (isExternal(node)) {
      link.setAttribute("aria-label", `${cleanTitle}, enlace externo; se abre en una pestaña nueva`);
    }
    topLine.append(link);
  } else {
    const title = document.createElement("span");
    title.className = "node-title-static";
    title.textContent = primaryTitle;
    topLine.append(title);
  }

  if (isPdf(node)) {
    const file = document.createElement("span");
    file.className = "file-mark";
    file.title = "Documento PDF";
    file.setAttribute("role", "img");
    file.setAttribute("aria-label", "Documento PDF");
    const fileLabel = document.createElement("span");
    fileLabel.className = "file-mark-label";
    fileLabel.textContent = "PDF";
    file.append(createContextIcon("pdf"), fileLabel);
    topLine.append(file);
  }

  if (isSearchNode(node)) {
    const search = document.createElement("span");
    search.className = "file-mark search-mark";
    search.title = "Buscador";
    search.setAttribute("aria-hidden", "true");
    const searchLabel = document.createElement("span");
    searchLabel.className = "file-mark-label";
    searchLabel.textContent = "SRC";
    search.append(createContextIcon("search"), searchLabel);
    topLine.append(search);
  }

  if (isRestrictedAccessNode(node)) {
    const access = document.createElement("span");
    access.className = "file-mark access-mark";
    access.title = "Acceso restringido";
    access.setAttribute("role", "img");
    access.setAttribute("aria-label", "Acceso restringido (ACC)");
    const accessLabel = document.createElement("span");
    accessLabel.className = "file-mark-label";
    accessLabel.textContent = "ACC";
    access.append(createContextIcon("lock"), accessLabel);
    topLine.append(access);
  }

  if (isExternal(node)) {
    const external = document.createElement("span");
    external.className = "external-link-mark";
    external.title = "Enlace externo";
    external.setAttribute("aria-hidden", "true");
    external.append(createContextIcon("external"));
    topLine.append(external);
  }

  body.append(topLine);

  if (approvalStatus) {
    const approval = document.createElement("span");
    approval.className = "node-meta annotation-approval";
    approval.textContent = approvalStatus;
    body.append(approval);
  }

  const details = !node.isAnnotation ? document.createElement("div") : null;
  if (details) details.className = "node-details";

  if (node.subtitle && details) {
    const subtitle = createDetailRow("p", "node-subtitle", node.subtitle);
    details.append(subtitle);
  }

  const meta = metaLabel(node);
  if (meta && details) {
    const metaElement = createDetailRow("span", "node-meta", meta);
    details.append(metaElement);
  }

  if (details?.childElementCount) body.append(details);

  element.append(body);

  if (node.children.length && !node.isAnnotation) {
    element.append(branchToggle(node));
    if (node.collapsed) {
      const count = document.createElement("span");
      count.className = "child-count";
      count.textContent = String(node.descendantCount);
      count.setAttribute("aria-hidden", "true");
      element.append(count);
    }
  }

  element.addEventListener("pointerenter", (event) => {
    if (state.mobile || event.pointerType === "touch") return;
    window.clearTimeout(state.hoverFocusTimer);
    state.hoverFocusTimer = window.setTimeout(() => {
      state.hoverFocusTimer = null;
      focusNode(node, "pointer");
    }, 500);
  });
  element.addEventListener("pointerleave", () => {
    window.clearTimeout(state.hoverFocusTimer);
    state.hoverFocusTimer = null;
    if (state.focusedId === node.id && state.focusOrigin === "pointer") clearNodeFocus();
  });

  return element;
}

function measureNodeHeights(visible) {
  const fragment = document.createDocumentFragment();
  const elements = [];

  visible.forEach((node) => {
    const element = renderNode(node);
    element.classList.add("is-measuring");
    element.style.height = "auto";
    element.style.minHeight = `${node.layout.height}px`;
    elements.push({ node, element, minimumHeight: node.layout.height });
    fragment.append(element);
  });

  dom.nodes.replaceChildren(fragment);
  elements.forEach(({ node, element, minimumHeight }) => {
    node.measuredHeight = Math.max(minimumHeight, Math.ceil(element.offsetHeight));
  });
}

function renderMap() {
  if (state.elasticDrag) cancelElasticDrag();
  if (!state.root) return;
  state.mobile = window.matchMedia(MOBILE_QUERY).matches;
  const visible = getVisibleNodes();
  state.visibleNodes = visible;

  visible.forEach((node) => { node.measuredHeight = 0; });

  if (state.mobile) layoutMobile(visible);
  else layoutDesktop(visible);
  measureNodeHeights(visible);

  if (state.mobile) layoutMobile(visible);
  else layoutDesktop(visible);

  dom.scene.style.width = `${state.sceneWidth}px`;
  dom.scene.style.height = `${state.sceneHeight}px`;
  dom.svg.setAttribute("width", state.sceneWidth);
  dom.svg.setAttribute("height", state.sceneHeight);
  dom.svg.setAttribute("viewBox", `0 0 ${state.sceneWidth} ${state.sceneHeight}`);

  renderConnectors(visible);
  const fragment = document.createDocumentFragment();
  visible.forEach((node) => fragment.append(renderNode(node)));
  dom.nodes.replaceChildren(fragment);

  dom.visibleCount.textContent = String(visible.filter((node) => !node.isAnnotation).length);
  applyTransform();
}

function applyTransform() {
  if (state.mobile && state.root) {
    const width = dom.viewport.clientWidth;
    const height = dom.viewport.clientHeight;
    const scaledWidth = state.sceneWidth * state.transform.scale;
    const scaledHeight = state.sceneHeight * state.transform.scale;
    const clearance = navigationClearancePx();
    const sideClearance = Math.max(clearance, width - 64);
    const minX = Math.min(16, width - scaledWidth - sideClearance);
    const maxX = sideClearance;
    const minY = Math.min(16, height - scaledHeight - clearance);
    const maxY = clearance;
    state.transform.x = Math.min(maxX, Math.max(minX, state.transform.x));
    state.transform.y = Math.min(maxY, Math.max(minY, state.transform.y));
  } else if (isMinimapEnabled() && state.root) {
    clampDesktopTransformToNavigationWorld();
  }

  const { x, y, scale } = state.transform;
  dom.scene.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  syncZoomControls();
  scheduleMinimap();
}

function clampScale(value) {
  return Math.min(1.7, Math.max(0.035, value));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function syncZoomControls() {
  const percentage = Math.round(state.transform.scale * 100);
  dom.zoomValue.value = `${percentage}%`;
  dom.zoomValue.textContent = `${percentage}%`;
  if (!dom.minimapZoom || !dom.minimapZoomSlider) return;
  const sliderValue = clamp(percentage, 4, 170);
  const progress = (sliderValue - 4) / (170 - 4) * 100;
  dom.minimapZoom.value = `${percentage}%`;
  dom.minimapZoom.textContent = `${percentage}%`;
  dom.minimapZoomSlider.value = String(sliderValue);
  dom.minimapZoomSlider.setAttribute("aria-valuetext", `${percentage} por ciento`);
  dom.minimapZoomSlider.style.setProperty("--zoom-progress", `${progress}%`);
}

function isMinimapEnabled() {
  return !state.mobile && window.matchMedia(MINIMAP_QUERY).matches;
}

function minimapBranchColor(node) {
  if (!node) return COLORS.corporate;
  const pathText = node.path.join(" / ");
  if (/ILUNION Servicios/.test(pathText)) return COLORS.servicios;
  if (/ILUNION Consultor[ií]a/.test(pathText)) return COLORS.consultoria;
  if (/Bienestar y VidaS[eé]nior/.test(pathText)) return COLORS.bienestar;
  if (/ILUNION TextilCare/.test(pathText)) return COLORS.textilcare;
  if (/ILUNION Retail/.test(pathText)) return COLORS.tutienda;
  if (/Econom[ií]a Circular/.test(pathText)) return COLORS.circular;
  if (/ILUNION Hoteles/.test(pathText)) return COLORS.hoteles;
  return themeFor(node);
}

function navigationClearancePx() {
  const height = Math.max(1, dom.viewport.clientHeight);
  return state.mobile
    ? Math.max(180, Math.min(260, height * 0.26))
    : Math.max(190, Math.min(300, height * 0.3));
}

function minimapWorldBounds() {
  const scale = Math.max(0.001, state.transform.scale);
  const clearance = navigationClearancePx() / scale;
  return {
    left: -clearance,
    top: -clearance,
    width: Math.max(1, state.sceneWidth) + clearance * 2,
    height: Math.max(1, state.sceneHeight) + clearance * 2
  };
}

function clampDesktopTransformToNavigationWorld() {
  const scale = Math.max(0.001, state.transform.scale);
  const viewportWidth = Math.max(1, dom.viewport.clientWidth);
  const viewportHeight = Math.max(1, dom.viewport.clientHeight);
  const viewWidth = viewportWidth / scale;
  const viewHeight = viewportHeight / scale;
  const world = minimapWorldBounds();
  const currentCenterX = (viewportWidth / 2 - state.transform.x) / scale;
  const currentCenterY = (viewportHeight / 2 - state.transform.y) / scale;
  const centerX = viewWidth >= world.width
    ? world.left + world.width / 2
    : clamp(currentCenterX, world.left + viewWidth / 2, world.left + world.width - viewWidth / 2);
  const centerY = viewHeight >= world.height
    ? world.top + world.height / 2
    : clamp(currentCenterY, world.top + viewHeight / 2, world.top + world.height - viewHeight / 2);
  state.transform.x = viewportWidth / 2 - centerX * scale;
  state.transform.y = viewportHeight / 2 - centerY * scale;
}

function minimapRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function minimapNodeRect(node, mapX, mapY, scaleX, scaleY) {
  const naturalWidth = node.layout.width * scaleX;
  const naturalHeight = node.layout.height * scaleY;
  const minimumWidth = node.depth === 0 ? 18 : node.depth === 1 ? 12 : node.depth === 2 ? 8 : 4;
  const minimumHeight = node.depth === 0 ? 8 : node.depth === 1 ? 5 : node.depth === 2 ? 3.5 : 2;
  const width = clamp(naturalWidth, minimumWidth, node.depth <= 1 ? 42 : 30);
  const height = clamp(naturalHeight, minimumHeight, node.depth === 0 ? 12 : 8);
  const centerX = mapX(node.layout.x + node.layout.width / 2);
  const centerY = mapY(node.layout.y);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
    right: centerX + width / 2
  };
}

function drawMinimap() {
  if (!isMinimapEnabled() || state.minimapCollapsed || !state.root || !dom.minimapCanvas || !state.visibleNodes.length) return;
  const canvasRect = dom.minimapCanvas.getBoundingClientRect();
  if (canvasRect.width < 2 || canvasRect.height < 2) return;

  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const pixelWidth = Math.round(canvasRect.width * dpr);
  const pixelHeight = Math.round(canvasRect.height * dpr);
  if (dom.minimapCanvas.width !== pixelWidth) dom.minimapCanvas.width = pixelWidth;
  if (dom.minimapCanvas.height !== pixelHeight) dom.minimapCanvas.height = pixelHeight;

  const context = dom.minimapCanvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, canvasRect.width, canvasRect.height);

  const padding = 10;
  const innerWidth = Math.max(1, canvasRect.width - padding * 2);
  const innerHeight = Math.max(1, canvasRect.height - padding * 2);
  const world = minimapWorldBounds();
  const scaleX = innerWidth / world.width;
  const scaleY = innerHeight / world.height;
  const metrics = { padding, innerWidth, innerHeight, scaleX, scaleY, world };
  state.minimapMetrics = metrics;
  const mapX = (value) => padding + (value - world.left) * scaleX;
  const mapY = (value) => padding + (value - world.top) * scaleY;
  const visibleSet = new Set(state.visibleNodes.map((node) => node.id));
  const nodeRects = new Map(state.visibleNodes.map((node) => [
    node.id,
    minimapNodeRect(node, mapX, mapY, scaleX, scaleY)
  ]));

  context.lineCap = "round";
  context.lineJoin = "round";
  state.visibleNodes.forEach((node) => {
    const parent = node.parent;
    if (!parent || !visibleSet.has(parent.id) || parent.collapsed) return;
    const parentRect = nodeRects.get(parent.id);
    const nodeRect = nodeRects.get(node.id);
    if (!parentRect || !nodeRect) return;
    const startX = parentRect.right;
    const startY = parentRect.centerY;
    const endX = nodeRect.x;
    const endY = nodeRect.centerY;
    const middleX = startX + (endX - startX) / 2;
    const color = minimapBranchColor(node);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(middleX, startY);
    context.lineTo(middleX, endY);
    context.lineTo(endX, endY);
    context.strokeStyle = color;
    context.lineWidth = node.depth <= 2 ? 1.7 : 1.2;
    context.setLineDash(isExternal(node) ? [3, 2] : []);
    context.stroke();
  });
  context.setLineDash([]);

  state.visibleNodes.forEach((node) => {
    const color = minimapBranchColor(node);
    const { x, y, width, height } = nodeRects.get(node.id);
    const opacity = node.isAnnotation ? .18 : node.depth === 0 ? .64 : node.depth === 1 ? .48 : node.depth === 2 ? .36 : .24;
    minimapRoundedRect(context, x, y, width, height, Math.min(2.5, height / 2));
    context.fillStyle = colorWithAlpha(color, opacity);
    context.fill();
    if (node.depth <= 2 && !node.isAnnotation) {
      context.strokeStyle = colorWithAlpha(color, .48);
      context.lineWidth = .65;
      context.stroke();
    }
  });

  const { x, y, scale } = state.transform;
  const viewportWidth = dom.viewport.clientWidth;
  const viewportHeight = dom.viewport.clientHeight;
  const sceneLeftRaw = -x / scale;
  const sceneTopRaw = -y / scale;
  const sceneRightRaw = sceneLeftRaw + viewportWidth / scale;
  const sceneBottomRaw = sceneTopRaw + viewportHeight / scale;
  const viewWidth = sceneRightRaw - sceneLeftRaw;
  const viewHeight = sceneBottomRaw - sceneTopRaw;
  const nodesInViewport = state.visibleNodes.filter((node) => {
    const nodeLeft = node.layout.x;
    const nodeRight = node.layout.x + node.layout.width;
    const nodeTop = node.layout.y - node.layout.height / 2;
    const nodeBottom = node.layout.y + node.layout.height / 2;
    return nodeRight >= sceneLeftRaw && nodeLeft <= sceneRightRaw && nodeBottom >= sceneTopRaw && nodeTop <= sceneBottomRaw;
  });
  const contentPadding = 36;
  const representedLeft = nodesInViewport.length
    ? Math.max(sceneLeftRaw, Math.min(...nodesInViewport.map((node) => node.layout.x)) - contentPadding)
    : sceneLeftRaw;
  const representedRight = nodesInViewport.length
    ? Math.min(sceneRightRaw, Math.max(...nodesInViewport.map((node) => node.layout.x + node.layout.width)) + contentPadding)
    : sceneRightRaw;
  const naturalMapWidth = Math.max(0, (representedRight - representedLeft) * scaleX);
  const minimumMapWidth = innerWidth * .34;
  const viewportMapWidth = Math.min(innerWidth, Math.max(minimumMapWidth, naturalMapWidth));
  const viewportMapHeight = viewHeight >= world.height ? innerHeight : viewHeight * scaleY;
  const sceneCenterX = (representedLeft + representedRight) / 2;
  const sceneCenterY = (sceneTopRaw + sceneBottomRaw) / 2;
  const viewportX = clamp(mapX(sceneCenterX) - viewportMapWidth / 2, padding, padding + innerWidth - viewportMapWidth);
  const viewportY = viewHeight >= world.height
    ? padding
    : clamp(mapY(sceneCenterY) - viewportMapHeight / 2, padding, padding + innerHeight - viewportMapHeight);
  state.minimapViewportRect = {
    x: viewportX,
    y: viewportY,
    width: viewportMapWidth,
    height: viewportMapHeight
  };

  context.fillStyle = colorWithAlpha(MINIMAP_VIEWPORT_FILL, .10);
  context.fillRect(viewportX, viewportY, viewportMapWidth, viewportMapHeight);

  const coversScene = sceneLeftRaw <= 0 && sceneTopRaw <= 0 && sceneRightRaw >= state.sceneWidth && sceneBottomRaw >= state.sceneHeight;
  if (coversScene) {
    dom.minimapLocation.textContent = "Vista general";
    dom.minimapLocation.title = "Vista general de la arquitectura";
  } else {
    const centerX = (viewportWidth / 2 - x) / scale;
    const centerY = (viewportHeight / 2 - y) / scale;
    const candidates = state.visibleNodes.filter((node) => !node.isAnnotation);
    const nearest = candidates.reduce((best, node) => {
      const nodeCenterX = node.layout.x + node.layout.width / 2;
      const distanceX = (nodeCenterX - centerX) / Math.max(1, state.sceneWidth);
      const distanceY = (node.layout.y - centerY) / Math.max(1, state.sceneHeight);
      const distance = distanceX * distanceX + distanceY * distanceY;
      return !best || distance < best.distance ? { node, distance } : best;
    }, null)?.node;
    if (nearest) {
      const level = nearest.depth >= 4 ? "N4+" : `N${nearest.depth}`;
      const cleanTitle = nearest.title.replace(/\s*↗\s*$/, "");
      dom.minimapLocation.textContent = `${level} · ${cleanTitle}`;
      dom.minimapLocation.title = nearest.path.join(" › ");
    }
  }
  const currentLocation = dom.minimapLocation.textContent;
  dom.minimapNavigator.setAttribute("aria-label", `Minimapa. Ubicación actual: ${currentLocation}. Arrastra el área azul claro para desplazarte, haz clic para saltar a un área o usa las flechas.`);
}

function scheduleMinimap() {
  if (!isMinimapEnabled() || state.minimapCollapsed || !dom.minimapCanvas || state.minimapFrame !== null) return;
  state.minimapFrame = window.requestAnimationFrame(() => {
    state.minimapFrame = null;
    drawMinimap();
  });
}

function setMinimapCollapsed(collapsed) {
  state.minimapCollapsed = Boolean(collapsed);
  dom.minimap.classList.toggle("is-collapsed", state.minimapCollapsed);
  dom.minimapStage.hidden = state.minimapCollapsed;
  dom.minimapToggleButton.classList.toggle("is-active", !state.minimapCollapsed);
  dom.minimapToggleButton.setAttribute("aria-expanded", String(!state.minimapCollapsed));
  const label = state.minimapCollapsed ? "Mostrar minimapa" : "Ocultar minimapa";
  dom.minimapToggleButton.setAttribute("aria-label", label);
  dom.minimapToggleButton.title = label;
  if (!state.minimapCollapsed) {
    state.minimapMetrics = null;
    window.requestAnimationFrame(() => scheduleMinimap());
  }
}

function centerScenePoint(sceneX, sceneY) {
  const scale = state.transform.scale;
  const viewWidth = dom.viewport.clientWidth / scale;
  const viewHeight = dom.viewport.clientHeight / scale;
  const world = state.minimapMetrics?.world || minimapWorldBounds();
  const targetX = viewWidth >= world.width
    ? world.left + world.width / 2
    : clamp(sceneX, world.left + viewWidth / 2, world.left + world.width - viewWidth / 2);
  const targetY = viewHeight >= world.height
    ? world.top + world.height / 2
    : clamp(sceneY, world.top + viewHeight / 2, world.top + world.height - viewHeight / 2);
  state.transform.x = dom.viewport.clientWidth / 2 - targetX * scale;
  state.transform.y = dom.viewport.clientHeight / 2 - targetY * scale;
  applyTransform();
}

function navigateFromMinimap(clientX, clientY) {
  if (!isMinimapEnabled()) return;
  if (!state.minimapMetrics) drawMinimap();
  const metrics = state.minimapMetrics;
  if (!metrics) return;
  const rect = dom.minimapCanvas.getBoundingClientRect();
  const canvasX = clamp(clientX - rect.left, metrics.padding, metrics.padding + metrics.innerWidth);
  const canvasY = clamp(clientY - rect.top, metrics.padding, metrics.padding + metrics.innerHeight);
  const sceneX = metrics.world.left + (canvasX - metrics.padding) / metrics.scaleX;
  const sceneY = metrics.world.top + (canvasY - metrics.padding) / metrics.scaleY;
  centerScenePoint(sceneX, sceneY);
}

function setupMinimapInteractions() {
  if (!dom.minimapNavigator || !dom.minimapCanvas) return;

  setMinimapCollapsed(false);
  dom.minimapToggleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setMinimapCollapsed(!state.minimapCollapsed);
  });
  dom.minimapFitButton.addEventListener("click", (event) => {
    event.stopPropagation();
    fitView();
  });
  dom.minimapZoomInButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const rect = dom.viewport.getBoundingClientRect();
    zoomAt(state.transform.scale * 1.18, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  dom.minimapZoomOutButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const rect = dom.viewport.getBoundingClientRect();
    zoomAt(state.transform.scale / 1.18, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  dom.minimapZoomSlider.addEventListener("input", (event) => {
    event.stopPropagation();
    const rect = dom.viewport.getBoundingClientRect();
    zoomAt(Number(event.currentTarget.value) / 100, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  dom.minimapNavigator.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (!state.minimapMetrics) drawMinimap();
    const canvasRect = dom.minimapCanvas.getBoundingClientRect();
    const localX = event.clientX - canvasRect.left;
    const localY = event.clientY - canvasRect.top;
    const frame = state.minimapViewportRect;
    const grabPadding = 6;
    const grabbedFrame = Boolean(frame &&
      localX >= frame.x - grabPadding && localX <= frame.x + frame.width + grabPadding &&
      localY >= frame.y - grabPadding && localY <= frame.y + frame.height + grabPadding);
    if (!grabbedFrame) navigateFromMinimap(event.clientX, event.clientY);
    state.minimapPointerId = event.pointerId;
    state.minimapDragOrigin = {
      clientX: event.clientX,
      clientY: event.clientY,
      centerX: (dom.viewport.clientWidth / 2 - state.transform.x) / state.transform.scale,
      centerY: (dom.viewport.clientHeight / 2 - state.transform.y) / state.transform.scale,
      scaleX: state.minimapMetrics?.scaleX || 1,
      scaleY: state.minimapMetrics?.scaleY || 1
    };
    dom.minimapNavigator.classList.add("is-dragging");
    try { dom.minimapNavigator.setPointerCapture(event.pointerId); } catch {}
  });
  dom.minimapNavigator.addEventListener("pointermove", (event) => {
    if (state.minimapPointerId !== event.pointerId) {
      const canvasRect = dom.minimapCanvas.getBoundingClientRect();
      const localX = event.clientX - canvasRect.left;
      const localY = event.clientY - canvasRect.top;
      const frame = state.minimapViewportRect;
      const hoveringFrame = Boolean(frame &&
        localX >= frame.x - 6 && localX <= frame.x + frame.width + 6 &&
        localY >= frame.y - 6 && localY <= frame.y + frame.height + 6);
      dom.minimapNavigator.classList.toggle("is-frame-hover", hoveringFrame);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const origin = state.minimapDragOrigin;
    if (!origin) return;
    const deltaX = (event.clientX - origin.clientX) / origin.scaleX;
    const deltaY = (event.clientY - origin.clientY) / origin.scaleY;
    centerScenePoint(origin.centerX + deltaX, origin.centerY + deltaY);
  });
  const releaseMinimapPointer = (event) => {
    if (state.minimapPointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    state.minimapPointerId = null;
    state.minimapDragOrigin = null;
    dom.minimapNavigator.classList.remove("is-dragging");
  };
  dom.minimapNavigator.addEventListener("pointerup", releaseMinimapPointer);
  dom.minimapNavigator.addEventListener("pointercancel", releaseMinimapPointer);
  dom.minimap.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });
  dom.minimapNavigator.addEventListener("keydown", (event) => {
    const centerX = (dom.viewport.clientWidth / 2 - state.transform.x) / state.transform.scale;
    const centerY = (dom.viewport.clientHeight / 2 - state.transform.y) / state.transform.scale;
    const stepX = dom.viewport.clientWidth / state.transform.scale * .12;
    const stepY = dom.viewport.clientHeight / state.transform.scale * .12;
    let targetX = centerX;
    let targetY = centerY;
    if (event.key === "ArrowLeft") targetX -= stepX;
    else if (event.key === "ArrowRight") targetX += stepX;
    else if (event.key === "ArrowUp") targetY -= stepY;
    else if (event.key === "ArrowDown") targetY += stepY;
    else if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      event.stopPropagation();
      fitView();
      return;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    centerScenePoint(targetX, targetY);
  });
}

function zoomAt(nextScale, clientX, clientY) {
  const old = state.transform.scale;
  const scale = clampScale(nextScale);
  const rect = dom.viewport.getBoundingClientRect();
  const pointX = clientX - rect.left;
  const pointY = clientY - rect.top;
  const sceneX = (pointX - state.transform.x) / old;
  const sceneY = (pointY - state.transform.y) / old;
  state.transform.x = pointX - sceneX * scale;
  state.transform.y = pointY - sceneY * scale;
  state.transform.scale = scale;
  applyTransform();
}

function fitView({ animate = true, readable = false } = {}) {
  const width = dom.viewport.clientWidth;
  const height = dom.viewport.clientHeight;
  const padding = state.mobile ? 34 : 64;
  const widthScale = (width - padding * 2) / state.sceneWidth;
  const fullScale = Math.min(widthScale, (height - padding * 2) / state.sceneHeight);
  const fitScale = readable && state.mobile
    ? Math.min(1, (width - padding * 2) / state.sceneWidth)
    : Math.min(1, fullScale);
  const scale = Math.max(readable ? (state.mobile ? 0.9 : 0.16) : 0.035, fitScale);
  const x = readable && state.mobile ? 16 : Math.max(18, (width - state.sceneWidth * scale) / 2);
  const y = readable && state.mobile ? 18 : Math.max(18, (height - state.sceneHeight * scale) / 2);

  if (animate) dom.scene.style.transition = "transform 260ms cubic-bezier(.2,.8,.2,1)";
  state.transform = { x, y, scale };
  applyTransform();
  if (animate) window.setTimeout(() => { dom.scene.style.transition = ""; }, 280);
}

function centerNode(node, emphasize = true) {
  const width = dom.viewport.clientWidth;
  const height = dom.viewport.clientHeight;
  const scale = Math.max(state.transform.scale, state.mobile ? 0.88 : 0.68);
  state.transform.scale = clampScale(scale);
  state.transform.x = width / 2 - (node.layout.x + node.layout.width / 2) * state.transform.scale;
  state.transform.y = height / 2 - node.layout.y * state.transform.scale;
  dom.scene.style.transition = "transform 260ms cubic-bezier(.2,.8,.2,1)";
  applyTransform();
  window.setTimeout(() => { dom.scene.style.transition = ""; }, 280);

  if (emphasize) {
    focusNode(node);
  }
}

function clearNodeFocus() {
  window.clearTimeout(state.focusTimer);
  window.clearTimeout(state.hoverFocusTimer);
  state.focusTimer = null;
  state.hoverFocusTimer = null;
  state.focusedId = null;
  state.focusOrigin = null;
  state.highlightedId = null;
  state.focusPathIds = new Set();
  dom.scene.classList.remove("has-node-focus");
  dom.scene.classList.remove("focus-from-pointer", "focus-from-search");
  dom.connections.querySelectorAll(".is-focus-path").forEach((element) => element.classList.remove("is-focus-path"));
  dom.nodes.querySelectorAll(".is-focus-path, .is-focus-target, .is-highlighted").forEach((element) => {
    element.classList.remove("is-focus-path", "is-focus-target", "is-highlighted");
  });
}

function focusNode(node, origin = "search") {
  if (!node) return;
  window.clearTimeout(state.focusTimer);
  window.clearTimeout(state.hoverFocusTimer);
  state.hoverFocusTimer = null;
  const pathIds = new Set();
  let current = node;
  while (current) {
    pathIds.add(current.id);
    current = current.parent;
  }
  state.focusedId = node.id;
  state.focusOrigin = origin;
  state.highlightedId = node.id;
  state.focusPathIds = pathIds;
  dom.scene.classList.add("has-node-focus");
  dom.scene.classList.toggle("focus-from-pointer", origin === "pointer");
  dom.scene.classList.toggle("focus-from-search", origin === "search");
  dom.nodes.querySelectorAll(".map-node").forEach((element) => {
    const id = element.dataset.nodeId;
    element.classList.toggle("is-focus-path", pathIds.has(id));
    element.classList.toggle("is-focus-target", id === node.id);
    element.classList.toggle("is-highlighted", id === node.id);
  });
  dom.connections.querySelectorAll(".connector[data-focus-child-id]").forEach((element) => {
    element.classList.toggle("is-focus-path", pathIds.has(element.dataset.focusChildId));
  });
  state.focusTimer = window.setTimeout(() => {
    if (state.focusedId === node.id && state.focusOrigin === "search") {
      clearNodeFocus();
      return;
    }
    const target = dom.nodes.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
    target?.classList.remove("is-highlighted");
    if (state.highlightedId === node.id) state.highlightedId = null;
    state.focusTimer = null;
  }, 3000);
}

function revealNode(node) {
  let ancestor = node.parent;
  while (ancestor) {
    ancestor.collapsed = false;
    ancestor = ancestor.parent;
  }
  renderMap();
  requestAnimationFrame(() => centerNode(node));
}

function setAllCollapsed(summary) {
  clearNodeFocus();
  state.allNodes.forEach((node) => {
    if (!node.children.length) return;
    node.collapsed = summary;
  });
  state.root.collapsed = false;
  const whatWeDo = state.allNodes.find((node) => node.title === "Qué hacemos" && node.depth === 1);
  if (whatWeDo) whatWeDo.collapsed = false;
  renderMap();

  if (summary) {
    fitView({ readable: state.mobile });
    showToast("Vista resumida: abre cada rama con el botón +.");
  } else {
    const rootLayout = state.root.layout;
    state.transform.scale = state.mobile ? 0.82 : 0.52;
    state.transform.x = (state.mobile ? 16 : 28) - rootLayout.x * state.transform.scale;
    state.transform.y = (state.mobile ? 18 : 28) - (rootLayout.y - rootLayout.height / 2) * state.transform.scale;
    applyTransform();
    showToast(`Arquitectura completa desplegada: ${dom.totalCount.textContent} páginas. Arrastra o usa el buscador para recorrerla.`);
  }
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  dom.toastMessage.textContent = message;
  dom.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 3200);
}

function fillColorKey(container, entries) {
  const fragment = document.createDocumentFragment();
  entries.forEach(([label, color, icon]) => {
    const row = document.createElement("div");
    row.className = "color-chip";
    row.style.setProperty("--chip", color);
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    if (icon) {
      dot.className = "business-key-icon";
      dot.style.setProperty("--business-icon", `url(\"./icons/business/${icon}.svg\")`);
    }
    const text = document.createElement("span");
    text.textContent = label;
    row.append(dot, text);
    fragment.append(row);
  });
  container.replaceChildren(fragment);
}

function searchMatches(query) {
  const normalized = normalize(query);
  if (!normalized) return [];
  return state.allNodes
    .filter((node) => !node.isAnnotation)
    .map((node) => {
      const title = normalize(node.title);
      const subtitle = normalize(node.subtitle || "");
      const parentSegments = node.path.slice(0, -1).map(normalize);
      let score = 0;
      if (title === normalized) score += 100;
      else if (title.startsWith(normalized)) score += 70;
      else if (title.includes(normalized)) score += 48;
      if (parentSegments.some((segment) => segment === normalized)) score += 24;
      else if (parentSegments.some((segment) => segment.startsWith(normalized))) score += 16;
      else if (parentSegments.some((segment) => segment.includes(normalized))) score += 10;
      if (normalized.length >= 4 && subtitle.split(/\s+/).some((word) => word.startsWith(normalized))) score += 6;
      return { node, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.depth - b.node.depth || a.node.title.localeCompare(b.node.title, "es"))
    .slice(0, 12)
    .map((item) => item.node);
}

function closeSearch() {
  dom.searchResults.hidden = true;
  dom.search.setAttribute("aria-expanded", "false");
  dom.search.removeAttribute("aria-activedescendant");
  state.searchIndex = -1;
}

function selectSearchResult(node) {
  dom.search.value = node.title.replace(/\s*↗\s*$/, "");
  closeSearch();
  revealNode(node);
  showToast(`Mostrando “${node.title.replace(/\s*↗\s*$/, "")}”`);
}

function renderSearch() {
  const matches = searchMatches(dom.search.value);
  dom.searchResults.replaceChildren();
  state.searchIndex = -1;

  if (!dom.search.value.trim()) {
    dom.searchStatus.textContent = "";
    closeSearch();
    return;
  }

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "search-empty";
    empty.textContent = "No hay resultados para esta búsqueda.";
    dom.searchResults.append(empty);
    dom.searchStatus.textContent = "No hay resultados disponibles.";
  } else {
    matches.forEach((node, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.role = "option";
      button.setAttribute("aria-selected", "false");
      button.setAttribute("aria-posinset", String(index + 1));
      button.setAttribute("aria-setsize", String(matches.length));
      button.id = `search-option-${node.id}`;
      button.dataset.index = String(index);
      button.style.setProperty("--result-color", themeFor(node));
      const marker = document.createElement("span");
      const businessIcon = businessIconFor(node);
      marker.className = businessIcon ? "result-business-icon" : "result-dot";
      marker.setAttribute("aria-hidden", "true");
      if (businessIcon) {
        marker.style.setProperty("--result-icon-color", businessIcon.color);
        marker.style.setProperty("--result-business-icon", `url(\"./icons/business/${businessIcon.icon}.svg\")`);
      }
      const copy = document.createElement("span");
      copy.className = "search-result-copy";
      const heading = document.createElement("span");
      heading.className = "search-result-heading";
      const title = document.createElement("strong");
      appendHighlightedText(title, node.title.replace(/\s*↗\s*$/, ""), dom.search.value);
      const level = document.createElement("span");
      const groupedDepth = Math.min(node.depth, 4);
      const levelText = node.depth >= 4 ? "N4+" : `N${groupedDepth}`;
      level.className = "result-level";
      level.textContent = levelText;
      level.title = node.depth >= 4 ? "Nivel 4 o superior de navegación" : `Nivel ${groupedDepth} de navegación`;
      level.setAttribute("aria-label", level.title);
      const path = document.createElement("small");
      path.className = "result-path";
      const fullPath = node.path.slice(0, -1).join(" › ");
      path.title = fullPath ? `Ruta completa: ${fullPath}` : "Inicio de la arquitectura";
      path.setAttribute("aria-label", path.title);
      const firstLevelPath = node.path.slice(1, -1);
      const compactPath = firstLevelPath.length > 2
        ? [firstLevelPath[0], "…", firstLevelPath.at(-1)]
        : firstLevelPath;
      const visiblePath = compactPath.length
        ? compactPath
        : [node.depth === 0 ? "Inicio de la arquitectura" : "ILUNION"];
      visiblePath.forEach((segment, segmentIndex) => {
        if (segmentIndex > 0) {
          const separator = document.createElement("span");
          separator.className = "result-path-separator";
          separator.textContent = "›";
          separator.setAttribute("aria-hidden", "true");
          path.append(separator);
        }
        const crumb = document.createElement("span");
        crumb.className = segment === "…"
          ? "result-path-ellipsis"
          : `result-path-segment${segmentIndex === visiblePath.length - 1 ? " result-path-parent" : ""}`;
        appendHighlightedText(crumb, segment, dom.search.value);
        crumb.setAttribute("aria-hidden", "true");
        path.append(crumb);
      });
      heading.append(title, level);
      copy.append(heading, path);
      button.append(marker, copy);
      button.addEventListener("click", () => selectSearchResult(node));
      dom.searchResults.append(button);
    });
    dom.searchStatus.textContent = `${matches.length} ${matches.length === 1 ? "resultado disponible" : "resultados disponibles"}. Usa las flechas para recorrerlos.`;
  }

  dom.searchResults.hidden = false;
  dom.search.setAttribute("aria-expanded", "true");
}

function moveSearchSelection(direction) {
  const items = [...dom.searchResults.querySelectorAll(".search-result")];
  if (!items.length) return;
  state.searchIndex = (state.searchIndex + direction + items.length) % items.length;
  items.forEach((item, index) => item.setAttribute("aria-selected", String(index === state.searchIndex)));
  dom.search.setAttribute("aria-activedescendant", items[state.searchIndex].id);
  items[state.searchIndex].scrollIntoView({ block: "nearest" });
}

function toggleLegend(open) {
  const shouldOpen = open ?? !dom.legend.classList.contains("is-open");
  dom.legend.classList.toggle("is-open", shouldOpen);
  dom.legend.setAttribute("aria-hidden", String(!shouldOpen));
  dom.legendButton.setAttribute("aria-expanded", String(shouldOpen));
  [dom.header, dom.viewport, dom.poweredBy].forEach((element) => {
    if (element) element.inert = shouldOpen;
  });
  if (shouldOpen) {
    window.setTimeout(() => {
      if (dom.legend.classList.contains("is-open")) dom.closeLegendButton.focus({ preventScroll: true });
    }, 230);
  } else {
    dom.legendButton.focus({ preventScroll: true });
  }
}

function setupInteractions() {
  setupMinimapInteractions();
  dom.legendButton.addEventListener("click", () => toggleLegend());
  dom.closeLegendButton.addEventListener("click", () => toggleLegend(false));
  dom.summaryButton.addEventListener("click", () => setAllCollapsed(true));
  dom.expandButton.addEventListener("click", () => setAllCollapsed(false));
  dom.toastDismissButton.addEventListener("click", () => {
    window.clearTimeout(state.toastTimer);
    dom.toast.classList.remove("is-visible");
  });
  dom.fitButton.addEventListener("click", () => fitView());
  dom.zoomInButton.addEventListener("click", () => {
    const rect = dom.viewport.getBoundingClientRect();
    zoomAt(state.transform.scale * 1.18, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  dom.zoomOutButton.addEventListener("click", () => {
    const rect = dom.viewport.getBoundingClientRect();
    zoomAt(state.transform.scale / 1.18, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  dom.hint.querySelector("button").addEventListener("click", () => dom.hint.classList.add("is-hidden"));
  window.setTimeout(() => dom.hint.classList.add("is-hidden"), 9000);

  dom.search.addEventListener("input", renderSearch);
  dom.search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); moveSearchSelection(1); }
    if (event.key === "ArrowUp") { event.preventDefault(); moveSearchSelection(-1); }
    if (event.key === "Escape") { closeSearch(); dom.search.blur(); }
    if (event.key === "Enter") {
      const results = searchMatches(dom.search.value);
      const selected = results[state.searchIndex >= 0 ? state.searchIndex : 0];
      if (selected) { event.preventDefault(); selectSearchResult(selected); }
    }
  });

  dom.nodes.addEventListener("dragstart", (event) => {
    if (event.target.closest(".map-node")) event.preventDefault();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".search-wrap")) closeSearch();
    if (
      dom.legend.classList.contains("is-open") &&
      !dom.legend.contains(event.target) &&
      !dom.legendButton.contains(event.target)
    ) {
      toggleLegend(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && dom.legend.classList.contains("is-open")) {
      const focusable = [...dom.legend.querySelectorAll("button, summary, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.disabled && !element.hidden);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first && last && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      dom.search.focus();
      dom.search.select();
    }
    if (event.key === "Escape" && dom.legend.classList.contains("is-open")) toggleLegend(false);
    if (event.key === "Escape" && state.focusedId) clearNodeFocus();
    if (event.target.matches("input, textarea, button, a, summary, select") || event.target.closest?.(".minimap, .legend-panel, [role='option']")) return;
    if (["+", "="].includes(event.key)) dom.zoomInButton.click();
    if (event.key === "-") dom.zoomOutButton.click();
    if (event.key === "0") fitView();
    const step = event.shiftKey ? 110 : 55;
    if (event.key === "ArrowLeft") { state.transform.x += step; applyTransform(); }
    if (event.key === "ArrowRight") { state.transform.x -= step; applyTransform(); }
    if (event.key === "ArrowUp") { state.transform.y += step; applyTransform(); }
    if (event.key === "ArrowDown") { state.transform.y -= step; applyTransform(); }
  });

  dom.viewport.addEventListener("wheel", (event) => {
    if (event.target.closest(".minimap")) return;
    event.preventDefault();
    if (state.elasticDrag?.phase === "dragging") return;
    if (event.ctrlKey || event.metaKey) {
      const factor = Math.exp(-event.deltaY * 0.0025);
      zoomAt(state.transform.scale * factor, event.clientX, event.clientY);
    } else {
      state.transform.x -= event.deltaX;
      state.transform.y -= event.deltaY;
      applyTransform();
    }
  }, { passive: false });

  dom.viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, .legend-panel, .minimap")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (
      state.elasticDrag &&
      state.elasticDrag.pointerId !== event.pointerId &&
      state.elasticDrag.phase !== "returning"
    ) {
      event.preventDefault();
      return;
    }
    const nodeElement = event.target.closest(".map-node");
    if (nodeElement && state.pointers.size === 0) {
      if (state.elasticDrag && state.elasticDrag.phase !== "returning") {
        event.preventDefault();
        return;
      }
      if (beginElasticCandidate(event, nodeElement)) return;
    }
    if (state.mobile && !event.target.closest(".map-node")) clearNodeFocus();
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.pointers.size === 1) {
      state.didDrag = false;
      state.panOrigin = {
        x: event.clientX,
        y: event.clientY,
        tx: state.transform.x,
        ty: state.transform.y
      };
    } else if (state.pointers.size === 2) {
      const points = [...state.pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const rect = dom.viewport.getBoundingClientRect();
      const centerX = (points[0].x + points[1].x) / 2 - rect.left;
      const centerY = (points[0].y + points[1].y) / 2 - rect.top;
      state.pinchOrigin = {
        distance,
        centerX,
        centerY,
        scale: state.transform.scale,
        sceneX: (centerX - state.transform.x) / state.transform.scale,
        sceneY: (centerY - state.transform.y) / state.transform.scale
      };
    }
  });

  dom.viewport.addEventListener("pointermove", (event) => {
    if (handleElasticPointerMove(event)) return;
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (state.pointers.size === 2 && state.pinchOrigin) {
      const points = [...state.pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const rect = dom.viewport.getBoundingClientRect();
      const centerX = (points[0].x + points[1].x) / 2 - rect.left;
      const centerY = (points[0].y + points[1].y) / 2 - rect.top;
      const moved = Math.hypot(centerX - state.pinchOrigin.centerX, centerY - state.pinchOrigin.centerY);
      if (Math.abs(distance - state.pinchOrigin.distance) > 4 || moved > 4) {
        state.didDrag = true;
        dom.viewport.classList.add("is-dragging");
        try { dom.viewport.setPointerCapture(event.pointerId); } catch {}
      }
      const scale = clampScale(state.pinchOrigin.scale * (distance / state.pinchOrigin.distance));
      state.transform.scale = scale;
      state.transform.x = centerX - state.pinchOrigin.sceneX * scale;
      state.transform.y = centerY - state.pinchOrigin.sceneY * scale;
      applyTransform();
      return;
    }

    if (state.pointers.size === 1 && state.panOrigin) {
      if (Math.hypot(event.clientX - state.panOrigin.x, event.clientY - state.panOrigin.y) > 7) {
        if (!state.didDrag) {
          try { dom.viewport.setPointerCapture(event.pointerId); } catch {}
          dom.viewport.classList.add("is-dragging");
        }
        state.didDrag = true;
      }
      state.transform.x = state.panOrigin.tx + event.clientX - state.panOrigin.x;
      state.transform.y = state.panOrigin.ty + event.clientY - state.panOrigin.y;
      applyTransform();
    }
  });

  const releasePointer = (event) => {
    if (handleElasticPointerRelease(event)) return;
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.delete(event.pointerId);
    if (state.pointers.size < 2) state.pinchOrigin = null;
    if (state.pointers.size === 1) {
      const remaining = [...state.pointers.values()][0];
      state.panOrigin = {
        x: remaining.x,
        y: remaining.y,
        tx: state.transform.x,
        ty: state.transform.y
      };
    } else if (!state.pointers.size) {
      if (state.didDrag) {
        state.suppressClick = true;
        window.clearTimeout(state.suppressClickTimer);
        state.suppressClickTimer = window.setTimeout(() => { state.suppressClick = false; }, 120);
      }
      state.didDrag = false;
      state.panOrigin = null;
      dom.viewport.classList.remove("is-dragging");
    }
  };
  dom.viewport.addEventListener("pointerup", releasePointer);
  dom.viewport.addEventListener("pointercancel", releasePointer);
  dom.viewport.addEventListener("lostpointercapture", (event) => {
    const drag = state.elasticDrag;
    if (drag?.pointerId === event.pointerId && drag.phase === "dragging") startElasticReturn(drag);
  }, true);

  dom.viewport.addEventListener("click", (event) => {
    if (event.target.closest("button, input, .legend-panel, .minimap")) {
      state.suppressClick = false;
      window.clearTimeout(state.suppressClickTimer);
      return;
    }
    if (!state.suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    state.suppressClick = false;
  }, true);

  let resizeTimer;
  const refreshViewport = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const wasMobile = state.mobile;
      const previousWidth = state.viewportWidth;
      const previousViewportWidth = dom.viewport.clientWidth;
      const previousViewportHeight = dom.viewport.clientHeight;
      const sceneCenterX = (previousViewportWidth / 2 - state.transform.x) / state.transform.scale;
      const sceneCenterY = (previousViewportHeight / 2 - state.transform.y) / state.transform.scale;
      syncViewportMetrics();
      syncHeaderHeight();
      renderMap();
      state.viewportWidth = dom.viewport.clientWidth;
      if (wasMobile !== state.mobile) {
        fitView({ animate: false, readable: state.mobile });
      } else if (state.mobile && Math.abs(state.viewportWidth - previousWidth) > 8) {
        state.transform.x = dom.viewport.clientWidth / 2 - sceneCenterX * state.transform.scale;
        state.transform.y = dom.viewport.clientHeight / 2 - sceneCenterY * state.transform.scale;
        applyTransform();
      } else applyTransform();
    }, 120);
  };
  window.addEventListener("resize", refreshViewport);
  window.visualViewport?.addEventListener("resize", refreshViewport);
  window.addEventListener("blur", cancelElasticDrag);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelElasticDrag();
  });
  if (window.ResizeObserver && dom.header) {
    new ResizeObserver(() => {
      syncHeaderHeight();
    }).observe(dom.header);
  }
}

function syncViewportMetrics() {
  const viewport = window.visualViewport;
  const bottomOffset = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;
  document.documentElement.style.setProperty("--visual-bottom-offset", `${Math.round(bottomOffset)}px`);
}

function syncHeaderHeight() {
  if (!dom.header) return;
  const height = Math.ceil(dom.header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--header-height", `${height}px`);
}

async function init() {
  document.documentElement.classList.toggle("is-embedded", window.self !== window.top);
  syncViewportMetrics();
  syncHeaderHeight();
  fillColorKey(dom.businessColorKey, BUSINESS_KEY);
  fillColorKey(dom.themeColorKey, THEME_KEY);
  setupInteractions();

  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar la arquitectura (${response.status}).`);
    const records = await response.json();
    const { root, allNodes } = buildTree(records);
    state.root = root;
    state.allNodes = allNodes;
    dom.totalCount.textContent = String(records.length);
    renderMap();
    requestAnimationFrame(() => fitView({ animate: false, readable: state.mobile }));
  } catch (error) {
    console.error(error);
    dom.nodes.innerHTML = '<div style="position:absolute;left:32px;top:40px;max-width:420px;padding:20px;border:1px solid #d6ddeb;border-radius:16px;background:#fff;color:#39455f;box-shadow:0 12px 30px rgba(25,39,75,.12)"><strong>No se ha podido mostrar el mapa.</strong><p style="margin:8px 0 0;font-size:.82rem;line-height:1.5">Recarga la página. Si el problema continúa, revisa la conexión.</p></div>';
  }
}

init();
