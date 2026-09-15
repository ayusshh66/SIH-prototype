import React, { useEffect, useState } from 'react';
import { Plus, Download, CheckCircle2, Wrench } from 'lucide-react';
import { getTasks } from '../../api/client';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { TaskDataTable } from './TaskDataTable';
import { TaskDetailSheet } from './TaskDetailSheet';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import type { MaintenanceTask } from '../../types/api';
import { mockTasks } from '../../mocks/mockData';
import { useTranslation } from 'react-i18next';

export const MaintenanceTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [loading, setLoading] = useState(true);

  // Work order modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [newDept, setNewDept] = useState<'ENG' | 'TRD' | 'SNT'>('ENG');
  const [newAssetId, setNewAssetId] = useState('AST-TRK-NDLS-045');
  const [newStartKm, setNewStartKm] = useState('45.2');
  const [newEndKm, setNewEndKm] = useState('46.5');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    getTasks()
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setTasks(res.data);
        } else {
          // Graceful fallback to mock data
          setTasks(mockTasks);
        }
      })
      .catch(() => setTasks(mockTasks))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenModal = () => {
    setLogSuccess(false);
    setNewDept('ENG');
    setNewAssetId('AST-TRK-NDLS-045');
    setNewStartKm('45.2');
    setNewEndKm('46.5');
    setNewDesc('');
    setIsModalOpen(true);
  };

  const handleSubmitWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    // Create a mock task entry and add it to the list for demo
    const mockNewTask: MaintenanceTask = {
      id: `TSK-${newDept}-NEW-${Date.now().toString(36).toUpperCase()}`,
      taskCode: `TSK-${newDept}-NEW`,
      assetId: newAssetId,
      departmentId: newDept,
      corridorId: 'NDLS-AGC',
      taskType: 'DEFECT_REPAIR',
      description: newDesc || `${newDept} inspection at Km ${newStartKm}–${newEndKm}`,
      locationStartKm: parseFloat(newStartKm) || 0,
      locationEndKm: parseFloat(newEndKm) || 0,
      criticalityScore: 72,
      urgencyScore: 68,
      safetyScore: 75,
      operationalImpactScore: 65,
      priorityScore: 70,
      estimatedDurationMinutes: 120,
      overdueDays: 0,
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'PENDING',
      requiredBlock: true,
      requiresPowerShutdown: newDept === 'TRD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [mockNewTask, ...prev]);
    setLogSuccess(true);
    setTimeout(() => {
      setLogSuccess(false);
      setIsModalOpen(false);
    }, 1400);
  };

  const handleExportCsv = () => {
    const headers = ['Task ID', 'Department', 'Asset', 'Type', 'Start Km', 'End Km', 'Criticality', 'Status', 'Due Date'];
    const rows = tasks.map((t) => [
      t.taskCode,
      t.departmentId,
      t.assetId,
      t.taskType,
      t.locationStartKm,
      t.locationEndKm,
      t.criticalityScore,
      t.status,
      t.dueAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rail_maintenance_tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('tasks.title')}
        description={t('tasks.description')}
        badge={
          <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-surface-sunken border border-border-hairline text-content-tertiary">
            {tasks.length} {t('tasks.registered_defects')}
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportCsv}
            >
              {t('tasks.export_csv')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleOpenModal}
            >
              {t('tasks.log_work_order')}
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton height={48} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
      ) : (
        <TaskDataTable tasks={tasks} onRowClick={setSelectedTask} />
      )}

      <TaskDetailSheet
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* Log Work Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('tasks.modal_title')}
      >
        <form onSubmit={handleSubmitWorkOrder} className="space-y-4">
          {/* Department */}
          <div className="space-y-1.5 font-mono text-small">
            <label className="text-micro uppercase text-content-tertiary font-semibold block">
              {t('tasks.modal_dept')}
            </label>
            <select
              value={newDept}
              onChange={(e) => setNewDept(e.target.value as 'ENG' | 'TRD' | 'SNT')}
              className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
            >
              <option value="ENG">Civil Engineering (Permanent Way)</option>
              <option value="TRD">Overhead Traction (TRD / OHE)</option>
              <option value="SNT">Signal &amp; Telecommunication (S&amp;T)</option>
            </select>
          </div>

          <Input
            label={t('tasks.modal_asset')}
            value={newAssetId}
            onChange={(e) => setNewAssetId(e.target.value)}
            placeholder="e.g. AST-TRK-NDLS-045"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('tasks.modal_start_km')}
              value={newStartKm}
              onChange={(e) => setNewStartKm(e.target.value)}
              placeholder="45.2"
              required
            />
            <Input
              label={t('tasks.modal_end_km')}
              value={newEndKm}
              onChange={(e) => setNewEndKm(e.target.value)}
              placeholder="46.5"
              required
            />
          </div>

          <div className="space-y-1.5 font-mono text-small">
            <label className="text-micro uppercase text-content-tertiary font-semibold block">
              {t('tasks.modal_desc')}
            </label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Details of defect or planned track renewal..."
              className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-content-primary focus:outline-none focus:border-border-strong font-mono text-small"
            />
          </div>

          {logSuccess && (
            <div className="p-3 bg-status-feasible-bg border border-status-feasible/30 rounded-sm text-status-feasible text-small font-mono flex items-center gap-2">
              <CheckCircle2 size={14} />
              {t('tasks.modal_success')}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border-hairline">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              {t('tasks.modal_cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={<Wrench size={13} />}>
              {t('tasks.modal_submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenanceTasksPage;
