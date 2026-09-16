/*
  Date Picker component — maps to powerappsui.com "Date Picker".
  createDatePicker({ mountId, value, onChange }) renders a trigger + popup
  calendar with a Gregorian/Hijri tab toggle; the underlying stored value is
  always canonical Gregorian ISO (yyyy-mm-dd) so downstream validation and
  "tentative closure date" math stay simple, with a Hijri-equivalent caption
  shown once a date is picked.

  Hijri conversion uses the standard tabular/civil Islamic calendar
  algorithm (the common Julian-day-based approximation) — it's accurate to
  within a day or two of the Umm al-Qura calendar, which is fine for a
  prototype; swap for a precise Umm al-Qura table if this becomes real.
*/

const DP_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DP_GREGORIAN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DP_HIJRI_MONTHS = ['Muharram', 'Safar', "Rabi' I", "Rabi' II", 'Jumada I', 'Jumada II', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'];

function dpGregorianToJD(y, m, d) {
  // The published Fliegel & Van Flandern algorithm uses C-style truncating
  // integer division throughout (toward zero), not floor — for m=1..2 the
  // (m-14)/12 sub-term is negative, and floor() rounds that one step too
  // far (e.g. -13/12 floors to -2 instead of truncating to -1), which threw
  // every date off by 2 days. Math.trunc matches the original algorithm.
  const tr = Math.trunc;
  return tr((1461 * (y + 4800 + tr((m - 14) / 12))) / 4)
    + tr((367 * (m - 2 - 12 * tr((m - 14) / 12))) / 12)
    - tr((3 * tr((y + 4900 + tr((m - 14) / 12)) / 100)) / 4)
    + d - 32075;
}

function dpJDToGregorian(jd) {
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const m = j + 2 - 12 * l;
  const y = 100 * (n - 49) + i + l;
  return { y, m, d };
}

// Civil/tabular Islamic epoch as an integer JDN (JD of 1 Muharram 1 AH),
// matching the same integer-JDN convention as dpGregorianToJD/dpJDToGregorian
// above. Forward and reverse below are the standard paired "Kuwaiti
// algorithm" tabular-calendar formulas — a mismatched epoch/rounding
// convention between the two directions (e.g. a half-integer epoch on one
// side only) is what breaks the round trip, so keep them paired if this
// ever gets edited.
const DP_ISLAMIC_EPOCH = 1948440;

function dpIslamicToJD(y, m, d) {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + DP_ISLAMIC_EPOCH - 1;
}

function dpJDToIslamic(jdInput) {
  let jd = Math.floor(jdInput) - DP_ISLAMIC_EPOCH + 10632;
  const n = Math.floor((jd - 1) / 10631);
  jd = jd - 10631 * n + 354;
  const j = Math.floor((10985 - jd) / 5316) * Math.floor((50 * jd) / 17719)
    + Math.floor(jd / 5670) * Math.floor((43 * jd) / 15238);
  jd = jd - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * jd) / 709);
  const day = jd - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { y: year, m: month, d: day };
}

function dpGregorianToHijri({ y, m, d }) {
  return dpJDToIslamic(dpGregorianToJD(y, m, d));
}

function dpHijriToGregorian({ y, m, d }) {
  return dpJDToGregorian(dpIslamicToJD(y, m, d));
}

function dpPad(n) {
  return String(n).padStart(2, '0');
}

function dpFormatGregorian({ y, m, d }) {
  return `${dpPad(d)}-${dpPad(m)}-${y}`;
}

function dpToISO({ y, m, d }) {
  return `${y}-${dpPad(m)}-${dpPad(d)}`;
}

function dpFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function createDatePicker({ mountId, value = null, onChange = () => {} }) {
  const mount = document.getElementById(mountId);
  let selectedGregorian = value ? dpFromISO(value) : null;
  let system = 'gregorian';
  const today = new Date();
  let viewGregorian = selectedGregorian || { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
  let viewHijri = dpGregorianToHijri(viewGregorian);

  function currentViewYM() {
    return system === 'gregorian' ? { y: viewGregorian.y, m: viewGregorian.m } : { y: viewHijri.y, m: viewHijri.m };
  }

  function monthLabel() {
    const ym = currentViewYM();
    const name = system === 'gregorian' ? DP_GREGORIAN_MONTHS[ym.m - 1] : DP_HIJRI_MONTHS[ym.m - 1];
    return `${name} ${ym.y}`;
  }

  function daysInMonth(system, y, m) {
    if (system === 'gregorian') {
      const startJD = dpGregorianToJD(y, m, 1);
      const nextJD = m === 12 ? dpGregorianToJD(y + 1, 1, 1) : dpGregorianToJD(y, m + 1, 1);
      return nextJD - startJD;
    }
    const startJD = dpIslamicToJD(y, m, 1);
    const nextJD = m === 12 ? dpIslamicToJD(y + 1, 1, 1) : dpIslamicToJD(y, m + 1, 1);
    return nextJD - startJD;
  }

  function firstWeekday(system, y, m) {
    const jd = system === 'gregorian' ? dpGregorianToJD(y, m, 1) : dpIslamicToJD(y, m, 1);
    return (jd + 1) % 7; // JDN 0 = Monday; +1 aligns 0=Sunday
  }

  function isSameDay(a, b) {
    return a && b && a.y === b.y && a.m === b.m && a.d === b.d;
  }

  function render() {
    const isOpen = mount.querySelector('.dp-field')?.classList.contains('open');
    const label = selectedGregorian ? dpFormatGregorian(selectedGregorian) : 'DD-MM-YYYY';
    const hijriCaption = selectedGregorian ? `Hijri: ${dpFormatGregorian(dpGregorianToHijri(selectedGregorian))} AH` : '';

    const ym = currentViewYM();
    const total = daysInMonth(system, ym.y, ym.m);
    const startOffset = firstWeekday(system, ym.y, ym.m);
    const todayGregorian = { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };

    let dayButtons = '';
    for (let i = 0; i < startOffset; i++) dayButtons += `<span class="dp-day dp-day-empty"></span>`;
    for (let d = 1; d <= total; d++) {
      const cellGregorian = system === 'gregorian' ? { y: ym.y, m: ym.m, d } : dpHijriToGregorian({ y: ym.y, m: ym.m, d });
      const isSelected = isSameDay(cellGregorian, selectedGregorian);
      const isToday = isSameDay(cellGregorian, todayGregorian);
      dayButtons += `<button type="button" class="dp-day${isSelected ? ' dp-day-selected' : ''}${isToday ? ' dp-day-today' : ''}" data-jd="${system === 'gregorian' ? dpGregorianToJD(ym.y, ym.m, d) : dpIslamicToJD(ym.y, ym.m, d)}">${d}</button>`;
    }

    mount.innerHTML = `
      <div class="dp-field${isOpen ? ' open' : ''}">
        <div class="dp-trigger" id="${mountId}-trigger">
          <i class="fa-regular fa-calendar dp-calendar-icon"></i>
          <span class="dp-trigger-label${selectedGregorian ? '' : ' placeholder'}">${label}</span>
          ${selectedGregorian ? `<button type="button" class="dp-trigger-clear" id="${mountId}-clear" aria-label="Clear"><i class="fa-solid fa-xmark"></i></button>` : ''}
        </div>
        <div class="dp-popup" id="${mountId}-popup">
          <div class="dp-tabs">
            <button type="button" class="dp-tab${system === 'gregorian' ? ' active' : ''}" data-system="gregorian">Gregorian</button>
            <button type="button" class="dp-tab${system === 'hijri' ? ' active' : ''}" data-system="hijri">Hijri</button>
          </div>
          <div class="dp-nav">
            <button type="button" class="dp-nav-btn" id="${mountId}-prev"><i class="fa-solid fa-chevron-left"></i></button>
            <span class="dp-nav-label">${monthLabel()}</span>
            <button type="button" class="dp-nav-btn" id="${mountId}-next"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
          <div class="dp-weekdays">${DP_WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
          <div class="dp-days">${dayButtons}</div>
        </div>
      </div>
      ${hijriCaption ? `<div class="dp-hijri-caption">${hijriCaption}</div>` : ''}
    `;

    wireEvents();
    if (isOpen) mount.querySelector('.dp-field').classList.add('open');
  }

  function open() {
    mount.querySelector('.dp-field').classList.add('open');
  }

  function close() {
    mount.querySelector('.dp-field')?.classList.remove('open');
  }

  function wireEvents() {
    const trigger = document.getElementById(`${mountId}-trigger`);
    trigger.addEventListener('click', (e) => {
      if (e.target.closest('.dp-trigger-clear')) return;
      const isOpen = mount.querySelector('.dp-field').classList.contains('open');
      if (isOpen) close(); else open();
    });

    const clearBtn = document.getElementById(`${mountId}-clear`);
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedGregorian = null;
        onChange(null);
        render();
      });
    }

    mount.querySelectorAll('.dp-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        system = btn.dataset.system;
        render();
        open();
      });
    });

    document.getElementById(`${mountId}-prev`).addEventListener('click', () => {
      shiftMonth(-1);
      render();
      open();
    });
    document.getElementById(`${mountId}-next`).addEventListener('click', () => {
      shiftMonth(1);
      render();
      open();
    });

    mount.querySelectorAll('.dp-day:not(.dp-day-empty)').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedGregorian = dpJDToGregorian(Number(btn.dataset.jd));
        viewGregorian = selectedGregorian;
        viewHijri = dpGregorianToHijri(selectedGregorian);
        onChange(dpToISO(selectedGregorian));
        close();
        render();
      });
    });
  }

  function shiftMonth(delta) {
    if (system === 'gregorian') {
      let { y, m } = viewGregorian;
      m += delta;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      viewGregorian = { y, m, d: 1 };
    } else {
      let { y, m } = viewHijri;
      m += delta;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      viewHijri = { y, m, d: 1 };
    }
  }

  // See the matching comment in searchable-select.js: clicks inside `mount`
  // trigger a full re-render, which detaches the original event.target
  // before this same click bubbles to document — stop it here so the
  // outside-click check below never misreads an inside click as outside.
  mount.addEventListener('click', (event) => event.stopPropagation());

  document.addEventListener('click', (event) => {
    const field = mount.querySelector('.dp-field');
    if (field && field.classList.contains('open') && !mount.contains(event.target)) {
      close();
    }
  });

  render();

  return {
    getValue: () => (selectedGregorian ? dpToISO(selectedGregorian) : null),
    setValue: (iso) => {
      selectedGregorian = iso ? dpFromISO(iso) : null;
      if (selectedGregorian) { viewGregorian = selectedGregorian; viewHijri = dpGregorianToHijri(selectedGregorian); }
      render();
    },
    setError: (hasError) => {
      const field = mount.querySelector('.dp-field');
      if (field) field.classList.toggle('has-error', hasError);
    },
  };
}
