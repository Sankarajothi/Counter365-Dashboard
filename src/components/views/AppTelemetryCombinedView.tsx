import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Layers,
  GitBranch,
  Activity,
  Battery,
  BatteryCharging,
  Wifi,
  Radio,
  RefreshCw,
  Search,
  Eye,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Database,
  Store,
  Apple,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { KPICard } from '../common/KPICard';
import { useDateFilter } from '../../context/DateFilterContext';
import { filterByDateRange, formatDateTime } from '../../utils/dateUtils';
import { TelemetryRecord, Shop } from '../../types/database';

interface AppTelemetryCombinedViewProps {
  records: TelemetryRecord[];
  shops?: Shop[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const AppTelemetryCombinedView: React.FC<AppTelemetryCombinedViewProps> = ({
  records,
  shops = [],
  loading = false,
  onRefresh,
}) => {
  const { dateRange } = useDateFilter();
  const [activeTab, setActiveTab] = useState<'devices' | 'versions' | 'clients'>('devices');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'ios' | 'web'>('all');
  const [selectedRecord, setSelectedRecord] = useState<TelemetryRecord | null>(null);

  // Filter records by date and platform
  const filteredRecords = useMemo(() => {
    let list = filterByDateRange(records, 'created_at', dateRange);
    if (platformFilter !== 'all') {
      list = list.filter((r) => r.platform?.toLowerCase() === platformFilter);
    }
    return list;
  }, [records, dateRange, platformFilter]);

  // Derived real metrics
  const uniqueDevices = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.device_id) set.add(r.device_id);
    });
    return set.size;
  }, [records]);

  const versionDistribution = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const v = r.app_version || 'Unknown';
      map.set(v, (map.get(v) || 0) + 1);
    });
    return Array.from(map.entries()).map(([version, count]) => ({
      version,
      count,
      percentage: records.length > 0 ? ((count / records.length) * 100).toFixed(1) : '0',
    }));
  }, [records]);

  const platformStats = useMemo(() => {
    let android = 0;
    let ios = 0;
    let other = 0;
    records.forEach((r) => {
      const p = r.platform?.toLowerCase() || '';
      if (p.includes('android')) android++;
      else if (p.includes('ios') || p.includes('apple')) ios++;
      else other++;
    });
    return { android, ios, other };
  }, [records]);

  const columns: Column<TelemetryRecord>[] = [
    {
      key: 'device_id',
      header: 'Device ID / Name',
      render: (r) => (
        <div>
          <div className="font-mono text-xs font-semibold text-neutral-900">
            {r.device_name || r.device_id || 'Unknown Device'}
          </div>
          {r.device_name && (
            <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[180px]">
              ID: {r.device_id}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'salon',
      header: 'Salon / Shop',
      render: (r) => {
        const shopName = r.shop?.name || shops.find((s) => s.id === r.shop_id)?.name || 'HQ / Unassigned';
        return (
          <div className="flex items-center gap-1.5 text-xs text-neutral-700">
            <Store className="w-3.5 h-3.5 text-neutral-800" />
            <span className="truncate max-w-[140px]">{shopName}</span>
          </div>
        );
      },
    },
    {
      key: 'platform',
      header: 'Platform & OS',
      render: (r) => {
        const isAndroid = r.platform?.toLowerCase().includes('android');
        const isIos = r.platform?.toLowerCase().includes('ios') || r.platform?.toLowerCase().includes('apple');
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                isAndroid
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : isIos
                  ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              {r.platform || 'Unknown'}
            </span>
            {r.os_version && (
              <span className="text-[11px] font-mono text-neutral-500">
                v{r.os_version}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'app_version',
      header: 'App Version',
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
          v{r.app_version || '1.0.0'}
        </span>
      ),
    },
    {
      key: 'hardware',
      header: 'Battery & Network',
      render: (r) => (
        <div className="flex items-center gap-3 text-xs text-neutral-600">
          {r.battery_level !== null && r.battery_level !== undefined ? (
            <div className="flex items-center gap-1">
              {r.is_charging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-[#0D9488]" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span className="font-mono text-[11px]">{r.battery_level}%</span>
            </div>
          ) : (
            <span className="text-neutral-400 text-[11px]">—</span>
          )}

          {r.network_type && (
            <div className="flex items-center gap-1 text-[11px] font-mono uppercase text-neutral-500">
              <Wifi className="w-3 h-3 text-neutral-700" />
              <span>{r.network_type}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Recorded At',
      render: (r) => (
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(r.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Telemetry Data',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRecord(r);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:text-black hover:border-black shadow-xs transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-black" />
          <span>Inspect</span>
        </button>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-black" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              App Version &amp; Hardware Telemetry
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
              Telemetry Stream
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Realtime mobile fleet telemetry events, client installations, and version adoption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:text-black hover:border-black shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-black ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          )}
        </div>
      </div>

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Telemetry Events"
          value={records.length.toString()}
          subtitle="Total recorded telemetry events"
          icon={Activity}
        />
        <KPICard
          title="Unique Devices"
          value={uniqueDevices.toString()}
          subtitle="Distinct active hardware IDs"
          icon={Smartphone}
        />
        <KPICard
          title="Active App Versions"
          value={versionDistribution.length.toString()}
          subtitle="Distinct builds reporting"
          icon={GitBranch}
        />
        <KPICard
          title="Platforms Recorded"
          value={`${platformStats.android} Android / ${platformStats.ios} iOS`}
          subtitle={platformStats.other > 0 ? `+${platformStats.other} other clients` : 'Fleet distribution'}
          icon={Radio}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'devices'
                ? 'bg-black text-white shadow-xs border border-black'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Device Telemetry Events ({filteredRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('versions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'versions'
                ? 'bg-black text-white shadow-xs border border-black'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Version Adoption ({versionDistribution.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'clients'
                ? 'bg-black text-white shadow-xs border border-black'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Client Workspace Specs</span>
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 border border-[#E5E7EB] text-xs">
            {(['all', 'android', 'ios'] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                  platformFilter === plat
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {plat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Live Devices Telemetry Table */}
      {activeTab === 'devices' && (
        <DataTable
          columns={columns}
          data={filteredRecords}
          loading={loading}
          emptyTitle="No telemetry records found"
          emptyDescription={
            records.length === 0
              ? 'Currently 0 device telemetry records received. When mobile apps send hardware heartbeats, they will automatically appear here via Realtime.'
              : 'No telemetry records match the current platform or date filter.'
          }
          searchPlaceholder="Search device ID, name, OS, salon..."
          searchFields={['device_id', 'device_name', 'platform', 'os_version', 'app_version']}
          defaultSortField="created_at"
          defaultSortOrder="desc"
          onRowClick={(r) => setSelectedRecord(r)}
        />
      )}

      {/* Tab 2: Version Adoption Breakdown */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          {versionDistribution.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {versionDistribution.map((v) => (
                <div
                  key={v.version}
                  className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-neutral-900">
                      Build v{v.version}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">
                      {v.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden border border-neutral-200">
                    <div
                      className="bg-black h-full rounded-full transition-all duration-500"
                      style={{ width: `${v.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-neutral-500">
                    <span className="text-neutral-900 font-semibold">{v.count}</span> total telemetry pings recorded
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-2">
              <GitBranch className="w-8 h-8 text-neutral-400 mx-auto" />
              <div className="text-sm font-semibold text-neutral-900">No version telemetry recorded yet</div>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Once mobile apps upload device telemetry, version adoption percentages will calculate dynamically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Workspace Mobile Clients */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-neutral-900">CounterPro Android Client</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0D9488] text-white border border-[#0D9488]">
                Target: Android 14+
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div>Framework: <span className="font-mono text-neutral-900">React Native 0.76 / Expo SDK 52</span></div>
              <div>Client Type: <span className="font-mono text-neutral-900 font-semibold">CounterPro Mobile Client</span></div>
              <div>Telemetry Target: <span className="font-mono text-[#0D9488]">Device Telemetry Sink</span></div>
              <div>Status: <span className="text-[#0D9488] font-semibold">Active Realtime Sink</span></div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-neutral-900">CounterPro iOS Client</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-800 border border-neutral-300">
                Target: iOS 16.0+
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div>Framework: <span className="font-mono text-neutral-900">Xcode 16 / React Native</span></div>
              <div>Bundle ID: <span className="font-mono text-neutral-900 font-semibold">com.stylefleet.ios</span></div>
              <div>Telemetry Target: <span className="font-mono text-neutral-900 font-semibold">Device Telemetry Sink</span></div>
              <div>Status: <span className="text-neutral-900 font-semibold">Ready in Workspace</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Modal for Detailed Telemetry Inspection */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={`Device Telemetry Event #${selectedRecord?.id.slice(0, 8)}`}
        subtitle={`Recorded on ${formatDateTime(selectedRecord?.created_at)}`}
        maxWidth="xl"
      >
        {selectedRecord && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
              <div>
                <span className="text-neutral-500 block text-[11px]">Device ID</span>
                <span className="font-mono text-neutral-900 font-semibold">{selectedRecord.device_id}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Device Name</span>
                <span className="text-neutral-900 font-semibold">{selectedRecord.device_name || 'Generic Device'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Platform</span>
                <span className="text-neutral-900 font-bold uppercase">{selectedRecord.platform}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">App Version</span>
                <span className="font-mono text-neutral-900">v{selectedRecord.app_version}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Battery Status</span>
                <span className="text-neutral-900">
                  {selectedRecord.battery_level !== null ? `${selectedRecord.battery_level}%` : 'N/A'}{' '}
                  {selectedRecord.is_charging ? '(Charging)' : ''}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Network Type</span>
                <span className="font-mono text-neutral-900 uppercase">{selectedRecord.network_type || 'N/A'}</span>
              </div>
            </div>

            {selectedRecord.metadata && (
              <div className="space-y-2">
                <span className="font-bold text-neutral-700">Raw Metadata JSON:</span>
                <pre className="p-3 rounded-xl bg-[#F8F9FA] border border-[#0D9488]/20 text-[11px] font-mono text-black overflow-x-auto max-h-48">
                  {JSON.stringify(selectedRecord.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
