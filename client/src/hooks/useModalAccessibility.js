import { useEffect, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isolateBackground(container) {
  const changed = [];
  let current = container;

  while (current?.parentElement && current !== document.body) {
    [...current.parentElement.children].forEach((sibling) => {
      if (sibling === current || sibling.tagName === "SCRIPT" || sibling.tagName === "STYLE") return;
      changed.push({
        element: sibling,
        inert: sibling.inert,
        ariaHidden: sibling.getAttribute("aria-hidden"),
      });
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    });
    current = current.parentElement;
  }

  return () => changed.forEach(({ element, inert, ariaHidden }) => {
    element.inert = inert;
    if (ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", ariaHidden);
  });
}

export default function useModalAccessibility({ open, containerRef, initialFocusRef, onClose, locked = false }) {
  const closeRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    closeRef.current = onClose;
    lockedRef.current = locked;
  }, [locked, onClose]);

  useEffect(() => {
    if (!open || !containerRef.current) return undefined;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const restoreBackground = isolateBackground(container);
    document.body.style.overflow = "hidden";

    const focusInitialControl = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current || container.querySelector(focusableSelector) || container;
      target.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !lockedRef.current) {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const controls = [...container.querySelectorAll(focusableSelector)]
        .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      if (!controls.length) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusInitialControl);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [containerRef, initialFocusRef, open]);
}
