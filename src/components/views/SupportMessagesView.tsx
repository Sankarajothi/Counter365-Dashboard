import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  MessageSquare,
  X,
  Send,
  Phone,
  Store,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { SupportMessage, Shop, Profile, SupportMessageAnswer } from '../../types/database';
import {
  updateSupportMessageStatus,
  submitSupportMessageAnswer,
} from '../../services/supportService';
import { supabase } from '../../services/supabase';

interface SupportMessagesViewProps {
  messages: SupportMessage[];
  shops?: Shop[];
  profiles?: Profile[];
  loading?: boolean;
  onRefresh?: () => void;
}

export interface EnrichedSupportMessage extends SupportMessage {
  effectiveStatus: string;
  formattedPhone: string;
  userName: string;
  shopName: string;
  updateNote: string;
  matchedShop?: Shop;
  matchedProfile?: Profile;
}

export const SupportMessagesView: React.FC<SupportMessagesViewProps> = ({
  messages = [],
  shops = [],
  profiles = [],
  loading = false,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<EnrichedSupportMessage | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [localUpdates, setLocalUpdates] = useState<Record<string, string>>({});

  // New Ticket Modal State
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicketShopId, setNewTicketShopId] = useState('');
  const [newTicketPhone, setNewTicketPhone] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Reply / Update State in View Modal
  const [updateText, setUpdateText] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string>('resolved');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Maps for quick lookup
  const shopMap = useMemo(() => {
    const map = new Map<string, Shop>();
    shops.forEach((s) => {
      map.set(s.id, s);
      if (s.phone) {
        map.set(s.phone.replace(/\D/g, '').slice(-10), s);
      }
    });
    return map;
  }, [shops]);

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    profiles.forEach((p) => {
      map.set(p.id, p);
      if (p.phone) {
        map.set(p.phone.replace(/\D/g, '').slice(-10), p);
      }
    });
    return map;
  }, [profiles]);

  // Format date matching reference screenshot: "13/10/2026, 6:07:20 pm"
  const formatTicketDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return '—';
    }
  };

  // Enriched messages with matched shop, profile, effective status, and latest update note
  const enrichedMessages = useMemo<EnrichedSupportMessage[]>(() => {
    return messages.map((m) => {
      const cleanPhone = (m.contact_info || '').replace(/\D/g, '').slice(-10);

      // Match Shop
      let matchedShop: Shop | undefined = undefined;
      if (m.shop_id) matchedShop = shopMap.get(m.shop_id);
      if (!matchedShop && cleanPhone) matchedShop = shopMap.get(cleanPhone);

      // Match Profile
      let matchedProfile: Profile | undefined = undefined;
      if (m.user_id) matchedProfile = profileMap.get(m.user_id);
      if (!matchedProfile && cleanPhone) matchedProfile = profileMap.get(cleanPhone);

      const effectiveStatus = (localStatuses[m.id] || m.status || 'open').toLowerCase();

      // Formatted phone
      let formattedPhone = m.contact_info || matchedProfile?.phone || matchedShop?.phone || '—';
      const digits = formattedPhone.replace(/\D/g, '');
      if (digits.length === 10) {
        formattedPhone = `+91${digits}`;
      } else if (digits.length === 12 && digits.startsWith('91')) {
        formattedPhone = `+${digits}`;
      }

      // User name
      const userName =
        matchedProfile?.full_name ||
        matchedShop?.name ||
        (m.contact_info ? `User ${m.contact_info.slice(-4)}` : 'Salon User');

      // Shop name
      const shopName =
        matchedShop?.name || m.shop_name || 'STYLEFLEET SALON';

      // Latest update / answer note
      const answers = m.answers || [];
      const latestAns = answers.length > 0 ? answers[answers.length - 1].answer : '';
      const updateNote =
        localUpdates[m.id] ||
        latestAns ||
        (effectiveStatus === 'resolved' ? 'Resolved by support team' : 'Pending resolution update');

      return {
        ...m,
        effectiveStatus,
        formattedPhone,
        userName,
        shopName,
        updateNote,
        matchedShop,
        matchedProfile,
      };
    });
  }, [messages, shopMap, profileMap, localStatuses, localUpdates]);

  // Counts for subtitle
  const counts = useMemo(() => {
    const total = enrichedMessages.length;
    let open = 0;
    let inProgress = 0;
    let hold = 0;
    let resolved = 0;

    enrichedMessages.forEach((m) => {
      const st = m.effectiveStatus;
      if (st === 'open') open += 1;
      else if (st === 'in_progress') inProgress += 1;
      else if (st === 'hold') hold += 1;
      else if (st === 'resolved' || st === 'closed') resolved += 1;
      else open += 1;
    });

    return { total, open, inProgress, hold, resolved };
  }, [enrichedMessages]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    if (statusFilter === 'all') return enrichedMessages;
    return enrichedMessages.filter((m) => {
      const st = m.effectiveStatus;
      if (statusFilter === 'resolved') return st === 'resolved' || st === 'closed';
      return st === statusFilter;
    });
  }, [enrichedMessages, statusFilter]);

  // Handle direct status change from table dropdown
  const handleStatusChange = async (messageId: string, newStatus: string) => {
    setLocalStatuses((prev) => ({ ...prev, [messageId]: newStatus }));
    try {
      await updateSupportMessageStatus(messageId, newStatus as any);
    } catch (err) {
      console.warn('Status update error:', err);
    }
  };

  // Handle submitting an update from inside the View Message modal
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !updateText.trim()) return;

    setIsSubmittingUpdate(true);
    try {
      await submitSupportMessageAnswer({
        messageId: selectedMessage.id,
        shopId: selectedMessage.shop_id || '',
        answerText: updateText.trim(),
        adminName: 'CounterPro Admin',
        newStatus: updateStatus as any,
      });

      setLocalUpdates((prev) => ({ ...prev, [selectedMessage.id]: updateText.trim() }));
      setLocalStatuses((prev) => ({ ...prev, [selectedMessage.id]: updateStatus }));
      setUpdateText('');
      setSelectedMessage(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error submitting update:', err);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Handle creating a new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketMessage.trim()) return;

    setIsSubmittingNew(true);
    try {
      const cleanPhone = newTicketPhone.replace(/\D/g, '').slice(-10);
      const { error } = await supabase.from('support_messages').insert({
        shop_id: newTicketShopId || null,
        contact_info: cleanPhone || null,
        message: newTicketMessage.trim(),
        status: 'open',
      });
      if (error) throw error;

      setIsNewTicketOpen(false);
      setNewTicketMessage('');
      setNewTicketPhone('');
      setNewTicketShopId('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Could not create ticket: ' + (err as any)?.message);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Support
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            {counts.total} tickets total · {counts.open} open · {counts.inProgress} in progress · {counts.hold} hold · {counts.resolved} resolved
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Status Filter Dropdown (matching reference) */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 font-medium focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All tickets</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="hold">Hold</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh Tickets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {/* New Ticket Button */}
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New ticket</span>
          </button>
        </div>
      </div>

      {/* 2. TABLE CONTAINER & INSTRUCTION BANNER */}
      <div className="bg-[#F8F9FA] rounded-2xl border border-[#0D9488]/20 shadow-2xs overflow-hidden">
        {/* Instruction Subheader */}
        <div className="p-4 px-5 border-b border-[#0D9488]/15 bg-[#0D9488]/5 text-xs text-black/70">
          Showing {filteredMessages.length} of {counts.total}. Tap a message or <span className="font-semibold text-black">View message</span> to read the full text.
        </div>

        {/* 3. SUPPORT TICKETS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#0D9488]/15 text-[10px] font-bold uppercase tracking-wider text-black/70 bg-[#0D9488]/10 font-mono">
                <th className="py-3 px-4">USER</th>
                <th className="py-3 px-3">PHONE</th>
                <th className="py-3 px-3">SHOP</th>
                <th className="py-3 px-4 min-w-[200px]">MESSAGE</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-4 min-w-[180px]">UPDATE</th>
                <th className="py-3 px-3">CREATED</th>
                <th className="py-3 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0D9488]/15 text-black">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-black/50">
                    Loading support tickets...
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-black/50">
                    No support tickets matching selected filter.
                  </td>
                </tr>
              ) : (
                filteredMessages.map((m) => {
                  let statusBadgeColor = 'text-[#0D9488] font-semibold';
                  let selectBorder = 'border-[#0D9488]/30 text-black bg-[#F8F9FA]';

                  const displayStatus =
                    m.effectiveStatus === 'in_progress'
                      ? 'In progress'
                      : m.effectiveStatus.charAt(0).toUpperCase() + m.effectiveStatus.slice(1);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-neutral-50/70 transition-colors align-top"
                    >
                      {/* USER */}
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 whitespace-nowrap">
                        {m.userName}
                      </td>

                      {/* PHONE */}
                      <td className="py-3.5 px-3 font-mono text-neutral-700 whitespace-nowrap">
                        {m.formattedPhone}
                      </td>

                      {/* SHOP */}
                      <td className="py-3.5 px-3 font-medium text-neutral-800 uppercase tracking-tight whitespace-nowrap">
                        {m.shopName}
                      </td>

                      {/* MESSAGE */}
                      <td className="py-3.5 px-4">
                        <div className="line-clamp-2 text-neutral-800 leading-relaxed">
                          {m.message}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedMessage(m);
                            setUpdateStatus(m.effectiveStatus);
                            setUpdateText('');
                          }}
                          className="mt-1.5 inline-block px-2.5 py-1 rounded-md border border-neutral-300/90 bg-white hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          View message
                        </button>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={statusBadgeColor}>{displayStatus}</span>
                      </td>

                      {/* UPDATE */}
                      <td className="py-3.5 px-4 text-neutral-600 leading-relaxed">
                        <div className="line-clamp-2">{m.updateNote}</div>
                      </td>

                      {/* CREATED */}
                      <td className="py-3.5 px-3 font-mono text-neutral-600 whitespace-nowrap text-[11px]">
                        {formatTicketDate(m.created_at)}
                      </td>

                      {/* ACTION DROPDOWN */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <select
                          value={m.effectiveStatus}
                          onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer shadow-2xs ${selectBorder}`}
                        >
                          <option value="resolved">Resolved</option>
                          <option value="in_progress">In progress</option>
                          <option value="open">Open</option>
                          <option value="hold">Hold</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. VIEW MESSAGE & UPDATE MODAL */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Support Ticket
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  ID: {selectedMessage.id} · {formatTicketDate(selectedMessage.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Info Card */}
            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">User</span>
                <span className="font-bold text-neutral-800">
                  {selectedMessage.userName || selectedMessage.contact_info || 'Salon User'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Phone</span>
                <span className="font-mono text-neutral-800">
                  {selectedMessage.formattedPhone || selectedMessage.contact_info || '—'}
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-neutral-200/60">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">Shop</span>
                <span className="font-medium text-neutral-800 uppercase">
                  {selectedMessage.shopName || selectedMessage.shop?.name || 'CounterPro Salon'}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                CLIENT MESSAGE
              </div>
              <div className="p-3.5 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/15 text-xs text-neutral-900 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>

            {/* Existing Answers / Updates History */}
            {selectedMessage.answers && selectedMessage.answers.length > 0 && (
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  PREVIOUS UPDATES ({selectedMessage.answers.length})
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedMessage.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className="p-3 rounded-lg bg-[#0D9488]/10 border border-[#0D9488]/20 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-black/50 font-mono mb-1">
                        <span className="font-bold text-[#0D9488]">{ans.admin_name || 'Admin'}</span>
                        <span>{formatTicketDate(ans.created_at)}</span>
                      </div>
                      <div className="text-black">{ans.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Resolution Update Form */}
            <form onSubmit={handleSubmitUpdate} className="pt-2 border-t border-[#0D9488]/15 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/70">
                  ADD RESOLUTION UPDATE / RESPONSE
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-black/70">Set status:</span>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-[#0D9488]/30 bg-[#F8F9FA] text-black font-medium focus:outline-none"
                  >
                    <option value="resolved">Resolved</option>
                    <option value="in_progress">In progress</option>
                    <option value="hold">Hold</option>
                    <option value="open">Open</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                required
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Type resolution update note or agent feedback..."
                className="w-full text-xs p-3 rounded-xl border border-[#0D9488]/30 focus:outline-none focus:ring-1 focus:ring-[#0D9488] bg-[#F8F9FA] text-black"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#0D9488]/30 text-xs font-semibold text-black/70 hover:bg-[#0D9488]/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpdate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingUpdate ? 'Saving...' : 'Save Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. LOG NEW TICKET MODAL */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Log New Support Ticket
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Record an incoming inquiry, bug report, or feature request from a salon.
                </p>
              </div>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  SALON SHOP
                </label>
                <select
                  value={newTicketShopId}
                  onChange={(e) => {
                    setNewTicketShopId(e.target.value);
                    const s = shops.find((shp) => shp.id === e.target.value);
                    if (s?.phone) setNewTicketPhone(s.phone);
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#0D9488]/30 bg-[#F8F9FA] text-black focus:outline-none focus:ring-1 focus:ring-[#0D9488] cursor-pointer"
                >
                  <option value="">Select Salon Shop (Optional)</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city || 'Tamil Nadu'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9360396190"
                  value={newTicketPhone}
                  onChange={(e) => setNewTicketPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#0D9488]/30 bg-[#F8F9FA] text-black font-mono focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                  MESSAGE / ISSUE DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the issue reported by the client..."
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#0D9488]/30 bg-[#F8F9FA] text-black focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0D9488]/15">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#0D9488]/30 text-xs font-semibold text-black/70 hover:bg-[#0D9488]/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmittingNew ? 'Creating...' : 'Create Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
