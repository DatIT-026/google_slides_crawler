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

// src/controller/background.js
// Service Worker coordinates script injection and relays progress to popup.
// never handles PDF data directly (avoids 64 MB message limit).

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.action) {

    case 'START_EXPORT':
      injectAndRun(msg.tabId, msg.slideData, msg.includeNotes);
      sendResponse({ ok: true });
      return false;

    case 'TAB_DONE':
      relay({ action: 'JOB_UPDATE', status: 'done',
              progress: 100, step: 'Done!', filename: msg.filename });
      sendResponse({ ok: true });
      return false;

    case 'TAB_PROGRESS':
      relay({ action: 'JOB_UPDATE',
              status:   msg.status || 'running',
              progress: msg.progress,
              step:     msg.step });
      sendResponse({ ok: true });
      return false;
  }
});

const relay = (msg) => {
  chrome.runtime.sendMessage(msg).catch(() => {}); // popup may be closed - ignore
}

const injectAndRun = async (tabId, slideData, includeNotes) => {
  // write config into the tab's window object
  await exec(tabId, (cfg) => { window.__slideGrabberConfig = cfg; },
    [{ ...slideData, includeNotes, extensionId: chrome.runtime.id }]);

  // inject jsPDF (idempotent)
  if (!(await execCheck(tabId, () => !!window.jspdf)))
    await execFile(tabId, 'assets/lib/jspdf.umd.min.js');

  // inject Arial fonts (idempotent: ~2 MB, only once per tab)
  if (!(await execCheck(tabId, () => !!window.ARIAL_REGULAR_B64)))
    await execFile(tabId, 'assets/fonts/fonts.js');

  // run the PDF builder
  await execFile(tabId, 'src/model/pdf_builder.js');
}

// helpers
const exec = async (tabId, func, args = []) => {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res[0].result;
}

const execCheck = async (tabId, func) => {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func });
  return res[0].result;
}

const execFile = async (tabId, file) => {
  await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
}
