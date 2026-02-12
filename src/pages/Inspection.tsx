import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getTrailers, createInspection } from '../services/api';
import { generateInspectionPDF, downloadPDF } from '../services/pdf';
import type { Trailer, InspectionCheckItem } from '../types';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';

export function Inspection() {
  const { t } = useTranslation();
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [technicianName, setTechnicianName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const checklistItems: InspectionCheckItem[] = [
    { id: 'doc_dot', label: t('inspection.documentDOT'), status: '', comments: '' },
    { id: 'lights', label: t('inspection.lightStatus'), status: '', comments: '' },
    { id: 'tires', label: t('inspection.tireStatus'), status: '', comments: '' },
    { id: 'brakes', label: t('inspection.brakeStatus'), status: '', comments: '' },
    { id: 'suspension', label: t('inspection.suspensionAxle'), status: '', comments: '' },
    { id: 'frame', label: t('inspection.frameBody'), status: '', comments: '' },
    { id: 'tandem', label: t('inspection.tandemLanding'), status: '', comments: '' },
  ];

  const [checklist, setChecklist] = useState<InspectionCheckItem[]>(checklistItems);

  useEffect(() => {
    loadTrailers();
  }, []);

  async function loadTrailers() {
    const data = await getTrailers();
    setTrailers(data);
  }

  const filteredTrailers = trailers.filter(trailer =>
    trailer.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function updateChecklistItem(id: string, field: 'status' | 'comments', value: string) {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTrailer) {
      toast.error(t('inspection.selectTrailerFirst'));
      return;
    }

    if (!technicianName.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    setSubmitting(true);

    try {
      const inspection = await createInspection({
        trailerId: selectedTrailer.id,
        trailerNumber: selectedTrailer.number,
        technicianName: technicianName.trim(),
        date: new Date().toISOString(),
        checklist,
      });

      // Generate PDF
      const pdfBlob = await generateInspectionPDF(inspection);
      downloadPDF(pdfBlob, `Inspection-${inspection.trailerNumber}-${Date.now()}.pdf`);

      toast.success(t('inspection.success'), {
        description: t('inspection.pdfGenerated'),
      });

      // Reset form
      setSelectedTrailer(null);
      setSearchQuery('');
      setTechnicianName('');
      setChecklist(checklistItems);
    } catch (error) {
      toast.error('Failed to submit inspection');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('inspection.title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trailer Selection */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('inspection.selectTrailer')} *
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
                placeholder={t('inspection.trailerPlaceholder')}
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
            {t('inspection.technicianName')} *
          </label>
          <input
            type="text"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            placeholder={t('inspection.technicianPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('inspection.checklist')}
          </h2>

          <div className="space-y-6">
            {checklist.map(item => (
              <div key={item.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <p className="font-medium text-gray-900 mb-3">{item.label}</p>

                {/* Status Radio Buttons */}
                <div className="flex gap-6 mb-3">
                  {(['pass', 'fail', 'na'] as const).map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`status-${item.id}`}
                        value={status}
                        checked={item.status === status}
                        onChange={(e) => updateChecklistItem(item.id, 'status', e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {t(`inspection.${status}`)}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Comments */}
                <input
                  type="text"
                  value={item.comments}
                  onChange={(e) => updateChecklistItem(item.id, 'comments', e.target.value)}
                  placeholder={t('inspection.commentsPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
          {submitting ? t('inspection.submitting') : t('inspection.submit')}
        </button>
      </form>
    </div>
  );
}
