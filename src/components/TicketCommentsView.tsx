import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  CornerDownRight, 
  ArrowRightCircle, 
  Check, 
  RotateCcw, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  Lock,
  XCircle
} from 'lucide-react';
import { TicketComment } from '../types';

interface TicketCommentsViewProps {
  ticketId: number;
  ticketNo: string;
  ticketStatus?: string;
  approvalStatus?: string;
  comments?: TicketComment[];
  currentAuthorName?: string;
  currentRole?: string;
  onCommentAdded?: () => void;
  onStatusUpdated?: (newStatus: string) => void;
}

const SYSTEM_ENGINEERS = [
  'Basavaraj SK',
  'Murugesh',
  'Vishal',
  'Mahantesh',
  'D. Manoharan (Manager)',
  'Samuel Kennedy (Requestor)'
];

const RESOLUTION_STATUS_CONFIG = [
  { id: 'OPEN', label: 'Open', color: 'blue' },
  { id: 'PENDING', label: 'Pending', color: 'amber' },
  { id: 'WAITING_FOR_REPORTER', label: 'Waiting for Reporter', color: 'purple' },
  { id: 'RESOLVED', label: 'Resolved', color: 'emerald' },
  { id: 'REOPENED', label: 'Reopened', color: 'orange' }
];

export default function TicketCommentsView({
  ticketId,
  ticketNo,
  ticketStatus = 'OPEN',
  approvalStatus = 'PENDING',
  comments = [],
  currentAuthorName = 'Basavaraj SK',
  currentRole = 'IT Field Engineer',
  onCommentAdded,
  onStatusUpdated
}: TicketCommentsViewProps) {
  const [currentStatus, setCurrentStatus] = useState<string>(ticketStatus);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    if (SYSTEM_ENGINEERS.includes(currentAuthorName)) {
      return currentAuthorName;
    }
    return SYSTEM_ENGINEERS[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [localComments, setLocalComments] = useState<TicketComment[]>(comments);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusNoteModal, setShowStatusNoteModal] = useState<string | null>(null);

  // Sync if parent updates
  React.useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  React.useEffect(() => {
    if (ticketStatus) {
      setCurrentStatus(ticketStatus);
    }
  }, [ticketStatus]);

  // Calculate counts for each resolution status based on current ticket status and transition comments
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: localComments.length,
      OPEN: 0,
      PENDING: 0,
      WAITING_FOR_REPORTER: 0,
      RESOLVED: 0,
      REOPENED: 0
    };

    // Credit current active status
    if (counts[currentStatus] !== undefined) {
      counts[currentStatus] = 1;
    }

    // Accumulate status history in comments
    localComments.forEach(c => {
      const text = (c.content || '').toUpperCase();
      if (text.includes('RESOLVED') && !text.includes('UNRESOLVED')) counts.RESOLVED += 1;
      else if (text.includes('WAITING FOR REPORTER') || text.includes('WAITING_FOR_REPORTER')) counts.WAITING_FOR_REPORTER += 1;
      else if (text.includes('REOPENED')) counts.REOPENED += 1;
      else if (text.includes('PENDING') && !text.includes('PENDING APPROVAL')) counts.PENDING += 1;
      else if (text.includes('OPEN') && !text.includes('REOPENED')) counts.OPEN += 1;
    });

    return counts;
  }, [localComments, currentStatus]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    if (activeFilter === 'ALL') return localComments;
    return localComments.filter(c => {
      const contentUpper = (c.content || '').toUpperCase();
      if (activeFilter === 'RESOLVED') return contentUpper.includes('RESOLVED');
      if (activeFilter === 'WAITING_FOR_REPORTER') return contentUpper.includes('WAITING FOR REPORTER') || contentUpper.includes('WAITING_FOR_REPORTER');
      if (activeFilter === 'PENDING') return contentUpper.includes('PENDING');
      if (activeFilter === 'REOPENED') return contentUpper.includes('REOPENED');
      if (activeFilter === 'OPEN') return contentUpper.includes('OPEN') && !contentUpper.includes('REOPENED');
      return true;
    });
  }, [localComments, activeFilter]);

  // Execute Status Transition API
  const handleTransitionStatus = async (nextStatus: string, optionalNote?: string) => {
    setIsUpdatingStatus(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/movement/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          note: optionalNote || statusNote || '',
          author_name: authorName,
          role: currentRole
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentStatus(nextStatus);
        setShowStatusNoteModal(null);
        setStatusNote('');

        if (data.comments) {
          setLocalComments(data.comments);
        } else if (data.comment) {
          setLocalComments(prev => [...prev, data.comment]);
        }

        setSuccessMsg(`Ticket status updated to ${nextStatus}.`);
        setTimeout(() => setSuccessMsg(''), 4000);

        if (onStatusUpdated) onStatusUpdated(nextStatus);
        if (onCommentAdded) onCommentAdded();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to update ticket status.');
      }
    } catch {
      setErrorMsg('Network error updating ticket status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit General Comment
  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/movement/tickets/${ticketId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          role: currentRole,
          content: commentText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setLocalComments(prev => [...prev, data.comment]);
        }
        setCommentText('');
        setSuccessMsg('Comment added to ticket activity stream.');
        setTimeout(() => setSuccessMsg(''), 3000);
        if (onCommentAdded) onCommentAdded();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to post comment.');
      }
    } catch {
      setErrorMsg('Network error while posting comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'IT';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'WAITING_FOR_REPORTER':
        return 'bg-purple-50 text-purple-900 border-purple-300';
      case 'REOPENED':
        return 'bg-orange-50 text-orange-900 border-orange-300';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'OPEN':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Activity Stream Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Activity & Comments ({localComments.length})
          </h4>
        </div>

        {/* Right Badges: Ticket Key & Prominent Approval Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200">
            Ticket {ticketNo}
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
            approvalStatus === 'APPROVED' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
              : approvalStatus === 'REJECTED'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            <ShieldCheck className="w-3 h-3" />
            <span>APPROVAL: {approvalStatus}</span>
          </span>
        </div>
      </div>

      {/* ================= RESOLUTION STATUS SECTION ================= */}
      {/* Placed prominently under Activity & Comments as requested */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        {/* Role & Authorization Governance Notice */}
        {approvalStatus !== 'APPROVED' ? (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            approvalStatus === 'REJECTED' 
              ? 'bg-rose-50 border-rose-300 text-rose-950' 
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            {approvalStatus === 'REJECTED' ? (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block text-xs">
                {approvalStatus === 'REJECTED' ? 'Movement Authorization Denied by Manager' : 'Awaiting Approval Manager Authorization'}
              </span>
              <span className="text-[11px] leading-relaxed">
                {approvalStatus === 'REJECTED'
                  ? 'Ticket approval was rejected in the Approval Manager Desk. Physical asset movement cannot proceed.'
                  : 'Ticket approval status belongs to the Approval Manager Desk. Once authorized by the manager, the Field Engineers Desk will unlock and handle physical asset movement.'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Authorized by Approval Manager:</strong> Field Engineers Desk now handles physical movement, floor bay installation, and resolution status.
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Resolution Status
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(currentStatus)}`}>
              Current: {currentStatus.replace(/_/g, ' ')}
            </span>
            {approvalStatus !== 'APPROVED' && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1 font-sans">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            )}
          </div>

          {/* Action Status Dropdown for Quick Direct Updates */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Action:</span>
            <div className="relative">
              <select
                disabled={isUpdatingStatus || approvalStatus !== 'APPROVED'}
                value={currentStatus}
                onChange={(e) => {
                  if (approvalStatus !== 'APPROVED') return;
                  const target = e.target.value;
                  if (target !== currentStatus) {
                    setShowStatusNoteModal(target);
                  }
                }}
                className={`pl-2.5 pr-7 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs appearance-none ${
                  approvalStatus !== 'APPROVED' ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-500' : 'focus:ring-2 focus:ring-blue-500 cursor-pointer'
                }`}
                title={approvalStatus !== 'APPROVED' ? 'Locked until authorized by Approval Manager' : 'Select movement status'}
              >
                {approvalStatus !== 'APPROVED' ? (
                  <option value={currentStatus}>
                    {approvalStatus === 'REJECTED' ? 'Locked (Movement Rejected by Manager)' : 'Locked (Awaiting Manager Approval)'}
                  </option>
                ) : (
                  <>
                    <option value="OPEN">Open</option>
                    <option value="PENDING">Pending</option>
                    <option value="WAITING_FOR_REPORTER">Waiting for Reporter</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REOPENED">Reopened</option>
                  </>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Resolution Status Action Pills Ribbon matching user screenshot */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          {/* All Filter Pill */}
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeFilter === 'ALL' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {statusCounts.ALL}
            </span>
          </button>

          {/* Status Pills: Open, Pending, Waiting for Reporter, Resolved, Reopened */}
          {RESOLUTION_STATUS_CONFIG.map(st => {
            const count = statusCounts[st.id] || 0;
            const isSelected = activeFilter === st.id;
            const isCurrentTicketStatus = currentStatus === st.id;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setActiveFilter(st.id);
                  if (currentStatus !== st.id) {
                    if (approvalStatus === 'APPROVED') {
                      setShowStatusNoteModal(st.id);
                    } else if (approvalStatus === 'REJECTED') {
                      setErrorMsg('Ticket approval was rejected by Approval Manager. Movement is halted and resolution status cannot be updated.');
                      setTimeout(() => setErrorMsg(''), 4500);
                    } else {
                      setErrorMsg('Ticket approval status belongs to the Approval Manager Desk. Movement status can only be updated once approved by the manager.');
                      setTimeout(() => setErrorMsg(''), 4500);
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : isCurrentTicketStatus
                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={isCurrentTicketStatus ? `Currently ${st.label}` : approvalStatus === 'APPROVED' ? `Click to transition to ${st.label}` : `Viewing ${st.label} entries (Locked until manager approval)`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected 
                    ? 'bg-slate-800 text-white' 
                    : isCurrentTicketStatus
                    ? 'bg-blue-200 text-blue-900 font-black'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Transition Note / Confirmation Prompt when selecting an alternative status */}
        {showStatusNoteModal && (
          <div className="bg-white border-2 border-blue-300 rounded-xl p-3 space-y-2 mt-2 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ArrowRightCircle className="w-4 h-4 text-blue-600" />
                <span>Transition Resolution Status to <strong>{showStatusNoteModal.replace(/_/g, ' ')}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setShowStatusNoteModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Add transition note (e.g., Work completed at floor 3 bay, awaiting reporter signoff...)"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowStatusNoteModal(null)}
                className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleTransitionStatus(showStatusNoteModal, statusNote)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isUpdatingStatus ? 'Updating...' : `Set to ${showStatusNoteModal.replace(/_/g, ' ')}`}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter notification indicator if filtering by specific status */}
      {activeFilter !== 'ALL' && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
          <span>Filtering activity stream for <strong>{activeFilter.replace(/_/g, ' ')}</strong></span>
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
          >
            Show All ({localComments.length})
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 text-slate-400 text-xs">
            <MessageSquare className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
            <p className="font-semibold text-slate-600">
              {activeFilter === 'ALL' ? 'No activity on this ticket yet.' : `No entries found for ${activeFilter.replace(/_/g, ' ')}.`}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Engineers and managers can record status updates, notes, or installation progress below.
            </p>
          </div>
        ) : (
          filteredComments.map((c) => {
            const isWorkflowTransition = c.role === 'Workflow Transition' || (c.content && c.content.includes('Status changed'));
            const isApprovalEvent = c.role === 'IT Approval Manager' || (c.content && c.content.includes('Approval Status'));

            return (
              <div 
                key={c.id} 
                className={`flex items-start space-x-3 p-3.5 bg-white border rounded-xl shadow-2xs hover:border-slate-300 transition-colors ${
                  isApprovalEvent 
                    ? 'border-emerald-200 bg-emerald-50/30' 
                    : isWorkflowTransition
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                  isApprovalEvent ? 'bg-emerald-600' : isWorkflowTransition ? 'bg-indigo-600' : 'bg-blue-600'
                }`}>
                  {getInitials(c.author_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">{c.author_name}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                        isApprovalEvent
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isWorkflowTransition
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {c.role || 'IT Field Engineer'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      <span>{formatTimestamp(c.created_at)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap leading-relaxed font-sans">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comment Composer Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <label className="font-bold text-slate-700 uppercase text-[11px] flex items-center gap-1.5">
            <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Ticket Comment / Activity Note</span>
          </label>

          {/* Engineer Author Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Posting as:</span>
            <select
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              {SYSTEM_ENGINEERS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Text Input Area */}
        <form onSubmit={handleSubmitComment} className="space-y-2.5">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type your comment, transit update, or installation notes here..."
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 font-medium shadow-2xs"
          />

          {errorMsg && (
            <div className="text-[11px] text-rose-700 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">
              Comments are preserved in the permanent movement audit log.
            </span>
            <div className="flex items-center gap-2">
              {commentText && (
                <button
                  type="button"
                  onClick={() => setCommentText('')}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Add Comment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
