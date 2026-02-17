import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { getTrailers, getInventory } from '../services/api';
import { createAirtableWorkOrder, getAirtableWorkOrders } from '../services/airtable';
import { generateWorkOrderPDF, downloadPDF } from '../services/pdf';
import type { Trailer, WorkOrderItem, InventoryItem } from '../types';
import { toast } from 'sonner';
import { Search, Loader2, Plus, X, Download, Filter, Camera, Image as ImageIcon, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AirtableWorkOrder {
  id: string;
  fields: {
    work_order_number?: string;
    asset_id?: string;
    vendor?: string;
    issue_description?: string;
    status?: string;
    priority?: string;
    repair_date?: string;
    grand_total?: number;
    notes?: string;
    created_at?: string;
    start_time?: string;
    end_time?: string;
    issue_photos?: Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
  };
  createdTime: string;
}

export function WorkOrders() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workOrders, setWorkOrders] = useState<AirtableWorkOrder[]>([]);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [technicianName, setTechnicianName] = useState('');
  
  // ✅ Inspection Flow States
  const [inspectionStep, setInspectionStep] = useState<'select-trailer' | 'check-issue' | 'details' | 'completed'>('select-trailer');
  const [hasIssue, setHasIssue] = useState<boolean | null>(null);
  
  const [issueNotes, setIssueNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [items, setItems] = useState<WorkOrderItem[]>([{ itemName: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterTrailer, setFilterTrailer] = useState<string>('all');
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const loggedInUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
})();


useEffect(() => {
  if (
    loggedInUser?.role === 'technician' &&
    loggedInUser?.name
  ) {
    setTechnicianName(loggedInUser.name);
  }
}, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [trailersData, inventoryData, workOrdersData] = await Promise.all([
        getTrailers(),
        getInventory(),
        getAirtableWorkOrders(),
      ]);
      setTrailers(trailersData);
      setInventory(inventoryData);
      setWorkOrders(workOrdersData);
      console.log('✅ Data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast.error('Failed to load data');
    }
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

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setImageFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${validFiles.length} image(s) added`);
  }

  function removeImage(index: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  // ✅ Handle trailer selection and move to issue check
  function handleTrailerSelect(trailer: Trailer) {
    setSelectedTrailer(trailer);
    setSearchQuery(trailer.number);
    setShowDropdown(false);
    setInspectionStep('check-issue');
  }

  // ✅ Handle issue check
  function handleIssueCheck(hasIssueValue: boolean) {
    setHasIssue(hasIssueValue);
    
    if (hasIssueValue) {
      // Has issue - go to details form
      setInspectionStep('details');
      toast.info('Please provide issue details and photos');
    } else {
      // No issue - mark as passed
      handlePassInspection();
    }
  }

  // ✅ Handle pass inspection (no issue)
  async function handlePassInspection() {
    if (!selectedTrailer) return;

    setSubmitting(true);

    try {
      const woNumber = `WO-${Date.now()}`;

      await createAirtableWorkOrder({
        work_order_number: woNumber,
        asset_id: selectedTrailer.id,
        vendor: technicianName.trim() || 'Auto-Check',
        issue_description: '✅ Inspection passed - No issues found',
        status: 'completed',
        priority: 'low',
        repair_date: new Date().toISOString(),
        grand_total: 0,
        notes: 'Routine inspection - All systems normal',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
      }, []);

      toast.success('Inspection passed!', {
        description: `${selectedTrailer.number} - No issues found`,
      });

      resetForm();
      loadData();
    } catch (error) {
      console.error('❌ Failed to record inspection:', error);
      toast.error('Failed to record inspection');
    } finally {
      setSubmitting(false);
    }
  }

  // ✅ Handle submit with issue
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

    if (imageFiles.length === 0) {
      toast.error('Please add at least one photo of the issue');
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
      const woNumber = `WO-${Date.now()}`;
      
      const grandTotal = validItems.reduce((sum, item) => {
        const inventoryItem = inventory.find(inv => inv.name === item.itemName);
        return sum + (inventoryItem ? inventoryItem.available * item.quantity : 0);
      }, 0);

      const airtableRecord = await createAirtableWorkOrder({
        work_order_number: woNumber,
        asset_id: selectedTrailer.id,
        vendor: technicianName.trim(),
        issue_description: issueNotes.trim(),
        status: 'completed',
        priority: priority,
        repair_date: new Date().toISOString(),
        grand_total: grandTotal,
        notes: `Items used: ${validItems.map(item => `${item.itemName} (${item.quantity})`).join(', ')} | ${imageFiles.length} photo(s) attached`,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
      }, imageFiles);

      console.log('✅ Work order created in Airtable:', airtableRecord);

      const workOrderForPDF = {
        id: airtableRecord.id,
        woNumber: woNumber,
        trailerId: selectedTrailer.id,
        trailerNumber: selectedTrailer.number,
        technicianName: technicianName.trim(),
        date: new Date().toISOString(),
        issueNotes: issueNotes.trim(),
        items: validItems,
        status: 'completed' as const,
      };

      const pdfBlob = await generateWorkOrderPDF(workOrderForPDF);
      downloadPDF(pdfBlob, `WorkOrder-${woNumber}.pdf`);

      toast.success('Work order created successfully!', {
        description: `Saved to Airtable with ${imageFiles.length} photo(s)`,
      });

      resetForm();
      loadData();
      setActiveTab('history');
    } catch (error) {
      console.error('❌ Failed to create work order:', error);
      toast.error('Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedTrailer(null);
    setSearchQuery('');
    setTechnicianName('');
    setIssueNotes('');
    setPriority('medium');
    setItems([{ itemName: '', quantity: 1 }]);
    setImageFiles([]);
    setImagePreviews([]);
    setHasIssue(null);
    setInspectionStep('select-trailer');
  }

  async function handleDownloadPDF(workOrder: AirtableWorkOrder) {
    try {
      const workOrderForPDF = {
        id: workOrder.id,
        woNumber: workOrder.fields.work_order_number || 'N/A',
        trailerId: workOrder.fields.asset_id || '',
        trailerNumber: workOrder.fields.asset_id || 'N/A',
        technicianName: workOrder.fields.vendor || 'N/A',
        date: workOrder.fields.repair_date || workOrder.createdTime,
        issueNotes: workOrder.fields.issue_description || '',
        items: [],
        status: 'completed' as const,
      };

      const pdfBlob = await generateWorkOrderPDF(workOrderForPDF);
      downloadPDF(pdfBlob, `WorkOrder-${workOrderForPDF.woNumber}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  }

  const filteredWorkOrders = filterTrailer === 'all'
    ? workOrders
    : workOrders.filter(wo => wo.fields.asset_id === filterTrailer);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('workOrders.title')}</h1>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('create');
              resetForm();
            }}
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
        <div className="space-y-6">
          {/* ✅ STEP 1: Select Trailer */}
          {inspectionStep === 'select-trailer' && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Select Trailer for Inspection</h2>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technician Name *
                </label>
             <input
  type="text"
  value={technicianName}
  onChange={(e) => setTechnicianName(e.target.value)}
  placeholder="Enter your name"
  disabled={loggedInUser?.role === 'technician'}
  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
    ${loggedInUser?.role === 'technician'
      ? 'bg-gray-100 cursor-not-allowed border-gray-300'
      : 'border-gray-300'
    }`}
  required
/>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Trailer *
              </label>
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
                  placeholder="Search by trailer number..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>

              {showDropdown && filteredTrailers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-2xl bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredTrailers.map(trailer => (
                    <button
                      key={trailer.id}
                      type="button"
                      onClick={() => handleTrailerSelect(trailer)}
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
          )}

          {/* ✅ STEP 2: Check for Issues */}
          {inspectionStep === 'check-issue' && selectedTrailer && (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Inspect Trailer</h2>
                  <p className="text-sm text-gray-600">Trailer: {selectedTrailer.number}</p>
                </div>
              </div>

              <div className="text-center py-8">
                <AlertTriangle className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Did you find any issues with this trailer?
                </h3>
                <p className="text-gray-600 mb-8">
                  Check all parts and systems carefully before proceeding
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => handleIssueCheck(true)}
                    disabled={submitting}
                    className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg"
                  >
                    <XCircle className="w-6 h-6" />
                    Yes, Found Issues
                  </button>
                  <button
                    onClick={() => handleIssueCheck(false)}
                    disabled={submitting}
                    className="flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg"
                  >
                    {submitting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle className="w-6 h-6" />
                    )}
                    No, All Good
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTrailer(null);
                  setInspectionStep('select-trailer');
                }}
                className="mt-4 text-gray-600 hover:text-gray-900"
              >
                ← Back to trailer selection
              </button>
            </div>
          )}

          {/* ✅ STEP 3: Issue Details Form (only if has issue) */}
          {inspectionStep === 'details' && hasIssue && selectedTrailer && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Document the Issue</h2>
                    <p className="text-sm text-gray-600">Trailer: {selectedTrailer.number}</p>
                  </div>
                </div>

                {/* Priority */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">🟢 Low - Can wait</option>
                    <option value="medium">🟡 Medium - Should fix soon</option>
                    <option value="high">🔴 High - Urgent fix needed</option>
                  </select>
                </div>

                {/* Issue Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Description *
                  </label>
                  <textarea
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Photo Upload */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">
                      📸 Issue Photos * (Required)
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      Take/Upload Photos
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {imagePreviews.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Issue ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {imageFiles[index]?.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-red-400" />
                      <p className="text-sm text-red-600 font-medium">
                        ⚠️ Photos required to document the issue
                      </p>
                    </div>
                  )}
                </div>

                {/* Parts Used */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">
                      Parts/Inventory Used *
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Part
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
                            <option value="">Select part...</option>
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
                            placeholder="Qty"
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
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setInspectionStep('check-issue');
                    setImageFiles([]);
                    setImagePreviews([]);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedTrailer || imageFiles.length === 0}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {submitting ? `Saving with ${imageFiles.length} photo(s)...` : 'Submit Work Order'}
                </button>
              </div>
            </form>
          )}
        </div>
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
                <option value="all">All Trailers</option>
                {trailers.map(trailer => (
                  <option key={trailer.id} value={trailer.id}>
                    {trailer.number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredWorkOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No work orders found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Technician
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wo.fields.work_order_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {wo.fields.asset_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {wo.fields.repair_date ? new Date(wo.fields.repair_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {wo.fields.vendor || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {wo.fields.issue_description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          wo.fields.priority === 'high' ? 'bg-red-100 text-red-800' :
                          wo.fields.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {wo.fields.priority || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {wo.fields.issue_photos && wo.fields.issue_photos.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            <span>{wo.fields.issue_photos.length}</span>
                          </div>
                        ) : wo.fields.issue_description?.includes('passed') ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Passed
                          </span>
                        ) : (
                          <span className="text-gray-400">No photos</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          wo.fields.status === 'completed' ? 'bg-green-100 text-green-800' :
                          wo.fields.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {wo.fields.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDownloadPDF(wo)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                          PDF
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