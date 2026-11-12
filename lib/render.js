'use strict';

// Builds the public page from content.json. Every value is escaped; the only
// formatting allowed in text is **bold** and *highlight*.

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const rich = (v) => esc(v).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
const list = (v) => (Array.isArray(v) ? v : []);
const pad = (n) => String(n).padStart(2, '0');
const shown = (section) => Boolean(section) && section.show !== false;

// Images may come from the uploads folder or any https URL
function safeImage(url) {
  const u = String(url || '').trim();
  return /^(\/uploads\/[\w.-]+|https:\/\/[^\s"'()<>]+)$/.test(u) ? u : '';
}

function safeLink(url) {
  const u = String(url || '').trim();
  if (!u || /[\s"'<>]/.test(u)) return '#';
  return /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(u) ? u : '#';
}

const ICONS = {
  finance: '<circle cx="24" cy="24" r="18"/><path d="M24 13v22M30 18c0-2.5-2.7-4-6-4s-6 1.5-6 4.5 3 4 6 4.5 6 1.5 6 4.5-2.7 4.5-6 4.5-6-1.5-6-4"/>',
  training: '<path d="M6 18 24 9l18 9-18 9z"/><path d="M13 22v9c0 3 5 6 11 6s11-3 11-6v-9M42 18v10"/>',
  research: '<path d="M8 40V8M8 40h32"/><path d="m14 30 7-8 6 5 10-12"/><circle cx="37" cy="15" r="1.5"/>',
  leaf: '<path d="M24 40c-9-4-14-12-14-20 8 0 14 5 14 14 0-12 6-20 16-23 0 14-5 25-16 29z"/>',
  globe: '<circle cx="24" cy="24" r="17"/><path d="M7 24h34M24 7c5 5 7 11 7 17s-2 12-7 17c-5-5-7-11-7-17s2-12 7-17z"/>',
  people: '<circle cx="18" cy="17" r="6"/><circle cx="33" cy="19" r="4.5"/><path d="M7 38c0-6 5-11 11-11s11 5 11 11M30 29c5 0 10 3 10 9"/>',
  water: '<path d="M24 7c7 9 12 15 12 22a12 12 0 0 1-24 0c0-7 5-13 12-22z"/>',
  sun: '<circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/>',
};
const icon = (name) => `<svg viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.leaf}</g></svg>`;

const LOGO_SVG = '<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 31c-6-3-9-8-9-13 5 0 9 3 9 9 0-8 4-13 10-15 0 9-3 16-10 19z" fill="currentColor"/></svg>';

const TOPO = `<svg class="topo" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" stroke-width="1">${
  Array.from({ length: 11 }, (_, i) => {
    const y = 620 - i * 40;
    return `<path d="M-50 ${y} C ${200 + i * 8} ${y - 80}, ${380 + i * 8} ${y + 80}, ${620 + i * 8} ${y - 20} S ${1000 + i * 8} ${y - 140}, 1260 ${y - 60}"/>`;
  }).join('')
}</g></svg>`;

function logo(site, extraClass = '') {
  const img = safeImage(site.logoImage);
  const [first, ...rest] = String(site.name || '').split(' ');
  const mark = img ? `<img class="logo-img" src="${esc(img)}" alt="">` : LOGO_SVG;
  const word = `${esc(first)}${rest.length ? `<strong>${esc(rest.join(' '))}</strong>` : ''}`;
  return `<a href="#top" class="logo ${extraClass}" aria-label="${esc(site.name)} home">${mark}<span>${word}</span></a>`;
}

const button = (b, cls) => (b && b.label ? `<a href="${esc(safeLink(b.link))}" class="btn ${cls}">${esc(b.label)} <span aria-hidden="true">→</span></a>` : '');

// Section ids, in page order; a section appears in the menu when it is shown and has a menu label
const NAV_ORDER = ['about', 'problem', 'pillars', 'fund', 'carbon', 'research', 'gallery', 'partners', 'involve', 'contact'];

function renderPage(c, opts = {}) {
  const site = c.site || {};
  const hero = c.hero || {};
  const nav = NAV_ORDER.filter((id) => shown(c[id]) && c[id].navLabel).map((id) => ({ id, label: c[id].navLabel }));
  const favicon = safeImage(site.faviconImage) || '/favicon.svg';
  const shareImage = safeImage(site.shareImage);
  const domain = String(site.domain || '').replace(/[^\w.-]/g, '');
  const heroPhoto = safeImage(hero.backgroundImage);

  const sections = [];

  // About
  const about = c.about;
  if (shown(about)) {
    const img = safeImage(about.image);
    sections.push(`
<section class="section about" id="about">
  <div class="container about-grid">
    <div class="reveal">
      <span class="kicker">${esc(about.kicker)}</span>
      <h2>${rich(about.heading)}</h2>
    </div>
    <div class="about-copy reveal">
      ${list(about.paragraphs).map((p) => `<p>${rich(p)}</p>`).join('\n      ')}
      ${img ? `<figure class="about-figure"><img src="${esc(img)}" alt="${esc(about.imageAlt)}" loading="lazy"></figure>` : ''}
    </div>
  </div>
  <div class="container mv-grid">
    ${about.mission ? `<article class="mv-card mv-mission reveal"><span class="mv-tag">Mission</span><p>${rich(about.mission)}</p></article>` : ''}
    ${about.vision ? `<article class="mv-card mv-vision reveal"><span class="mv-tag">Vision</span><p>${rich(about.vision)}</p></article>` : ''}
  </div>
</section>`);
  }

  // Problem
  const problem = c.problem;
  if (shown(problem)) {
    sections.push(`
<section class="section problem" id="problem">
  <div class="container">
    <div class="section-head reveal">
      <span class="kicker kicker-light">${esc(problem.kicker)}</span>
      <h2>${rich(problem.heading)}</h2>
    </div>
    <div class="problem-grid">
      ${list(problem.cards).map((card, i) => `
      <article class="problem-card reveal">
        <span class="problem-index">${pad(i + 1)}</span>
        <h3>${rich(card.title)}</h3>
        <p>${rich(card.text)}</p>
      </article>`).join('')}
    </div>
  </div>
</section>`);
  }

  // Pillars
  const pillars = c.pillars;
  if (shown(pillars)) {
    sections.push(`
<section class="section pillars" id="pillars">
  <div class="container">
    <div class="section-head center reveal">
      <span class="kicker">${esc(pillars.kicker)}</span>
      <h2>${rich(pillars.heading)}</h2>
      ${pillars.intro ? `<p class="section-sub">${rich(pillars.intro)}</p>` : ''}
    </div>
    <div class="pillar-grid">
      ${list(pillars.items).map((item, i) => `
      <article class="pillar${item.featured ? ' pillar-featured' : ''} reveal">
        <div class="pillar-icon" aria-hidden="true">${icon(item.icon)}</div>
        <span class="pillar-num">Pillar ${pad(i + 1)}</span>
        <h3>${rich(item.title)}</h3>
        <p>${rich(item.text)}</p>
        ${list(item.points).length ? `<ul class="ticks">${list(item.points).map((pt) => `<li>${rich(pt)}</li>`).join('')}</ul>` : ''}
      </article>`).join('')}
    </div>
  </div>
</section>`);
  }

  // Fund
  const fund = c.fund;
  if (shown(fund)) {
    const img = safeImage(fund.image);
    const visual = img
      ? `<div class="feature-visual has-image reveal"><img src="${esc(img)}" alt="${esc(fund.imageAlt)}" loading="lazy"></div>`
      : `<div class="feature-visual reveal" aria-hidden="true"><div class="stack">${list(fund.layers).map((layer, i) => `<div class="stack-layer l${(i % 3) + 1}"><span>${esc(layer.title)}</span><small>${esc(layer.text)}</small></div>`).join('')}</div></div>`;
    sections.push(`
<section class="section feature" id="fund">
  <div class="container feature-grid">
    ${visual}
    <div class="feature-copy reveal">
      <span class="kicker">${esc(fund.kicker)}</span>
      <h2>${rich(fund.heading)}</h2>
      <p>${rich(fund.text)}</p>
      ${list(fund.points).length ? `<dl class="feature-points">${list(fund.points).map((pt) => `<div><dt>${esc(pt.label)}</dt><dd>${rich(pt.value)}</dd></div>`).join('')}</dl>` : ''}
      ${button(fund.button, 'btn-primary')}
    </div>
  </div>
</section>`);
  }

  // Carbon markets
  const carbon = c.carbon;
  if (shown(carbon)) {
    sections.push(`
<section class="section carbon" id="carbon">
  <div class="container">
    <div class="section-head reveal">
      <span class="kicker kicker-light">${esc(carbon.kicker)}</span>
      <h2>${rich(carbon.heading)}</h2>
      ${carbon.intro ? `<p class="section-sub light">${rich(carbon.intro)}</p>` : ''}
    </div>
    <ol class="journey">
      ${list(carbon.steps).map((step, i) => `
      <li class="reveal">
        <span class="step">${i + 1}</span>
        <h3>${rich(step.title)}</h3>
        <p>${rich(step.text)}</p>
      </li>`).join('')}
    </ol>
    ${carbon.ctaText ? `<div class="carbon-cta reveal"><p>${rich(carbon.ctaText)}</p>${carbon.ctaButton && carbon.ctaButton.label ? `<a href="${esc(safeLink(carbon.ctaButton.link))}" class="btn btn-accent">${esc(carbon.ctaButton.label)}</a>` : ''}</div>` : ''}
  </div>
</section>`);
  }

  // Research
  const research = c.research;
  if (shown(research)) {
    sections.push(`
<section class="section research" id="research">
  <div class="container">
    <div class="section-head split reveal">
      <div>
        <span class="kicker">${esc(research.kicker)}</span>
        <h2>${rich(research.heading)}</h2>
      </div>
      ${research.intro ? `<p class="section-sub">${rich(research.intro)}</p>` : ''}
    </div>
    <div class="research-grid">
      ${list(research.items).map((item, i) => {
        const img = safeImage(item.image);
        const title = item.link ? `<a href="${esc(safeLink(item.link))}">${rich(item.title)}</a>` : rich(item.title);
        return `
      <article class="research-card reveal">
        <div class="research-art${img ? ' has-image' : ` art-${(i % 3) + 1}`}"${img ? '' : ' aria-hidden="true"'}>${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</div>
        <div class="research-body">
          ${item.tag ? `<span class="tag">${esc(item.tag)}</span>` : ''}
          <h3>${title}</h3>
          <p>${rich(item.text)}</p>
        </div>
      </article>`;
      }).join('')}
    </div>
  </div>
</section>`);
  }

  // Gallery
  const gallery = c.gallery;
  const galleryImages = list(gallery && gallery.images).filter((g) => safeImage(g.image));
  if (shown(gallery) && galleryImages.length) {
    sections.push(`
<section class="section gallery" id="gallery">
  <div class="container">
    <div class="section-head reveal">
      <span class="kicker">${esc(gallery.kicker)}</span>
      <h2>${rich(gallery.heading)}</h2>
    </div>
    <div class="gallery-grid">
      ${galleryImages.map((g) => `
      <figure class="gallery-item reveal">
        <img src="${esc(safeImage(g.image))}" alt="${esc(g.caption)}" loading="lazy">
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`).join('')}
    </div>
  </div>
</section>`);
  }

  // Partners
  const partners = c.partners;
  if (shown(partners)) {
    sections.push(`
<section class="section partners" id="partners">
  <div class="container">
    <div class="section-head center reveal">
      <span class="kicker">${esc(partners.kicker)}</span>
      <h2>${rich(partners.heading)}</h2>
    </div>
    <div class="stake-grid">
      ${list(partners.items).map((p) => {
        const img = safeImage(p.logo);
        const tag = p.link ? 'a' : 'div';
        const href = p.link ? ` href="${esc(safeLink(p.link))}"` : '';
        return `
      <${tag} class="stake reveal"${href}>
        ${img ? `<img class="stake-logo" src="${esc(img)}" alt="${esc(p.name)} logo" loading="lazy">` : ''}
        ${p.category ? `<span class="stake-cat">${esc(p.category)}</span>` : ''}
        <h3>${esc(p.name)}</h3>
        ${p.note ? `<p>${esc(p.note)}</p>` : ''}
      </${tag}>`;
      }).join('')}
    </div>
  </div>
</section>`);
  }

  // Get involved
  const involve = c.involve;
  if (shown(involve)) {
    sections.push(`
<section class="section involve" id="involve">
  <div class="container">
    <div class="section-head center reveal">
      <span class="kicker">${esc(involve.kicker)}</span>
      <h2>${rich(involve.heading)}</h2>
    </div>
    <div class="involve-grid">
      ${list(involve.items).map((item) => `
      <a class="involve-card reveal" href="mailto:${esc(item.email)}">
        <h3>${rich(item.title)}</h3>
        <p>${rich(item.text)}</p>
        <span class="involve-link">${esc(item.email)} →</span>
      </a>`).join('')}
    </div>
  </div>
</section>`);
  }

  // Contact
  const contact = c.contact;
  if (shown(contact)) {
    sections.push(`
<section class="section contact" id="contact">
  <div class="container contact-grid">
    <div class="contact-info reveal">
      <span class="kicker kicker-light">${esc(contact.kicker)}</span>
      <h2>${rich(contact.heading)}</h2>
      ${contact.intro ? `<p>${rich(contact.intro)}</p>` : ''}
      <ul class="email-list">
        ${list(contact.emails).map((e) => `<li><span>${esc(e.label)}</span><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></li>`).join('\n        ')}
      </ul>
    </div>
    <form class="contact-form reveal" id="contactForm" novalidate data-success="${esc(contact.successMessage)}" data-fallback="${esc(list(contact.emails)[0] ? list(contact.emails)[0].email : '')}">
      <div class="field-row">
        <label for="f-name">Full name<input type="text" id="f-name" name="name" required maxlength="120" autocomplete="name"></label>
        <label for="f-email">Email<input type="email" id="f-email" name="email" required maxlength="200" autocomplete="email"></label>
      </div>
      <label for="f-org">Organisation<input type="text" id="f-org" name="org" maxlength="200" autocomplete="organization"></label>
      <label for="f-topic">I am a…
        <select id="f-topic" name="topic">
          ${list(contact.topics).map((t) => `<option value="${esc(t.label)}">${esc(t.label)}</option>`).join('\n          ')}
        </select>
      </label>
      <label for="f-message">Message<textarea id="f-message" name="message" rows="5" required maxlength="5000"></textarea></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="btn btn-accent btn-block">Send message <span aria-hidden="true">→</span></button>
      <p class="form-note" id="formNote" role="status"></p>
    </form>
  </div>
</section>`);
  }

  const footer = c.footer || {};
  const footerEmails = list(contact && contact.emails).slice(0, 2);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(site.title || site.name)}</title>
  <meta name="description" content="${esc(site.description)}">
  <meta name="theme-color" content="#0d2a1f">
  <meta property="og:title" content="${esc(site.title || site.name)}">
  <meta property="og:description" content="${esc(site.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${domain}/">
  ${shareImage ? `<meta property="og:image" content="${esc(shareImage.startsWith('/') ? `https://${domain}${shareImage}` : shareImage)}">` : ''}
  <link rel="canonical" href="https://${domain}/">
  <link rel="icon" href="${esc(favicon)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body${opts.preview ? ' data-preview' : ''}>

<header class="site-header" id="top">
  <div class="container nav-wrap">
    ${logo(site)}
    <nav class="main-nav" aria-label="Main">
      <ul>
        ${nav.map((n) => `<li><a href="#${n.id}">${esc(n.label)}</a></li>`).join('\n        ')}
      </ul>
    </nav>
    ${c.nav && c.nav.ctaLabel ? `<a href="${esc(safeLink(c.nav.ctaLink))}" class="btn btn-sm btn-accent nav-cta">${esc(c.nav.ctaLabel)}</a>` : ''}
    <button class="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>

<main>
<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    ${heroPhoto ? `<div class="hero-photo" style="background-image:url('${esc(heroPhoto)}')"></div>` : ''}
    ${TOPO}
    <div class="sun"></div>
  </div>
  <div class="container hero-inner">
    <div class="hero-copy">
      ${hero.eyebrow ? `<span class="eyebrow"><span class="dot"></span> ${esc(hero.eyebrow)}</span>` : ''}
      <h1>${rich(hero.title)}</h1>
      ${hero.lead ? `<p class="lead">${rich(hero.lead)}</p>` : ''}
      <div class="hero-actions">
        ${button(hero.primaryButton, 'btn-accent')}
        ${hero.secondaryButton && hero.secondaryButton.label ? `<a href="${esc(safeLink(hero.secondaryButton.link))}" class="btn btn-ghost">${esc(hero.secondaryButton.label)}</a>` : ''}
      </div>
    </div>
    ${list(hero.glance).length ? `
    <aside class="hero-card" aria-label="${esc(hero.glanceTitle)}">
      <div class="hero-card-head"><span class="pill">${esc(hero.glanceTitle)}</span></div>
      <ul class="glance">
        ${list(hero.glance).map((g) => `<li><span class="glance-num">${esc(g.number)}</span><span class="glance-label">${rich(g.label)}</span></li>`).join('\n        ')}
      </ul>
    </aside>` : ''}
  </div>
  ${list(hero.standards).length ? `
  <div class="container">
    <div class="standards-strip">
      <span class="strip-label">${esc(hero.standardsLabel)}</span>
      <ul>${list(hero.standards).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </div>
  </div>` : ''}
</section>
${sections.join('\n')}
</main>

<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      ${logo(site, 'logo-light')}
      ${footer.text ? `<p>${rich(footer.text)}</p>` : ''}
      ${list(footer.social).length ? `<ul class="social">${list(footer.social).map((s) => `<li><a href="${esc(safeLink(s.url))}" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>` : ''}
    </div>
    <div>
      <h4>Explore</h4>
      <ul>${nav.map((n) => `<li><a href="#${n.id}">${esc(n.label)}</a></li>`).join('')}</ul>
    </div>
    ${shown(involve) ? `
    <div>
      <h4>${esc(involve.kicker)}</h4>
      <ul>${list(involve.items).map((i) => `<li><a href="mailto:${esc(i.email)}">${esc(i.title)}</a></li>`).join('')}</ul>
    </div>` : ''}
    <div>
      <h4>Contact</h4>
      <ul>
        ${footerEmails.map((e) => `<li><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></li>`).join('')}
        ${site.address ? `<li>${esc(site.address)}</li>` : ''}
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© <span id="year">${new Date().getFullYear()}</span> ${esc(site.copyright)}</span>
    <span>${esc(domain)}</span>
  </div>
</footer>

<script src="/script.js"></script>
</body>
</html>
`;
}

module.exports = { renderPage, ICON_NAMES: Object.keys(ICONS) };
