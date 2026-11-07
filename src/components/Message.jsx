import { useEffect, useRef } from 'react';
export default function Message({ children, error = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (error && children) ref.current?.focus();
  }, [error, children]);
  return (
    <p
      ref={ref}
      className="notice-message"
      role="status"
      aria-live="polite"
      tabIndex={-1}
      data-error={error}
    >
      {children}
    </p>
  );
}
