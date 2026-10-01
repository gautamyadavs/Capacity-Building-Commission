import '@testing-library/jest-dom/vitest';

// jsdom lacks native dialog methods; browser tests cover real modal focus/locking.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
}
