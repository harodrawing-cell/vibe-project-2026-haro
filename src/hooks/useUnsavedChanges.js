import { useEffect } from 'react';
export default function useUnsavedChanges(dirty) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event) => {
      const link = event.target.closest('a[href]');
      if (
        !link ||
        link.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      if (
        !confirm('저장하지 않은 변경사항이 있습니다. 이 페이지를 떠날까요?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty]);
}
