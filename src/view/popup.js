/*
 * Google Slides Crawler
 * Copyright (C) 2026 FireHelper Team
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// src/view/popup.js
// thin view controller - handles UI state only, delegates all work to background.js.

const $ = id => document.getElementById(id);
const dot        = $('dot');
const statusText = $('status-text');
const countBadge = $('count-badge');
const progWrap   = $('prog-wrap');
const progBar    = $('prog-bar');
const progInfo   = $('prog-info');
const progStep   = $('prog-step');
const progPct    = $('prog-pct');
const btn        = $('btn');
const btnLabel   = $('btn-label');
const wrongDiv   = $('wrong');
const optNotes   = $('opt-notes');

let tabId     = null;
let slideData = null;

// UI state helpers - declared first so init() can call them
const setStatus = (html, dotClass) => {
  statusText.innerHTML = html;
  dot.className = 'dot ' + (dotClass || 'muted');
};

const setRunning = ({ progress: pct = 0, step = '' }) => {
  pct = Math.round(pct);
  dot.className = 'dot accent';
  statusText.innerHTML = 'Exporting… <b>' + pct + '%</b>';
  progWrap.style.display = 'block';
  progInfo.style.display = 'flex';
  progBar.style.width    = pct + '%';
  progStep.textContent   = step;
  progPct.textContent    = pct + '%';
  btnLabel.textContent   = 'Exporting… safe to close';
  btn.disabled = true;
};

const setDone = () => {
  dot.className = 'dot green';
  statusText.innerHTML = '<b>PDF saved!</b>';
  progBar.style.width  = '100%';
  progStep.textContent = '✓ Complete';
  progPct.textContent  = '100%';
  btn.classList.add('done');
  btn.disabled = false;
  btnLabel.textContent = 'Export Again';
};

const setError = (msg) => {
  dot.className = 'dot red';
  statusText.innerHTML = '<b>Error:</b> ' + (msg || 'unknown');
  progStep.textContent = '✗ Failed';
  btn.disabled = false;
  btnLabel.textContent = 'Retry';
  btn.classList.remove('done');
};

// init
const init = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  tabId = tab.id;

  const url = tab.url || '';
  if (!url.includes('docs.google.com/presentation/')) {
    wrongDiv.classList.add('show');
    setStatus('Not a Google Slides page.', 'red');
    return;
  }
  if (!url.includes('/htmlpresent')) {
    wrongDiv.classList.add('show');
    setStatus('Switch URL to <code>/htmlpresent</code> first.', 'muted');
    return;
  }

  setStatus('Scanning slides…', 'accent');

  try {
    await chrome.scripting.executeScript({
      target: { tabId }, files: ['src/model/slide_extractor.js']
    }).catch(() => {});

    const resp = await chrome.tabs.sendMessage(tabId, { action: 'GET_SLIDE_DATA' });

    if (!resp || !resp.count) {
      setStatus('No slides found. Scroll through the page then retry.', 'red');
      dot.className = 'dot red';
      return;
    }

    slideData = resp;
    dot.className = 'dot green';
    statusText.innerHTML = '<b>' + resp.count + ' slides</b> ready';
    countBadge.textContent = resp.count;
    countBadge.style.display = 'block';
    btn.disabled = false;
    btnLabel.textContent = 'Export PDF';

  } catch (e) {
    setStatus('Could not read the page. Refresh and retry.', 'red');
    dot.className = 'dot red';
  }
};

// export
btn.addEventListener('click', async () => {
  if (!slideData || btn.disabled) return;
  setRunning({ progress: 0, step: 'Starting…' });
  await chrome.runtime.sendMessage({
    action: 'START_EXPORT', tabId, slideData, includeNotes: optNotes.checked
  });
});

// listen to background progress
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== 'JOB_UPDATE') return;
  if (msg.status === 'running') setRunning(msg);
  if (msg.status === 'done')    setDone();
  if (msg.status === 'error')   setError(msg.step);
});

init();
