import { useEffect } from 'react';
export default function useReveal(ref) {
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.2 },
    );
    const nodes = ref.current.querySelectorAll('[data-reveal]');
    nodes.forEach((node) => {
      node.classList.add('is-revealing');
      observer.observe(node);
    });
    return () => {
      observer.disconnect();
      nodes.forEach((node) => node.classList.remove('is-revealing'));
    };
  }, [ref]);
}
