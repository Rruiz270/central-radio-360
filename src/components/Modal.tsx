'use client';

export function Modal({ title, stage, stageTone, onClose, children }: {
  title: string; stage?: string; stageTone?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="modal-bg on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="mh">
          {stage && <span className={`chip c-${stageTone || 'blue'}`}>{stage}</span>}
          <h3 className="disp">{title}</h3>
          <div className="mx" onClick={onClose} data-testid="modal-close">✕</div>
        </div>
        <div className="mb">{children}</div>
      </div>
    </div>
  );
}
