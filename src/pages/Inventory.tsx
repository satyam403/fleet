import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import {
  getInventory,
  addInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from '../services/airtable';
import type { InventoryItem } from '../services/airtable';
import { toast } from 'sonner';
import {
  Plus,
  Loader2,
  Package,
  AlertTriangle,
  Trash2,
  Pencil,
  X,
  Check,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Add Form default state
// ─────────────────────────────────────────────
const defaultForm = {
  name: '',
  quantity: 0,
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

const defaultEditFields = { available: 0, used: 0, pending: 0 };

export function Inventory() {
  const { t } = useTranslation();

  const [inventory, setInventory]     = useState<InventoryItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [formData, setFormData]       = useState(defaultForm);

  // ── Inline edit state ──
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    available: number;
    used: number;
    pending: number;
  }>(defaultEditFields);
  const [savingEdit, setSavingEdit] = useState(false);

  // ─────────────────────────────────────────────
  // FIX 1: useCallback so loadInventory can safely
  //        go into the useEffect dependency array
  // ─────────────────────────────────────────────
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      toast.error('Failed to load inventory');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX 1 continued: proper dependency array
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function cancelEdit() {
    setEditingId(null);
    // FIX 2: reset editFields when cancelling so
    //        stale values don't bleed into next edit
    setEditFields(defaultEditFields);
  }

  // ─────────────────────────────────────────────
  // ADD
  // ─────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim() || formData.quantity <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await addInventoryItem({
        name:      formData.name.trim(),
        available: formData.quantity,
        used:      0,
        pending:   0,
        dateAdded: formData.date,
        notes:     formData.notes.trim(),
      });

      toast.success(t('inventory.addForm.success'));
      setShowAddForm(false);
      setFormData(defaultForm);
      loadInventory();
    } catch (error) {
      toast.error('Failed to add inventory item');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm(t('common.confirmDelete'))) return;

    setDeletingId(id);
    try {
      await deleteInventoryItem(id);
      toast.success('Inventory item deleted');
      setInventory(prev => prev.filter(i => i.id !== id));

      // FIX 3: if the item being deleted is currently
      //        in edit mode, clear edit state too
      if (editingId === id) {
        cancelEdit();
      }
    } catch (error) {
      toast.error('Failed to delete item');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  // ─────────────────────────────────────────────
  // EDIT — start
  // ─────────────────────────────────────────────
  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditFields({
      available: item.available,
      used:      item.used,
      pending:   item.pending,
    });
  }

  // ─────────────────────────────────────────────
  // EDIT — save
  // ─────────────────────────────────────────────
  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      await updateInventoryItem(id, {
        available: editFields.available,
        used: editFields.used,
        pending: editFields.pending,
      } as Partial<InventoryItem>);
      toast.success('Item updated');
      setInventory(prev =>
        prev.map(i => (i.id === id ? { ...i, ...editFields } : i))
      );
      // FIX 2 continued: always reset editFields on save too
      cancelEdit();
    } catch (error) {
      toast.error('Failed to update item');
      console.error(error);
    } finally {
      setSavingEdit(false);
    }
  }

  // ─────────────────────────────────────────────
  // LOADING SKELETON
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('inventory.addNew')}
        </button>
      </div>

      {/* ── Add Form Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('inventory.addForm.title')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('inventory.addForm.itemName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('inventory.addForm.itemPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('inventory.addForm.quantity')} *
                </label>
                <input
                  type="number"
                  min="1"
                  // FIX 4: show empty string instead of 0 so field
                  //        doesn't look pre-filled; avoids || 0 masking
                  value={formData.quantity === 0 ? '' : formData.quantity}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      // FIX 4 continued: keep 0 only when field is
                      //                  actually empty, not on every NaN
                      quantity: val === '' ? 0 : parseInt(val, 10),
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('inventory.addForm.date')} *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('inventory.addForm.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('inventory.addForm.notesPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData(defaultForm);
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('inventory.addForm.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('inventory.addForm.submit')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {inventory.length === 0 ? (
        <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('inventory.noItems')}</p>
        </div>
      ) : (

        /* ── Inventory Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.map(item => {
            const stockStatus =
              item.available === 0
                ? 'outOfStock'
                : item.available < 10
                ? 'lowStock'
                : 'normal';

            const isEditing  = editingId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {stockStatus !== 'normal' && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-orange-600">
                            {t(`inventory.${stockStatus}`)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {!isEditing ? (
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit quantities"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={savingEdit}
                          className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-gray-400"
                          title="Save"
                        >
                          {savingEdit
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Check className="w-4 h-4" />
                          }
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(item.id)}
                      // FIX 5: disable delete while any edit is saving
                      //        to prevent race condition
                      disabled={isDeleting || savingEdit}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {isDeleting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">

                  {/* Available */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('inventory.available')}</span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editFields.available}
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            available: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 text-right px-2 py-1 border border-blue-300 rounded-lg text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-lg font-bold text-blue-600">{item.available}</span>
                    )}
                  </div>

                  {/* Used */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('inventory.used')}</span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editFields.used}
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            used: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 text-right px-2 py-1 border border-green-300 rounded-lg text-sm font-bold text-green-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-green-600">{item.used}</span>
                    )}
                  </div>

                  {/* Pending */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('inventory.pending')}</span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editFields.pending}
                        onChange={e =>
                          setEditFields({
                            ...editFields,
                            pending: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-20 text-right px-2 py-1 border border-orange-300 rounded-lg text-sm font-bold text-orange-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-orange-600">{item.pending}</span>
                    )}
                  </div>

                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">{item.notes}</p>
                  </div>
                )}

                {/* Date */}
                {item.dateAdded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Added: {new Date(item.dateAdded).toLocaleDateString()}
                    </p>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}