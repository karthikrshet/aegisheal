import { Link } from 'react-router-dom';
import { FiCompass } from 'react-icons/fi';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState
      icon={FiCompass}
      title="Page not found"
      action={
        <Link to="/" className="btn btn-primary">
          Back to dashboard
        </Link>
      }
    >
      The page you are looking for does not exist or was moved.
    </EmptyState>
  );
}
