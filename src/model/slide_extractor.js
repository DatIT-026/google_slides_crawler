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

// src/model/slide_extractor.js
// injected into the Google Slides /htmlpresent tab.
// extracts image URLs and speaker notes.

(function () {
  function getUrls() {
    return Array.from(document.querySelectorAll('section.slide-content'))
      .map(s => (s.style.backgroundImage || '')
        .replace(/^url\(["']?/, '').replace(/["']?\)$/, '')
        .replace(/&showText=0/g, '&showText=1'))
      .filter(Boolean);
  }

  function getNotes() {
    return Array.from(document.querySelectorAll('div.slide')).map(slide =>
      Array.from(slide.querySelectorAll('aside.slide-notes p'))
        .map(p => p.innerText.trim()).filter(Boolean).join('\n')
    );
  }

  function getTitle() {
    const t = document.querySelector('title');
    return t ? t.innerText.replace(' - Google Slides', '').trim() : 'slides';
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'GET_SLIDE_DATA') {
      const urls = getUrls();
      sendResponse({ urls, notes: getNotes(), title: getTitle(), count: urls.length });
    }
    return true;
  });
})();
