import { FiRotateCcw } from 'react-icons/fi';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';

export function CircuitTable({ circuits = [], canReset, onReset, resetting }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Recent failed recoveries</th>
            <th>Circuit</th>
            <th>State</th>
            {canReset && <th className="right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {circuits.map((c) => (
            <tr key={c.serviceId}>
              <td style={{ fontWeight: 600 }}>{c.serviceId}</td>
              <td>{c.recentFailures}</td>
              <td>{c.circuitOpen ? <Badge tone="red">Open — agent halted</Badge> : <Badge tone="green">Closed</Badge>}</td>
              <td>{c.recovering ? <Badge tone="blue">Recovering</Badge> : <span className="muted small">Idle</span>}</td>
              {canReset && (
                <td className="right">
                  <Button size="sm" variant="secondary" icon={FiRotateCcw} disabled={!c.recentFailures} loading={resetting === c.serviceId} onClick={() => onReset(c.serviceId)}>
                    Reset
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
