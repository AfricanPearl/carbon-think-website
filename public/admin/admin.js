(() => {
  'use strict';

  // ---------- configuration ----------

  const SECTIONS = [
    { id: 'site', title: 'Site settings', desc: 'Organisation name, domain, logo, browser tab icon and search engine details.' },
    { id: 'nav', title: 'Top menu', desc: 'The button at the right of the top menu. Menu links come from each section’s menu label.' },
    { id: 'hero', title: 'Hero (top of page)', desc: 'The first thing visitors see: headline, introduction, buttons, key figures and background photo.' },
    { id: 'about', title: 'About & mission', desc: 'Who we are, plus the mission and vision cards.' },
    { id: 'problem', title: 'The challenge', desc: 'The problem cards on the dark background.' },
    { id: 'pillars', title: 'What we do', desc: 'The three pillar cards.' },
    { id: 'fund', title: 'Catalytic Fund', desc: 'The Climate Catalytic Fund section. Add an image to replace the coloured finance layers.' },
    { id: 'carbon', title: 'Carbon markets', desc: 'The step-by-step carbon market journey.' },
    { id: 'research', title: 'Research', desc: 'Research cards. Add an image to any card to replace its colour pattern.' },
    { id: 'gallery', title: 'Photo gallery', desc: 'A grid of photos with captions. Switch it on and add photos to show it.' },
    { id: 'partners', title: 'Partners', desc: 'Stakeholders and partners. Each can have a logo and a link.' },
    { id: 'involve', title: 'Get involved', desc: 'Audience cards, each linking to a team email.' },
    { id: 'contact', title: 'Contact', desc: 'Team email addresses and the contact form options.' },
    { id: 'footer', title: 'Footer', desc: 'Footer text and social media links.' },
  ];

  const LABELS = {
    show: 'Show this section on the website', navLabel: 'Menu label (leave empty to keep it out of the menu)',
    kicker: 'Small label above the heading', heading: 'Heading', intro: 'Introduction', text: 'Text', title: 'Title',
    lead: 'Introduction text', eyebrow: 'Badge text', glanceTitle: 'Key figures card title', glance: 'Key figures',
    number: 'Figure', label: 'Label', standardsLabel: 'Standards strip label', standards: 'Standards',
    backgroundImage: 'Background photo', primaryButton: 'Main button', secondaryButton: 'Second button',
    link: 'Link', paragraphs: 'Paragraphs', image: 'Image', imageAlt: 'Image description (read aloud by screen readers)',
    mission: 'Mission', vision: 'Vision', cards: 'Cards', items: 'Cards', icon: 'Icon', featured: 'Highlight this card in dark green',
    points: 'Bullet points', layers: 'Finance layers (shown when no image is set)', value: 'Value', button: 'Button',
    steps: 'Steps', ctaText: 'Call-to-action text', ctaButton: 'Call-to-action button', tag: 'Tag', images: 'Photos',
    caption: 'Caption', category: 'Category', name: 'Name', note: 'Note', logo: 'Logo', email: 'Email address',
    emails: 'Team email addresses', topics: 'Contact form “I am a…” options', successMessage: 'Message shown after the form is sent',
    social: 'Social media links', url: 'Link', logoImage: 'Logo image (replaces the leaf mark)', faviconImage: 'Browser tab icon',
    shareImage: 'Image shown when the site is shared on social media', domain: 'Domain', description: 'Description for search engines',
    address: 'Address', copyright: 'Copyright line', ctaLabel: 'Menu button label', ctaLink: 'Menu button link',
  };
  const LABELS_BY_PATH = { 'site.name': 'Organisation name', 'site.title': 'Browser tab title', 'partners.items': 'Partners', 'research.items': 'Research cards', 'involve.items': 'Audience cards', 'pillars.items': 'Pillars' };
  const HINTS = {
    'site.domain': 'Used for search engines and social sharing links, e.g. carbon-think.org',
    'link': 'A web address (https://…), a section on this page (#contact), or an email (mailto:info@carbon-think.org).',
    'ctaLink': 'A web address (https://…), a section on this page (#contact), or an email (mailto:…).',
    'hero.title': 'Wrap words in *asterisks* to show them in gold italics.',
  };
  const LONG_KEYS = new Set(['text', 'lead', 'intro', 'mission', 'vision', 'description', 'successMessage', 'ctaText']);
  const ICONS = ['finance', 'training', 'research', 'leaf', 'globe', 'people', 'water', 'sun'];

  // Shape of a new item for each list, keyed by its path without indexes
  const TEMPLATES = {
    'hero.glance': { number: '', label: '' },
    'hero.standards': '',
    'about.paragraphs': '',
    'problem.cards': { title: '', text: '' },
    'pillars.items': { icon: 'leaf', title: '', text: '', featured: false, points: [] },
    'pillars.items.points': '',
    'fund.layers': { title: '', text: '' },
    'fund.points': { label: '', value: '' },
    'carbon.steps': { title: '', text: '' },
    'research.items': { tag: '', title: '', text: '', image: '', link: '' },
    'gallery.images': { image: '', caption: '' },
    'partners.items': { category: '', name: '', note: '', logo: '', link: '' },
    'involve.items': { title: '', text: '', email: '' },
    'contact.emails': { label: '', email: '' },
    'contact.topics': { label: '', email: '' },
    'footer.social': { label: '', url: '' },
  };

  // ---------- state & helpers ----------

  const state = { content: null, saved: '', view: 'site', open: new Set(), device: 'desktop', previewOn: true, scrollTo: null };

  const $ = (sel, root = document) => root.querySelector(sel);
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k in node && typeof v !== 'string') node[k] = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c);
    return node;
  }
  const humanize = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase());
  const pathKey = (path) => path.filter((p) => typeof p === 'string').join('.');
  const labelFor = (key, path) => LABELS_BY_PATH[pathKey(path)] || LABELS[key] || humanize(key);
  const hintFor = (key, path) => HINTS[pathKey(path)] || HINTS[key];
  const formatDate = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const isDirty = () => state.content && JSON.stringify(state.content) !== state.saved;

  let toastTimer;
  function toast(message, isError = false) {
    const t = $('#toast');
    t.textContent = message;
    t.classList.toggle('error', isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 6000 : 3500);
  }

  async function api(url, opts = {}) {
    const init = { credentials: 'same-origin', method: opts.method || 'GET' };
    if (opts.body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, init);
    if (res.status === 401 && url !== '/api/login') {
      showLogin();
      throw new Error('Your session has ended. Please sign in again.');
    }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  }

  // ---------- login ----------

  function showLogin() {
    $('#appView').hidden = true;
    $('#loginView').hidden = false;
    $('#password').focus();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try {
      await api('/api/login', { method: 'POST', body: { password: $('#password').value } });
      $('#password').value = '';
      await startApp();
    } catch (err) {
      $('#loginError').textContent = err.message;
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    if (isDirty() && !confirm('You have unpublished changes. Sign out and lose them?')) return;
    await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
    state.content = null;
    showLogin();
  });

  async function startApp() {
    state.content = await api('/api/content');
    state.saved = JSON.stringify(state.content);
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    renderNav();
    const fromHash = location.hash.slice(1);
    go(fromHash && (SECTIONS.some((s) => s.id === fromHash) || ['media', 'messages', 'history'].includes(fromHash)) ? fromHash : 'site');
    updateSaveState();
    refreshMessageCount();
  }

  // ---------- navigation ----------

  function renderNav() {
    $('#sectionNav').replaceChildren(...SECTIONS.map((s) => el('li', {}, el('button', { type: 'button', 'data-view': s.id, text: s.title }))));
  }

  document.querySelector('.sidebar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) go(btn.dataset.view);
  });

  function go(view) {
    state.view = view;
    history.replaceState(null, '', `#${view}`);
    document.querySelectorAll('.sidebar button[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    const sectionIds = { site: 'top', nav: 'top', hero: 'top', footer: 'contact' };
    state.scrollTo = SECTIONS.some((s) => s.id === view) ? (sectionIds[view] || view) : null;
    render();
    $('#editor').scrollTop = 0;
    schedulePreview(0);
  }

  function render() {
    const editor = $('#editor');
    const scroll = editor.scrollTop;
    if (state.view === 'media') renderMedia();
    else if (state.view === 'messages') renderMessages();
    else if (state.view === 'history') renderHistory();
    else renderSection(state.view);
    editor.scrollTop = scroll;
  }

  // ---------- section editor ----------

  function renderSection(id) {
    const meta = SECTIONS.find((s) => s.id === id);
    if (!state.content[id]) state.content[id] = {};
    const form = el('div', { class: 'fields' });
    renderFields(form, state.content[id], [id]);
    $('#editor').replaceChildren(
      el('div', { class: 'editor-head' },
        el('h1', { text: meta.title }),
        el('p', { text: meta.desc }),
        el('p', { class: 'tip', text: 'Formatting: *word* shows a word in italics (gold in headings), **word** makes it bold.' })),
      form,
    );
  }

  function renderFields(container, obj, path) {
    for (const key of Object.keys(obj)) container.append(renderField(obj, key, [...path, key]));
  }

  function kindOf(key, value) {
    if (typeof value === 'boolean') return 'toggle';
    if (Array.isArray(value)) return 'list';
    if (value && typeof value === 'object') return 'group';
    if (/(image|logo)$/i.test(key) && !/alt$/i.test(key)) return 'image';
    if (key === 'icon') return 'icon';
    if (LONG_KEYS.has(key) || String(value ?? '').length > 90) return 'textarea';
    return 'text';
  }

  function renderField(obj, key, path) {
    const value = obj[key];
    const id = `f-${path.join('-')}`;
    const label = labelFor(key, path);
    const hint = hintFor(key, path);
    const hintEl = hint ? el('small', { class: 'hint', text: hint }) : null;

    switch (kindOf(key, value)) {
      case 'toggle':
        return el('label', { class: 'toggle', for: id },
          el('input', { type: 'checkbox', id, checked: value, onchange: (e) => { obj[key] = e.target.checked; changed(); } }),
          el('span', { class: 'toggle-ui', 'aria-hidden': 'true' }),
          el('span', { text: label }));

      case 'group': {
        const box = el('fieldset', { class: 'group' }, el('legend', { text: label }));
        renderFields(box, value, path);
        return box;
      }

      case 'list':
        return listField(obj, key, path, label);

      case 'image':
        return imageField(obj, key, path, id, label);

      case 'icon':
        return el('div', { class: 'field' },
          el('label', { for: id, text: label }),
          el('select', { id, onchange: (e) => { obj[key] = e.target.value; changed(); } },
            ICONS.map((name) => el('option', { value: name, text: humanize(name), selected: name === value }))));

      case 'textarea': {
        const ta = el('textarea', { id, rows: 3, oninput: (e) => { obj[key] = e.target.value; autoGrow(e.target); changed(); } });
        ta.value = value ?? '';
        requestAnimationFrame(() => autoGrow(ta));
        return el('div', { class: 'field' }, el('label', { for: id, text: label }), ta, hintEl);
      }

      default: {
        const type = key === 'email' ? 'email' : 'text';
        const input = el('input', { id, type, oninput: (e) => { obj[key] = e.target.value; changed(); } });
        input.value = value ?? '';
        return el('div', { class: 'field' }, el('label', { for: id, text: label }), input, hintEl);
      }
    }
  }

  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }

  function itemSummary(item, i) {
    if (typeof item === 'string') return item || `Item ${i + 1}`;
    const text = item.title || item.name || item.label || item.caption || item.number || item.tag;
    return text ? String(text).replace(/\*/g, '') : `Item ${i + 1}`;
  }

  function newItem(arr, path) {
    const tpl = TEMPLATES[pathKey(path)];
    if (tpl !== undefined) return structuredClone(tpl);
    const first = arr[0];
    if (typeof first === 'string' || first === undefined) return '';
    const blank = (v) => (typeof v === 'boolean' ? false : Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).map((k) => [k, blank(v[k])])) : '');
    return blank(first);
  }

  function listField(obj, key, path, label) {
    const arr = obj[key];
    const listKey = path.join('.');
    const wrap = el('div', { class: 'list' }, el('div', { class: 'list-head' }, el('h3', { text: label }), el('span', { class: 'count', text: `${arr.length}` })));

    const move = (from, to) => {
      if (to < 0 || to >= arr.length) return;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      changed();
      render();
    };
    const remove = (i) => {
      if (typeof arr[i] === 'object' && !confirm(`Remove “${itemSummary(arr[i], i)}”?`)) return;
      arr.splice(i, 1);
      changed();
      render();
    };
    const controls = (i) => el('div', { class: 'item-controls' },
      el('button', { type: 'button', class: 'icon-btn', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: (e) => { e.preventDefault(); move(i, i - 1); } }, '↑'),
      el('button', { type: 'button', class: 'icon-btn', title: 'Move down', 'aria-label': 'Move down', disabled: i === arr.length - 1, onclick: (e) => { e.preventDefault(); move(i, i + 1); } }, '↓'),
      el('button', { type: 'button', class: 'icon-btn danger', title: 'Remove', 'aria-label': 'Remove', onclick: (e) => { e.preventDefault(); remove(i); } }, '✕'));

    arr.forEach((item, i) => {
      const itemPath = [...path, i];
      if (typeof item === 'string') {
        const id = `f-${itemPath.join('-')}`;
        const input = el(item.length > 90 ? 'textarea' : 'input', { id, 'aria-label': `${label} ${i + 1}`, oninput: (e) => { arr[i] = e.target.value; if (e.target.tagName === 'TEXTAREA') autoGrow(e.target); changed(); } });
        input.value = item;
        if (input.tagName === 'TEXTAREA') requestAnimationFrame(() => autoGrow(input));
        wrap.append(el('div', { class: 'list-row' }, input, controls(i)));
        return;
      }
      const openKey = `${listKey}.${i}`;
      const details = el('details', { class: 'list-item', open: state.open.has(openKey), ontoggle: (e) => { e.target.open ? state.open.add(openKey) : state.open.delete(openKey); } },
        el('summary', {}, el('span', { class: 'item-title', text: itemSummary(item, i) }), controls(i)));
      const body = el('div', { class: 'item-body' });
      renderFields(body, item, itemPath);
      details.append(body);
      wrap.append(details);
    });

    wrap.append(el('button', { type: 'button', class: 'btn btn-add', onclick: () => {
      arr.push(newItem(arr, path));
      if (typeof arr[arr.length - 1] === 'object') state.open.add(`${listKey}.${arr.length - 1}`);
      changed();
      render();
    } }, '+ Add'));
    return wrap;
  }

  // ---------- images ----------

  function imageField(obj, key, path, id, label) {
    const value = obj[key] || '';
    const set = (url) => { obj[key] = url; changed(); render(); };
    const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', hidden: true, onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        set(await uploadImage(file));
        toast('Image uploaded. Publish to make it live.');
      } catch (err) {
        toast(err.message, true);
      }
    } });
    const url = el('input', { id, type: 'text', placeholder: 'or paste an image link (https://…)', onchange: (e) => set(e.target.value.trim()) });
    url.value = value;
    return el('div', { class: 'field image-field' },
      el('label', { for: id, text: label }),
      el('div', { class: 'image-box' },
        value ? el('img', { src: value, alt: '' }) : el('span', { class: 'image-empty', text: 'No image' }),
        el('div', { class: 'image-actions' },
          el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => fileInput.click() }, 'Upload image'),
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => openPicker(set) }, 'Choose from library'),
          value ? el('button', { type: 'button', class: 'btn btn-link btn-sm danger', onclick: () => set('') }, 'Remove') : null,
          fileInput)),
      url);
  }

  // Large photos are scaled down in the browser before upload to keep the site fast
  async function uploadImage(file) {
    let data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('That file could not be read.'));
      reader.readAsDataURL(file);
    });
    if (file.type !== 'image/gif' && file.size > 600 * 1024) {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('That file is not an image this browser can open.'));
        i.src = data;
      });
      const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      data = file.type === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
    }
    const result = await api('/api/uploads', { method: 'POST', body: { filename: file.name, data } });
    return result.url;
  }

  async function openPicker(onPick) {
    const dialog = $('#pickerDialog');
    const grid = $('#pickerGrid');
    grid.replaceChildren(el('p', { class: 'muted', text: 'Loading…' }));
    dialog.showModal();
    try {
      const files = await api('/api/uploads');
      grid.replaceChildren(...(files.length ? files.map((f) => el('button', { type: 'button', class: 'media-item', onclick: () => { dialog.close(); onPick(f.url); } },
        el('img', { src: f.url, alt: '', loading: 'lazy' }), el('span', { text: f.name }))) : [el('p', { class: 'muted', text: 'No images uploaded yet. Use “Upload image” first.' })]));
    } catch (err) {
      grid.replaceChildren(el('p', { class: 'muted', text: err.message }));
    }
  }
  $('#pickerClose').addEventListener('click', () => $('#pickerDialog').close());

  async function renderMedia() {
    const editor = $('#editor');
    const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', multiple: true, hidden: true, onchange: async (e) => {
      for (const file of e.target.files) {
        try { await uploadImage(file); } catch (err) { toast(`${file.name}: ${err.message}`, true); }
      }
      toast('Upload finished.');
      renderMedia();
    } });
    const grid = el('div', { class: 'media-grid' }, el('p', { class: 'muted', text: 'Loading…' }));
    editor.replaceChildren(
      el('div', { class: 'editor-head' },
        el('h1', { text: 'Image library' }),
        el('p', { text: 'Every image you have uploaded. Images marked “In use” appear somewhere on the site.' }),
        el('button', { type: 'button', class: 'btn btn-primary', onclick: () => fileInput.click() }, 'Upload images'), fileInput),
      grid);
    try {
      const files = await api('/api/uploads');
      const used = JSON.stringify(state.content);
      grid.replaceChildren(...(files.length ? files.map((f) => {
        const inUse = used.includes(f.url);
        return el('div', { class: 'media-item' },
          el('img', { src: f.url, alt: '', loading: 'lazy' }),
          el('span', { text: f.name }),
          el('div', { class: 'media-meta' },
            el('small', { text: `${(f.size / 1024).toFixed(0)} KB` }),
            inUse ? el('small', { class: 'pill-ok', text: 'In use' }) : el('button', { type: 'button', class: 'btn btn-link btn-sm danger', onclick: async () => {
              if (!confirm(`Delete ${f.name}? This cannot be undone.`)) return;
              await api(`/api/uploads/${encodeURIComponent(f.name)}`, { method: 'DELETE' });
              renderMedia();
            } }, 'Delete')));
      }) : [el('p', { class: 'muted', text: 'No images uploaded yet.' })]));
    } catch (err) {
      grid.replaceChildren(el('p', { class: 'muted', text: err.message }));
    }
  }

  // ---------- messages ----------

  async function refreshMessageCount() {
    try {
      const messages = await api('/api/messages');
      const badge = $('#messageCount');
      badge.textContent = messages.length;
      badge.hidden = messages.length === 0;
      return messages;
    } catch { return []; }
  }

  async function renderMessages() {
    const listEl = el('div', { class: 'messages' }, el('p', { class: 'muted', text: 'Loading…' }));
    $('#editor').replaceChildren(
      el('div', { class: 'editor-head' }, el('h1', { text: 'Messages' }), el('p', { text: 'Messages sent through the contact form on the website, newest first.' })),
      listEl);
    const messages = await refreshMessageCount();
    listEl.replaceChildren(...(messages.length ? messages.map((m) => el('article', { class: 'message' },
      el('header', {},
        el('div', {}, el('strong', { text: m.name }), m.org ? el('span', { class: 'muted', text: ` · ${m.org}` }) : null),
        el('small', { class: 'muted', text: formatDate(m.date) })),
      el('div', { class: 'message-meta' },
        el('a', { href: `mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Carbon Think')}`, text: m.email }),
        m.topic ? el('span', { class: 'tag', text: m.topic }) : null),
      el('p', { class: 'message-body', text: m.message }),
      el('button', { type: 'button', class: 'btn btn-link btn-sm danger', onclick: async () => {
        if (!confirm('Delete this message?')) return;
        await api(`/api/messages/${m.id}`, { method: 'DELETE' });
        renderMessages();
      } }, 'Delete'))) : [el('p', { class: 'muted', text: 'No messages yet.' })]));
  }

  // ---------- history ----------

  async function renderHistory() {
    const listEl = el('div', { class: 'history' }, el('p', { class: 'muted', text: 'Loading…' }));
    $('#editor').replaceChildren(
      el('div', { class: 'editor-head' }, el('h1', { text: 'Version history' }), el('p', { text: 'The site is saved before every publish. Restore any earlier version below; the current version is kept in history too, so restoring can be undone.' })),
      listEl);
    try {
      const versions = await api('/api/history');
      listEl.replaceChildren(...(versions.length ? versions.map((v) => el('div', { class: 'history-row' },
        el('span', { text: `Before publish on ${formatDate(v.date)}` }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: async () => {
          if (!confirm(`Restore the site as it was before ${formatDate(v.date)}? This replaces what is live now${isDirty() ? ' and discards your unpublished changes' : ''}.`)) return;
          state.content = await api(`/api/history/${v.id}/restore`, { method: 'POST', body: {} });
          state.saved = JSON.stringify(state.content);
          updateSaveState();
          schedulePreview(0);
          toast('Version restored and live.');
          renderHistory();
        } }, 'Restore'))) : [el('p', { class: 'muted', text: 'No earlier versions yet. One is created each time you publish.' })]));
    } catch (err) {
      listEl.replaceChildren(el('p', { class: 'muted', text: err.message }));
    }
  }

  // ---------- saving ----------

  function changed() {
    updateSaveState();
    schedulePreview();
  }

  function updateSaveState() {
    const dirty = isDirty();
    $('#saveBtn').disabled = !dirty;
    $('#discardBtn').disabled = !dirty;
    $('#saveState').textContent = dirty ? 'Unpublished changes' : 'All changes published';
    $('#saveState').classList.toggle('dirty', dirty);
  }

  async function publish() {
    if (!isDirty()) return;
    const btn = $('#saveBtn');
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      await api('/api/content', { method: 'PUT', body: state.content });
      state.saved = JSON.stringify(state.content);
      toast('Published. Your changes are live on the website.');
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.textContent = 'Publish changes';
      updateSaveState();
    }
  }

  $('#saveBtn').addEventListener('click', publish);
  $('#discardBtn').addEventListener('click', () => {
    if (!confirm('Discard all unpublished changes?')) return;
    state.content = JSON.parse(state.saved);
    updateSaveState();
    render();
    schedulePreview(0);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      publish();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- live preview ----------

  let previewTimer;
  let previewSeq = 0;
  function schedulePreview(delay = 500) {
    if (!state.previewOn || !state.content) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      const seq = ++previewSeq;
      try {
        const html = await api('/api/preview', { method: 'POST', body: state.content });
        if (seq !== previewSeq) return;
        const frame = $('#previewFrame');
        const target = state.scrollTo;
        const keepY = frame.contentWindow ? frame.contentWindow.scrollY : 0;
        state.scrollTo = null;
        frame.onload = () => {
          const doc = frame.contentDocument;
          const node = target && doc.getElementById(target);
          if (node) node.scrollIntoView();
          else frame.contentWindow.scrollTo(0, keepY);
        };
        frame.srcdoc = html;
      } catch { /* the preview is best-effort; errors surface on publish */ }
    }, delay);
  }

  $('#togglePreview').addEventListener('click', (e) => {
    state.previewOn = !state.previewOn;
    $('#workspace').classList.toggle('no-preview', !state.previewOn);
    e.currentTarget.textContent = state.previewOn ? 'Hide preview' : 'Show preview';
    e.currentTarget.setAttribute('aria-pressed', String(state.previewOn));
    if (state.previewOn) schedulePreview(0);
  });

  document.querySelector('.device-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-device]');
    if (!btn) return;
    document.querySelectorAll('.device-toggle button').forEach((b) => b.classList.toggle('active', b === btn));
    $('.preview-frame-wrap').classList.toggle('mobile', btn.dataset.device === 'mobile');
  });

  // Phones: start with the preview hidden so the editor has room
  if (window.matchMedia('(max-width: 900px)').matches) $('#togglePreview').click();

  // ---------- boot ----------

  api('/api/session').then((s) => (s.authenticated ? startApp() : showLogin())).catch(showLogin);
})();
