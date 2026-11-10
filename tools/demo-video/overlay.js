// Injected into every page during recording: fake cursor, click ripple, lower-third captions.
(() => {
  if (location.protocol === 'file:') return;
  const css = `
    #__cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .05s}
    .__rip{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #2563eb;z-index:2147483646;pointer-events:none;animation:__r .6s ease-out forwards}
    @keyframes __r{to{transform:scale(4.2);opacity:0}}
    #__cap{position:fixed;left:36px;bottom:36px;z-index:2147483645;pointer-events:none;max-width:780px;padding:16px 22px 16px 20px;border-radius:16px;
      background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border:1px solid #dbeafe;border-left:6px solid #2563eb;
      box-shadow:0 18px 50px rgba(30,64,175,.25);font-family:'Segoe UI',Inter,system-ui,sans-serif;transform:translateY(30px);opacity:0;transition:all .6s cubic-bezier(.2,.8,.2,1)}
    #__cap.on{transform:none;opacity:1}
    #__cap .k{font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2563eb}
    #__cap .t{font-size:22px;font-weight:650;color:#0f172a;margin-top:2px}
    #__step{position:fixed;right:30px;top:84px;z-index:2147483645;pointer-events:none;padding:8px 16px;border-radius:999px;background:#2563eb;color:#fff;
      font:700 14px 'Segoe UI',system-ui;letter-spacing:.06em;box-shadow:0 10px 30px rgba(37,99,235,.4);opacity:0;transition:opacity .5s}
    #__step.on{opacity:1}`;
  const boot = () => {
    if (document.getElementById('__cur')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const cur = document.createElement('div'); cur.id = '__cur';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 9-6.5 1.6L9.6 19 4 2z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const cap = document.createElement('div'); cap.id = '__cap'; cap.innerHTML = '<div class="k"></div><div class="t"></div>';
    const step = document.createElement('div'); step.id = '__step';
    document.body.append(cur, cap, step);
    const pos = JSON.parse(sessionStorage.getItem('__pos') || '[800,450]');
    cur.style.left = pos[0] + 'px'; cur.style.top = pos[1] + 'px';
    addEventListener('mousemove', (e) => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; sessionStorage.setItem('__pos', JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.className = '__rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
    const saved = JSON.parse(sessionStorage.getItem('__capv') || 'null');
    if (saved) window.__caption(saved[0], saved[1], saved[2], true);
  };
  window.__caption = (kicker, text, stepLabel, instant) => {
    sessionStorage.setItem('__capv', JSON.stringify([kicker, text, stepLabel]));
    const cap = document.getElementById('__cap'); const step = document.getElementById('__step');
    if (!cap) return;
    const set = () => { cap.querySelector('.k').textContent = kicker; cap.querySelector('.t').textContent = text; cap.classList.toggle('on', !!text);
      step.textContent = stepLabel || ''; step.classList.toggle('on', !!stepLabel); };
    if (instant) set(); else { cap.classList.remove('on'); setTimeout(set, 350); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
