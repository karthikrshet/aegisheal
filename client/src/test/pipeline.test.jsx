import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineFlow } from '../components/agent/PipelineFlow.jsx';

describe('PipelineFlow', () => {
  it('renders all seven methodology steps idle by default', () => {
    render(<PipelineFlow steps={null} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveAccessibleName(/Step 1 Monitor: pending/);
    expect(items[6]).toHaveAccessibleName(/Step 7 Verify: pending/);
  });

  it('reflects step status and detail from an incident', () => {
    const steps = [
      { key: 'monitor', label: 'System monitoring', status: 'done', detail: 'HTTP 500' },
      { key: 'detect', label: 'Failure detection', status: 'done' },
      { key: 'collect', label: 'Log & data collection', status: 'done' },
      { key: 'analyze', label: 'AI-based analysis', status: 'running' },
      { key: 'decide', label: 'Recovery decision', status: 'pending' },
      { key: 'recover', label: 'Automated recovery', status: 'pending' },
      { key: 'verify', label: 'Verification', status: 'failed', detail: 'still down' },
    ];
    const { container } = render(<PipelineFlow steps={steps} />);
    expect(container.querySelectorAll('.pipe-step.done')).toHaveLength(3);
    expect(container.querySelector('.pipe-step.running')).toHaveTextContent('AI-based analysis');
    expect(container.querySelector('.pipe-step.failed')).toHaveTextContent('still down');
    expect(screen.getByText('HTTP 500')).toBeInTheDocument();
  });
});
