"use client";

import { useEffect } from "react";

/** Adds subtle, accessible entrance animations to content as it enters view. */
export default function PageMotion() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section, main article, main [data-motion-card]"
      )
    );
    if (!targets.length || !("IntersectionObserver" in window)) return;

    targets.forEach((element, index) => {
      element.classList.add("motion-reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 65}ms`);
    });
    // Only hide elements after JS has successfully prepared the observer.
    root.classList.add("motion-enabled");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("motion-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" }
    );
    targets.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      root.classList.remove("motion-enabled");
    };
  }, []);

  return null;
}
