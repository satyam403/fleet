import { useState, useEffect, useRef } from 'react';
import { getTrailers } from '../services/api';
import { createAirtableInspection } from '../services/airtable';
import type { Trailer } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Camera, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, ChevronLeft, X, Truck,
  User, FileText, Image as ImageIcon, ClipboardCheck,
} from 'lucide-react';

interface InspectionItem {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'na' | '';
  notes?: string;
}
interface InspectionSection {
  title: string;
  icon: string;
  items: InspectionItem[];
}

const STEPS = [
  { id: 1, label: 'Trailer', Icon: Truck },
  { id: 2, label: 'Details', Icon: User },
  { id: 3, label: 'Inspect', Icon: ClipboardCheck },
  { id: 4, label: 'Photos', Icon: ImageIcon },
  { id: 5, label: 'Review', Icon: FileText },
];

const INITIAL_SECTIONS: InspectionSection[] = [
  {
    title: 'Brake System', icon: '🛑',
    items: [
      { id: 'brake_adjustment', label: 'Brake Adjustment', status: '' },
      { id: 'brake_connections', label: 'Brake Connections', status: '' },
      { id: 'brake_drums', label: 'Brake Drums / Rotors', status: '' },
      { id: 'brake_hoses', label: 'Brake Hoses', status: '' },
      { id: 'brake_tubing', label: 'Brake Tubing', status: '' },
    ],
  },
  {
    title: 'Coupling', icon: '🔗',
    items: [
      { id: 'fifth_wheel', label: 'Fifth Wheel', status: '' },
      { id: 'pintle_hooks', label: 'Pintle Hooks', status: '' },
      { id: 'drawbar_eye', label: 'Drawbar / Towbar / Eye', status: '' },
      { id: 'safety_chains', label: 'Safety Chains', status: '' },
    ],
  },
  {
    title: 'Lighting', icon: '💡',
    items: [
      { id: 'headlights', label: 'Headlights', status: '' },
      { id: 'tail_lights', label: 'Tail Lights', status: '' },
      { id: 'brake_lights', label: 'Brake Lights', status: '' },
      { id: 'turn_signals', label: 'Turn Signals', status: '' },
      { id: 'clearance_lights', label: 'Clearance Lights', status: '' },
      { id: 'reflectors', label: 'Reflectors', status: '' },
    ],
  },
  {
    title: 'Loading', icon: '📦',
    items: [
      { id: 'cargo_securement', label: 'Cargo Securement', status: '' },
      { id: 'tailgate', label: 'Tailgate / Doors', status: '' },
      { id: 'doors', label: 'Side Doors', status: '' },
    ],
  },
  {
    title: 'Suspension', icon: '🔧',
    items: [
      { id: 'spring_assembly', label: 'Spring Assembly', status: '' },
      { id: 'torque_arm', label: 'Torque / Radius Arm', status: '' },
    ],
  },
  {
    title: 'Tires', icon: '🛞',
    items: [
      { id: 'tire_condition', label: 'Tire Condition', status: '' },
      { id: 'tire_tread_depth', label: 'Tread Depth', status: '' },
    ],
  },
  {
    title: 'Wheels', icon: '⚙️',
    items: [
      { id: 'wheels_rims', label: 'Wheels / Rims', status: '' },
      { id: 'wheel_fasteners', label: 'Wheel Fasteners', status: '' },
    ],
  },
  {
    title: 'Frame', icon: '🏗️',
    items: [{ id: 'frame_members', label: 'Frame Members', status: '' }],
  },
  {
    title: 'Exhaust', icon: '💨',
    items: [{ id: 'exhaust_system', label: 'Exhaust System', status: '' }],
  },
  {
    title: 'Fuel', icon: '⛽',
    items: [
      { id: 'fuel_tank', label: 'Fuel Tank', status: '' },
      { id: 'fuel_lines', label: 'Fuel Lines', status: '' },
    ],
  },
  {
    title: 'Steering', icon: '🎮',
    items: [
      { id: 'steering_wheel', label: 'Steering Wheel', status: '' },
      { id: 'steering_column', label: 'Steering Column', status: '' },
      { id: 'steering_gear', label: 'Steering Gear Box', status: '' },
      { id: 'pitman_arm', label: 'Pitman Arm', status: '' },
      { id: 'power_steering', label: 'Power Steering', status: '' },
    ],
  },
  {
    title: 'Windshield', icon: '🪟',
    items: [
      { id: 'windshield_condition', label: 'Windshield Condition', status: '' },
      { id: 'windshield_wipers', label: 'Wipers / Washers', status: '' },
    ],
  },
  {
    title: 'Other', icon: '🔔',
    items: [
      { id: 'horn', label: 'Horn', status: '' },
      { id: 'mirrors', label: 'Mirrors', status: '' },
      { id: 'mud_flaps', label: 'Mud Flaps / Splash Guards', status: '' },
    ],
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export function Inspection() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [technicianName, setTechnicianName] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [vin, setVin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [activeSec, setActiveSec] = useState(0);
  const [sections, setSections] = useState<InspectionSection[]>(INITIAL_SECTIONS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTrailers(); }, []);
  async function loadTrailers() {
    const data = await getTrailers();
    setTrailers(data);
  }

  function goTo(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  const filtered = trailers.filter(t =>
    t.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function updateItem(si: number, ii: number, field: 'status' | 'notes', val: string) {
    setSections(prev => prev.map((s, sIdx) =>
      sIdx !== si ? s : {
        ...s,
        items: s.items.map((item, iIdx) =>
          iIdx !== ii ? item : { ...item, [field]: val }
        )
      }
    ));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} too large (max 10MB)`); return false; }
      return true;
    });
    if (!files.length) return;
    setImageFiles(p => [...p, ...files]);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = e => setImagePreviews(p => [...p, e.target?.result as string]);
      r.readAsDataURL(f);
    });
    toast.success(`${files.length} photo(s) added`);
  }

  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);
  const doneItems = sections.reduce((s, sec) => s + sec.items.filter(i => i.status !== '').length, 0);
  const progress = Math.round((doneItems / totalItems) * 100);

  async function handleSubmit() {
    if (!selectedTrailer || !technicianName.trim()) return;
    setSubmitting(true);
    try {
      const data: any = {
        inspection_number: `INS-${Date.now()}`,
        asset_id: selectedTrailer.id,
        technician_name: technicianName.trim(),
        inspection_date: new Date().toISOString(),
        inspection_type: 'DOT Annual',
        dot_number: dotNumber || '',
        vin: vin || '',
      };
      let failCount = 0, passCount = 0;
      const defects: string[] = [];
      sections.forEach(sec => sec.items.forEach(item => {
        data[item.id] = item.status || 'na';
        if (item.status === 'fail') { failCount++; defects.push(`${item.label}: ${item.notes || 'Failed'}`); }
        else if (item.status === 'pass') passCount++;
        if (item.notes) data[`${item.id}_notes`] = item.notes;
      }));
      data.overall_status = failCount > 0 ? 'failed' : 'passed';
      data.defects_found = defects.join('\n');
      await createAirtableInspection(data, imageFiles);
      toast.success('Inspection submitted!', { description: `${passCount} passed, ${failCount} failed` });
      setSelectedTrailer(null); setSearchQuery(''); setTechnicianName('');
      setDotNumber(''); setVin(''); setImageFiles([]); setImagePreviews([]);
      setSections(INITIAL_SECTIONS); setStep(1); setActiveSec(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  const canNext = step === 1 ? !!selectedTrailer : step === 2 ? !!technicianName.trim() : true;
  const activeSec_ = sections[activeSec];
  const allItems = sections.flatMap(s => s.items);
  const passCount = allItems.filter(i => i.status === 'pass').length;
  const failCount = allItems.filter(i => i.status === 'fail').length;
  const naCount = allItems.filter(i => i.status === 'na').length;

  return (
    <div className="bg-gray-50">

      {/* ── TOP NAV ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Header row */}
          <div className="flex items-center justify-between h-28">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Truck size={16} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm leading-tight">DOT Inspection</div>
                <div className="text-xs text-gray-400 leading-tight">Annual Trailer Check</div>
              </div>
            </div>
            <div className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              Step <span className="text-blue-600 font-bold">{step}</span> of 5
            </div>
          </div>

          {/* ── STEP PROGRESS BAR ── */}
          <div className="flex items-center py-3">
            {STEPS.map((s, idx) => {
              const isDone = step > s.id;
              const isActive = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1 min-w-0">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200
                        ${isDone
                          ? 'bg-blue-600 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                      {isDone ? <CheckCircle2 size={15} /> : <s.Icon size={14} />}
                    </motion.div>
                    <span className={`text-xs font-semibold whitespace-nowrap
                      ${isActive ? 'text-blue-600' : isDone ? 'text-blue-400' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>

                  {/* Connector line between steps */}
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 rounded-full bg-gray-200 overflow-hidden">
                      <motion.div
                        animate={{ width: isDone ? '100%' : '0%' }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-16">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >

            {/* ── STEP 1: Trailer ── */}
            {step === 1 && (
              <div className="max-w-xl mx-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Select Trailer</h2>
                  <p className="text-gray-500 mt-1 text-sm">Search and pick the trailer to inspect</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                    placeholder="Search trailer number..."
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 font-medium text-sm focus:border-blue-500 focus:outline-none transition-colors bg-white shadow-sm"
                  />
                </div>

                <AnimatePresence>
                  {showDropdown && filtered.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden -mt-3"
                    >
                      {filtered.slice(0, 8).map(trailer => (
                        <button
                          key={trailer.id}
                          onMouseDown={() => { setSelectedTrailer(trailer); setSearchQuery(trailer.number); setShowDropdown(false); }}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Truck size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{trailer.number}</div>
                            {trailer.make && <div className="text-xs text-gray-400">{trailer.make} {trailer.model} {trailer.year}</div>}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedTrailer && (
                  <motion.div
                    initial={{ scale: 0.97, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-blue-50 border-2 border-blue-500 rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Truck size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-0.5">Selected Trailer</div>
                      <div className="text-xl font-bold text-gray-900">{selectedTrailer.number}</div>
                      {selectedTrailer.make && <div className="text-xs text-gray-500">{selectedTrailer.make} {selectedTrailer.model}</div>}
                    </div>
                    <CheckCircle2 size={22} className="text-blue-500 flex-shrink-0" />
                  </motion.div>
                )}
              </div>
            )}

            {/* ── STEP 2: Details ── */}
            {step === 2 && (
              <div className="max-w-xl mx-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Details</h2>
                  <p className="text-gray-500 mt-1 text-sm">Enter technician information</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {[
                    { label: 'Technician Name', val: technicianName, set: setTechnicianName, required: true, placeholder: 'Enter your full name', type: 'text' },
                    { label: 'DOT Number', val: dotNumber, set: setDotNumber, required: false, placeholder: 'Optional', type: 'text' },
                    { label: 'VIN', val: vin, set: setVin, required: false, placeholder: 'Optional', type: 'text' },
                  ].map((field, idx) => (
                    <div key={field.label} className={`px-6 py-5 ${idx < 2 ? 'border-b border-gray-100' : ''}`}>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={field.val}
                        onChange={e => field.set(e.target.value)}
                        placeholder={field.placeholder}
                        autoFocus={idx === 0}
                        className="w-full py-1.5 text-gray-900 font-semibold text-base bg-transparent border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-300"
                      />
                    </div>
                  ))}
                </div>

                {/* Helper note */}
                <p className="text-xs text-gray-400 text-center">Only Technician Name is required. DOT Number and VIN are optional.</p>
              </div>
            )}

            {/* ── STEP 3: Inspection ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Inspection</h2>
                    <p className="text-gray-500 mt-0.5 text-sm">{doneItems} of {totalItems} items checked</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                    <span className="text-sm font-bold text-blue-600 w-10">{progress}%</span>
                  </div>
                </div>

                <div className="flex gap-5">
                  {/* Sidebar (desktop) */}
                  <div className="hidden sm:flex flex-col gap-1 w-44 flex-shrink-0">
                    {sections.map((sec, idx) => {
                      const done = sec.items.filter(i => i.status !== '').length;
                      const hasFail = sec.items.some(i => i.status === 'fail');
                      const allDone = done === sec.items.length;
                      const isActive = activeSec === idx;
                      return (
                        <button
                          key={sec.title}
                          onClick={() => setActiveSec(idx)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all text-sm font-semibold
                            ${isActive ? 'bg-blue-600 text-white shadow-sm' :
                              hasFail ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                              allDone ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                              'text-gray-600 hover:bg-gray-100'}`}
                        >
                          <span className="text-sm">{sec.icon}</span>
                          <span className="flex-1 truncate text-xs">{sec.title}</span>
                          <span className={`text-xs font-normal tabular-nums ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                            {done}/{sec.items.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Horizontal tabs (mobile) */}
                  <div className="sm:hidden w-full">
                    <div className="overflow-x-auto -mx-4 px-4 mb-4">
                      <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
                        {sections.map((sec, idx) => {
                          const done = sec.items.filter(i => i.status !== '').length;
                          const hasFail = sec.items.some(i => i.status === 'fail');
                          const allDone = done === sec.items.length;
                          const isActive = activeSec === idx;
                          return (
                            <button
                              key={sec.title}
                              onClick={() => setActiveSec(idx)}
                              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all min-w-[64px]
                                ${isActive ? 'border-blue-500 bg-blue-50 text-blue-700' :
                                  hasFail ? 'border-red-200 bg-red-50 text-red-600' :
                                  allDone ? 'border-green-200 bg-green-50 text-green-700' :
                                  'border-gray-200 bg-white text-gray-500'}`}
                            >
                              <span className="text-base">{sec.icon}</span>
                              <span className="text-xs font-semibold text-center leading-tight">{sec.title}</span>
                              <span className="text-xs opacity-60">{done}/{sec.items.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Desktop section content */}
                  <div className="hidden sm:block flex-1">
                    <SectionPanel
                      sec={activeSec_}
                      secIdx={activeSec}
                      onUpdate={updateItem}
                      onPrev={activeSec > 0 ? () => setActiveSec(p => p - 1) : undefined}
                      onNext={activeSec < sections.length - 1 ? () => setActiveSec(p => p + 1) : undefined}
                    />
                  </div>
                </div>

                {/* Mobile section content */}
                <div className="sm:hidden">
                  <SectionPanel
                    sec={activeSec_}
                    secIdx={activeSec}
                    onUpdate={updateItem}
                    onPrev={activeSec > 0 ? () => setActiveSec(p => p - 1) : undefined}
                    onNext={activeSec < sections.length - 1 ? () => setActiveSec(p => p + 1) : undefined}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 4: Photos ── */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Inspection Photos</h2>
                  <p className="text-gray-500 mt-1 text-sm">Optional — photograph defects or overall condition</p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl py-12 flex flex-col items-center gap-3 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                    <Camera size={24} className="text-white" />
                  </div>
                  <div className="font-bold text-blue-700 text-lg">Add Photos</div>
                  <div className="text-sm text-blue-500">Tap to use camera or select from gallery</div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={handleImageSelect} className="hidden" />

                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imagePreviews.map((src, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm group"
                      >
                        <img src={src} alt="" className="w-full h-32 object-cover" />
                        <button
                          onClick={() => { setImageFiles(p => p.filter((_, j) => j !== i)); setImagePreviews(p => p.filter((_, j) => j !== i)); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center opacity-100 transition-opacity shadow"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4">No photos added yet</div>
                )}
              </div>
            )}

            {/* ── STEP 5: Review ── */}
            {step === 5 && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
                  <p className="text-gray-500 mt-1 text-sm">Confirm everything before submitting</p>
                </div>

                {/* Info summary */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  {[
                    { icon: <Truck size={16} className="text-blue-600" />, label: 'Trailer', val: selectedTrailer?.number },
                    { icon: <User size={16} className="text-blue-600" />, label: 'Technician', val: technicianName },
                    dotNumber ? { icon: <FileText size={16} className="text-blue-600" />, label: 'DOT Number', val: dotNumber } : null,
                    vin ? { icon: <FileText size={16} className="text-blue-600" />, label: 'VIN', val: vin } : null,
                    { icon: <ImageIcon size={16} className="text-blue-600" />, label: 'Photos', val: `${imagePreviews.length} photo(s)` },
                  ].filter(Boolean).map((row: any, i, arr) => (
                    <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {row.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{row.label}</div>
                        <div className="text-sm font-bold text-gray-900 mt-0.5">{row.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pass/Fail/NA stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Passed', val: passCount, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: <CheckCircle2 size={20} className="text-green-500" /> },
                    { label: 'Failed', val: failCount, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle size={20} className="text-red-500" /> },
                    { label: 'N/A', val: naCount, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertCircle size={20} className="text-amber-500" /> },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className={`${s.bg} border-2 ${s.border} rounded-xl p-4 flex flex-col items-center gap-1`}
                    >
                      {s.icon}
                      <div className={`text-3xl font-extrabold ${s.color}`}>{s.val}</div>
                      <div className={`text-xs font-semibold ${s.color} opacity-70`}>{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Overall status badge */}
                <div className={`rounded-xl px-5 py-4 flex items-center gap-3 border-2 ${failCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  {failCount > 0
                    ? <XCircle size={22} className="text-red-500 flex-shrink-0" />
                    : <CheckCircle2 size={22} className="text-green-500 flex-shrink-0" />}
                  <div>
                    <div className={`font-bold text-sm ${failCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {failCount > 0 ? 'Inspection Failed' : 'Inspection Passed'}
                    </div>
                    <div className={`text-xs mt-0.5 ${failCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {failCount > 0 ? `${failCount} item(s) need attention` : 'All items passed or marked N/A'}
                    </div>
                  </div>
                </div>

                {/* Failed items */}
                {failCount > 0 && (
                  <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-red-50 border-b border-red-200">
                      <div className="font-bold text-red-700 text-sm flex items-center gap-2">
                        <XCircle size={14} /> Failed Items
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sections.flatMap(s => s.items.filter(i => i.status === 'fail')).map(item => (
                        <div key={item.id} className="px-5 py-3">
                          <div className="font-semibold text-gray-800 text-sm">{item.label}</div>
                          {item.notes && <div className="text-red-500 text-xs mt-0.5">{item.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── MOBILE STICKY BOTTOM BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-40">
        <div className="flex gap-3">
          {step > 1 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => goTo(step - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm"
            >
              <ChevronLeft size={15} /> Back
            </motion.button>
          )}
          {step < 5 ? (
            <motion.button
              whileTap={{ scale: canNext ? 0.96 : 1 }}
              onClick={() => {
                if (canNext) goTo(step + 1);
                else toast.error(step === 1 ? 'Please select a trailer' : 'Please enter your name');
              }}
              className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors
                ${canNext ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Continue <ChevronRight size={15} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: submitting ? 1 : 0.96 }}
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                ${submitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-md'}`}
            >
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting...</> : <>Submit Inspection</>}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── DESKTOP BOTTOM ACTIONS ── */}
      <div className="hidden sm:block max-w-5xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div>
            {step > 1 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => goTo(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </motion.button>
            )}
          </div>
          <div>
            {step < 5 ? (
              <motion.button
                whileTap={{ scale: canNext ? 0.97 : 1 }}
                onClick={() => {
                  if (canNext) goTo(step + 1);
                  else toast.error(step === 1 ? 'Please select a trailer' : 'Please enter your name');
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors
                  ${canNext ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Continue <ChevronRight size={14} />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: submitting ? 1 : 0.97 }}
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm
                  ${submitting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'}`}
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <>Submit Inspection</>}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SECTION PANEL COMPONENT ── */
function SectionPanel({
  sec, secIdx, onUpdate, onPrev, onNext,
}: {
  sec: InspectionSection;
  secIdx: number;
  onUpdate: (si: number, ii: number, field: 'status' | 'notes', val: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <motion.div
      key={secIdx}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <span className="text-xl">{sec.icon}</span>
        <div className="flex-1">
          <div className="font-bold text-gray-900 text-sm">{sec.title}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {sec.items.filter(i => i.status !== '').length} / {sec.items.length} checked
          </div>
        </div>
        {/* Inline mini progress */}
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${(sec.items.filter(i => i.status !== '').length / sec.items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {sec.items.map((item, ii) => (
          <div key={item.id} className="px-5 py-4">
            <div className="font-semibold text-gray-800 text-sm mb-3">{item.label}</div>

            <div className="flex gap-2">
              {[
                { val: 'pass', label: 'Pass', Icon: CheckCircle2, active: 'bg-green-600 text-white border-green-600 shadow-sm', inactive: 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:bg-green-50' },
                { val: 'fail', label: 'Fail', Icon: XCircle, active: 'bg-red-500 text-white border-red-500 shadow-sm', inactive: 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:bg-red-50' },
                { val: 'na', label: 'N/A', Icon: AlertCircle, active: 'bg-amber-500 text-white border-amber-500 shadow-sm', inactive: 'bg-white text-gray-500 border-gray-200 hover:border-amber-300 hover:bg-amber-50' },
              ].map(btn => (
                <motion.button
                  key={btn.val}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onUpdate(secIdx, ii, 'status', btn.val)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all
                    ${item.status === btn.val ? btn.active : btn.inactive}`}
                >
                  <btn.Icon size={13} />
                  {btn.label}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {item.status === 'fail' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <input
                    value={item.notes || ''}
                    onChange={e => onUpdate(secIdx, ii, 'notes', e.target.value)}
                    placeholder="Describe the issue..."
                    className="w-full px-3 py-2.5 border-2 border-red-300 rounded-lg text-sm text-gray-800 bg-red-50 focus:border-red-500 focus:outline-none placeholder-red-300"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Prev / Next navigation */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
        {onPrev ? (
          <button onClick={onPrev} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            <ChevronLeft size={13} /> Previous
          </button>
        ) : <div />}
        <div className="flex-1" />
        {onNext && (
          <button onClick={onNext} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
            Next <ChevronRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}