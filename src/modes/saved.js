// Saved: designs, Studio creations and paintings. Tap to open full screen; long-press, or Delete in the
// viewer, removes with an Undo toast instead of a confirm dialog. Backup export/import as one JSON file.

import { svgToPng, download, share, slug } from '../ui/export.js';
import { capitalise, linkFor, withTitle } from './reform.js';

const $ = (id) => document.getElementById(id);
const LONG_PRESS = 550;

export function createSaved(ctx) {
  const { host, track, toast } = ctx;
  // Deletions wait for the Undo toast to expire before they are written.
  const pending = new Set();

  // ---- Viewer --------------------------------------------------------------------------------

  const viewer = document.createElement('dialog');
  viewer.className = 'viewer';
  viewer.setAttribute('aria-labelledby', 'viewer-title');
  viewer.innerHTML = `
    <div class="viewer-head">
      <button class="icon" type="button" data-act="close" aria-label="Close" data-tip="Close"><svg class="i"><use href="#i-chevron-left"/></svg></button>
      <p id="viewer-title"></p>
    </div>
    <div class="viewer-stage"><div class="viewer-art"></div></div>
    <div class="actions" role="toolbar" aria-label="Saved item actions">
      <button class="icon act" type="button" data-act="open"><svg class="i"><use href="#i-sparkles"/></svg></button>
      <button class="icon act" type="button" data-act="share" aria-label="Share" data-tip="Share"><svg class="i"><use href="#i-share-2"/></svg></button>
      <button class="icon act" type="button" data-act="download" aria-label="Download PNG" data-tip="Download PNG"><svg class="i"><use href="#i-download"/></svg></button>
      <button class="icon act danger" type="button" data-act="delete" aria-label="Delete" data-tip="Delete"><svg class="i"><use href="#i-trash-2"/></svg></button>
    </div>`;
  document.body.appendChild(viewer);
  let open = null; // the entry being viewed

  const OPEN_AS = {
    design: { icon: 'sparkles', label: 'Show in Reform' },
    creation: { icon: 'pencil', label: 'Edit in Studio' },
    painting: { icon: 'paintbrush', label: 'Open in Splash' }
  };

  function view(entry) {
    open = entry;
    viewer.querySelector('#viewer-title').textContent = entry.title;
    viewer.querySelector('.viewer-art').innerHTML = entry.html;
    const b = viewer.querySelector('[data-act="open"]');
    b.setAttribute('aria-label', OPEN_AS[entry.kind].label);
    b.dataset.tip = OPEN_AS[entry.kind].label;
    b.querySelector('use').setAttribute('href', '#i-' + OPEN_AS[entry.kind].icon);
    viewer.showModal();
    track('saved_open', { kind: entry.kind });
  }

  async function pngOf(entry) {
    if (entry.kind === 'painting') return (await fetch(entry.dataUrl)).blob();
    return svgToPng(entry.svg);
  }

  viewer.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (!act || !open) return;
    const entry = open;
    const kind = act.dataset.act;
    if (kind === 'close') viewer.close();
    else if (kind === 'open') {
      viewer.close();
      if (entry.kind === 'design') ctx.go('reform', { item: entry.item });
      else if (entry.kind === 'creation') ctx.go('studio', { creation: entry.id });
      else ctx.go('splash', { painting: entry.dataUrl });
    } else if (kind === 'download') {
      download(await pngOf(entry), entry.file);
      track('download', { mode: 'saved', format: 'png', kind: entry.kind });
    } else if (kind === 'share') {
      const url = entry.kind === 'design' ? linkFor(entry.item) : null;
      const result = await share({ blob: await pngOf(entry), filename: entry.file, url, title: entry.title + ' by Artify' });
      if (result === 'copied') toast('Link copied.');
      else if (result === 'downloaded') toast('Image downloaded.');
      if (result !== 'cancelled') track('share', { mode: 'saved', result, link: Boolean(url) });
    } else if (kind === 'delete') {
      viewer.close();
      remove(entry);
    }
  });

  // ---- Grid ----------------------------------------------------------------------------------

  function entries() {
    const designs = host.collection().map((item, index) => {
      const { svg, name } = host.render(item);
      return {
        kind: 'design', key: 'd:' + JSON.stringify(item), item, index, svg,
        title: capitalise(name) + (item.seed ? ' · ' + item.seed : ''),
        html: withTitle(svg, name),
        file: `artify-${slug(name)}${item.seed ? '-' + item.seed : ''}.png`
      };
    });
    const creations = host.creations().map((c) => {
      const { svg } = host.renderCreation(c);
      return { kind: 'creation', key: 'c:' + c.id, id: c.id, svg, title: c.name, html: withTitle(svg, c.name), file: `artify-${slug(c.name)}.png` };
    });
    const paintings = host.paintings().map((p) => ({
      kind: 'painting', key: 'p:' + p.id, id: p.id, dataUrl: p.dataUrl, title: 'Painting',
      html: `<img alt="Saved painting" src="${p.dataUrl}">`, file: `artify-painting-${p.id}.png`
    }));
    return { designs, creations, paintings };
  }

  function thumb(entry) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.setAttribute('aria-label', 'Open ' + entry.title);
    b.innerHTML = entry.html;
    let timer = 0;
    let long = false;
    b.addEventListener('pointerdown', () => {
      long = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        long = true;
        if (navigator.vibrate) navigator.vibrate(10);
        remove(entry);
      }, LONG_PRESS);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, () => clearTimeout(timer)));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      if (!long) view(entry);
    });
    return b;
  }

  function render() {
    const all = entries();
    const fill = (id, list) => {
      const box = $('saved-' + id);
      const shown = list.filter((e) => !pending.has(e.key));
      box.replaceChildren(...shown.map(thumb));
      $('saved-' + id + '-empty').hidden = shown.length > 0;
    };
    fill('designs', all.designs);
    fill('creations', all.creations);
    fill('paintings', all.paintings);
  }

  async function commit(entry) {
    if (entry.kind === 'design') await host.unsave(entry.item);
    else if (entry.kind === 'creation') {
      await host.removeCreation(entry.id);
      ctx.refreshChips();
    } else await host.removePainting(entry.id);
    pending.delete(entry.key);
    track('saved_delete', { kind: entry.kind });
  }

  function remove(entry) {
    pending.add(entry.key);
    render();
    const what = entry.kind === 'painting' ? 'Painting' : entry.kind === 'creation' ? '“' + entry.title + '”' : 'Design';
    toast(what + ' deleted.', {
      action: 'Undo',
      onAction: () => {
        pending.delete(entry.key);
        if (ctx.mode === 'saved') render();
      },
      onExpire: () => commit(entry).then(() => ctx.mode === 'saved' && render())
    });
  }

  // ---- Backup --------------------------------------------------------------------------------

  $('export-all').addEventListener('click', () => {
    const data = host.exportAll();
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `artify-backup-${new Date().toISOString().slice(0, 10)}.json`);
    track('backup_export', { designs: data.collection.length, paintings: data.paintings.length, creations: data.creations.length });
  });
  $('import-all').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const added = await host.importAll(JSON.parse(await file.text()));
      const parts = [];
      if (added.designs) parts.push(added.designs + (added.designs === 1 ? ' design' : ' designs'));
      if (added.creations) parts.push(added.creations + (added.creations === 1 ? ' Studio design' : ' Studio designs'));
      if (added.paintings) parts.push(added.paintings + (added.paintings === 1 ? ' painting' : ' paintings'));
      toast(parts.length ? 'Restored ' + parts.join(', ') + '.' : 'Nothing new in that backup.');
      ctx.refreshChips();
      render();
      track('backup_import', added);
    } catch (err) {
      toast(err instanceof SyntaxError ? 'That file is not valid JSON.' : err.message || 'Could not import that file.');
    }
  });

  return {
    enter() {
      render();
    },
    leave() {
      if (viewer.open) viewer.close();
    }
  };
}
