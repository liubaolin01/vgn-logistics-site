/* ================================================================
   VGN GROUP INC — site behaviour
   - sticky header / mobile nav
   - bilingual (zh default, en via /assets/js/i18n.en.js dictionary)
   - scroll reveal + stat counters
   - FAQ accordion
   - quote form (mailto, no backend required)
   ================================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var EN = (window.VGN_I18N && window.VGN_I18N.en) || {};
  var originals = new Map();
  var LANG_KEY = 'vgn.lang';

  /* ---------- language ---------- */
  function collectOriginals() {
    doc.querySelectorAll('[data-t]').forEach(function (el) {
      if (!originals.has(el.dataset.t)) originals.set(el.dataset.t, el.innerHTML);
    });
    doc.querySelectorAll('[data-tp]').forEach(function (el) {
      var k = '__ph__' + el.dataset.tp;
      if (!originals.has(k)) originals.set(k, el.getAttribute('placeholder') || '');
    });
  }

  function applyLang(lang) {
    var isEn = lang === 'en';
    doc.querySelectorAll('[data-t]').forEach(function (el) {
      var k = el.dataset.t;
      if (isEn && Object.prototype.hasOwnProperty.call(EN, k)) el.innerHTML = EN[k];
      else if (!isEn) el.innerHTML = originals.get(k) != null ? originals.get(k) : el.innerHTML;
    });
    doc.querySelectorAll('[data-tp]').forEach(function (el) {
      var k = el.dataset.tp;
      var orig = originals.get('__ph__' + k);
      if (isEn && Object.prototype.hasOwnProperty.call(EN, '__ph__' + k)) {
        el.setAttribute('placeholder', EN['__ph__' + k]);
      } else if (!isEn) {
        el.setAttribute('placeholder', orig || '');
      }
    });
    var titleKey = doc.body.dataset.titleKey;
    if (titleKey) {
      doc.title = (isEn && EN[titleKey]) ? EN[titleKey] : originals.get('__title__') || doc.title;
    }
    var descEl = doc.querySelector('meta[name="description"]');
    var descKey = doc.body.dataset.descKey;
    if (descEl && descKey) {
      if (!originals.has('__desc__')) originals.set('__desc__', descEl.getAttribute('content') || '');
      descEl.setAttribute('content', (isEn && EN[descKey]) ? EN[descKey] : originals.get('__desc__'));
    }
    root.setAttribute('lang', isEn ? 'en' : 'zh-CN');
    doc.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  function initLang() {
    collectOriginals();
    if (!originals.has('__title__')) originals.set('__title__', doc.title);
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    var qp = new URLSearchParams(location.search).get('lang');
    var initial = (qp === 'en' || qp === 'zh') ? qp : (saved === 'en' ? 'en' : 'zh');
    applyLang(initial);
    doc.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.dataset.lang); });
    });
  }

  /* ---------- header / nav ---------- */
  function initHeader() {
    var header = doc.querySelector('.site-header');
    var toggle = doc.querySelector('.nav-toggle');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-solid', window.scrollY > 36);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = doc.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      doc.querySelectorAll('.nav a').forEach(function (a) {
        a.addEventListener('click', function () {
          doc.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          doc.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ---------- reveal ---------- */
  function prefersStatic() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduce || /[?&]noanim\b/.test(location.search);
  }

  function initReveal() {
    var items = doc.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (prefersStatic()) {
      root.classList.add('noanim');
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = Number(el.dataset.reveal) || 0;
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- counters ---------- */
  function initCounters() {
    var nodes = doc.querySelectorAll('[data-count]');
    if (!nodes.length) return;
    var reduce = prefersStatic();
    var fmt = function (n, decimals) {
      if (decimals) return n.toFixed(decimals);
      return Math.round(n).toLocaleString('en-US');
    };
    var run = function (el) {
      var target = parseFloat(el.dataset.count);
      var dec = parseInt(el.dataset.decimals || '0', 10);
      if (reduce) { el.textContent = fmt(target, dec); return; }
      var start = performance.now();
      var dur = 1400;
      /* guard: if rAF is throttled or interrupted, settle on the real number */
      setTimeout(function () { el.textContent = fmt(target, dec); }, dur + 800);
      var step = function (now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased, dec);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target, dec);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    doc.querySelectorAll('.faq-item').forEach(function (item) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a) return;
      q.setAttribute('aria-expanded', 'false');
      q.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        q.setAttribute('aria-expanded', String(open));
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
      });
    });
  }

  /* ---------- quote form ---------- */
  function initForm() {
    var form = doc.getElementById('quoteForm');
    if (!form) return;
    var status = doc.getElementById('formStatus');
    var out = doc.getElementById('formOutput');
    var copyBtn = doc.getElementById('copyFormBtn');

    var compose = function (d) {
      var lines = [
        'VGN GROUP INC — Quote Request',
        '',
        'Company: ' + (d.company || '-'),
        'Name: ' + (d.name || '-'),
        'Email: ' + (d.email || '-'),
        'Phone/WeChat: ' + (d.phone || '-'),
        'Freight type: ' + (d.freight || '-'),
        'Monthly volume: ' + (d.volume || '-'),
        'Route / origin: ' + (d.route || '-'),
        '',
        'Requirement:',
        (d.message || '-')
      ];
      return lines.join('\n');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var fd = new FormData(form);
      var d = {};
      fd.forEach(function (v, k) { d[k] = String(v).trim(); });
      var body = compose(d);
      var to = form.dataset.mailto || 'service@vgn-group.com';
      var subject = encodeURIComponent('Quote request — ' + (d.company || d.name || 'new inquiry'));
      var mail = 'mailto:' + to + '?subject=' + subject + '&body=' + encodeURIComponent(body);
      if (out) { out.value = body; out.hidden = false; }
      if (copyBtn) copyBtn.hidden = false;
      if (status) {
        status.className = 'form-status is-ok';
        status.textContent = (doc.documentElement.lang === 'en')
          ? 'Your mail client is opening. If nothing happens, copy the text below and send it to ' + to + '.'
          : '正在调起邮件客户端。若未弹出，请复制下方内容发送至 ' + to + '。';
      }
      window.location.href = mail;
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!out) return;
        out.select();
        var done = function () {
          copyBtn.textContent = (doc.documentElement.lang === 'en') ? 'Copied' : '已复制';
          setTimeout(function () {
            copyBtn.textContent = (doc.documentElement.lang === 'en') ? 'Copy text' : '复制内容';
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(out.value).then(done).catch(function () { doc.execCommand('copy'); done(); });
        } else { doc.execCommand('copy'); done(); }
      });
    }

    doc.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var txt = b.dataset.copy;
        var done = function () {
          var old = b.textContent;
          b.textContent = (doc.documentElement.lang === 'en') ? 'Copied' : '已复制';
          setTimeout(function () { b.textContent = old; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(done).catch(function () {});
        }
      });
    });
  }

  /* ---------- site config (contact details) ---------- */
  function initConfig() {
    var c = window.VGN_CONFIG || {};
    var hasPhone = !!(c.phone && String(c.phone).trim());
    doc.querySelectorAll('[data-cfg="email"]').forEach(function (el) {
      if (!c.email) return;
      el.textContent = c.email;
      if (el.tagName === 'A') el.setAttribute('href', 'mailto:' + c.email);
    });
    /* phone: blocks are hidden unless config.phone is set */
    doc.querySelectorAll('[data-cfg-block="phone"]').forEach(function (b) { b.hidden = !hasPhone; });
    doc.querySelectorAll('[data-cfg="phone"]').forEach(function (el) {
      if (!hasPhone) return;
      el.textContent = c.phone;
      if (el.tagName === 'A') {
        var tel = c.phoneTel || String(c.phone).replace(/[^\d+]/g, '');
        el.setAttribute('href', 'tel:' + tel);
      }
    });
    doc.querySelectorAll('[data-cfg="address"]').forEach(function (el) {
      if (c.address) el.textContent = c.address;
    });
    var form = doc.getElementById('quoteForm');
    if (form && c.email) form.dataset.mailto = c.email;
    doc.querySelectorAll('[data-copy]').forEach(function (b) {
      if (c.email && b.dataset.copy && b.dataset.copy.indexOf('@') > -1) b.dataset.copy = c.email;
    });
  }

  /* ---------- back to top ---------- */
  function initToTop() {
    var btn = doc.querySelector('.to-top');
    if (!btn) return;
    var onScroll = function () { btn.classList.toggle('is-visible', window.scrollY > 700); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function boot() {
    initConfig();
    initLang();
    initHeader();
    initReveal();
    initCounters();
    initFaq();
    initForm();
    initToTop();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
