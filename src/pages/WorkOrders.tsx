import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getTrailers, getWorkOrders, createWorkOrder, getInventory } from '../services/api';
import { generateWorkOrderPDF, downloadPDF } from '../services/pdf';
import type { Trailer, WorkOrder, WorkOrderItem, InventoryItem } from '../types';
import { toast } from 'sonner';
import { Search, Loader2, Plus, X, Download, Filter } from 'lucide-react';

export function WorkOrders() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [technicianName, setTechnicianName] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [items, setItems] = useState<WorkOrderItem[]>([{ itemName: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterTrailer, setFilterTrailer] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [trailersData, inventoryData, workOrdersData] = await Promise.all([
      getTrailers(),
      getInventory(),
      getWorkOrders(),
    ]);
    setTrailers(trailersData);
    setInventory(inventoryData);
    setWorkOrders(workOrdersData);
  }

  const filteredTrailers = trailers.filter(trailer =>
    trailer.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function addItem() {
    setItems([...items, { itemName: '', quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof WorkOrderItem, value: string | number) {
    setItems(items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTrailer) {
      toast.error('Please select a trailer');
      return;
    }

    if (!technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    if (!issueNotes.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    const validItems = items.filter(item => item.itemName.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one inventory item');
      return;
    }

    // Check inventory availability
    for (const item of validItems) {
      const inventoryItem = inventory.find(inv => inv.name === item.itemName);
      if (!inventoryItem) {
        toast.error(`Item "${item.itemName}" not found in inventory`);
        return;
      }
      if (inventoryItem.available < item.quantity) {
        toast.error(`Not enough "${item.itemName}" in stock. Available: ${inventoryItem.available}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const workOrder = await createWorkOrder({
        trailerId: selectedTrailer.id,
        trailerNumber: selectedTrailer.number,
        technicianName: technicianName.trim(),
        date: new Date().toISOString(),
        issueNotes: issueNotes.trim(),
        items: validItems,
        status: 'completed',
      });

      // Generate PDF
      const pdfBlob = await generateWorkOrderPDF(workOrder);
      downloadPDF(pdfBlob, `WorkOrder-${workOrder.woNumber}.pdf`);

      toast.success(t('workOrders.success'), {
        description: t('workOrders.pdfGenerated'),
      });

      // Reset form and reload data
      setSelectedTrailer(null);
      setSearchQuery('');
      setTechnicianName('');
      setIssueNotes('');
      setItems([{ itemName: '', quantity: 1 }]);
      loadData();
      setActiveTab('history');
    } catch (error) {
      toast.error('Failed to create work order');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPDF(workOrder: WorkOrder) {
    try {
      const pdfBlob = await generateWorkOrderPDF(workOrder);
      downloadPDF(pdfBlob, `WorkOrder-${workOrder.woNumber}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  }

  const filteredWorkOrders = filterTrailer === 'all'
    ? workOrders
    : workOrders.filter(wo => wo.trailerNumber === filterTrailer);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('workOrders.title')}</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('workOrders.createNew')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('workOrders.history')}
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trailer Selection */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('workOrders.selectTrailer')} *
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={t('workOrders.trailerPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {showDropdown && filteredTrailers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredTrailers.map(trailer => (
                    <button
                      key={trailer.id}
                      type="button"
                      onClick={() => {
                        setSelectedTrailer(trailer);
                        setSearchQuery(trailer.number);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{trailer.number}</p>
                      {trailer.make && (
                        <p className="text-sm text-gray-500">
                          {trailer.make} {trailer.model} {trailer.year}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTrailer && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Selected:</span> {selectedTrailer.number}
                  {selectedTrailer.make && ` - ${selectedTrailer.make} ${selectedTrailer.model}`}
                </p>
              </div>
            )}
          </div>

          {/* Technician Name */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('workOrders.technicianName')} *
            </label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder={t('workOrders.technicianPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Issue Notes */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('workOrders.issueNotes')} *
            </label>
            <textarea
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder={t('workOrders.issueNotesPlaceholder')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Inventory Items */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                {t('workOrders.inventoryItems')} *
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('workOrders.addItem')}
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-1">
                    <select
                      value={item.itemName}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">{t('workOrders.itemPlaceholder')}</option>
                      {inventory.map(inv => (
                        <option key={inv.id} value={inv.name}>
                          {inv.name} (Available: {inv.available})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder={t('workOrders.quantity')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !selectedTrailer}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {submitting ? t('workOrders.submitting') : t('workOrders.submit')}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterTrailer}
                onChange={(e) => setFilterTrailer(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('workOrders.allTrailers')}</option>
                {trailers.map(trailer => (
                  <option key={trailer.id} value={trailer.number}>
                    {trailer.number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredWorkOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t('workOrders.noWorkOrders')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('workOrders.table.woNumber')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('workOrders.table.trailer')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('workOrders.table.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('workOrders.table.technician')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('workOrders.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('workOrders.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wo.woNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {wo.trailerNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(wo.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {wo.technicianName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          wo.status === 'completed' ? 'bg-green-100 text-green-800' :
                          wo.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t(`workOrders.status.${wo.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDownloadPDF(wo)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                          {t('workOrders.downloadPDF')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
