import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Toggle } from '../components/ui/Toggle.jsx';
import { Sparkline } from '../components/charts/Sparkline.jsx';
import { StatusBadge } from '../components/incidents/StatusBadge.jsx';
import { SeverityBadge } from '../components/incidents/SeverityBadge.jsx';
import { HealthBadge } from '../components/services/HealthBadge.jsx';

describe('Button', () => {
  it('renders and handles clicks', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalled();
  });
  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('ProgressBar', () => {
  it('clamps the value and exposes aria attributes', () => {
    render(<ProgressBar value={2} max={1} label="Load" />);
    const bar = screen.getByRole('progressbar', { name: 'Load' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar.className).toContain('red');
  });
});

describe('EmptyState', () => {
  it('shows title, text and action', () => {
    render(<EmptyState title="Nothing here" action={<button>Do it</button>}>Try later</EmptyState>);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try later')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('renders only when open and closes on Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open={false} title="Hi" onClose={onClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Modal open title="Hi" onClose={onClose}>Body</Modal>);
    expect(screen.getByRole('dialog', { name: 'Hi' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Toggle', () => {
  it('reports changes', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Enabled" id="t" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('badges', () => {
  it('maps incident statuses to readable labels', () => {
    render(<StatusBadge status="awaiting_approval" />);
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
  });
  it('falls back gracefully for unknown values', () => {
    render(
      <>
        <StatusBadge status="weird_state" />
        <SeverityBadge severity="critical" />
        <HealthBadge health="down" />
      </>,
    );
    expect(screen.getByText('Weird state')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Down')).toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('draws a polyline for 2+ points and ignores bad values', () => {
    const { container } = render(<Sparkline values={[1, null, 3, NaN, 5]} />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });
  it('renders an empty svg for too few points', () => {
    const { container } = render(<Sparkline values={[1]} />);
    expect(container.querySelector('polyline')).toBeNull();
  });
});
