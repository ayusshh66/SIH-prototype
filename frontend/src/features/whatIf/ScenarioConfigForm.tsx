import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

interface Props {
  onSimulate: (data: any) => void;
  isSimulating: boolean;
}

export const ScenarioConfigForm: React.FC<Props> = ({ onSimulate, isSimulating }) => {
  const [type, setType] = useState('TRAIN_DELAY');
  const [train, setTrain] = useState('12002 Shatabdi');
  const [delay, setDelay] = useState(45);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate({ type, train, delay });
  };

  return (
    <Card title="Scenario Configuration" className="h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
        
        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold text-text-muted uppercase tracking-widest font-mono block">Incident Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-background-main border-2 border-surface-border p-3 font-mono text-sm focus:border-text-primary focus:outline-none appearance-none"
          >
            <option value="TRAIN_DELAY">Train Delay / Late Running</option>
            <option value="BLOCK_UNAVAILABLE">Possession Window Curtailed</option>
            <option value="RESOURCE_UNAVAILABLE">Machinery Breakdown</option>
          </select>
        </div>

        {type === 'TRAIN_DELAY' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest font-mono block">Affected Train</label>
              <select 
                value={train} 
                onChange={(e) => setTrain(e.target.value)}
                className="w-full bg-background-main border-2 border-surface-border p-3 font-mono text-sm focus:border-text-primary focus:outline-none appearance-none"
              >
                <option value="12002 Shatabdi">12002 Bhopal Shatabdi Exp</option>
                <option value="22436 Vande Bharat">22436 Vande Bharat Exp</option>
                <option value="FREIGHT_BOXN">Freight BOXN-402</option>
              </select>
            </div>
            
            <div className="space-y-4 pt-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest font-mono flex justify-between">
                <span>Delay Minutes</span>
                <span className="text-status-warning text-sm">{delay} mins</span>
              </label>
              <input 
                type="range" 
                min="15" 
                max="180" 
                step="15"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full h-2 bg-surface-border appearance-none cursor-pointer"
              />
            </div>
          </>
        )}

        <div className="mt-auto pt-6">
           <Button 
             type="submit" 
             disabled={isSimulating}
             className="w-full py-4 text-background-main bg-status-warning border-status-warning hover:bg-yellow-600 disabled:opacity-50"
           >
             {isSimulating ? 'Simulating...' : 'Execute Re-Optimization'}
           </Button>
        </div>
      </form>
    </Card>
  );
};
