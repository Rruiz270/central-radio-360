'use client';

import { useToast } from './Toast';

export function CopyLink({ token }: { token: string }) {
  const toast = useToast();
  return (
    <button
      className="btn sm"
      onClick={() => {
        const url = `${window.location.origin}/portal/${token}`;
        navigator.clipboard.writeText(url).then(
          () => toast('Link do cliente copiado: ' + url, 'ok'),
          () => toast(url, 'ok'),
        );
      }}
    >
      Copiar link do cliente
    </button>
  );
}
