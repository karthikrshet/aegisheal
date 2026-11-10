import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', tone = 'primary', loading, onConfirm, onCancel, children }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="muted">{message}</p>}
      {children}
    </Modal>
  );
}
