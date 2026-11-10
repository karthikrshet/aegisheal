import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · AegisHeal` : 'AegisHeal · Self-Healing Control Center';
  }, [title]);
}
