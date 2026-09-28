import React, { useState } from 'react';
import { EmailQueue } from '../types';
import { Mail, Wifi, WifiOff, RefreshCw, Send, AlertTriangle } from 'lucide-react';

interface EmailQueueViewProps {
  emailQueue: EmailQueue[];
  isOnline: boolean;
  onToggleInternet: () => void;
  onRefresh: () => void;
}

export default function EmailQueueView({ emailQueue, isOnline, onToggleInternet, onRefresh }: EmailQueueViewProps) {
  const [syncing, setSyncing] = useState(false);

  const triggerManualSync = async () => {
    setSyncing(true);
    // Fetch queue to let background worker pick it up
    onRefresh();
    setTimeout(() => {
      setSyncing(false);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Pending Sync</span>;
      case 'SENT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Sent (SMTP)</span>;
      case 'FAILED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Delivery Fail</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">{status}</span>;
    }
  };

  const pendingCount = emailQueue.filter(e => e.status === 'PENDING').length;

  return (
    <div className="space-y-6" id="email-queue-panel">
      {/* Network Controller State */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6" id="network-state-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Wifi className="w-3.5 h-3.5 mr-1" />
                  Internet Online (SMTP Active)
                </span>
              ) : (
                <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <WifiOff className="w-3.5 h-3.5 mr-1" />
                  Internet Offline (Local Cache)
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-2">SMTP Mailer & Offline Event Queue</h3>
            <p className="text-sm text-gray-600 max-w-2xl leading-normal">
              When custody checkpoints scan assets, the validation engine writes real-time security records into a SQLite-backed queue. If the checkpoint is in a subterranean depot without reception, events are cached safely and automatically re-transmitted once connection resumes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={onToggleInternet}
              className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                isOnline
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs'
              }`}
            >
              {isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 mr-1.5" />
                  Disconnect Internet (Go Offline)
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-1.5" />
                  Restore Connection (Online Sync)
                </>
              )}
            </button>

            <button
              onClick={triggerManualSync}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Outbox Now
            </button>
          </div>
        </div>

        {/* Offline warnings if disconnected */}
        {!isOnline && pendingCount > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Connection Interrupted: Emails Buffered Locally</h4>
              <p className="text-xs text-amber-700 leading-normal mt-0.5">
                There are <strong>{pendingCount} security notification(s)</strong> queued in SQLite memory. They will stay safely buffered. Restore connection to trigger background retransmission.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SMTP Queue List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Mail className="w-4 h-4 text-slate-700" />
            <span>Outbound SMTP Transaction Queue Logs</span>
          </h3>
          <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-700">
            Total Queue: {emailQueue.length}
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
              <tr>
                <th className="px-5 py-3">Queue ID</th>
                <th className="px-5 py-3">Recipient SMTP Server</th>
                <th className="px-5 py-3">Subject Alert</th>
                <th className="px-5 py-3">Timestamp Logged</th>
                <th className="px-5 py-3">Deliver Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {emailQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    SMTP Queue is empty. Trigger a scan checkpoint to generate notification logs.
                  </td>
                </tr>
              ) : (
                [...emailQueue].reverse().map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">#SMTP-QX-{email.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{email.recipient}</td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900">{email.subject}</div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-1">{email.body}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      <div>Created: {new Date(email.created_at).toLocaleTimeString()}</div>
                      {email.sent_at && (
                        <div className="text-emerald-600 mt-0.5">Sent: {new Date(email.sent_at).toLocaleTimeString()}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center">
                        {getStatusBadge(email.status)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
