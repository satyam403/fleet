// src/pages/Inspection.tsx
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { getTrailers, createInspection } from "../services/api";
import { generateInspectionPDF, downloadPDF } from "../services/pdf";
import type { Trailer, InspectionCheckItem } from "../types";
import { toast } from "sonner";
import {
  Search, Loader2, Zap, Camera,
  CheckCircle2, XCircle, AlertCircle,
  Image as ImageIcon, X
} from "lucide-react";

/* ── Airtable ── */
const AT_KEY   = import.meta.env.VITE_AIRTABLE_API_KEY;
const AT_BASE  = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AT_TABLE = import.meta.env.VITE_AIRTABLE_INSPECTION_TABLE || "Inspections";
const AT_URL   = `https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}`;

interface Att { url: string; filename?: string; }

interface ATF {
  inspection_id?: string;
  asset_id?: string;
  asset_unit_number?: string;
  asset_type?: string;
  related_assets?: string;
  inspector_name?: string;
  mechanic_id?: string;
  verified_by?: string;
  verified_at?: string;
  overall_status?: string;
  status?: string;
  is_compliant?: boolean;
  is_sealed?: boolean;
  sealed?: boolean;
  passed?: boolean;
  inspection_type?: string;
  inspection_score?: number;
  issue_count?: number;
  issues_found?: string;
  work_orders_created?: number;
  documents_dot_status?: string;
  lights_status?: string;
  tires_status?: string;
  brakes_status?: string;
  suspension_axles_status?: string;
  frame_body_status?: string;
  tandems_landing_gear_status?: string;
  checklist_data?: string;
  mechanic_notes?: string;
  ai_notes?: string;
  notes?: string;
  photos?: Att[];
  next_due_date?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

async function saveAirtable(fields: ATF, imgs: File[]) {
  let photos: Att[] = [];
  if (imgs.length) {
    const res = await Promise.all(
      imgs.map(f => new Promise<Att | null>(ok => {
        const r = new FileReader();
        r.onload = e => ok({ url: e.target?.result as string, filename: f.name });
        r.onerror = () => ok(null);
        r.readAsDataURL(f);
      }))
    );
    photos = res.filter((x): x is Att => x !== null);
  }
  const clean = Object.fromEntries(
    Object.entries({ ...fields, photos: photos.length ? photos : undefined })
      .filter(([, v]) => v !== undefined && v !== "")
  );
  const r = await fetch(AT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${AT_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: clean }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || "Airtable error"); }
  return r.json();
}

interface QItem {
  id: string; label: string; icon: string;
  field: keyof ATF;
  status: "pass" | "fail" | "na" | "";
  notes: string;
}

const INIT_QITEMS: QItem[] = [
  { id: "brakes",  label: "Brakes",                 icon: "🛑", field: "brakes_status",               status: "", notes: "" },
  { id: "lights",  label: "Lights",                 icon: "💡", field: "lights_status",               status: "", notes: "" },
  { id: "tires",   label: "Tires",                  icon: "🛞", field: "tires_status",                status: "", notes: "" },
  { id: "docs",    label: "DOT Documents",          icon: "📋", field: "documents_dot_status",        status: "", notes: "" },
  { id: "susp",    label: "Suspension & Axles",     icon: "🔧", field: "suspension_axles_status",     status: "", notes: "" },
  { id: "frame",   label: "Frame & Body",           icon: "🏗️",  field: "frame_body_status",           status: "", notes: "" },
  { id: "tandems", label: "Tandems & Landing Gear", icon: "⚙️",  field: "tandems_landing_gear_status", status: "", notes: "" },
];

function StatusBtns({ status, onPass, onFail, onNA }:
  { status: string; onPass(): void; onFail(): void; onNA(): void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button type="button" onClick={onPass}
        className={"py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 " +
          (status === "pass" ? "bg-green-500 text-white shadow-md" : "bg-green-50 text-green-700 border-2 border-green-200")}>
        <CheckCircle2 className="w-4 h-4" /> Pass
      </button>
      <button type="button" onClick={onFail}
        className={"py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 " +
          (status === "fail" ? "bg-red-500 text-white shadow-md" : "bg-red-50 text-red-700 border-2 border-red-200")}>
        <XCircle className="w-4 h-4" /> Fail
      </button>
      <button type="button" onClick={onNA}
        className={"py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 " +
          (status === "na" ? "bg-amber-400 text-white shadow-md" : "bg-amber-50 text-amber-700 border-2 border-amber-200")}>
        <AlertCircle className="w-4 h-4" /> N/A
      </button>
    </div>
  );
}

export function Inspectionself() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"dot" | "quick">("dot");
  const [trailers, setTrailers] = useState<Trailer[]>([]);

  /* DOT tab state */
  const [dotTrailer, setDotTrailer] = useState<Trailer | null>(null);
  const [dotTech, setDotTech]       = useState("");
  const [dotSub, setDotSub]         = useState(false);
  const [dotQ, setDotQ]             = useState("");
  const [dotDrop, setDotDrop]       = useState(false);

  const checklistItems: InspectionCheckItem[] = [
    { id: "doc_dot",    label: t("inspection.documentDOT"),    status: "", comments: "" },
    { id: "lights",     label: t("inspection.lightStatus"),    status: "", comments: "" },
    { id: "tires",      label: t("inspection.tireStatus"),     status: "", comments: "" },
    { id: "brakes",     label: t("inspection.brakeStatus"),    status: "", comments: "" },
    { id: "suspension", label: t("inspection.suspensionAxle"), status: "", comments: "" },
    { id: "frame",      label: t("inspection.frameBody"),      status: "", comments: "" },
    { id: "tandem",     label: t("inspection.tandemLanding"),  status: "", comments: "" },
  ];
  const [checklist, setChecklist] = useState<InspectionCheckItem[]>(checklistItems);

  /* Quick tab state */
  const [qkTrailer, setQkTrailer] = useState<Trailer | null>(null);
  const [qkInsp, setQkInsp]       = useState("");
  const [qkNotes, setQkNotes]     = useState("");
  const [qkSub, setQkSub]         = useState(false);
  const [qkQ, setQkQ]             = useState("");
  const [qkDrop, setQkDrop]       = useState(false);
  const [qkItems, setQkItems]     = useState<QItem[]>(INIT_QITEMS);
  const [qkImgs, setQkImgs]       = useState<File[]>([]);
  const [qkPrev, setQkPrev]       = useState<string[]>([]);
  const qkRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getTrailers().then(setTrailers).catch(console.error); }, []);

  const dotFiltered = trailers.filter(t => t.number.toLowerCase().includes(dotQ.toLowerCase()));
  const qkFiltered  = trailers.filter(t => t.number.toLowerCase().includes(qkQ.toLowerCase()));

  /* DOT helpers */
  function updateChecklistItem(id: string, field: "status" | "comments", value: string) {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  async function handleDotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dotTrailer) { toast.error(t("inspection.selectTrailerFirst")); return; }
    if (!dotTech.trim()) { toast.error("Please enter technician name"); return; }
    setDotSub(true);
    try {
      const inspection = await createInspection({
        trailerId: dotTrailer.id, trailerNumber: dotTrailer.number,
        technicianName: dotTech.trim(), date: new Date().toISOString(), checklist,
      });
      const pdfBlob = await generateInspectionPDF(inspection);
      downloadPDF(pdfBlob, `Inspection-${inspection.trailerNumber}-${Date.now()}.pdf`);
      toast.success(t("inspection.success"), { description: t("inspection.pdfGenerated") });
      setDotTrailer(null); setDotQ(""); setDotTech(""); setChecklist(checklistItems);
    } catch {
      toast.error("Failed to submit inspection");
    } finally { setDotSub(false); }
  }

  /* Quick helpers */
  function addQkImgs(files: File[]) {
    const valid = files.filter(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 10 * 1024 * 1024)    { toast.error(`${f.name} is too large (max 10MB)`); return false; }
      return true;
    });
    if (!valid.length) return;
    setQkImgs(p => [...p, ...valid]);
    valid.forEach(f => {
      const r = new FileReader();
      r.onload = e => setQkPrev(p => [...p, e.target?.result as string]);
      r.readAsDataURL(f);
    });
    toast.success(`${valid.length} photo(s) added`);
  }

  function updQk(i: number, field: "status" | "notes", val: string) {
    setQkItems(p => p.map((it, x) => x !== i ? it : { ...it, [field]: val }));
  }

  async function handleQkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qkTrailer)     { toast.error("Select a trailer");    return; }
    if (!qkInsp.trim()) { toast.error("Enter inspector name"); return; }
    if (!qkItems.every(i => i.status !== "")) { toast.error("Check all items"); return; }

    setQkSub(true);
    try {
      let fail = 0, pass = 0;
      const defs: string[] = [];
      const secFields: Partial<ATF> = {};

      qkItems.forEach(it => {
        (secFields as any)[it.field] = it.status;
        if (it.status === "fail") {
          fail++;
          defs.push(`${it.label}${it.notes ? ": " + it.notes : ""}`);
        } else if (it.status === "pass") pass++;
      });

      const tot = pass + fail;
      const ok  = fail === 0;

      await saveAirtable({
        inspection_id:     `QINS-${Date.now()}`,
        asset_id:          qkTrailer.id,
        asset_unit_number: qkTrailer.number,
        asset_type:        "Trailer",
        inspector_name:    qkInsp.trim(),
        inspection_type:   "Quick",
        overall_status:    ok ? "passed" : "failed",
        status:            "completed",
        passed:            ok,
        is_compliant:      ok,
        inspection_score:  tot > 0 ? Math.round((pass / tot) * 100) : 0,
        issue_count:       fail,
        issues_found:      defs.join("\n") || "None",
        mechanic_notes:    qkNotes.trim() || undefined,
        checklist_data:    JSON.stringify(
          qkItems.map(i => ({ id: i.id, label: i.label, status: i.status, notes: i.notes }))
        ),
        next_due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        completed_at:  new Date().toISOString(),
        ...secFields,
      }, qkImgs);

      toast.success(
        ok ? "✅ Quick Inspection Passed!" : "⚠️ Issues Found!",
        { description: `${fail} issue(s) — Saved to Airtable` }
      );

      setQkTrailer(null); setQkQ(""); setQkInsp(""); setQkNotes("");
      setQkImgs([]); setQkPrev([]);
      setQkItems(INIT_QITEMS.map(i => ({ ...i })));
    } catch (err) {
      console.error(err); toast.error("Failed to save inspection");
    } finally { setQkSub(false); }
  }

  const qkDone = qkItems.filter(i => i.status !== "").length;
  const qkPct  = Math.round((qkDone / qkItems.length) * 100);

  return (
    <div className="max-w-4xl mx-auto">

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("dot")}
          className={"flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all " +
            (tab === "dot"
              ? "bg-blue-600 text-white border-blue-600 shadow"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300")}>
          📋 DOT Annual
        </button>
        <button
          onClick={() => setTab("quick")}
          className={"flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all " +
            (tab === "quick"
              ? "bg-blue-600 text-white border-blue-600 shadow"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300")}>
          <Zap className="w-4 h-4" /> Quick Check
        </button>
      </div>

      {/* ══ DOT ANNUAL — original form, untouched ══ */}
      {tab === "dot" && (
        <form onSubmit={handleDotSubmit} className="space-y-6">

          {/* Trailer Selection */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("inspection.selectTrailer")} *
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text" value={dotQ}
                  onChange={e => { setDotQ(e.target.value); setDotDrop(true); }}
                  onFocus={() => setDotDrop(true)}
                  placeholder={t("inspection.trailerPlaceholder")}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {dotDrop && dotFiltered.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {dotFiltered.map(trailer => (
                    <button key={trailer.id} type="button"
                      onClick={() => { setDotTrailer(trailer); setDotQ(trailer.number); setDotDrop(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0">
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
            {dotTrailer && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Selected:</span> {dotTrailer.number}
                  {dotTrailer.make && ` - ${dotTrailer.make} ${dotTrailer.model}`}
                </p>
              </div>
            )}
          </div>

          {/* Technician Name */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("inspection.technicianName")} *
            </label>
            <input type="text" value={dotTech} onChange={e => setDotTech(e.target.value)}
              placeholder={t("inspection.technicianPlaceholder")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required />
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("inspection.checklist")}</h2>
            <div className="space-y-6">
              {checklist.map(item => (
                <div key={item.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <p className="font-medium text-gray-900 mb-3">{item.label}</p>
                  <div className="flex gap-6 mb-3">
                    {(["pass", "fail", "na"] as const).map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`status-${item.id}`} value={s}
                          checked={item.status === s}
                          onChange={e => updateChecklistItem(item.id, "status", e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">{t(`inspection.${s}`)}</span>
                      </label>
                    ))}
                  </div>
                  <input type="text" value={item.comments}
                    onChange={e => updateChecklistItem(item.id, "comments", e.target.value)}
                    placeholder={t("inspection.commentsPlaceholder")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={dotSub || !dotTrailer}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {dotSub && <Loader2 className="w-5 h-5 animate-spin" />}
            {dotSub ? t("inspection.submitting") : t("inspection.submit")}
          </button>
        </form>
      )}

      {/* ══ QUICK CHECK — saves to Airtable ══ */}
      {tab === "quick" && (
        <form onSubmit={handleQkSubmit} className="space-y-4 max-w-2xl mx-auto pb-24">

          {/* Trailer */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-900 mb-3">🚛 Select Trailer *</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={qkQ}
                onChange={e => { setQkQ(e.target.value); setQkDrop(true); }}
                onFocus={() => setQkDrop(true)}
                placeholder="Search trailer number..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base" />
            </div>
            {qkDrop && qkFiltered.length > 0 && (
              <div className="mt-2 border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg max-h-56 overflow-y-auto">
                {qkFiltered.map(tr => (
                  <button key={tr.id} type="button"
                    onClick={() => { setQkTrailer(tr); setQkQ(tr.number); setQkDrop(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors">
                    <p className="font-bold text-gray-900">{tr.number}</p>
                    {tr.make && <p className="text-xs text-gray-500">{tr.make} {tr.model} {tr.year}</p>}
                  </button>
                ))}
              </div>
            )}
            {qkTrailer && (
              <div className="mt-3 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-blue-900">{qkTrailer.number}</p>
                  {qkTrailer.make && <p className="text-xs text-blue-700">{qkTrailer.make} {qkTrailer.model}</p>}
                </div>
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
            )}
          </div>

          {/* Inspector */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <label className="text-sm font-bold text-gray-900 mb-2 block">👷 Inspector Name *</label>
            <input type="text" value={qkInsp} onChange={e => setQkInsp(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required />
          </div>

          {/* Progress */}
          {qkDone > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">Progress</span>
                <span className={"text-sm font-bold " + (qkPct === 100 ? "text-green-600" : "text-blue-600")}>
                  {qkPct}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={"h-3 rounded-full transition-all duration-500 " + (qkPct === 100 ? "bg-green-500" : "bg-blue-600")}
                  style={{ width: `${qkPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">{qkDone} of {qkItems.length} items checked</p>
            </div>
          )}

          {/* Checklist cards */}
          <div className="space-y-3">
            {qkItems.map((item, idx) => (
              <div key={item.id} className={"bg-white rounded-2xl p-4 shadow-sm border-2 transition-all " +
                (item.status === "fail" ? "border-red-300"
                  : item.status === "pass" ? "border-green-300"
                  : item.status === "na"   ? "border-amber-300"
                  : "border-gray-100")}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{item.icon}</span>
                  <p className="font-bold text-gray-900 flex-1">{item.label}</p>
                  {item.status === "pass" && <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">✓ PASS</span>}
                  {item.status === "fail" && <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded-full">✗ FAIL</span>}
                  {item.status === "na"   && <span className="text-amber-600 font-bold text-xs bg-amber-100 px-2 py-1 rounded-full">N/A</span>}
                </div>
                <StatusBtns status={item.status}
                  onPass={() => updQk(idx, "status", item.status === "pass" ? "" : "pass")}
                  onFail={() => updQk(idx, "status", item.status === "fail" ? "" : "fail")}
                  onNA={()   => updQk(idx, "status", item.status === "na"   ? "" : "na")} />
                {item.status === "fail" && (
                  <input type="text" value={item.notes}
                    onChange={e => updQk(idx, "notes", e.target.value)}
                    placeholder="Describe the issue..."
                    className="mt-3 w-full px-3 py-2.5 border-2 border-red-300 rounded-xl text-sm bg-red-50 focus:ring-2 focus:ring-red-400 placeholder:text-red-400" />
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <label className="text-sm font-bold text-gray-900 mb-2 block">🗒️ Mechanic Notes (Optional)</label>
            <textarea value={qkNotes} onChange={e => setQkNotes(e.target.value)}
              placeholder="Additional observations..." rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none" />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">📸 Photos</p>
              <button type="button" onClick={() => qkRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-semibold active:scale-95 transition-all">
                <Camera className="w-4 h-4" /> Add Photo
              </button>
              <input ref={qkRef} type="file" accept="image/*" multiple capture="environment"
                onChange={e => addQkImgs(Array.from(e.target.files || []))} className="hidden" />
            </div>
            {qkPrev.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {qkPrev.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} className="w-full h-24 object-cover rounded-xl border-2 border-gray-100" />
                    <button type="button"
                      onClick={() => {
                        setQkImgs(p => p.filter((_, x) => x !== i));
                        setQkPrev(p => p.filter((_, x) => x !== i));
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">No photos added</p>
              </div>
            )}
          </div>

          {/* Fixed submit button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-gray-200 shadow-2xl z-40">
            <div className="max-w-2xl mx-auto">
              <button type="submit" disabled={qkSub || !qkTrailer || !qkInsp.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg">
                {qkSub
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving to Airtable...</>
                  : <><Zap className="w-5 h-5" /> Save Quick Inspection</>}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
