import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Store,
  User,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  Scissors,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  FileText,
  RotateCcw,
  PhoneCall,
  PlusCircle,
  FileSpreadsheet,
  X,
  MessageSquare,
  Users,
  CalendarClock,
  ShieldCheck,
  TrendingUp,
  Tag,
  ChevronRight,
  ChevronDown,
  Trash2,
  MessageCircle,
  Package,
} from 'lucide-react';
import { Shop, Profile, Staff, Customer, Bill, Payment, Appointment } from '../../types/database';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { saveManualSubscription } from '../../services/billingService';
import { fetchCrmUserAccounts, CrmUserAccount } from '../../services/crmUserService';
import { fetchAllResponses, createResponse, deleteResponseById, AdminResponse } from '../../services/responseService';

interface SalonFreshDetailPageProps {
  shop: Shop;
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  appointments: Appointment[];
  payments: Payment[];
  subscriptions?: any[];
  onBack: () => void;
  onRefresh?: () => void;
}

interface SalonService {
  id: string;
  name: string;
  price_minor: number;
  duration_minutes: number;
  is_active: boolean;
  category_id?: string | null;
}

interface CallResponse {
  id: string;
  date: string;
  type: 'Answered' | 'No Answer' | 'Not Reachable' | string;
  outcome: 'Positive' | 'Negative' | string;
  contactPerson: string;
  notes: string;
  customerFeedback?: string;
  leadSource?: string;
  demoStatus?: string;
  serviceType?: string;
  followUpDate?: string;
  recordedBy: string;
  duration?: string;
  priority?: string;
}

export const SalonFreshDetailPage: React.FC<SalonFreshDetailPageProps> = ({
  shop,
  profiles,
  staff,
  customers,
  bills,
  appointments,
  payments,
  subscriptions = [],
  onBack,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [services, setServices] = useState<SalonService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Products Catalog State
  const [products, setProducts] = useState<Array<{ id: string; name: string; price_minor: number; category: string; is_active: boolean }>>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Collapsible Table Sections State
  const [isResponsesOpen, setIsResponsesOpen] = useState(true);
  const [isStaffOpen, setIsStaffOpen] = useState(true);
  const [isProductsOpen, setIsProductsOpen] = useState(true);
  const [isBillsOpen, setIsBillsOpen] = useState(true);

  // Add Response Modal State (matching operations console response form)
  const [isAddResponseOpen, setIsAddResponseOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<'Answered' | 'No Answer' | 'Not Reachable'>('Answered');
  const [responseSentiment, setResponseSentiment] = useState<'Positive' | 'Negative'>('Positive');
  const [leadSource, setLeadSource] = useState('');
  const [demoStatus, setDemoStatus] = useState<'WhatsApp Demo' | 'Call Demo' | 'No Demo' | ''>('No Demo');
  const [serviceType, setServiceType] = useState<string>('Hair & Styling');
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [responseDate, setResponseDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [reportedBy, setReportedBy] = useState(() => user?.name || user?.email || 'Textellar Super Admin');
  const [crmUsers, setCrmUsers] = useState<CrmUserAccount[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadCrmStaff() {
      try {
        const list = await fetchCrmUserAccounts();
        if (isMounted) setCrmUsers(list);
      } catch (e) {
        console.warn('Could not load CRM users in detail page:', e);
      }
    }
    loadCrmStaff();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user?.name && (reportedBy === 'Support' || reportedBy === 'Textellar Super Admin' || !reportedBy)) {
      setReportedBy(user.name);
    }
  }, [user]);
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [followUpHour, setFollowUpHour] = useState('10 AM');
  const [followUpMin, setFollowUpMin] = useState('00');
  const [followUpPriority, setFollowUpPriority] = useState('Medium');
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  // Manual Plan Upgrade State (matching operations console UI)
  const [upgradePlan, setUpgradePlan] = useState<string>('monthly');
  const [upgradeNote, setUpgradeNote] = useState<string>('');
  const [upgradeDurationMonths, setUpgradeDurationMonths] = useState<number>(1);
  const [upgradeBaseAmount, setUpgradeBaseAmount] = useState<number>(499);
  const [upgradeDiscountType, setUpgradeDiscountType] = useState<'None' | 'Percentage' | 'Flat'>('None');
  const [upgradeDiscountValue, setUpgradeDiscountValue] = useState<number>(0);
  const [upgradePaymentType, setUpgradePaymentType] = useState<string>('MANUAL');
  const [upgradePaymentStatus, setUpgradePaymentStatus] = useState<'Success' | 'Pending' | 'Failed'>('Success');
  const [upgradeStartDate, setUpgradeStartDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [upgradeEndDate, setUpgradeEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [isUpgradingPlan, setIsUpgradingPlan] = useState<boolean>(false);
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string>('');
  const [manualSubOverride, setManualSubOverride] = useState<any | null>(null);

  const handleUpgradePlanSelect = (selected: string) => {
    setUpgradePlan(selected);
    let months = 1;
    let base = 499;
    if (selected === 'monthly') {
      months = 1;
      base = 499;
    } else if (selected === '3_months') {
      months = 3;
      base = 2999;
    } else if (selected === 'quarterly') {
      months = 3;
      base = 1299;
    } else if (selected === '6_months') {
      months = 6;
      base = 2499;
    } else if (selected === '12_months') {
      months = 12;
      base = 5999;
    } else if (selected === 'free') {
      months = 0;
      base = 0;
    }
    setUpgradeDurationMonths(months);
    setUpgradeBaseAmount(base);

    const d = new Date(upgradeStartDate || Date.now());
    d.setMonth(d.getMonth() + months);
    setUpgradeEndDate(d.toISOString().slice(0, 10));
  };

  const handleDurationChange = (months: number) => {
    setUpgradeDurationMonths(months);
    const d = new Date(upgradeStartDate || Date.now());
    d.setMonth(d.getMonth() + months);
    setUpgradeEndDate(d.toISOString().slice(0, 10));
  };

  const handleStartDateChange = (startDateStr: string) => {
    setUpgradeStartDate(startDateStr);
    const d = new Date(startDateStr || Date.now());
    d.setMonth(d.getMonth() + upgradeDurationMonths);
    setUpgradeEndDate(d.toISOString().slice(0, 10));
  };

  const upgradeDiscountAmount = useMemo(() => {
    if (upgradeDiscountType === 'None') return 0;
    if (upgradeDiscountType === 'Percentage') {
      return Math.round((upgradeBaseAmount * upgradeDiscountValue) / 100);
    }
    if (upgradeDiscountType === 'Flat') {
      return Math.min(upgradeBaseAmount, upgradeDiscountValue);
    }
    return 0;
  }, [upgradeDiscountType, upgradeBaseAmount, upgradeDiscountValue]);

  const upgradeFinalAmount = Math.max(0, upgradeBaseAmount - upgradeDiscountAmount);

  // Handle Call Status Switch: Answered defaults to Positive + starts timer; No Answer / Not Reachable defaults to Negative + resets timer
  const handleSelectCallStatus = (status: 'Answered' | 'No Answer' | 'Not Reachable') => {
    setCallStatus(status);
    if (status === 'Answered') {
      setResponseSentiment('Positive');
      setTimerSeconds(0);
    } else {
      setResponseSentiment('Negative');
      setTimerSeconds(0);
    }
  };

  // Timer: count seconds ONLY when modal is open AND callStatus === 'Answered'
  useEffect(() => {
    let interval: any;
    if (isAddResponseOpen && callStatus === 'Answered') {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAddResponseOpen, callStatus]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Call Responses saved in persistent local storage and synced with database
  const storageKey = `counterpro_call_responses_${shop.id}`;
  const [callResponses, setCallResponses] = useState<CallResponse[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save call responses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(callResponses));
    } catch (e) {
      console.warn('Failed to save call responses to localStorage:', e);
    }
  }, [callResponses, storageKey]);

  // Load responses from persistent responses database API & Supabase audit_logs
  useEffect(() => {
    let isMounted = true;
    async function loadDbResponses() {
      try {
        const list = await fetchAllResponses(shop.id);
        if (isMounted && list && list.length > 0) {
          const mapped: CallResponse[] = list.map((r) => {
            const timerMatch = (r.notes || '').match(/Timer:\s*([0-9:]+)/i);
            const duration = r.timer_duration || (timerMatch ? timerMatch[1] : undefined);
            return {
              id: r.id,
              date: r.created_at,
              type: r.response_type || 'Answered',
              outcome: r.outcome || 'Positive',
              contactPerson: r.employee_name || 'Admin Team',
              notes: r.notes || '',
              customerFeedback: r.customer_feedback,
              leadSource: r.lead_source,
              demoStatus: r.demo_status,
              serviceType: r.service_type,
              followUpDate: r.follow_up_date,
              recordedBy: r.employee_name || 'Admin Team',
              duration,
              priority: r.follow_up_priority,
            };
          });
          setCallResponses(mapped);
        }
      } catch (e) {
        console.warn('Error loading db responses:', e);
      }
    }
    loadDbResponses();
    return () => {
      isMounted = false;
    };
  }, [shop.id]);

  // Match owner profile
  const ownerProfile = useMemo(() => {
    if (shop.owner_profile_id) {
      const p = profiles.find((prof) => prof.id === shop.owner_profile_id);
      if (p) return p;
    }
    const cleanShopPhone = (shop.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanShopPhone) {
      const p = profiles.find((prof) => (prof.phone || '').replace(/\D/g, '').slice(-10) === cleanShopPhone);
      if (p) return p;
    }
    return null;
  }, [shop, profiles]);

  // Associated staff for this shop
  const salonStaff = useMemo(() => {
    return staff.filter((s) => s.shop_id === shop.id);
  }, [staff, shop.id]);

  // Associated bills for this shop
  const salonBills = useMemo(() => {
    return bills.filter((b) => b.shop_id === shop.id);
  }, [bills, shop.id]);

  // Associated appointments for this shop
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.shop_id === shop.id);
  }, [appointments, shop.id]);

  // Associated customers for this shop
  const salonCustomers = useMemo(() => {
    const list = customers.filter((c) => c.shop_id === shop.id);
    if (list.length > 0) return list;
    // Fallback: Extract from bills
    const uniqueFromBills = new Set<string>();
    salonBills.forEach((b) => {
      const name = b.customer?.name || (b as any).customer_name;
      if (name) uniqueFromBills.add(name);
    });
    return Array.from(uniqueFromBills).map((name, i) => ({
      id: `c-bill-${i}`,
      shop_id: shop.id,
      name,
      phone: '—',
      notes: null,
      preferred_staff_id: null,
      is_starred: false,
      created_at: shop.created_at,
      updated_at: shop.created_at,
    }));
  }, [customers, shop.id, salonBills, shop.created_at]);

  // Total revenue calculated strictly from bills
  const totalRevenue = useMemo(() => {
    return salonBills.reduce((acc, b) => {
      if (b.status !== 'deleted' && b.status !== 'cancelled') {
        return acc + (b.total_minor || 0);
      }
      return acc;
    }, 0);
  }, [salonBills]);

  // Order breakdown metrics
  const pendingOrdersCount = useMemo(() => {
    return salonBills.filter((b) => b.status === 'pending' || b.status === 'draft').length;
  }, [salonBills]);

  const completedOrdersCount = useMemo(() => {
    return salonBills.filter((b) => b.status === 'completed' || b.status === 'paid').length;
  }, [salonBills]);

  const cancelledOrdersCount = useMemo(() => {
    return salonBills.filter((b) => b.status === 'cancelled' || b.status === 'deleted').length;
  }, [salonBills]);

  // Days active calculation
  const daysActive = useMemo(() => {
    if (!shop.created_at) return 1;
    const createdTime = new Date(shop.created_at).getTime();
    if (isNaN(createdTime)) return 1;
    const diffDays = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [shop.created_at]);

  // Free quota metrics
  const freeSalesLimit = shop.free_sales_limit || 100;
  const freeOrdersUsed = salonBills.length;
  const freeOrdersRemaining = Math.max(0, freeSalesLimit - freeOrdersUsed);
  const freeOrdersPercent = Math.min(100, Math.round((freeOrdersUsed / freeSalesLimit) * 100));

  const {
    isSubscriber,
    planExpiry,
    paymentStatus,
    planLabel,
    subscribedDateText,
    subscriptionAmountText,
    activeSubRecord,
  } = useMemo(() => {
    // 0. Priority: check manualSubOverride for instant reactive updates
    if (manualSubOverride) {
      const isAct = manualSubOverride.status === 'active' && manualSubOverride.plan_id !== 'free';
      const startD = manualSubOverride.subscription_start_date ? formatDate(manualSubOverride.subscription_start_date) : 'Today';
      const endD = isAct ? formatDate(manualSubOverride.subscription_end_date) : 'N/A (Free Quota)';
      const amt = `₹${(manualSubOverride.amount_minor || 0).toLocaleString('en-IN')}`;
      const pName = manualSubOverride.plan_name || (isAct ? 'Pro Plan' : 'Free Plan (100 Quota)');
      return {
        isSubscriber: isAct,
        planExpiry: endD,
        paymentStatus: isAct ? 'Paid (Active Pro)' : 'Free Tier (Unpaid)',
        planLabel: pName,
        subscribedDateText: isAct ? startD : 'Not Subscribed',
        subscriptionAmountText: amt,
        activeSubRecord: manualSubOverride,
      };
    }

    // 1. Check subscriptions table for a REAL active paid Pro record
    const rawSub = subscriptions.find((s: any) => s.shop_id === shop.id);

    // Strictly check if the shop has a real paid Pro subscription
    const hasRealPaidPro = Boolean(
      rawSub &&
      (rawSub.status === 'active' || rawSub.status === 'paid') &&
      (rawSub.plan || '').toLowerCase() !== 'free' &&
      ((rawSub.plan || '').toLowerCase().includes('pro') || Number(rawSub.amount || rawSub.amount_minor || 0) > 0)
    );

    let expiryText = 'Quota Based (100 Bills)';
    let subDateText = 'Not Subscribed';
    let amtText = '₹0';
    let pLabel = 'Free Plan (100 Quota)';
    let payStatus = 'Free Tier (Unpaid)';

    if (hasRealPaidPro && rawSub) {
      pLabel = rawSub.plan_name || (rawSub.plan === 'pro' ? 'Pro Plan' : `Plan: ${rawSub.plan}`);
      payStatus = 'Paid (Active Pro)';

      if (rawSub.subscription_end_date || rawSub.current_period_end || rawSub.expires_at) {
        const rawEnd = rawSub.subscription_end_date || rawSub.current_period_end || rawSub.expires_at;
        expiryText = new Date(rawEnd).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      } else {
        expiryText = 'Active (Auto-Renews)';
      }

      if (rawSub.subscription_start_date || rawSub.current_period_start || rawSub.created_at) {
        const rawStart = rawSub.subscription_start_date || rawSub.current_period_start || rawSub.created_at;
        subDateText = new Date(rawStart).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }

      const rawAmount = typeof rawSub.amount_minor === 'number' && rawSub.amount_minor > 0
        ? (rawSub.amount_minor >= 10000 ? Math.round(rawSub.amount_minor / 100) : rawSub.amount_minor)
        : (typeof rawSub.amount === 'number' && rawSub.amount > 0 ? rawSub.amount : 0);
      amtText = `₹${rawAmount.toLocaleString('en-IN')}`;
    }

    return {
      isSubscriber: hasRealPaidPro,
      planExpiry: expiryText,
      paymentStatus: payStatus,
      planLabel: pLabel,
      subscribedDateText: subDateText,
      subscriptionAmountText: amtText,
      activeSubRecord: rawSub || null,
    };
  }, [shop, subscriptions, manualSubOverride]);

  // Last Login / Activity Time
  const lastLoginFormatted = useMemo(() => {
    const dates: number[] = [];
    if (ownerProfile?.updated_at) dates.push(new Date(ownerProfile.updated_at).getTime());
    if (shop.updated_at) dates.push(new Date(shop.updated_at).getTime());
    if (salonBills[0]?.issued_at) dates.push(new Date(salonBills[0].issued_at).getTime());
    if (salonAppointments[0]?.starts_at) dates.push(new Date(salonAppointments[0].starts_at).getTime());

    if (dates.length === 0) {
      return shop.created_at
        ? new Date(shop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Recently active';
    }

    const validDates = dates.filter((d) => !isNaN(d));
    if (validDates.length === 0) return 'Recently active';

    const latest = new Date(Math.max(...validDates));
    return latest.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [ownerProfile, shop, salonBills, salonAppointments]);

  // Fetch real products catalog configured for this shop
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      setProductsLoading(true);
      try {
        const foundProducts: Array<{ id: string; name: string; price_minor: number; category: string; is_active: boolean }> = [];

        // 1. Check services table
        const { data: srvData } = await supabase
          .from('services')
          .select('id, name, price_minor, category_id, is_active')
          .eq('shop_id', shop.id);
        if (srvData && srvData.length > 0) {
          srvData.forEach((s) => {
            foundProducts.push({
              id: s.id,
              name: s.name,
              price_minor: s.price_minor || 0,
              category: 'Catalog Item',
              is_active: s.is_active ?? true,
            });
          });
        }

        // 2. Extract unique products from bill_items
        const shopBillIds = salonBills.map((b) => b.id);
        if (shopBillIds.length > 0) {
          const { data: itemData } = await supabase
            .from('bill_items')
            .select('id, item_name, name, unit_price, price, quantity')
            .in('bill_id', shopBillIds.slice(0, 50));
          if (itemData && itemData.length > 0) {
            const seen = new Set(foundProducts.map((p) => p.name.toLowerCase()));
            itemData.forEach((it: any) => {
              const itemName = it.item_name || it.name;
              if (itemName && !seen.has(itemName.toLowerCase())) {
                seen.add(itemName.toLowerCase());
                const price = it.unit_price || it.price || 0;
                foundProducts.push({
                  id: it.id || `item-${Date.now()}-${Math.random()}`,
                  name: itemName,
                  price_minor: price > 1000 ? price : price * 100,
                  category: 'Retail Product',
                  is_active: true,
                });
              }
            });
          }
        }

        if (isMounted) {
          setProducts(foundProducts);
        }
      } catch (err) {
        console.warn('Error fetching products for shop:', err);
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [shop.id, salonBills]);

  // Friendly date formatter
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Handle Saving New Call Response / Notes
  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSavingResponse(true);
    const durationStr = callStatus === 'Answered' && timerSeconds > 0 ? formatTimer(timerSeconds) : undefined;
    const followUpCombined = scheduleFollowUp && followUpDate
      ? `${followUpDate}${followUpHour ? ` ${followUpHour}` : ''}${followUpMin ? `:${followUpMin}` : ''} [${followUpPriority}]`.trim()
      : undefined;

    // Database safe follow-up date (strictly YYYY-MM-DD or null for PostgreSQL DATE type)
    const dbFollowUpDate = scheduleFollowUp && followUpDate ? followUpDate.slice(0, 10) : null;

    const currentEmployeeName = reportedBy.trim() || user?.name || user?.email || 'Support';
    const currentEmployeeEmail = user?.email || '';

    // Rich notes capturing call details, employee, email, timer, customer feedback, and follow-up
    const notesParts: string[] = [];
    if (callStatus === 'Answered') {
      notesParts.push(`[${responseSentiment.toUpperCase()}]`);
      notesParts.push(`Employee: ${currentEmployeeName}`);
      if (currentEmployeeEmail) notesParts.push(`Email: ${currentEmployeeEmail}`);
      if (leadSource) notesParts.push(`Source: ${leadSource}`);
      if (demoStatus) notesParts.push(`Demo: ${demoStatus}`);
      if (serviceType) notesParts.push(`Service: ${serviceType}`);
      if (customerFeedback.trim()) notesParts.push(`Feedback: "${customerFeedback.trim()}"`);
    } else {
      notesParts.push(`[NEGATIVE - ${callStatus.toUpperCase()}]`);
      notesParts.push(`Employee: ${currentEmployeeName}`);
      if (currentEmployeeEmail) notesParts.push(`Email: ${currentEmployeeEmail}`);
    }

    if (responseNotes.trim()) {
      notesParts.push(`Notes: ${responseNotes.trim()}`);
    }
    if (durationStr) {
      notesParts.push(`Timer: ${durationStr}`);
    }
    if (scheduleFollowUp && followUpDate) {
      notesParts.push(`Follow-up: ${followUpDate}${followUpHour ? ` ${followUpHour}` : ''}${followUpMin ? `:${followUpMin}` : ''} [${followUpPriority}]`);
    }
    const combinedNotes = notesParts.join(' | ');

    const newEntry: CallResponse = {
      id: `resp-${Date.now()}`,
      date: responseDate,
      type: callStatus,
      outcome: responseSentiment,
      contactPerson: currentEmployeeName,
      notes: combinedNotes,
      customerFeedback: customerFeedback.trim() || undefined,
      leadSource: leadSource || undefined,
      demoStatus: demoStatus || undefined,
      serviceType: serviceType || undefined,
      followUpDate: followUpCombined,
      recordedBy: currentEmployeeName,
      duration: durationStr,
      priority: followUpPriority,
    };

    try {
      // Primary write to persistent response API database and Supabase audit_logs
      const saved = await createResponse({
        shop_id: shop.id,
        shop_name: shop.name,
        employee_name: currentEmployeeName,
        employee_email: currentEmployeeEmail,
        response_type: callStatus,
        outcome: responseSentiment,
        sentiment: responseSentiment,
        notes: combinedNotes,
        customer_feedback: customerFeedback.trim() || undefined,
        service_type: serviceType || undefined,
        lead_source: leadSource || undefined,
        demo_status: demoStatus || undefined,
        timer_duration: durationStr,
        follow_up_date: scheduleFollowUp && followUpDate ? followUpDate : undefined,
        follow_up_priority: followUpPriority,
      });

      if (saved?.id) {
        newEntry.id = saved.id;
      }
    } catch (err) {
      console.warn('Response API save warning:', err);
    }

    setCallResponses((prev) => [newEntry, ...prev]);

    // Dispatch event for real-time UI synchronization across Overview & Customer Tracking
    try {
      window.dispatchEvent(new CustomEvent('counterpro_call_response_added', { detail: newEntry }));
    } catch (e) {
      console.warn('Event dispatch error:', e);
    }

    setIsSavingResponse(false);
    setIsAddResponseOpen(false);
    setResponseNotes('');
    setCustomerFeedback('');
    setLeadSource('');
    setTimerSeconds(0);
  };

  // Delete Call Response
  const handleDeleteResponse = async (id: string) => {
    try {
      await deleteResponseById(id);
    } catch (err) {
      console.warn('Error deleting response from DB:', err);
    }
    setCallResponses((prev) => prev.filter((r) => r.id !== id));
  };

  // Manual Plan Upgrade Action
  const handleExecuteUpgradePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpgradingPlan(true);
    setUpgradeSuccessMsg('');

    try {
      const isFree = upgradePlan === 'free';
      const planLabelMap: Record<string, string> = {
        monthly: 'Monthly',
        '3_months': 'Pro 3M',
        quarterly: 'Quarterly',
        '6_months': 'Half Yearly',
        '12_months': 'Annual (1 Year)',
        free: 'Free Plan',
      };
      const planName = planLabelMap[upgradePlan] || upgradePlan;

      const subData = {
        shop_id: shop.id,
        plan_id: upgradePlan,
        plan_name: planName,
        status: isFree ? 'expired' : upgradePaymentStatus === 'Success' ? 'active' : 'pending',
        subscription_start_date: new Date(upgradeStartDate).toISOString(),
        subscription_end_date: isFree ? new Date().toISOString() : new Date(upgradeEndDate).toISOString(),
        amount_minor: upgradeFinalAmount,
        currency: 'INR',
        cashfree_order_id: `manual-admin-${upgradePaymentType.toLowerCase()}`,
        discount_type: upgradeDiscountType,
        discount_value: upgradeDiscountValue,
        discount_amount: upgradeDiscountAmount,
        base_amount: upgradeBaseAmount,
        payment_type: upgradePaymentType,
        payment_status: upgradePaymentStatus,
        note: upgradeNote.trim() || undefined,
      };

      const res = await saveManualSubscription(subData);

      if (res.success) {
        setManualSubOverride(subData);
        setUpgradeSuccessMsg(`✓ Successfully upgraded to ${planName}!`);
        if (onRefresh) onRefresh();
        setTimeout(() => setUpgradeSuccessMsg(''), 6000);
      } else {
        alert(res.error || 'Failed to update subscription');
      }
    } catch (err: any) {
      console.error('Error during manual plan upgrade:', err);
      alert(err.message || 'Error updating subscription');
    } finally {
      setIsUpgradingPlan(false);
    }
  };

  // Report Builder: Generates Comprehensive Salon CSV
  const handleGenerateReport = () => {
    const lines: string[] = [];
    lines.push(`"STYLEFLEET SALON ACTIVITY LOGS & REPORT"`);
    lines.push(`"Report Generated","${new Date().toLocaleString('en-IN')}"`);
    lines.push('');
    lines.push(`"SALON INFORMATION"`);
    lines.push(`"Salon Name","${shop.name}"`);
    lines.push(`"City","${shop.city || 'Tamil Nadu'}"`);
    lines.push(`"Phone","${shop.phone || '—'}"`);
    lines.push(`"Owner Name","${ownerProfile?.full_name || shop.name}"`);
    lines.push(`"Owner Phone","${ownerProfile?.phone || shop.phone || '—'}"`);
    lines.push(`"GSTIN","${shop.gstin || 'None'}"`);
    lines.push(`"Registered Date","${formatDate(shop.created_at)}"`);
    lines.push(`"Days Active","${daysActive} days"`);
    lines.push(`"Current Plan","${planLabel}"`);
    lines.push(`"Plan Expiry","${planExpiry}"`);
    lines.push(`"Payment Status","${paymentStatus}"`);
    lines.push(`"Last Activity","${lastLoginFormatted}"`);
    lines.push('');
    lines.push(`"PERFORMANCE METRICS"`);
    lines.push(`"Total Revenue (INR)","₹${Math.round(totalRevenue / 100).toLocaleString('en-IN')}"`);
    lines.push(`"Total Customers","${salonCustomers.length}"`);
    lines.push(`"Total Orders","${salonBills.length}"`);
    lines.push(`"Completed Orders","${completedOrdersCount}"`);
    lines.push(`"Pending Orders","${pendingOrdersCount}"`);
    lines.push(`"Cancelled Orders","${cancelledOrdersCount}"`);
    lines.push(`"Free Quota Used","${freeOrdersUsed} / ${freeSalesLimit}"`);
    lines.push(`"Free Quota Remaining","${freeOrdersRemaining}"`);
    lines.push('');

    // Call responses
    if (callResponses.length > 0) {
      lines.push(`"CALL RESPONSES & ADMIN NOTES"`);
      lines.push(`"Date","Type","Outcome","Contact Person","Notes","Follow-Up Date"`);
      callResponses.forEach((cr) => {
        lines.push(
          `"${cr.date}","${cr.type}","${cr.outcome}","${cr.contactPerson}","${cr.notes.replace(/"/g, '""')}","${cr.followUpDate || '—'}"`
        );
      });
      lines.push('');
    }

    // Bills & orders
    lines.push(`"ORDERS & INVOICES"`);
    lines.push(`"Invoice #","Date","Customer","Amount (INR)","Status"`);
    salonBills.forEach((b) => {
      lines.push(
        `"${b.invoice_number}","${formatDate(b.issued_at || b.created_at)}","${b.customer?.name || 'Walk-in'}","₹${(((b.total_minor ?? 0)) / 100).toFixed(2)}","${b.status}"`
      );
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const cleanName = (shop.name || 'salon').replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `counterpro_${cleanName}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans text-black pb-16">
      {/* 1. TOP NAVIGATION & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D4621A]/15 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#D4621A] hover:bg-[#bf5312] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to List</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Response Button */}
          <button
            onClick={() => setIsAddResponseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4621A] hover:bg-[#bf5312] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-white" />
            <span>Add Response</span>
          </button>

          {/* Report Builder Button */}
          <button
            onClick={handleGenerateReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4621A]/30 bg-[#F8F3F0] hover:bg-[#D4621A]/10 text-black text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Report Builder</span>
          </button>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4621A]/30 bg-[#F8F3F0] hover:bg-[#D4621A]/10 text-black text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4621A]" />
              <span>Refresh</span>
            </button>
          )}

          <span className="text-xs font-mono text-black/70 bg-[#F8F3F0] px-2.5 py-1 rounded border border-[#D4621A]/20">
            ID: {shop.id.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* 2. SALON PROFILE HERO BANNER */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4621A] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {shop.name ? shop.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-black tracking-tight">{shop.name}</h1>
                  {isSubscriber ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4621A] text-white border border-[#D4621A]">
                      ★ Pro Subscriber
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4621A]/10 text-black border border-[#D4621A]/30">
                      Free Plan
                    </span>
                  )}
                  {callResponses.length > 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border font-mono shadow-2xs ${
                        callResponses[0].outcome === 'Positive'
                          ? 'bg-[#D4621A] text-white border-[#D4621A]'
                          : 'bg-[#F8F3F0] text-black border-[#D4621A]/30'
                      }`}
                    >
                      {callResponses[0].outcome === 'Positive' ? 'Positive' : 'Negative'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-black/70 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#D4621A]" />
                    {shop.city || 'Tamil Nadu'}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-black">
                    <Phone className="w-3.5 h-3.5 text-[#D4621A]" />
                    {shop.phone || 'No phone'}
                  </span>
                  <span>•</span>
                  <span className="text-black/60 font-mono">
                    Owner: <strong>{ownerProfile?.full_name || shop.name}</strong>
                  </span>
                  <span>•</span>
                  {/* Platform: Android */}
                  <span className="inline-flex items-center gap-1 font-bold text-black bg-white px-2.5 py-0.5 rounded-full border border-[#D4621A]/20">
                    <svg className="w-3.5 h-3.5 text-[#D4621A] fill-current" viewBox="0 0 24 24">
                      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
                    </svg>
                    <span>Android</span>
                  </span>
                  <span>•</span>
                  {/* Last Active Date */}
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-black bg-white px-2.5 py-0.5 rounded-full border border-[#D4621A]/20">
                    <Clock className="w-3.5 h-3.5 text-[#D4621A]" />
                    <span>Last Active: {lastLoginFormatted}</span>
                  </span>
                </div>
              </div>
            </div>

            {shop.address && (
              <p className="text-xs text-black/80 pt-1">
                <span className="font-semibold text-black">Address: </span>
                {shop.address}
                {shop.pin_code ? ` - ${shop.pin_code}` : ''}
              </p>
            )}
          </div>

          {/* Quick Plan & GST Pill */}
          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4621A] text-white text-xs font-bold font-mono shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{isSubscriber ? `MANUAL PLAN: ${planLabel.toUpperCase()}` : 'PLAN: FREE (100 LIMIT)'}</span>
            </div>
            {callResponses.length > 0 && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border shadow-2xs ${
                  callResponses[0].outcome === 'Positive'
                    ? 'bg-[#D4621A] text-white border-[#D4621A]'
                    : 'bg-[#F8F3F0] text-black border-[#D4621A]/30'
                }`}
              >
                <span>{callResponses[0].outcome === 'Positive' ? 'Positive Customer' : 'Negative Customer'}</span>
              </div>
            )}
            <span className="text-[11px] font-mono text-black/70">
              GST: {shop.gstin ? shop.gstin : 'Not Registered'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. COMPREHENSIVE PERFORMANCE & ACCOUNT METRICS (ALL USER-REQUESTED FIELDS) */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D4621A]/15">
          <h2 className="text-xs font-bold text-[#D4621A] uppercase font-mono tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#D4621A]" />
            <span>Account Status & Operational Metrics</span>
          </h2>
          <span className="text-[11px] font-mono text-black/60">Real-Time Data Verified</span>
        </div>

        {/* 12-Card Metrics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* 1. Registered Date */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Registered Date</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{formatDate(shop.created_at)}</div>
          </div>

          {/* 2. Days Active */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Days Active</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{daysActive} days active</div>
          </div>

          {/* 3. Current Plan */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Current Plan</div>
            <div className="text-sm font-black text-black mt-1 font-mono">
              {isSubscriber ? planLabel : 'Free Trial'}
            </div>
            {isSubscriber && subscriptionAmountText !== '₹0' && (
              <div className="text-[11px] text-[#D4621A] font-bold font-mono mt-0.5">
                Amount: {subscriptionAmountText}
              </div>
            )}
          </div>

          {/* 4. Plan Expiry */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">
              {isSubscriber ? `Plan Expiry (Subscribed: ${subscribedDateText})` : 'Plan Expiry'}
            </div>
            <div className="text-sm font-black text-black mt-1 font-mono">{planExpiry}</div>
          </div>

          {/* 5. Payment Status */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Payment Status</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{paymentStatus}</div>
          </div>

          {/* 6. Total Revenue */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Total Revenue</div>
            <div className="text-sm font-black text-black mt-1 font-mono">
              ₹{Math.round(totalRevenue / 100).toLocaleString('en-IN')}
            </div>
          </div>

          {/* 7. Total Customers */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Total Customers</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{salonCustomers.length} clients</div>
          </div>

          {/* 8. Total Orders */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Total Orders</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{salonBills.length} orders</div>
          </div>

          {/* 9. Completed Orders */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Completed Orders</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{completedOrdersCount}</div>
          </div>

          {/* 10. Pending Orders */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Pending Orders</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{pendingOrdersCount}</div>
          </div>

          {/* 11. Cancelled Orders */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Cancelled Orders</div>
            <div className="text-sm font-black text-black mt-1 font-mono">{cancelledOrdersCount}</div>
          </div>

          {/* 12. Last Login */}
          <div className="bg-[#F8F3F0] rounded-xl p-3 border border-[#D4621A]/15">
            <div className="text-[10px] font-bold text-black/60 uppercase font-mono">Last Login / Active</div>
            <div className="text-xs font-black text-black mt-1 font-mono truncate">{lastLoginFormatted}</div>
          </div>
        </div>

        {/* Free Orders Quota Progress Bar */}
        <div className="pt-3 border-t border-[#D4621A]/15">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-black mb-1.5">
            <span>Free Orders Quota Status:</span>
            <span>
              {freeOrdersUsed} / {freeSalesLimit} Used ({freeOrdersRemaining} Orders Left)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full bg-[#D4621A] transition-all" style={{ width: `${freeOrdersPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 4. DOWN BY DOWN SECTIONS (NO SIDE-BY-SIDE) */}

      {/* SECTION 1: OWNER AND BUSINESS INFO */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D4621A]/15">
          <h3 className="text-xs font-bold text-[#D4621A] uppercase font-mono tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[#D4621A]" />
            <span>Owner and Business Information</span>
          </h3>
          <span className="text-[11px] font-mono text-black/60">Verified Credentials</span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Owner Full Name</span>
              <span className="text-sm font-bold text-black mt-0.5 block">
                {ownerProfile?.full_name || shop.name}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Owner Phone</span>
              <span className="text-sm font-mono font-bold text-black mt-0.5 block">
                {ownerProfile?.phone || shop.phone || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Owner Profile ID</span>
              <span className="text-xs font-mono text-black/80 bg-black/5 px-2 py-1 rounded inline-block mt-0.5">
                {shop.owner_profile_id || ownerProfile?.id || '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Profile Registration</span>
              <span className="text-xs font-mono text-black mt-0.5 block">
                {formatDate(ownerProfile?.created_at || shop.created_at)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D4621A]/15 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">GSTIN Number</span>
              <span className="text-sm font-mono font-bold text-black mt-0.5 block">
                {shop.gstin || 'None Registered'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">GST Rate</span>
              <span className="text-sm font-mono font-bold text-black mt-0.5 block">
                {shop.gst_rate !== undefined ? `${shop.gst_rate}%` : '0%'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Invoice Prefix</span>
              <span className="text-sm font-mono font-bold text-[#D4621A] mt-0.5 block">
                {shop.invoice_prefix || 'INV'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Brand Theme Accent</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: shop.accent_color || '#D4621A' }}
                />
                <span className="font-mono text-xs font-bold text-black">
                  {shop.accent_color || '#D4621A'}
                </span>
              </div>
            </div>
          </div>

          {shop.address && (
            <div className="pt-3 border-t border-[#D4621A]/15">
              <span className="text-[10px] font-bold text-black/60 uppercase block font-mono">Full Physical Address</span>
              <span className="text-xs text-black font-medium mt-0.5 block">
                {shop.address}
                {shop.city ? `, ${shop.city}` : ''}
                {shop.pin_code ? ` - ${shop.pin_code}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SUBSCRIPTION & MANUAL PLAN UPGRADE (ABOVE CALL RESPONSES) */}
      <div id="manual-plan-upgrade-section" className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 p-5 shadow-2xs space-y-5 transition-all">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D4621A]/15">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4621A] block font-mono">
              ADMIN BILLING
            </span>
            <h3 className="text-base sm:text-lg font-bold text-black tracking-tight mt-0.5">
              Manual plan upgrade
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              Grant Pro or move back to Free without Razorpay Autopay. Admin only.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#D4621A]/10 text-[#D4621A] border border-[#D4621A]/30 font-medium">
              Current: {isSubscriber ? (planLabel.replace(/\(.*?\)/g, '').trim() || 'Monthly') : 'Free Plan'}
            </span>
            <span className="text-xs font-semibold text-neutral-600">
              {isSubscriber ? 'Subscribed' : 'Free Tier'}
            </span>
          </div>
        </div>

        {/* Upgrade Form */}
        <form onSubmit={handleExecuteUpgradePlan} className="space-y-4">
          {upgradeSuccessMsg && (
            <div className="p-3 rounded-lg bg-[#D4621A] text-white text-xs font-semibold flex items-center justify-between shadow-xs">
              <span>{upgradeSuccessMsg}</span>
              <button
                type="button"
                onClick={() => setUpgradeSuccessMsg('')}
                className="text-white/80 hover:text-white font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Row 1: Plan, Note, Duration, Base Amount, Discount Type, Discount Value, Discount Amount, Final Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
            {/* PLAN */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                PLAN
              </label>
              <select
                value={upgradePlan}
                onChange={(e) => handleUpgradePlanSelect(e.target.value)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] cursor-pointer"
              >
                <option value="monthly">Monthly (1 month) - ₹499</option>
                <option value="3_months">Pro 3M (3 months) - ₹2999</option>
                <option value="quarterly">Quarterly (3 months) - ₹1299</option>
                <option value="6_months">Half Yearly (6 months) - ₹2499</option>
                <option value="12_months">Annual (12 months) - ₹5999</option>
                <option value="free">Free (Move back to Free) - ₹0</option>
              </select>
            </div>

            {/* NOTE (OPTIONAL) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                NOTE (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="Paid offline / goodwill / promo"
                value={upgradeNote}
                onChange={(e) => setUpgradeNote(e.target.value)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A]"
              />
            </div>

            {/* DURATION (MONTHS) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                DURATION (MONTHS)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={upgradeDurationMonths}
                onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || 0)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] font-mono"
              />
            </div>

            {/* BASE AMOUNT */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                BASE AMOUNT
              </label>
              <input
                type="number"
                min="0"
                value={upgradeBaseAmount}
                onChange={(e) => setUpgradeBaseAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] font-mono"
              />
            </div>

            {/* DISCOUNT TYPE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                DISCOUNT TYPE
              </label>
              <select
                value={upgradeDiscountType}
                onChange={(e) => setUpgradeDiscountType(e.target.value as any)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] cursor-pointer"
              >
                <option value="None">None</option>
                <option value="Percentage">Percentage (%)</option>
                <option value="Flat">Flat (₹)</option>
              </select>
            </div>

            {/* DISCOUNT VALUE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                DISCOUNT VALUE
              </label>
              <input
                type="number"
                min="0"
                value={upgradeDiscountValue}
                onChange={(e) => setUpgradeDiscountValue(parseInt(e.target.value, 10) || 0)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] font-mono"
              />
            </div>

            {/* DISCOUNT AMOUNT */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                DISCOUNT AMOUNT
              </label>
              <div className="w-full py-1.5 px-2 text-xs bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-md font-mono font-medium">
                ₹{upgradeDiscountAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* FINAL AMOUNT */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                FINAL AMOUNT
              </label>
              <div className="w-full py-1.5 px-2 text-xs bg-neutral-100 text-[#D4621A] border border-neutral-300 rounded-md font-mono font-bold">
                ₹{upgradeFinalAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Row 2: Payment Type, Payment Status, Subscription Start, Subscription End, Upgrade Plan Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end pt-1">
            {/* PAYMENT TYPE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                PAYMENT TYPE
              </label>
              <select
                value={upgradePaymentType}
                onChange={(e) => setUpgradePaymentType(e.target.value)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] cursor-pointer font-medium"
              >
                <option value="MANUAL">MANUAL</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            {/* PAYMENT STATUS */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                PAYMENT STATUS
              </label>
              <select
                value={upgradePaymentStatus}
                onChange={(e) => setUpgradePaymentStatus(e.target.value as any)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] cursor-pointer font-medium"
              >
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            {/* SUBSCRIPTION START */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                SUBSCRIPTION START
              </label>
              <input
                type="date"
                value={upgradeStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] font-mono cursor-pointer"
              />
            </div>

            {/* SUBSCRIPTION END */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 block font-mono">
                SUBSCRIPTION END
              </label>
              <input
                type="date"
                value={upgradeEndDate}
                onChange={(e) => setUpgradeEndDate(e.target.value)}
                className="w-full py-1.5 px-2 text-xs bg-white text-black border border-neutral-300 rounded-md focus:outline-none focus:border-[#D4621A] font-mono cursor-pointer"
              />
            </div>

            {/* UPGRADE PLAN BUTTON */}
            <div>
              <button
                type="submit"
                disabled={isUpgradingPlan}
                className="w-full py-2 px-4 rounded-md text-xs font-bold text-white bg-[#D4621A] hover:bg-[#bf5312] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isUpgradingPlan ? 'Updating plan...' : 'Upgrade plan'}
              </button>
            </div>
          </div>
        </form>

        {/* Current Subscription Snapshot (Matching operations console footer) */}
        <div className="pt-4 border-t border-[#D4621A]/15 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
            <h4 className="text-xs font-bold text-black tracking-tight">
              Current subscription
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500 hidden sm:inline">
                Plan entitlement and latest billing snapshot for this shop.
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('manual-plan-upgrade-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    el.classList.add('ring-2', 'ring-[#EA580C]');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-[#EA580C]'), 2500);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                ✏️ <span>Edit Subscription</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs bg-white p-3 rounded-xl border border-[#D4621A]/15 shadow-2xs">
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Status</span>
              <div className="font-bold text-black mt-0.5">{isSubscriber ? 'Paid (prepaid)' : 'Free Tier (100 Quota)'}</div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Plan</span>
              <div className="font-bold text-black mt-0.5">{isSubscriber ? (planLabel.replace(/\(.*?\)/g, '').trim() || 'Monthly') : 'Free Plan'}</div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Base amount</span>
              <div className="font-bold text-black mt-0.5 font-mono">{subscriptionAmountText}</div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Discount</span>
              <div className="font-bold text-black mt-0.5">
                {activeSubRecord?.discount_type && activeSubRecord?.discount_type !== 'None'
                  ? `${activeSubRecord.discount_type}`
                  : 'None'}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Final amount</span>
              <div className="font-bold text-[#D4621A] mt-0.5 font-mono font-extrabold">{subscriptionAmountText}</div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Start date</span>
              <div className="font-bold text-black mt-0.5 font-mono">{subscribedDateText}</div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">End date</span>
              <div className="font-bold text-black mt-0.5 font-mono">{planExpiry}</div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Payment type</span>
              <div className="font-bold text-black mt-0.5 font-mono">{activeSubRecord?.payment_type || 'MANUAL'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CALL RESPONSES & ADMIN NOTES */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D4621A]/15">
          <button
            type="button"
            onClick={() => setIsResponsesOpen((prev) => !prev)}
            className="flex items-center gap-2 text-left cursor-pointer group select-none"
          >
            <PhoneCall className="w-4 h-4 text-[#D4621A]" />
            <h3 className="text-xs font-bold text-[#D4621A] uppercase font-mono tracking-wider group-hover:underline">
              Call Responses & Admin Notes ({callResponses.length})
            </h3>
            <ChevronDown
              className={`w-4 h-4 text-[#D4621A] transition-transform duration-200 ${
                isResponsesOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <button
            onClick={() => setIsAddResponseOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-[#D4621A] hover:bg-[#bf5312] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Response</span>
          </button>
        </div>

        {isResponsesOpen && (
          callResponses.length === 0 ? (
            <div className="py-8 text-center bg-[#F8F3F0] rounded-xl border border-dashed border-[#D4621A]/25 p-4">
              <MessageSquare className="w-8 h-8 text-[#D4621A]/40 mx-auto mb-2" />
              <p className="text-xs text-black/70 font-medium">No calls or responses logged yet for this shop.</p>
              <p className="text-[11px] text-black/50 mt-0.5">
                Click <strong>&ldquo;+ Add Response&rdquo;</strong> to record a call note with employee name, outcome, and follow-up.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {callResponses.map((cr) => (
                <div
                  key={cr.id}
                  className="bg-[#F8F3F0] rounded-xl p-4 border border-[#D4621A]/20 hover:border-[#D4621A]/40 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D4621A]/10 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                          cr.outcome === 'Positive'
                            ? 'bg-[#D4621A] text-white border border-[#D4621A]'
                            : 'bg-[#F8F3F0] text-black border border-[#D4621A]/30'
                        }`}
                      >
                        {cr.outcome || (cr.type === 'Answered' ? 'Positive' : 'Negative')}
                      </span>
                      <span className="text-xs font-bold text-black font-mono">
                        Call {cr.type} • {cr.contactPerson}
                      </span>
                      <span className="text-[11px] font-mono text-black font-bold bg-[#FFEDD5] px-2 py-0.5 rounded border border-[#D4621A]/30">
                        👤 Employee: {cr.recordedBy || 'Admin'}
                      </span>
                      {cr.duration && (
                        <span className="text-[10px] font-mono text-[#D4621A] bg-white px-2 py-0.5 rounded-md border border-[#D4621A]/20 font-semibold">
                          ⏱ {cr.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] font-mono text-black/70 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#D4621A]" />
                        <span>{cr.date.replace('T', ' ')}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteResponse(cr.id)}
                        className="text-black/40 hover:text-black p-1 transition-colors cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-black/90 leading-relaxed whitespace-pre-wrap">{cr.notes}</p>

                  {cr.followUpDate && (
                    <div className="text-[11px] font-mono text-[#D4621A] font-semibold pt-1">
                      Scheduled Follow-Up: {cr.followUpDate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* SECTION 3: STAFF ROSTER */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 overflow-hidden shadow-2xs">
        <div
          onClick={() => setIsStaffOpen((prev) => !prev)}
          className="p-4 border-b border-[#D4621A]/15 bg-[#F8F3F0] flex items-center justify-between cursor-pointer select-none hover:bg-[#D4621A]/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#D4621A]" />
            <h3 className="text-xs font-bold text-[#D4621A] uppercase font-mono tracking-wider">
              Staff Roster ({salonStaff.length})
            </h3>
            <ChevronDown
              className={`w-4 h-4 text-[#D4621A] transition-transform duration-200 ${
                isStaffOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
          <span className="text-[11px] font-mono text-black/60">Full shop team list</span>
        </div>

        {isStaffOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#D4621A]/15 text-[10px] font-bold uppercase tracking-wider text-black/60 bg-[#D4621A]/5 font-mono">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4621A]/10 text-black">
                {salonStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-black/50">
                      No staff members configured for this shop.
                    </td>
                  </tr>
                ) : (
                  salonStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-[#D4621A]/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-black">{s.name}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-semibold text-black/80">{s.role || 'Staff'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-black/80">{s.phone || '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            s.is_active
                              ? 'bg-[#D4621A] text-white border border-[#D4621A]'
                              : 'bg-black/10 text-black/60'
                          }`}
                        >
                          {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-black/70 text-[11px]">{formatDate(s.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 4: PRODUCTS CATALOG */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 overflow-hidden shadow-2xs">
        <div
          onClick={() => setIsProductsOpen((prev) => !prev)}
          className="p-4 border-b border-[#D4621A]/15 bg-[#F8F3F0] flex items-center justify-between cursor-pointer select-none hover:bg-[#D4621A]/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#D4621A]" />
            <h3 className="text-xs font-bold text-[#D4621A] uppercase font-mono tracking-wider">
              Products Catalog ({products.length})
            </h3>
            <ChevronDown
              className={`w-4 h-4 text-[#D4621A] transition-transform duration-200 ${
                isProductsOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
          <span className="text-[11px] font-mono text-black/60">Product-wise contents & catalog status</span>
        </div>

        {isProductsOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#D4621A]/15 text-[10px] font-bold uppercase tracking-wider text-black/60 bg-[#D4621A]/5 font-mono">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-center">Contents / Category</th>
                  <th className="py-3 px-3 text-center">Catalog Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4621A]/10 text-black">
                {productsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-black/50">
                      Loading products catalog...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-black/50">
                      No products entered for this shop.
                    </td>
                  </tr>
                ) : (
                  products.map((srv) => (
                    <tr key={srv.id} className="hover:bg-[#D4621A]/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-black">{srv.name}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-black">
                        ₹{(srv.price_minor / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-black/80">{srv.category}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            srv.is_active
                              ? 'bg-[#D4621A] text-white border border-[#D4621A]'
                              : 'bg-black/10 text-black/60'
                          }`}
                        >
                          {srv.is_active ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 5: BILLS AND ORDERS */}
      <div className="bg-[#F8F3F0] rounded-2xl border border-[#D4621A]/20 overflow-hidden shadow-2xs">
        <div
          onClick={() => setIsBillsOpen((prev) => !prev)}
          className="p-4 border-b border-[#D4621A]/15 bg-[#F8F3F0] flex items-center justify-between cursor-pointer select-none hover:bg-[#D4621A]/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#D4621A]" />
            <h3 className="text-xs font-bold text-[#D4621A] uppercase font-mono tracking-wider">
              Bills and Orders History ({salonBills.length})
            </h3>
            <ChevronDown
              className={`w-4 h-4 text-[#D4621A] transition-transform duration-200 ${
                isBillsOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
          <span className="text-[11px] font-mono text-black/60">
            Total Revenue: ₹{Math.round(totalRevenue / 100).toLocaleString('en-IN')}
          </span>
        </div>

        {isBillsOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#D4621A]/15 text-[10px] font-bold uppercase tracking-wider text-black/60 bg-[#D4621A]/5 font-mono">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4621A]/10 text-black">
                {salonBills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-black/50">
                      No bills issued yet by this shop.
                    </td>
                  </tr>
                ) : (
                  salonBills.map((b) => (
                    <tr key={b.id} className="hover:bg-[#D4621A]/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#D4621A]">{b.invoice_number}</td>
                      <td className="py-3 px-3 font-mono text-black/70 text-[11px]">
                        {formatDate(b.issued_at || b.created_at)}
                      </td>
                      <td className="py-3 px-3 text-black font-medium">{b.customer?.name || 'Walk-in Client'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-black">
                        ₹{(((b.total_minor ?? 0)) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#D4621A]/10 text-black border border-[#D4621A]/20">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. ADD RESPONSE / CALL NOTE MODAL (MATCHING OPERATIONS CONSOLE UI) */}
      {isAddResponseOpen && (() => {
        const displayPhone = ownerProfile?.phone || shop.phone || '';
        const cleanPhoneDigits = displayPhone.replace(/\D/g, '').slice(-10);
        const displayId = `TS${shop.id.replace(/[^0-9]/g, '').slice(0, 10) || shop.id.slice(0, 8).toUpperCase()}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-[#F8F3F0] rounded-2xl max-w-3xl w-full shadow-2xl border border-[#D4621A]/30 overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-[#D4621A] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Add response
                  </h3>
                  <div className="flex items-center gap-2 text-white/90 text-xs font-semibold mt-0.5 flex-wrap">
                    <span>{shop.name.toUpperCase()}</span>
                    <span className="opacity-60">•</span>
                    <span>{displayPhone || 'No phone'}</span>
                    {cleanPhoneDigits && (
                      <a
                        href={`https://wa.me/91${cleanPhoneDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      </a>
                    )}
                    <span className="opacity-60">•</span>
                    <span className="font-mono text-[11px] opacity-80">
                      {displayId}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddResponseOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: Two Columns */}
              <div className="p-6 flex flex-col md:flex-row gap-6 bg-[#F8F3F0] text-xs">
                {/* Left Column: Preview */}
                <div className="w-full md:w-64 shrink-0 flex flex-col">
                  <label className="text-xs font-bold text-black uppercase tracking-wider mb-2 block">
                    Preview ({callResponses.length})
                  </label>
                  <div className="flex-1 bg-white/85 rounded-xl border border-[#D4621A]/20 p-3 min-h-[320px] max-h-[460px] overflow-y-auto flex flex-col justify-start space-y-2.5">
                    {callResponses.length === 0 ? (
                      <p className="text-xs text-black/50 text-center my-auto">
                        No previous responses yet.
                      </p>
                    ) : (
                      callResponses.map((cr) => (
                        <div
                          key={cr.id}
                          className="p-2.5 rounded-lg border border-[#D4621A]/15 bg-[#F8F3F0] text-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                cr.outcome === 'Positive'
                                  ? 'bg-[#D4621A] text-white border border-[#D4621A]'
                                  : 'bg-[#F8F3F0] text-black border border-[#D4621A]/30'
                              }`}
                            >
                              {cr.outcome || (cr.type === 'Answered' ? 'Positive' : 'Negative')}
                            </span>
                            <span className="text-[10px] text-black/60 font-mono">
                              {new Date(cr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, {new Date(cr.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="text-[11px] text-black/85 leading-snug line-clamp-2 italic">
                            {cr.customerFeedback ? `"${cr.customerFeedback}"` : cr.notes.replace(/\[.*?\]/g, '').trim() || '—'}
                          </p>
                          <div className="text-[10px] text-black/60 flex items-center justify-between pt-1 border-t border-black/5">
                            <span>Call {cr.type} - {cr.recordedBy || 'Support'}</span>
                            {cr.duration && <span className="font-mono text-[#D4621A] font-semibold">⏱ {cr.duration}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column: Form Fields */}
                <form onSubmit={handleSaveResponse} className="flex-1 space-y-4">
                  {/* ROW 1: CALL STATUS & (IF ANSWERED) RESPONSE SENTIMENT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* CALL STATUS * */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-black uppercase tracking-wider flex items-center gap-1">
                        <span>CALL STATUS</span>
                        <span className="text-[#D4621A] font-black">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['Answered', 'No Answer', 'Not Reachable'] as const).map((status) => {
                          const isSelected = callStatus === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleSelectCallStatus(status)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#D4621A] text-white border border-[#D4621A] shadow-xs'
                                  : 'bg-white text-black border border-[#D4621A]/30 hover:border-[#D4621A]'
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RESPONSE (POSITIVE / NEGATIVE) — Shown when Answered */}
                    {callStatus === 'Answered' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                          RESPONSE
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setResponseSentiment('Positive')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              responseSentiment === 'Positive'
                                ? 'bg-[#D4621A] text-white border border-[#D4621A] shadow-xs'
                                : 'bg-white text-black border border-[#D4621A]/30 hover:border-[#D4621A]'
                            }`}
                          >
                            Positive
                          </button>
                          <button
                            type="button"
                            onClick={() => setResponseSentiment('Negative')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              responseSentiment === 'Negative'
                                ? 'bg-[#D4621A] text-white border border-[#D4621A] shadow-xs'
                                : 'bg-white text-black border border-[#D4621A]/30 hover:border-[#D4621A]'
                            }`}
                          >
                            Negative
                          </button>
                        </div>
                        <p className="text-[10px] text-black/50">Select Positive or Negative.</p>
                      </div>
                    )}
                  </div>

                  {/* ANSWERED-SPECIFIC FIELDS (SOURCE, DEMO STATUS, SERVICES, TIMER) */}
                  {callStatus === 'Answered' && (
                    <>
                      {/* ROW 2: HOW DID YOU HEAR & DEMO STATUS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                            HOW DID YOU HEAR ABOUT STYLEFLEET?
                          </label>
                          <select
                            value={leadSource}
                            onChange={(e) => setLeadSource(e.target.value)}
                            className="w-full p-2.5 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] cursor-pointer"
                          >
                            <option value="">Select source</option>
                            <option value="Google Search / Website">Google Search / Website</option>
                            <option value="Instagram / Social Media">Instagram / Social Media</option>
                            <option value="Friend / Salon Referral">Friend / Salon Referral</option>
                            <option value="Sales Executive Outreach">Sales Executive Outreach</option>
                            <option value="WhatsApp / SMS">WhatsApp / SMS</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                            DEMO STATUS
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(['WhatsApp Demo', 'Call Demo', 'No Demo'] as const).map((dm) => (
                              <button
                                key={dm}
                                type="button"
                                onClick={() => setDemoStatus(dm)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                  demoStatus === dm
                                    ? 'bg-[#D4621A] text-white border border-[#D4621A]'
                                    : 'bg-white text-black border border-[#D4621A]/30 hover:border-[#D4621A]'
                                }`}
                              >
                                {dm}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ROW 3: WHICH SERVICE ARE YOU DOING & RESPONSE TIMER */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                            WHICH SERVICE ARE YOU DOING?
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(['Hair & Styling', 'Spa & Facial', 'Bridal & Makeup', 'Full Unisex Salon', 'Other'] as const).map((srv) => (
                              <button
                                key={srv}
                                type="button"
                                onClick={() => setServiceType(srv)}
                                className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                                  serviceType === srv
                                    ? 'bg-[#D4621A] text-white border border-[#D4621A]'
                                    : 'bg-white text-black border border-[#D4621A]/30 hover:border-[#D4621A]'
                                }`}
                              >
                                {srv}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-black uppercase tracking-wider block whitespace-nowrap">
                            RESPONSE TIMER
                          </label>
                          <div className="w-full py-2 px-3 rounded-lg border border-[#D4621A]/30 bg-white text-center font-mono font-bold text-xs text-[#D4621A] shadow-2xs">
                            {formatTimer(timerSeconds)}
                          </div>
                        </div>
                      </div>

                      {/* ROW 4: NOTES & CUSTOMER FEEDBACK */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                            NOTES
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Internal CRM notes..."
                            value={responseNotes}
                            onChange={(e) => setResponseNotes(e.target.value)}
                            className="w-full p-2.5 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black placeholder-black/40 focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                            CUSTOMER FEEDBACK
                          </label>
                          <textarea
                            rows={3}
                            placeholder="What did the customer say?"
                            value={customerFeedback}
                            onChange={(e) => setCustomerFeedback(e.target.value)}
                            className="w-full p-2.5 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black placeholder-black/40 focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] resize-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* UNANSWERED FORM (NO ANSWER / NOT REACHABLE): ONLY NOTES */}
                  {callStatus !== 'Answered' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                        NOTES
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Optional notes"
                        value={responseNotes}
                        onChange={(e) => setResponseNotes(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black placeholder-black/40 focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] resize-none"
                      />
                    </div>
                  )}

                  {/* RESPONSE DATE & REPORTED BY */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                        RESPONSE DATE
                      </label>
                      <input
                        type="datetime-local"
                        value={responseDate}
                        onChange={(e) => setResponseDate(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                        EMPLOYEE (LOGGED IN USER)
                      </label>
                      <select
                        value={reportedBy}
                        onChange={(e) => setReportedBy(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] cursor-pointer font-medium"
                      >
                        <option value={user?.name || user?.email || 'CounterPro Admin'}>
                          {user?.name || user?.email || 'CounterPro Admin'} (You)
                        </option>
                        {crmUsers
                          .filter((u) => u.name !== (user?.name || 'CounterPro Admin') && u.email !== user?.email)
                          .map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name} ({u.crm_role === 'admin' ? 'Admin' : 'Staff'})
                            </option>
                          ))}
                        <option value="Support Team">Support Team</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>
                  </div>

                  {/* SCHEDULE FOLLOW-UP SECTION */}
                  <div className="rounded-xl border border-[#D4621A]/20 bg-white/80 p-3.5 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={scheduleFollowUp}
                        onChange={(e) => setScheduleFollowUp(e.target.checked)}
                        className="w-4 h-4 rounded text-[#D4621A] accent-[#D4621A] focus:ring-[#D4621A] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-black">Schedule follow-up</span>
                    </label>

                    {scheduleFollowUp && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[10px] font-bold text-black/70 uppercase tracking-wider block">
                            FOLLOW-UP DATE
                          </label>
                          <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] cursor-pointer"
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-black/70 uppercase tracking-wider block">
                            TIME
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={followUpHour}
                              onChange={(e) => setFollowUpHour(e.target.value)}
                              className="flex-1 p-2 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] cursor-pointer"
                            >
                              <option value="">Hour</option>
                              <option value="09 AM">09 AM</option>
                              <option value="10 AM">10 AM</option>
                              <option value="11 AM">11 AM</option>
                              <option value="12 PM">12 PM</option>
                              <option value="01 PM">01 PM</option>
                              <option value="02 PM">02 PM</option>
                              <option value="03 PM">03 PM</option>
                              <option value="04 PM">04 PM</option>
                              <option value="05 PM">05 PM</option>
                              <option value="06 PM">06 PM</option>
                              <option value="07 PM">07 PM</option>
                              <option value="08 PM">08 PM</option>
                            </select>
                            <select
                              value={followUpMin}
                              onChange={(e) => setFollowUpMin(e.target.value)}
                              className="w-16 p-2 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] cursor-pointer"
                            >
                              <option value="">Min</option>
                              <option value="00">00</option>
                              <option value="15">15</option>
                              <option value="30">30</option>
                              <option value="45">45</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-black/70 uppercase tracking-wider block">
                            PRIORITY
                          </label>
                          <select
                            value={followUpPriority}
                            onChange={(e) => setFollowUpPriority(e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-[#D4621A]/30 bg-white text-black focus:outline-none focus:border-[#D4621A] cursor-pointer"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FOOTER ACTIONS */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D4621A]/15">
                    <button
                      type="button"
                      onClick={() => setIsAddResponseOpen(false)}
                      className="px-5 py-2 rounded-lg text-xs font-semibold text-black/70 bg-[#F8F3F0] border border-[#D4621A]/30 hover:bg-[#D4621A]/10 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingResponse}
                      className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-[#D4621A] hover:bg-[#bf5312] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingResponse ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
