import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Button } from './Button.jsx';

export function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="small muted">
        Page {page} of {pages} · {total} total
      </span>
      <div className="row">
        <Button size="sm" variant="secondary" icon={FiChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <FiChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
