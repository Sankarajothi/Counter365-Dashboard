import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tziqjkklqtmjlncoraba.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_CkIw1TkmOb9qbIVd8Lb0RA_8FCAHfli';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

const DATA_DIR = path.join(process.cwd(), 'data');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESPONSES_FILE)) {
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify([]), 'utf-8');
  }
}

function readLocalResponses(): any[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(RESPONSES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading responses.json:', err);
    return [];
  }
}

function writeLocalResponses(list: any[]) {
  ensureDataFile();
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get('shop_id');

  try {
    let localList = readLocalResponses();

    // Also fetch from Supabase audit_logs as backup cloud storage
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'customer_response.added')
        .order('created_at', { ascending: false });

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      const { data: dbData, error } = await query;
      if (!error && dbData && dbData.length > 0) {
        const localIds = new Set(localList.map((r: any) => r.id));
        let changed = false;

        dbData.forEach((row: any) => {
          const meta = row.metadata || {};
          const recordId = meta.response_id || row.id;
          if (!localIds.has(recordId)) {
            localList.push({
              id: recordId,
              shop_id: row.shop_id,
              shop_name: meta.shop_name || '',
              employee_name: meta.employee_name || 'Admin',
              employee_email: meta.employee_email || '',
              response_type: meta.response_type || 'Answered',
              outcome: meta.outcome || 'Positive',
              sentiment: meta.sentiment || meta.outcome || 'Positive',
              notes: meta.notes || '',
              customer_feedback: meta.customer_feedback || '',
              service_type: meta.service_type || '',
              lead_source: meta.lead_source || '',
              demo_status: meta.demo_status || '',
              timer_duration: meta.timer_duration || '',
              follow_up_date: meta.follow_up_date || '',
              follow_up_priority: meta.follow_up_priority || 'Medium',
              created_at: meta.created_at || row.created_at,
            });
            localIds.add(recordId);
            changed = true;
          }
        });

        if (changed) {
          writeLocalResponses(localList);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase audit_logs fetch warning:', dbErr);
    }

    if (shopId) {
      localList = localList.filter((r: any) => r.shop_id === shopId);
    }

    localList.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, responses: localList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shop_id,
      shop_name,
      employee_name,
      employee_email,
      response_type,
      outcome,
      sentiment,
      notes,
      customer_feedback,
      service_type,
      lead_source,
      demo_status,
      timer_duration,
      follow_up_date,
      follow_up_priority,
    } = body;

    if (!shop_id) {
      return NextResponse.json({ success: false, error: 'shop_id is required' }, { status: 400 });
    }

    const newResponse = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      shop_id,
      shop_name: shop_name || '',
      employee_name: employee_name || 'Admin',
      employee_email: employee_email || '',
      response_type: response_type || 'Answered',
      outcome: outcome || sentiment || 'Positive',
      sentiment: sentiment || outcome || 'Positive',
      notes: notes || '',
      customer_feedback: customer_feedback || '',
      service_type: service_type || '',
      lead_source: lead_source || '',
      demo_status: demo_status || '',
      timer_duration: timer_duration || '',
      follow_up_date: follow_up_date || '',
      follow_up_priority: follow_up_priority || 'Medium',
      created_at: new Date().toISOString(),
    };

    // 1. Save to local server persistent database
    const localList = readLocalResponses();
    localList.unshift(newResponse);
    writeLocalResponses(localList);

    // 2. Sync to Supabase audit_logs
    try {
      await supabase.from('audit_logs').insert([
        {
          shop_id,
          action: 'customer_response.added',
          entity_type: 'customer_response',
          metadata: {
            response_id: newResponse.id,
            shop_name: newResponse.shop_name,
            employee_name: newResponse.employee_name,
            employee_email: newResponse.employee_email,
            response_type: newResponse.response_type,
            outcome: newResponse.outcome,
            sentiment: newResponse.sentiment,
            notes: newResponse.notes,
            customer_feedback: newResponse.customer_feedback,
            service_type: newResponse.service_type,
            lead_source: newResponse.lead_source,
            demo_status: newResponse.demo_status,
            timer_duration: newResponse.timer_duration,
            follow_up_date: newResponse.follow_up_date,
            follow_up_priority: newResponse.follow_up_priority,
            created_at: newResponse.created_at,
          },
        },
      ]);
    } catch (dbErr) {
      console.warn('Supabase audit_logs insert warning:', dbErr);
    }

    return NextResponse.json({ success: true, response: newResponse });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter is required' }, { status: 400 });
    }

    let localList = readLocalResponses();
    localList = localList.filter((r: any) => r.id !== id);
    writeLocalResponses(localList);

    return NextResponse.json({ success: true, message: 'Response deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
