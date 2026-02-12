import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { getDashboardStats, getInventory, getInspections } from '../services/api';
import type { DashboardStats, InventoryItem, Inspection } from '../types';
import { Truck, ClipboardCheck, Package, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, inventoryData, inspectionsData] = await Promise.all([
        getDashboardStats(),
        getInventory(),
        getInspections(),
      ]);
      setStats(statsData);
      setInventory(inventoryData);
      setInspections(inspectionsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: t('dashboard.totalTrailers'),
      value: stats?.totalTrailers || 0,
      icon: Truck,
      color: 'bg-blue-500',
    },
    {
      label: t('dashboard.inspectionsPending'),
      value: stats?.inspectionsPending || 0,
      icon: ClipboardCheck,
      color: 'bg-yellow-500',
    },
    {
      label: t('dashboard.usedInventory'),
      value: stats?.usedInventory || 0,
      icon: Package,
      color: 'bg-green-500',
    },
    {
      label: t('dashboard.pendingInventory'),
      value: stats?.pendingInventory || 0,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
  ];

  // Prepare chart data
  const inventoryChartData = inventory.slice(0, 6).map(item => ({
    name: item.name,
    available: item.available,
    used: item.used,
    pending: item.pending,
  }));

  const inspectionStatusData = [
    { name: 'Pass', value: inspections.filter(i => i.checklist.every(c => c.status === 'pass')).length },
    { name: 'Fail', value: inspections.filter(i => i.checklist.some(c => c.status === 'fail')).length },
    { name: 'Pending', value: (stats?.inspectionsPending || 0) },
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Usage Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.inventoryUsage')}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="available" fill="#3b82f6" name="Available" />
              <Bar dataKey="used" fill="#10b981" name="Used" />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inspection Status Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.inspectionStatus')}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={inspectionStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {inspectionStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.recentActivity')}
        </h2>
        {inspections.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('common.noData')}</p>
        ) : (
          <div className="space-y-3">
            {inspections.slice(0, 5).map(inspection => (
              <div
                key={inspection.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {t('nav.inspection')} - {inspection.trailerNumber}
                    </p>
                    <p className="text-sm text-gray-500">{inspection.technicianName}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(inspection.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
