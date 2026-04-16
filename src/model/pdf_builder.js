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

(async function runPdfBuilder(cfg) {
  const { urls, notes, title, includeNotes, extensionId } = cfg;
  const TOTAL = urls.length;

  const progress = (pct, step, status) => {
    chrome.runtime.sendMessage(extensionId, {
      action: 'TAB_PROGRESS', progress: pct, step, status: status || 'running'
    }).catch(() => {});
  }

  const fetchJpeg = (url) => {
    return new Promise((resolve) => {
      fetch(url, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(blob => new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => {
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, cv.width, cv.height);
            ctx.drawImage(img, 0, 0);
            res({ dataUrl: cv.toDataURL('image/jpeg', 0.92), w: img.naturalWidth, h: img.naturalHeight });
            URL.revokeObjectURL(img.src);
          };
          img.onerror = rej;
          img.src = URL.createObjectURL(blob);
        }))
        .then(resolve)
        .catch(() => resolve(null));
    });
  }

  const fetchAll = async (urls, concurrency) => {
    const out = new Array(urls.length).fill(null);
    let next = 0, done = 0;
    const slot = async () => {
      while (next < urls.length) {
        const i = next++;
        await new Promise(r => setTimeout(r, Math.random() * 120));
        out[i] = await fetchJpeg(urls[i]);
        done++;
        progress(Math.round((done / TOTAL) * 78), `Slide ${done} / ${TOTAL}`);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, slot));
    return out;
  }

  // justify a line by placing each word at the exact x
  // the last line of the paragraph (isLast=true) -> left-align
  const justifyLine = (pdf, words, lineW, x0, y, usableW) => {
    if (words.length <= 1 || lineW <= 0) {
      pdf.text(words.join(' '), x0, y);
      return;
    }
    const gap = (usableW - lineW) / (words.length - 1);
    let x = x0;
    words.forEach(w => {
      pdf.text(w, x, y);
      x += pdf.getTextWidth(w) + gap;
    });
  }

  // render note text with justification according to the paragraph
  // each '\n' in noteText = paragraph break -> the last line of the paragraph is not justified.
  const renderNote = (pdf, text, x0, y0, usableW, lineH, pageH, pageMargin, F, fs) => {
    pdf.setFont(F, 'normal');
    pdf.setFontSize(fs);
    pdf.setTextColor(0, 0, 0);

    let y = y0;
    const paragraphs = text.split('\n');

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) { y += lineH; continue; }

      const wrapped = pdf.splitTextToSize(trimmed, usableW);

      for (let li = 0; li < wrapped.length; li++) {
        if (y > pageH - pageMargin) {
          pdf.addPage();
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, 210, 297, 'F');
          pdf.setFont(F, 'normal');
          pdf.setFontSize(fs);
          pdf.setTextColor(0, 0, 0);
          y = pageMargin + 10;
        }

        const line  = wrapped[li];
        const words = line.trim().split(/\s+/).filter(Boolean);
        const lineW = words.reduce((s, w) => s + pdf.getTextWidth(w), 0);
        const isLastOfPara = li === wrapped.length - 1;

        if (isLastOfPara || words.length <= 1) {
          pdf.text(line.trim(), x0, y);
        } else {
          justifyLine(pdf, words, lineW, x0, y, usableW);
        }
        y += lineH;
      }
    }
    return y;
  }

  const M       = 10;
  const PW      = 210;
  const PH      = 297;
  const B_M     = 15;
  const HDR_Y   = 14;
  const TITLE_Y = 26;
  const IMG_X   = 12.5;
  const IMG_W   = 185;
  const IMG_H   = 110;
  const IMG_Y   = 36;
  const LBL_FS  = 11;
  const LBL_H   = 8;
  const BODY_FS = 11;
  const BODY_LH = 6;

  try {
    progress(0, 'Starting…');
    const images = await fetchAll(urls, 6);

    progress(82, 'Registering fonts…');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const hasArial = !!(window.ARIAL_REGULAR_B64 && window.ARIAL_BOLD_B64);
    if (hasArial) {
      pdf.addFileToVFS('Arial.ttf',      window.ARIAL_REGULAR_B64);
      pdf.addFileToVFS('Arial-Bold.ttf', window.ARIAL_BOLD_B64);
      pdf.addFont('Arial.ttf',      'Arial', 'normal');
      pdf.addFont('Arial-Bold.ttf', 'Arial', 'bold');
    }
    const F = hasArial ? 'Arial' : 'helvetica';

    progress(85, 'Building PDF…');

    for (let i = 0; i < TOTAL; i++) {
      if (i > 0) pdf.addPage();

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PW, PH, 'F');

      // header
      pdf.setFont(F, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Crawled by Google Slides Crawler', PW - M, HDR_Y, { align: 'right' });

      // title "Slide X"
      pdf.setFont(F, 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Slide ' + (i + 1), M, TITLE_Y);

      // image
      const MAX_IMG_H = PH - IMG_Y - B_M - 40;
      const imgData = images[i];
      let renderedH = MAX_IMG_H;
      if (imgData) {
        renderedH = Math.min(
          Math.round((imgData.h / imgData.w) * IMG_W * 10) / 10,
          MAX_IMG_H
        );
        pdf.addImage(imgData.dataUrl, 'JPEG', IMG_X, IMG_Y, IMG_W, renderedH, '', 'FAST');
      } else {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(IMG_X, IMG_Y, IMG_W, renderedH, 'F');
        pdf.setFont(F, 'normal'); pdf.setFontSize(10); pdf.setTextColor(160, 160, 160);
        pdf.text('[Image unavailable]', PW / 2, IMG_Y + renderedH / 2, { align: 'center' });
      }

      // notes section - equal spacing above label and between label and body
      const GAP    = 7; // uniform gap: image -> label and label -> body
      const LBL_Y  = IMG_Y + renderedH + GAP + LBL_FS * 0.35; // baseline after gap
      const BODY_Y = LBL_Y + GAP; // same gap below label before body

      pdf.setFont(F, 'bold');
      pdf.setFontSize(LBL_FS);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Note:', M, LBL_Y);

      const noteText = (includeNotes && notes[i]) ? notes[i].trim() : '';
      if (noteText) renderNote(pdf, noteText, M, BODY_Y, IMG_W, BODY_LH, PH, B_M, F, BODY_FS);
    }

    progress(97, 'Saving…');
    const filename = (title || 'slides').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80) + '.pdf';
    const blobUrl  = URL.createObjectURL(pdf.output('blob'));
    const a = Object.assign(document.createElement('a'), {
      href: blobUrl, download: filename, style: 'display:none'
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

    progress(100, 'Done!', 'done');
    chrome.runtime.sendMessage(extensionId, { action: 'TAB_DONE', filename }).catch(() => {});

  } catch (err) {
    progress(0, err.message, 'error');
  }

})(window.__slideGrabberConfig);
