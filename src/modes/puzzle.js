// Puzzle: the shards scatter and you drag them back. Ported from the extension's media/play.js,
// with a wider snap on touch, a celebration, and "tap the solved art for the next one".

import { svgToPng, svgBlob, download, slug } from '../ui/export.js';
import { capitalise, withTitle } from './reform.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const coarse = window.matchMedia('(pointer: coarse)');
const snapDistance = () => (coarse.matches ? 18 : 12);

export function createPuzzle(ctx) {
  const { host, track, toast, prefs } = ctx;
  const board = $('board');
  const saveBtn = $('p-save');
  const guide = $('p-guide');
  const win = $('win');

  const puzzle = { item: null, name: '', svg: null, pieces: [], drag: null, dropped: false, moves: 0, solved: false, startedAt: 0 };
  guide.checked = prefs.get('guide', true);

  function toSvg(e) {
    const pt = puzzle.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(puzzle.svg.getScreenCTM().inverse());
  }

  function place(g, x, y) {
    g.__x = x;
    g.__y = y;
    g.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  }

  function restack() {
    puzzle.pieces.slice().sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i)).forEach((g) => puzzle.svg.appendChild(g));
    puzzle.svg.querySelectorAll('.f').forEach((n) => puzzle.svg.appendChild(n));
  }

  function updateProgress() {
    const total = puzzle.pieces.length;
    const done = puzzle.pieces.filter((g) => g.classList.contains('done')).length;
    if (done === total && total > 0 && !puzzle.solved) solved();
    else if (!puzzle.solved) ctx.setStatus(done + ' of ' + total + ' pieces placed');
  }

  function solved(byAnswer = false) {
    puzzle.solved = true;
    puzzle.svg.classList.add('solved');
    puzzle.pieces.forEach((g, k) => g.style.setProperty('--k', String(k)));
    const text = byAnswer ? capitalise(puzzle.name) + ', all in place.' : 'Reformed in ' + puzzle.moves + (puzzle.moves === 1 ? ' move.' : ' moves.');
    $('win-text').textContent = text;
    win.hidden = false;
    ctx.setStatus(capitalise(puzzle.name));
    if (!byAnswer && navigator.vibrate) navigator.vibrate(12);
    track('puzzle_solved', { moves: puzzle.moves, pieces: puzzle.pieces.length, seconds: Math.round((performance.now() - puzzle.startedAt) / 1000), answer: byAnswer });
  }

  function syncSave() {
    const saved = host.isSaved(puzzle.item);
    saveBtn.setAttribute('aria-pressed', String(saved));
    saveBtn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save design');
  }

  function newPuzzle() {
    const item = host.nextPuzzle(ctx.category);
    const { svg, name } = host.render(item);
    puzzle.item = item;
    puzzle.name = name;
    board.innerHTML = withTitle(svg, name);
    win.hidden = true;
    start();
    syncSave();
    track('puzzle_start', { category: ctx.category, pieces: puzzle.pieces.length });
  }

  function start() {
    const svg = board.querySelector('svg');
    if (!svg) return;
    puzzle.svg = svg;
    puzzle.moves = 0;
    puzzle.solved = false;
    puzzle.startedAt = performance.now();
    svg.classList.add('puzzle');
    svg.setAttribute('aria-label', 'Puzzle: drag the shards of ' + puzzle.name + ' back into place');
    svg.querySelectorAll('.s.d').forEach((d) => { d.style.display = 'none'; });
    puzzle.pieces = Array.from(svg.querySelectorAll('.s.p'));

    // A faint copy of the solved picture so there is something to aim for.
    const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ghost.setAttribute('class', 'ghost');
    ghost.setAttribute('aria-hidden', 'true');
    puzzle.pieces.forEach((g) => {
      const copy = g.cloneNode(true);
      ['class', 'style', 'data-i'].forEach((a) => copy.removeAttribute(a));
      ghost.appendChild(copy);
    });
    const defs = svg.querySelector('defs');
    svg.insertBefore(ghost, defs ? defs.nextSibling : svg.querySelector('title') ? svg.querySelector('title').nextSibling : svg.firstChild);
    svg.classList.toggle('ghost-off', !guide.checked);

    puzzle.pieces.forEach((g) => {
      const b = g.getBBox();
      const lo = { x: Math.max(-120, 4 - b.x), y: Math.max(-120, 4 - b.y) };
      const hi = { x: Math.min(120, 236 - (b.x + b.width)), y: Math.min(120, 376 - (b.y + b.height)) };
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 10 && Math.hypot(x, y) < 30; tries++) {
        x = Math.round(rand(Math.min(lo.x, hi.x), Math.max(lo.x, hi.x)));
        y = Math.round(rand(Math.min(lo.y, hi.y), Math.max(lo.y, hi.y)));
      }
      g.classList.remove('done');
      place(g, x, y);
    });
    updateProgress();

    svg.addEventListener('pointerdown', (e) => {
      puzzle.dropped = false;
      if (puzzle.solved) return;
      const g = e.target.closest('.s.p');
      if (!g || g.classList.contains('done') || puzzle.drag) return;
      const p = toSvg(e);
      puzzle.drag = { g, id: e.pointerId, dx: p.x - g.__x, dy: p.y - g.__y };
      svg.appendChild(g);
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('dragging');
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!puzzle.drag || e.pointerId !== puzzle.drag.id) return;
      const p = toSvg(e);
      place(puzzle.drag.g, Math.round((p.x - puzzle.drag.dx) * 10) / 10, Math.round((p.y - puzzle.drag.dy) * 10) / 10);
    });
    const release = (e) => {
      if (!puzzle.drag || e.pointerId !== puzzle.drag.id) return;
      const g = puzzle.drag.g;
      puzzle.drag = null;
      puzzle.dropped = true;
      svg.classList.remove('dragging');
      puzzle.moves++;
      if (Math.hypot(g.__x, g.__y) < snapDistance()) {
        place(g, 0, 0);
        g.classList.add('done');
      }
      restack();
      updateProgress();
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);
    // Once solved, tapping the art moves on, the same as Reform.
    // The click that follows the last drop is not a tap.
    svg.addEventListener('click', () => {
      if (puzzle.solved && !puzzle.dropped) newPuzzle();
      puzzle.dropped = false;
    });
  }

  function showAnswer() {
    if (!puzzle.svg || puzzle.solved) return;
    puzzle.pieces.forEach((g) => {
      place(g, 0, 0);
      g.classList.add('done');
    });
    restack();
    const more = $('sheet-more');
    if (more.open) more.close();
    solved(true);
  }

  async function toggleSave() {
    if (!puzzle.item) return;
    if (host.isSaved(puzzle.item)) {
      await host.unsave(puzzle.item);
      toast('Removed from Saved.');
      track('unsave', { mode: 'puzzle' });
    } else {
      await host.save(puzzle.item);
      toast('Saved.', { action: 'View', onAction: () => ctx.go('saved') });
      track('save_design', { mode: 'puzzle', category: puzzle.item.category, mine: Boolean(puzzle.item.creation) });
    }
    syncSave();
  }

  const fileName = (ext) => `artify-${slug(puzzle.name)}${puzzle.item.seed ? '-' + puzzle.item.seed : ''}.${ext}`;

  async function downloadPng() {
    if (!puzzle.item) return;
    download(await svgToPng(host.render(puzzle.item).svg), fileName('png'));
    track('download', { mode: 'puzzle', format: 'png' });
  }

  saveBtn.addEventListener('click', toggleSave);
  $('p-answer').addEventListener('click', showAnswer);
  $('p-answer-2').addEventListener('click', showAnswer);
  $('p-download').addEventListener('click', downloadPng);
  $('p-svg').addEventListener('click', () => {
    if (!puzzle.item) return;
    download(svgBlob(host.render(puzzle.item).svg), fileName('svg'));
    track('download', { mode: 'puzzle', format: 'svg' });
  });
  $('p-next').addEventListener('click', newPuzzle);
  $('win-next').addEventListener('click', newPuzzle);
  guide.addEventListener('change', () => {
    prefs.set('guide', guide.checked);
    if (puzzle.svg) puzzle.svg.classList.toggle('ghost-off', !guide.checked);
  });

  return {
    enter() {
      if (!puzzle.item) newPuzzle();
      else {
        win.hidden = !puzzle.solved;
        if (puzzle.solved) ctx.setStatus(capitalise(puzzle.name));
        else updateProgress();
        syncSave();
      }
    },
    leave() {
      win.hidden = true;
    },
    onCategory() {
      newPuzzle();
    },
    key(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const k = e.key.toLowerCase();
      if (k === 'n') newPuzzle();
      else if (k === 's') toggleSave();
      else if (k === 'd') downloadPng();
      else return false;
      return true;
    }
  };
}
