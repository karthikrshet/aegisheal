import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export function PageHeader({ title, description, actions }) {
  useDocumentTitle(title);
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row-wrap">{actions}</div>}
    </div>
  );
}
