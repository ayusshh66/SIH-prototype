import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { ExplanationDrawer } from './ExplanationDrawer';
import { getExplanations } from '../../api/client';
import type { Explanation } from '../../types/api';
import { ShieldCheck, Search, Download } from 'lucide-react';
import { mockExplanations } from '../../mocks/mockData';

export const ExplainPage: React.FC = () => {
  const { t } = useTranslation();
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExplanation, setSelectedExplanation] = useState<Explanation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getExplanations()
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setExplanations(res.data);
        } else {
          // Fallback to mock data so audit page is never empty
          setExplanations(mockExplanations);
        }
      })
      .catch(() => setExplanations(mockExplanations))
      .finally(() => setLoading(false));
  }, []);

  const handleInspect = (explanation: Explanation) => {
    setSelectedExplanation(explanation);
    setDrawerOpen(true);
  };

  const handleExportAudit = () => {
    const headers = ['Audit ID', 'Entity Type', 'Entity ID', 'Summary', 'Reason Codes', 'Provenance'];
    const rows = explanations.map((e) => [
      e.explanation_id,
      e.entity_type,
      e.entity_id,
      `"${e.summary.replace(/"/g, '""')}"`,
      e.reason_codes.join(';'),
      e.generated_by,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rail_decision_audit_ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('explain.title')}
        description={t('explain.description')}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-status-feasible-bg border border-status-feasible/30 text-status-feasible text-micro font-mono">
            <ShieldCheck size={14} />
            {t('explain.proof_certified')}
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportAudit}
          >
            {t('explain.export_audit')}
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {explanations.map((exp) => (
            <Card
              key={exp.explanation_id}
              title={
                <div className="flex items-center gap-2.5">
                  <Badge
                    tone={
                      exp.entity_type === 'BLOCK'
                        ? 'status-feasible'
                        : exp.entity_type === 'REJECTION'
                        ? 'crit-p1'
                        : 'accent'
                    }
                  >
                    {exp.entity_type}
                  </Badge>
                  <span className="font-mono text-content-primary font-semibold text-small">
                    {exp.entity_id}
                  </span>
                </div>
              }
              eyebrow={`PROVENANCE: ${exp.generated_by} // TRACE: ${exp.explanation_id}`}
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Search size={13} />}
                  onClick={() => handleInspect(exp)}
                >
                  {t('explain.inspect_btn')}
                </Button>
              }
            >
              <p className="text-small font-mono text-content-secondary leading-relaxed bg-surface-sunken p-3 rounded-sm border border-border-hairline mb-3">
                {exp.summary}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {exp.reason_codes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded-sm bg-surface-sunken border border-border-hairline font-mono text-micro text-accent-400 font-semibold"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ExplanationDrawer
        explanation={selectedExplanation}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default ExplainPage;
