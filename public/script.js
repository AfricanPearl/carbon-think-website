(function () {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelectorAll('.main-nav a');

  // Solid header after scrolling past the top of the hero
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.forEach((a) => a.addEventListener('click', () => {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  // Reveal on scroll, staggered within each parent
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const siblings = [...entry.target.parentElement.children].filter((el) => el.classList.contains('reveal'));
      entry.target.style.transitionDelay = `${Math.min(siblings.indexOf(entry.target), 5) * 90}ms`;
      entry.target.classList.add('visible');
      // Drop the reveal styles once done so they don't override hover transforms
      entry.target.addEventListener('transitionend', () => {
        entry.target.classList.remove('reveal', 'visible');
        entry.target.style.transitionDelay = '';
      }, { once: true });
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  // Highlight the nav link for the section in view
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => {
    const section = document.querySelector(a.getAttribute('href'));
    if (section) sectionObserver.observe(section);
  });

  // Contact form: validate, then store the message for the team (read it under Messages in /admin)
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll('[required]').forEach((field) => {
      const ok = field.value.trim() !== '' && (field.type !== 'email' || /^\S+@\S+\.\S+$/.test(field.value));
      field.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      note.textContent = 'Please fill in your name, a valid email and a message.';
      return;
    }
    if (document.body.hasAttribute('data-preview')) {
      note.textContent = 'The form is switched off in the admin preview.';
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    note.textContent = 'Sending…';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || '');
      form.reset();
      note.textContent = form.dataset.success || 'Thank you, your message has been sent.';
    } catch (err) {
      const fallback = form.dataset.fallback;
      note.textContent = `${err.message || 'Your message could not be sent.'}${fallback ? ` You can also email ${fallback}.` : ''}`;
    } finally {
      button.disabled = false;
    }
  });
})();
