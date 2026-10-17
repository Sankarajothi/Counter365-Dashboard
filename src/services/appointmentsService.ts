import { Appointment } from '../types/database';

export async function fetchAppointments(): Promise<{ data: Appointment[]; error: string | null }> {
  // CounterPro retail billing counters do not use salon appointment slots
  return { data: [], error: null };
}
