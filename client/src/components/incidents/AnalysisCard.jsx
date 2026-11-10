import { FiCpu } from 'react-icons/fi';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { formatPercent, humanize } from '../../utils/format.js';

export function AnalysisCard({ analysis }) {
  if (!analysis) {
    return (
      <Card title="AI analysis">
        <div className="row muted">
          <span className="spinner sm" aria-hidden /> The agent is analysing logs and metrics…
        </div>
      </Card>
    );
  }
  const conf = analysis.confidence ?? 0;
  return (
    <Card title="AI root-cause analysis" subtitle={`Engine: ${analysis.engine}`} actions={<Badge tone="violet" icon={FiCpu}>{analysis.category}</Badge>}>
      <div className="stack">
        <div>
          <div className="small muted">Diagnosis</div>
          <h3 style={{ marginTop: 2 }}>{analysis.signatureName}</h3>
          <p style={{ marginTop: 6 }}>{analysis.rootCause}</p>
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 4 }}>
            Confidence
          </div>
          <div className="confidence">
            <ProgressBar value={conf} max={1} tone={conf >= 0.7 ? 'green' : conf >= 0.5 ? 'amber' : 'red'} label="Confidence" />
            <strong>{formatPercent(conf)}</strong>
          </div>
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 4 }}>
            Evidence
          </div>
          <ul className="evidence small">
            {(analysis.evidence || []).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Recommended playbook
          </div>
          <div className="chip-list">
            {(analysis.recommendedActions || []).map((a, i) => (
              <Badge key={a} tone={i === 0 ? 'blue' : 'gray'}>
                {i + 1}. {humanize(a)}
              </Badge>
            ))}
          </div>
        </div>
        {analysis.secondOpinion && (
          <div className="small muted">
            Local engine second opinion: {humanize(analysis.secondOpinion.signatureId)} ({formatPercent(analysis.secondOpinion.confidence)}) —{' '}
            {analysis.secondOpinion.agrees ? 'agrees' : 'disagrees'}
          </div>
        )}
        {analysis.alternatives?.length > 0 && (
          <div className="small muted">
            Other hypotheses: {analysis.alternatives.map((a) => `${a.name} (${formatPercent(a.confidence)})`).join(', ')}
          </div>
        )}
      </div>
    </Card>
  );
}
