export interface AdminResponse {
  id: string;
  shop_id: string;
  shop_name?: string;
  employee_name: string;
  employee_email?: string;
  response_type: 'Answered' | 'No Answer' | 'Not Reachable' | string;
  outcome: 'Positive' | 'Negative' | string;
  sentiment: 'Positive' | 'Negative' | string;
  notes: string;
  customer_feedback?: string;
  service_type?: string;
  lead_source?: string;
  demo_status?: string;
  timer_duration?: string;
  follow_up_date?: string;
  follow_up_priority?: string;
  created_at: string;
}

export async function fetchAllResponses(shopId?: string): Promise<AdminResponse[]> {
  try {
    const url = shopId ? `/api/admin/responses?shop_id=${encodeURIComponent(shopId)}` : '/api/admin/responses';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.responses || [];
  } catch (err) {
    console.warn('Failed to fetch responses from API:', err);
    // Fallback to local storage if API call fails
    try {
      const storageKey = shopId ? `counterpro_call_responses_${shopId}` : 'counterpro_all_responses';
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
}

export async function createResponse(payload: Omit<AdminResponse, 'id' | 'created_at'>): Promise<AdminResponse> {
  const res = await fetch('/api/admin/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save response (status ${res.status})`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to save response');
  }

  // Also cache locally for instant UI response
  try {
    const storageKey = `counterpro_call_responses_${payload.shop_id}`;
    const saved = localStorage.getItem(storageKey);
    const list: any[] = saved ? JSON.parse(saved) : [];
    list.unshift(data.response);
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to cache response locally:', e);
  }

  return data.response;
}

export async function deleteResponseById(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/responses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete response from API:', err);
    return false;
  }
}
