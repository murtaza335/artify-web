// Bottom sheets built on <dialog>, which gives focus trapping, Escape and a backdrop for free.
// "Dockable" sheets are shown inline in the desktop side panel instead, so opening them there is a no-op.

const desktop = window.matchMedia('(min-width: 1024px)');

export const isDesktop = () => desktop.matches;

export function openSheet(dialog) {
  if (dialog.open) return;
  if (dialog.classList.contains('dockable') && desktop.matches) {
    const first = dialog.querySelector('button:not(.sheet-close), input, a');
    if (first) first.focus();
    return;
  }
  dialog.showModal();
}

export function closeSheet(dialog) {
  if (dialog.open) dialog.close();
}

export function setupSheets() {
  document.querySelectorAll('dialog.sheet').forEach((dialog) => {
    dialog.querySelectorAll('.sheet-close').forEach((b) => b.addEventListener('click', () => closeSheet(dialog)));
    // A tap on the backdrop (the dialog element itself, outside its content) closes it.
    dialog.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeSheet(dialog);
    });
  });
  // Moving to desktop docks the sheets, so close any that were open as modals.
  desktop.addEventListener('change', () => {
    document.querySelectorAll('dialog.dockable[open]').forEach(closeSheet);
  });
}
