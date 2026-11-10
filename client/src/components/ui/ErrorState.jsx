import { FiAlertOctagon, FiRefreshCw } from 'react-icons/fi';
import { Button } from './Button.jsx';

export function ErrorState({ error, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <FiAlertOctagon aria-hidden />
      <div className="grow">{error?.message || 'Something went wrong.'}</div>
      {onRetry && (
        <Button size="sm" variant="secondary" icon={FiRefreshCw} onClick={() => onRetry()}>
          Retry
        </Button>
      )}
    </div>
  );
}
