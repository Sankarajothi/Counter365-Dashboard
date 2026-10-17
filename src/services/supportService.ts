import { supabase } from './supabase';
import { SupportMessage, SupportMessageAnswer } from '../types/database';

export async function fetchSupportMessages(): Promise<{ data: SupportMessage[]; error: string | null }> {
  try {
    // If support_messages table doesn't exist, read from localStorage fallback
    let localMessages: SupportMessage[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('counterpro_support_messages');
        if (raw) localMessages = JSON.parse(raw);
      } catch (e) {}
    }

    return { data: localMessages, error: null };
  } catch (err: any) {
    return { data: [], error: null };
  }
}

export async function updateSupportMessageStatus(
  messageId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('counterpro_support_messages');
      if (raw) {
        const list: SupportMessage[] = JSON.parse(raw);
        const item = list.find((m) => m.id === messageId);
        if (item) {
          item.status = status;
          item.updated_at = new Date().toISOString();
          localStorage.setItem('counterpro_support_messages', JSON.stringify(list));
        }
      }
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitSupportMessageAnswer(params: {
  messageId: string;
  shopId: string;
  adminName?: string;
  answerText: string;
  newStatus?: 'open' | 'in_progress' | 'resolved' | 'closed';
}): Promise<{ success: boolean; data?: SupportMessageAnswer; error: string | null }> {
  try {
    const answer: SupportMessageAnswer = {
      id: `ans-${Date.now()}`,
      shop_id: params.shopId,
      message_id: params.messageId,
      admin_name: params.adminName || 'Admin',
      answer: params.answerText,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('counterpro_support_messages');
      if (raw) {
        const list: SupportMessage[] = JSON.parse(raw);
        const item = list.find((m) => m.id === params.messageId);
        if (item) {
          if (!item.answers) item.answers = [];
          item.answers.push(answer);
          if (params.newStatus) item.status = params.newStatus;
          item.updated_at = new Date().toISOString();
          localStorage.setItem('counterpro_support_messages', JSON.stringify(list));
        }
      }
    }

    return { success: true, data: answer, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function subscribeToSupportMessages(onUpdate: () => void) {
  return () => {};
}
