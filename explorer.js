"use strict";

// Stageshow's retained frame, causal motion and compact-layout principles,
// applied to the live architecture rather than a simulated product.
(() => {
  const $ = selector => document.querySelector(selector);
  const ui = {
    nav: $('#scopeNavigation'), overview: $('#overviewButton'), crumbs: $('#breadcrumbs'),
    outline: $('#outlinePanel'), rows: $('#outlineRows'), outlineTitle: $('#outlineTitle'),
    mapButton: $('#mapViewButton'), listButton: $('#listViewButton'),
    areas: $('#areasButton'), backdrop: $('#navBackdrop'), sidebar: $('#explorerNav'),
    tour: $('#tourPanel'), tourStart: $('#tourStart'), tourTitle: $('#tourTitle'),
    tourDescription: $('#tourDescription'), tourStep: $('#tourStep'), tourDots: $('#tourDots'),
    tourNext: $('#tourNext'), tourPrevious: $('#tourPrevious'), tourPlay: $('#tourPlay')
  };
  let ready = false;
  let pendingReveal = null;
  let view = window.matchMedia('(max-width: 840px)').matches ? 'list' : 'map';
  let tourIndex = -1;
  let tourTimer = null;
  let playing = false;
  let tourSnapshot = null;
  let selectionButtons = [];
  const reduced = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const label = node => node.title.replace(/^ILUNION\s+(?=.)/, '').replace(/\s*↗$/, '');
  const scope = () => state.scopeRoot || state.root;
  const find = title => state.allNodes.find(node => node.title === title);
  const icon = path => {
    const img = document.createElement('img');
    img.src = path; img.alt = ''; img.width = 18; img.height = 18;
    return img;
  };
  const button = (text, action, className = '') => {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = text; el.className = className;
    el.addEventListener('click', action);
    return el;
  };

  function setView(next, {fit = true} = {}) {
    view = next;
    document.body.dataset.view = next;
    ui.outline.hidden = next !== 'list';
    dom.viewport.hidden = next === 'list';
    ui.mapButton.setAttribute('aria-pressed', String(next === 'map'));
    ui.listButton.setAttribute('aria-pressed', String(next === 'list'));
    if (next === 'list') renderOutline();
    else if (ready) requestAnimationFrame(() => {
      renderMap();
      if (fit) fitView({readable: state.mobile, animate: false});
    });
  }

  function setNav(open, returnFocus = false) {
    ui.sidebar.classList.toggle('is-open', open);
    ui.areas.setAttribute('aria-expanded', String(open));
    ui.backdrop.hidden = !open;
    if (window.matchMedia('(max-width: 840px)').matches) ui.sidebar.inert = !open;
    if (open) ui.overview.focus({preventScroll: true});
    if (returnFocus) ui.areas.focus({preventScroll: true});
  }

  function writeHash(node) {
    const hash = node === state.root ? '' : '#area=' + encodeURIComponent(node.path.join(' / '));
    history.replaceState(null, '', location.pathname + location.search + hash);
  }

  function selectScope(node, {tour = false, updateUrl = true} = {}) {
    if (!node) return;
    if (!tour && tourIndex >= 0) closeTour(false);
    clearNodeFocus();
    state.scopeRoot = node === state.root ? null : node;
    state.allNodes.forEach(item => { if (item.children.length) item.collapsed = true; });
    node.collapsed = false;
    renderMap();
    const navWasOpen = ui.sidebar.classList.contains('is-open');
    setNav(false, navWasOpen);
    if (updateUrl) writeHash(node);
    if (view === 'map') requestAnimationFrame(() => fitView({readable: state.mobile}));
    else ui.outline.scrollTop = 0;
  }

  function navEntry(node, business = false) {
    const el = button('', () => selectScope(node), 'scope-link');
    const mark = businessIconFor(node);
    el.style.setProperty('--area-color', themeFor(node));
    el.append(icon(mark ? `./icons/business/${mark.icon}.svg` : './icons/context/layer.svg'));
    const text = document.createElement('span'); text.textContent = label(node);
    const count = document.createElement('span'); count.className = 'scope-count';
    count.textContent = node.descendantCount + 1;
    el.append(text, count);
    if (isExternal(node)) {
      text.textContent += ' ↗';
      el.setAttribute('aria-label', `${label(node)}. Accesos externos, ${node.descendantCount + 1} páginas`);
    }
    selectionButtons.push({node, el});
    return el;
  }

  function renderNavigation() {
    ui.nav.replaceChildren(); selectionButtons = [];
    const heading = (text, number) => {
      const p = document.createElement('p'); p.className = 'nav-section-label';
      p.textContent = text;
      if (number) { const b = document.createElement('span'); b.textContent = number; p.append(b); }
      ui.nav.append(p);
    };
    const businesses = find('Qué hacemos');
    heading('Áreas de negocio', businesses.children.length);
    businesses.children.forEach(node => ui.nav.append(navEntry(node, true)));
    heading('Corporativo y transversal');
    state.root.children.filter(node => node !== businesses).forEach(node => ui.nav.append(navEntry(node)));
  }

  function renderCrumbs() {
    ui.crumbs.replaceChildren();
    const ancestors = []; let node = scope();
    while (node) { ancestors.unshift(node); node = node.parent; }
    ancestors.forEach((item, i) => {
      if (i) { const sep = document.createElement('span'); sep.className = 'crumb-separator'; sep.textContent = '›'; sep.setAttribute('aria-hidden','true'); ui.crumbs.append(sep); }
      const el = button(item === state.root ? 'Vista general' : label(item), () => selectScope(item));
      if (i === ancestors.length - 1) el.setAttribute('aria-current', 'location');
      ui.crumbs.append(el);
    });
    ui.overview.setAttribute('aria-current', scope() === state.root ? 'page' : 'false');
    selectionButtons.forEach(({node, el}) => {
      let current = scope(); let active = false;
      while (current) { if (current === node) active = true; current = current.parent; }
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function renderOutline() {
    if (!state.root) return;
    ui.outlineTitle.textContent = scope() === state.root ? 'Arquitectura corporativa' : scope().title;
    const fragment = document.createDocumentFragment();
    state.visibleNodes.forEach(node => {
      const row = document.createElement('div'); row.className = 'outline-row';
      row.dataset.nodeId = node.id;
      row.tabIndex = -1;
      row.style.setProperty('--indent', Math.min(node.depth - scope().depth, 4));
      row.style.setProperty('--area-color', themeFor(node));
      if (node.isAnnotation) row.classList.add('is-annotation');
      const control = button(node.children.length ? (node.collapsed ? '+' : '−') : '·', () => {
        if (!node.children.length) return;
        node.collapsed = !node.collapsed;
        renderMap();
        ui.rows.querySelector(`[data-node-id="${CSS.escape(node.id)}"] button`)?.focus({preventScroll:true});
      }, 'outline-toggle');
      if (node.children.length) {
        control.setAttribute('aria-label', `${node.collapsed ? 'Desplegar' : 'Contraer'} ${node.title}`);
        control.setAttribute('aria-expanded', String(!node.collapsed));
      } else { control.disabled = true; control.setAttribute('aria-hidden','true'); }
      const copy = document.createElement('div'); copy.className = 'outline-copy';
      const title = node.children.length ? button(node.title, () => selectScope(node), 'outline-name') : document.createElement('span');
      title.textContent = node.title;
      if (!node.children.length) title.className = 'outline-name';
      const subtitle = document.createElement('span'); subtitle.className = 'outline-description'; subtitle.textContent = node.subtitle || (node.isAnnotation ? 'Anotación de la propuesta' : `Nivel ${node.depth}`);
      copy.append(title, subtitle);
      row.append(control, copy);
      if (node.children.length) { const count = document.createElement('span'); count.className = 'outline-count'; count.textContent = node.descendantCount; row.append(count); }
      if (node.url) {
        const link = document.createElement('a'); link.href = node.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.className = 'outline-external'; link.textContent = '↗'; link.setAttribute('aria-label', `Abrir ${node.title} en otra pestaña`); row.append(link);
      }
      fragment.append(row);
    });
    ui.rows.replaceChildren(fragment);
  }

  const steps = [
    {node:'ILUNION', title:'Todo parte de una misma web.', text:'La propuesta reúne la arquitectura corporativa, las áreas de negocio y los accesos comunes en un único ecosistema.'},
    {node:'Qué hacemos', title:'Cada negocio tiene su espacio.', text:'Seis webs se integran en Qué hacemos. Hoteles mantiene el acceso a su web externa. Cada color identifica una rama.'},
    {node:'ILUNION Retail', title:'Retail reúne Tu Tienda y Comercialización.', text:'Un área propia dentro de Qué hacemos permite explorar su oferta sin situarla dentro de ILUNION Servicios.'},
    {node:'Nosotros', title:'Lo compartido se cuenta una vez.', text:'Nosotros incorpora Compromiso. Sedes y Contacto se sitúan en el nivel corporativo para dar servicio a todos los negocios.'},
    {node:'ILUNION', title:'Del conjunto al detalle, a tu ritmo.', text:'Elige un área, despliega sus ramas o busca una página. Cambia a Índice para recorrer la estructura como una lista.'}
  ];

  function scheduleTour() {
    clearTimeout(tourTimer);
    if (!playing || tourIndex < 0 || document.hidden) return;
    tourTimer = setTimeout(() => {
      if (tourIndex === steps.length - 1) { playing = false; syncPlay(); return; }
      showStep(tourIndex + 1);
    }, 8500);
  }

  function syncPlay() {
    ui.tourPlay.textContent = playing ? 'Pausar' : 'Reproducir';
    ui.tourPlay.setAttribute('aria-label', playing ? 'Pausar recorrido automático' : 'Reproducir recorrido automáticamente');
    scheduleTour();
  }

  function showStep(index) {
    tourIndex = Math.max(0, Math.min(steps.length - 1, index));
    const step = steps[tourIndex];
    ui.tour.hidden = false; document.body.classList.add('tour-open');
    ui.tourTitle.textContent = step.title; ui.tourDescription.textContent = step.text;
    ui.tourStep.textContent = `${String(tourIndex + 1).padStart(2, '0')} / 05`;
    ui.tourPrevious.disabled = tourIndex === 0;
    ui.tourNext.textContent = tourIndex === steps.length - 1 ? 'Explorar mapa' : 'Siguiente →';
    ui.tourDots.replaceChildren(...steps.map((s, i) => {
      const b = button('', () => showStep(i)); b.setAttribute('aria-label', `Paso ${i + 1}: ${s.title}`);
      b.setAttribute('aria-current', i === tourIndex ? 'step' : 'false'); return b;
    }));
    selectScope(find(step.node), {tour:true, updateUrl:false});
    if (!reduced()) $('#tourBody').animate([{opacity:.3,translate:'0 8px'},{opacity:1,translate:'0 0'}], {duration:320,easing:'cubic-bezier(.25,.8,.25,1)'});
    scheduleTour();
  }

  function closeTour(restore = true) {
    clearTimeout(tourTimer); playing = false; tourIndex = -1;
    ui.tour.hidden = true; document.body.classList.remove('tour-open');
    if (restore && tourSnapshot) {
      state.scopeRoot = tourSnapshot.scope;
      state.allNodes.forEach(node => { node.collapsed = tourSnapshot.collapsed.get(node.id); });
      setView(tourSnapshot.view, {fit:false});
      renderMap(); state.transform = {...tourSnapshot.transform}; applyTransform();
      renderCrumbs();
    }
    tourSnapshot = null;
  }

  ui.overview.addEventListener('click', () => selectScope(state.root));
  ui.mapButton.addEventListener('click', () => setView('map'));
  ui.listButton.addEventListener('click', () => setView('list'));
  ui.areas.addEventListener('click', () => setNav(!ui.sidebar.classList.contains('is-open')));
  ui.backdrop.addEventListener('click', () => setNav(false, true));
  ui.tourStart.addEventListener('click', () => {
    if (!ready) return;
    if (tourIndex >= 0) { closeTour(true); return; }
    tourSnapshot = {scope:state.scopeRoot, collapsed:new Map(state.allNodes.map(node => [node.id,node.collapsed])), transform:{...state.transform}, view};
    if (!window.matchMedia('(max-width:840px)').matches) setView('map', {fit:false});
    showStep(0); $('#tourClose').focus({preventScroll:true});
  });
  $('#tourClose').addEventListener('click', () => { closeTour(true); ui.tourStart.focus({preventScroll:true}); });
  ui.tourPrevious.addEventListener('click', () => showStep(tourIndex - 1));
  ui.tourNext.addEventListener('click', () => {
    if (tourIndex === steps.length - 1) { closeTour(false); selectScope(state.root); ui.tourStart.focus({preventScroll:true}); }
    else showStep(tourIndex + 1);
  });
  ui.tourPlay.addEventListener('click', () => { playing = !playing; syncPlay(); });
  document.addEventListener('visibilitychange', scheduleTour);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (tourIndex >= 0) { closeTour(true); ui.tourStart.focus({preventScroll:true}); }
      if (ui.sidebar.classList.contains('is-open')) setNav(false, true);
    }
    if (event.key === 'Tab' && ui.sidebar.classList.contains('is-open') && window.matchMedia('(max-width:840px)').matches) {
      const controls = [...ui.sidebar.querySelectorAll('button')]; const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('hashchange', () => {
    const path = new URLSearchParams(location.hash.slice(1)).get('area');
    selectScope(state.allNodes.find(node => node.path.join(' / ') === path) || state.root, {updateUrl:false});
  });
  window.matchMedia('(max-width:840px)').addEventListener('change', event => {
    setNav(false); ui.sidebar.inert = event.matches;
    setView(event.matches ? 'list' : 'map');
  });
  window.ilunionExplorer = {
    ready() {
      if (ready) return; ready = true;
      $('#navTotal').textContent = dom.totalCount.textContent;
      renderNavigation(); renderCrumbs();
      ui.sidebar.inert = window.matchMedia('(max-width:840px)').matches;
      setView(view);
      const path = new URLSearchParams(location.hash.slice(1)).get('area');
      const node = path && state.allNodes.find(item => item.path.join(' / ') === path);
      if (node) selectScope(node, {updateUrl:false});
    },
    onRender() {
      if (!ready) return;
      renderCrumbs();
      if (view === 'list') {
        renderOutline();
        if (pendingReveal) {
          const id = pendingReveal; pendingReveal = null;
          requestAnimationFrame(() => {
            const row = ui.rows.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
            row?.classList.add('is-selected');
            row?.scrollIntoView({block:'center', behavior:reduced() ? 'instant' : 'smooth'});
            row?.focus({preventScroll:true});
          });
        }
      }
    },
    prepareSearch(node) {
      if (tourIndex >= 0) closeTour(false);
      let area = node;
      while (area.parent && area.depth > (area.path[1] === 'Qué hacemos' ? 2 : 1)) area = area.parent;
      state.scopeRoot = area === state.root ? null : area;
      pendingReveal = view === "list" ? node.id : null;
      writeHash(area); setNav(false);
    }
  };
  if (state.root) window.ilunionExplorer.ready();
})();
