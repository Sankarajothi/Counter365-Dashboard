import React, { useState } from 'react';
import { Store, Users } from 'lucide-react';
import { SalonsView } from './SalonsView';
import { StylistsView } from './StylistsView';
import { Shop, Profile, Staff, Customer, Bill, Payment, Appointment, AccountDeletion, SupportMessage } from '../../types/database';

interface SalonsCombinedViewProps {
  shops: Shop[];
  profiles: Profile[];
  staff: Staff[];
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  subscriptions?: any[];
  appointments?: Appointment[];
  deletions?: AccountDeletion[];
  supportMessages?: SupportMessage[];
  loading?: boolean;
  selectedShop?: Shop | null;
  onClearSelectedShop?: () => void;
  onRefresh?: () => void;
  onSelectSalon?: (shop: Shop) => void;
  initialTab?: 'directory' | 'stylists';
  initialModalTab?: 'overview' | 'staff' | 'services' | 'billing' | 'settings' | 'telemetry';
}

export const SalonsCombinedView: React.FC<SalonsCombinedViewProps> = ({
  shops,
  staff,
  subscriptions = [],
  loading = false,
  selectedShop,
  onClearSelectedShop,
  onRefresh,
  onSelectSalon,
  initialTab = 'directory',
  initialModalTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'stylists'>(initialTab);
  const [modalShop, setModalShop] = useState<Shop | null>(null);

  const handleSelectSalonFromStylists = (shop: Shop) => {
    if (onSelectSalon) {
      onSelectSalon(shop);
    } else {
      setModalShop(shop);
      setActiveTab('directory');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#0D9488] text-white shadow-xs font-bold border border-[#0D9488]'
              : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#0D9488]/10 border border-transparent'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Outlets Directory ({shops.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stylists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'stylists'
              ? 'bg-[#0D9488] text-white shadow-xs font-bold border border-[#0D9488]'
              : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#0D9488]/10 border border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff &amp; Access ({staff.length})</span>
        </button>
      </div>

      {activeTab === 'directory' && (
        <SalonsView
          shops={shops}
          subscriptions={subscriptions}
          loading={loading}
          selectedShop={selectedShop || modalShop}
          onClearSelectedShop={() => {
            setModalShop(null);
            onClearSelectedShop?.();
          }}
          onSelectSalon={onSelectSalon}
          onStaffChange={onRefresh}
          initialModalTab={initialModalTab}
        />
      )}

      {activeTab === 'stylists' && (
        <StylistsView
          staff={staff}
          shops={shops}
          loading={loading}
          onRefresh={onRefresh}
          onSelectSalon={handleSelectSalonFromStylists}
        />
      )}
    </div>
  );
};
