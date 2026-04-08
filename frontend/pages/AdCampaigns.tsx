import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Pause, Play, Plus, RotateCw, Target, Trash2, X } from 'lucide-react';
import { adCampaignsAPI, apiService } from '../services/api';
import { getThemeClasses, useTheme } from '../context/ThemeContext';
import { AdCampaign, Campaign } from '../types';

type PlatformSelection = 'meta' | 'google' | 'both';
type PlatformKey = 'meta' | 'google';

type LocationState = {
  campaignId?: string;
  campaign?: Campaign;
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const normalizeCampaignCaption = (campaign?: Campaign | null) =>
  String(campaign?.creative?.captions || campaign?.creative?.textContent || campaign?.description || '').trim();

const normalizeCampaignImage = (campaign?: Campaign | null) =>
  String(
    (Array.isArray(campaign?.creative?.imageUrls) && campaign?.creative?.imageUrls[0]) ||
      campaign?.creative?.videoUrl ||
      ''
  ).trim();

const normalizeCampaignHashtags = (campaign?: Campaign | null) => {
  const rawTags = Array.isArray(campaign?.creative?.hashtags) ? campaign?.creative?.hashtags : [];
  if (rawTags.length > 0) {
    return rawTags
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  }

  const caption = normalizeCampaignCaption(campaign);
  return (caption.match(/#[A-Za-z0-9_]+/g) || []).slice(0, 12);
};

const platformLabel = (selection: string) => {
  if (selection === 'meta') return 'Meta Ads';
  if (selection === 'google') return 'Google Ads';
  if (selection === 'both') return 'Meta + Google';
  return selection;
};

const compactDate = (value?: string) => {
  const ts = new Date(String(value || '')).getTime();
  if (!Number.isFinite(ts)) return '';
  return new Date(ts).toISOString().slice(0, 10);
};

const campaignSourceLabel = (campaign: Campaign) => {
  const name = String(campaign?.name || 'Campaign').trim();
  const platform = String(campaign?.platforms?.[0] || 'platform').trim().toLowerCase();
  const stamp =
    compactDate(campaign?.scheduling?.startDate) ||
    compactDate((campaign as any)?.createdAt) ||
    formatDateInput(new Date());
  return `${name} - ${platform} ${stamp}`;
};

type CampaignUiState = 'failed' | 'partial' | 'success';

const getSelectedPlatforms = (item: AdCampaign): PlatformKey[] =>
  item.platformSelection === 'both' ? ['meta', 'google'] : [item.platformSelection];

const getFailedPlatforms = (item: AdCampaign) => {
  const selected = getSelectedPlatforms(item);
  return selected.filter((name) => item?.platformStatus?.[name]?.status === 'failed');
};

const getCampaignUiState = (item: AdCampaign): CampaignUiState => {
  const selected = getSelectedPlatforms(item);
  const failed = getFailedPlatforms(item);
  const success = selected.filter((name) => item?.platformStatus?.[name]?.status === 'success');
  const rawStatus = String(item?.status || '').toLowerCase();

  if (failed.length === selected.length && failed.length > 0) return 'failed';
  if (failed.length > 0 && success.length > 0) return 'partial';
  if (rawStatus === 'failed') return 'failed';
  if (rawStatus === 'partial') return 'partial';
  return 'success';
};

const getStatusLabel = (uiState: CampaignUiState) => {
  if (uiState === 'failed') return 'Failed';
  if (uiState === 'partial') return 'Partially Completed';
  return 'Active';
};

const statusPillClass = (uiState: CampaignUiState, isDarkMode: boolean) => {
  if (uiState === 'failed') return 'bg-red-500/20 text-red-400';
  if (uiState === 'partial') return 'bg-amber-500/20 text-amber-400';
  if (uiState === 'success') return 'bg-emerald-500/20 text-emerald-400';
  return isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
};

const getFailedMessages = (item: AdCampaign) => {
  return getFailedPlatforms(item).map((name) => {
    const message = String(item?.platformStatus?.[name]?.message || 'Failed to process ad campaign');
    return `${platformLabel(name)}: ${message}`;
  });
};

const AdCampaigns: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = getThemeClasses(isDarkMode);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state || {}) as LocationState;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const [deleteModalItem, setDeleteModalItem] = useState<AdCampaign | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [platformSelection, setPlatformSelection] = useState<PlatformSelection>('meta');
  const [budget, setBudget] = useState('500');
  const [currency, setCurrency] = useState('INR');
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [endDate, setEndDate] = useState(formatDateInput(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)));

  const stateCampaignId = String(locationState?.campaignId || '').trim();
  const stateCampaign = locationState?.campaign;

  const campaignNameMap = useMemo(() => new Map(campaigns.map((campaign) => [campaign._id, campaign.name])), [campaigns]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign._id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const effectiveCampaign = selectedCampaign || stateCampaign || null;
  const prefilledTitle = String(effectiveCampaign?.name || '').trim();
  const prefilledDescription = normalizeCampaignCaption(effectiveCampaign);
  const prefilledHashtags = normalizeCampaignHashtags(effectiveCampaign);
  const prefilledCreative = normalizeCampaignImage(effectiveCampaign);

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');

      const [campaignRes, adRes] = await Promise.all([apiService.getCampaigns(), adCampaignsAPI.getAll()]);
      const nextCampaigns = Array.isArray(campaignRes?.campaigns) ? campaignRes.campaigns : [];
      const nextAds = Array.isArray(adRes?.adCampaigns) ? adRes.adCampaigns : [];

      setCampaigns(nextCampaigns);
      setAdCampaigns(nextAds);

      if (stateCampaignId && nextCampaigns.some((campaign) => campaign._id === stateCampaignId)) {
        setSelectedCampaignId(stateCampaignId);
        setIsCreateModalOpen(true);
      } else if (!selectedCampaignId && nextCampaigns.length > 0) {
        setSelectedCampaignId(nextCampaigns[0]._id);
      }
    } catch (err: any) {
      setPageError(err?.message || 'Failed to load ad campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stateCampaignId || campaigns.length === 0) return;
    if (campaigns.some((campaign) => campaign._id === stateCampaignId)) {
      setSelectedCampaignId(stateCampaignId);
    }
  }, [campaigns, stateCampaignId]);

  const closeCreateModal = () => {
    if (submitting) return;
    setIsCreateModalOpen(false);
    setModalError('');
  };

  const validateForm = () => {
    if (!selectedCampaignId) {
      return 'Standalone ads are disabled. You must select an existing campaign.';
    }

    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      return 'Budget must be greater than 0.';
    }

    if (!/^[A-Za-z]{3}$/.test(currency)) {
      return 'Currency must be a valid 3-letter code like INR or USD.';
    }

    if (!startDate || !endDate) {
      return 'Start date and end date are required.';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Please enter valid start and end dates.';
    }
    if (end <= start) {
      return 'End date must be after start date.';
    }

    return '';
  };

  const createAdCampaign = async () => {
    const validationError = validateForm();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      setPageError('');
      setPageSuccess('');

      const response = await adCampaignsAPI.create({
        campaignId: selectedCampaignId,
        platformSelection,
        budget: Number(budget),
        currency: currency.toUpperCase(),
        startDate,
        endDate
      });

      if (!response?.success || !response?.adCampaign) {
        setModalError(response?.message || 'Failed to create ad campaign.');
        return;
      }

      const nextItem = response.adCampaign as AdCampaign;
      setAdCampaigns((prev) => [nextItem, ...prev]);
      setPageSuccess(response?.message || 'Ad campaign created successfully.');
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create ad campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (item: AdCampaign) => {
    const nextStatus = item.status === 'paused' ? 'active' : 'paused';
    try {
      setUpdatingId(item._id);
      setPageError('');

      const response = await adCampaignsAPI.updateStatus(item._id, nextStatus);
      if (!response?.success || !response?.adCampaign) {
        setPageError(response?.message || 'Failed to update ad status.');
        return;
      }

      const updated = response.adCampaign as AdCampaign;
      setAdCampaigns((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)));
    } catch (err: any) {
      setPageError(err?.message || 'Failed to update ad status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const retryCampaign = async (item: AdCampaign) => {
    try {
      setRetryingId(item._id);
      setPageError('');
      setPageSuccess('');

      const response = await adCampaignsAPI.retry(item._id);
      if (!response?.success || !response?.adCampaign) {
        setPageError(response?.message || 'Failed to retry campaign.');
        return;
      }

      const updated = response.adCampaign as AdCampaign;
      setAdCampaigns((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)));
      setPageSuccess(response?.message || 'Campaign retried successfully.');
    } catch (err: any) {
      setPageError(err?.message || 'Failed to retry campaign.');
    } finally {
      setRetryingId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setDeleteModalItem(null);
  };

  const deleteCampaign = async () => {
    if (!deleteModalItem?._id) return;
    try {
      setDeletingId(deleteModalItem._id);
      setPageError('');
      setPageSuccess('');

      const response = await adCampaignsAPI.remove(deleteModalItem._id);
      if (!response?.success) {
        setPageError(response?.message || 'Failed to delete campaign.');
        return;
      }

      setAdCampaigns((prev) => prev.filter((entry) => entry._id !== deleteModalItem._id));
      setPageSuccess(response?.message || 'Campaign deleted successfully.');
      setDeleteModalItem(null);
    } catch (err: any) {
      setPageError(err?.message || 'Failed to delete campaign.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderCreateModal = () => {
    if (!isCreateModalOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && closeCreateModal()}
      >
        <div
          className={`w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden ${
            isDarkMode ? 'bg-[#161b22]' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <h3 className={`font-bold text-lg ${theme.text}`}>Create Ad Campaign</h3>
            <button
              type="button"
              onClick={closeCreateModal}
              className={`p-1 rounded-lg hover:bg-slate-500/20 ${theme.textSecondary}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-[#0d1117]' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${theme.textSecondary}`}>Source Campaign</p>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-[#0d1117] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="">Select campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign._id} value={campaign._id}>
                    {campaignSourceLabel(campaign)}
                  </option>
                ))}
              </select>
              <p className={`text-xs mt-2 ${theme.textMuted}`}>
                Standalone ads are disabled. You must select an existing campaign
              </p>
            </section>

            <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-[#0d1117]' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${theme.textSecondary}`}>Prefilled from Campaign</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className={`text-[11px] uppercase tracking-wide ${theme.textMuted}`}>Campaign Name</p>
                  <p className={`mt-1 font-semibold ${theme.text}`}>{prefilledTitle || 'No campaign selected'}</p>
                </div>
                <div>
                  <p className={`text-[11px] uppercase tracking-wide ${theme.textMuted}`}>Hashtags</p>
                  <p className={`mt-1 ${theme.textSecondary}`}>
                    {prefilledHashtags.length > 0 ? prefilledHashtags.join(' ') : 'No hashtags available'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className={`text-[11px] uppercase tracking-wide ${theme.textMuted}`}>Caption</p>
                  <p className={`mt-1 ${theme.textSecondary}`}>
                    {prefilledDescription || 'Campaign caption will be prefilled automatically.'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className={`text-[11px] uppercase tracking-wide mb-2 ${theme.textMuted}`}>Creative Preview</p>
                  {prefilledCreative ? (
                    <img src={prefilledCreative} alt="Campaign creative preview" className="w-full h-44 object-cover rounded-lg border border-slate-200/40" />
                  ) : (
                    <div className={`h-32 rounded-lg border flex items-center justify-center text-xs ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                      Creative preview unavailable
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-[#0d1117]' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${theme.textSecondary}`}>Ad Configuration</p>

              <div>
                <label className={`text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>
                  Platform Selection
                </label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { id: 'meta', label: 'Meta Ads' },
                    { id: 'google', label: 'Google Ads' },
                    { id: 'both', label: 'Both' }
                  ] as const).map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setPlatformSelection(platform.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        platformSelection === platform.id
                          ? 'border-[#ffcc29] bg-[#ffcc29]/15 text-[#ffcc29]'
                          : isDarkMode
                            ? 'border-slate-700 text-slate-300 hover:border-slate-500'
                            : 'border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {platform.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Budget</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${
                      isDarkMode ? 'bg-[#0d1117] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${
                      isDarkMode ? 'bg-[#0d1117] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {['INR', 'USD'].map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${
                      isDarkMode ? 'bg-[#0d1117] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${
                      isDarkMode ? 'bg-[#0d1117] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </section>

            {modalError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {modalError}
              </div>
            )}
          </div>

          <div className={`p-4 border-t flex items-center justify-end gap-2 ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={closeCreateModal}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={createAdCampaign}
              disabled={submitting || !selectedCampaignId}
              className="px-5 py-2 rounded-lg bg-[#ffcc29] text-[#070A12] font-semibold hover:bg-[#ffcc29]/90 disabled:opacity-60 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Create Ad Campaign
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (!deleteModalItem) return null;

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}
      >
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-[#161b22]' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <h3 className={`font-bold text-lg ${theme.text}`}>Delete Campaign</h3>
          </div>
          <div className="p-4">
            <p className={`text-sm ${theme.textSecondary}`}>
              Are you sure you want to delete this campaign?
            </p>
          </div>
          <div className={`p-4 border-t flex justify-end gap-2 ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={closeDeleteModal}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                isDarkMode
                  ? 'border-slate-700 text-slate-300 hover:border-slate-500'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
              disabled={!!deletingId}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteCampaign}
              disabled={!!deletingId}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Campaign
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center ${theme.text}`}>
        <Loader2 className="w-6 h-6 animate-spin text-[#ffcc29]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className={`text-2xl font-bold ${theme.text}`}>Ad Campaigns</h1>
        <button
          onClick={() => {
            setModalError('');
            setPageSuccess('');
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-[#ffcc29] text-[#070A12] font-semibold hover:bg-[#ffcc29]/90 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Ad Campaign
        </button>
      </div>

      {pageError && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {pageError}
        </div>
      )}

      {pageSuccess && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {pageSuccess}
        </div>
      )}

      <section className={`rounded-2xl border p-5 ${theme.bgCard} ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
        {adCampaigns.length === 0 && (
          <div className={`p-4 rounded-xl border text-sm ${isDarkMode ? 'border-slate-700 bg-[#0d1117] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            No ad campaigns yet. Create one from an existing campaign
          </div>
        )}

        <div className="space-y-3">
          {adCampaigns.map((item) => {
            const uiState = getCampaignUiState(item);
            const statusLabel = getStatusLabel(uiState);
            const failedMessages = getFailedMessages(item);
            const failedPlatformsLabel = getFailedPlatforms(item).map((name) => platformLabel(name)).join(', ');
            const linkedCampaignId = typeof item.campaignId === 'object' ? String(item.campaignId?._id || '') : String(item.campaignId || '');
            const linkedCampaignName =
              typeof item.campaignId === 'object'
                ? item.campaignId?.name || campaignNameMap.get(linkedCampaignId) || 'Campaign'
                : campaignNameMap.get(linkedCampaignId) || 'Campaign';

            return (
              <div key={item._id} className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-700 bg-[#0d1117]' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${theme.text}`}>{item.adTitle}</p>
                    <p className={`text-xs mt-1 ${theme.textSecondary}`}>
                      {linkedCampaignName} - {platformLabel(item.platformSelection)} - {item.budget.currency} {Number(item.budget.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${statusPillClass(uiState, isDarkMode)}`}>
                    {statusLabel}
                  </span>
                </div>

                {uiState === 'failed' && failedMessages.length > 0 && (
                  <div className={`mt-3 rounded-lg border p-3 text-xs ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {failedMessages.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                )}

                {uiState === 'partial' && failedPlatformsLabel && (
                  <div className={`mt-3 rounded-lg border p-3 text-xs ${isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                    Failed platforms: {failedPlatformsLabel}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className={`rounded-lg p-2 border ${isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                    <span className="font-semibold">Meta:</span> {item.platformStatus?.meta?.status || 'skipped'} - {item.platformStatus?.meta?.message || 'Not selected'}
                  </div>
                  <div className={`rounded-lg p-2 border ${isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                    <span className="font-semibold">Google:</span> {item.platformStatus?.google?.status || 'skipped'} - {item.platformStatus?.google?.message || 'Not selected'}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(uiState === 'failed' || uiState === 'partial') && (
                    <button
                      onClick={() => retryCampaign(item)}
                      disabled={retryingId === item._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ffcc29] text-[#070A12] hover:bg-[#ffcc29]/90 disabled:opacity-60 flex items-center gap-1"
                    >
                      {retryingId === item._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                      Retry Campaign
                    </button>
                  )}

                  {uiState === 'failed' && (
                    <button
                      onClick={() => setDeleteModalItem(item)}
                      disabled={deletingId === item._id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                        isDarkMode
                          ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                          : 'border-red-300 text-red-700 hover:bg-red-50'
                      } disabled:opacity-60`}
                    >
                      {deletingId === item._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Delete Campaign
                    </button>
                  )}

                  {uiState === 'success' && (item.status === 'active' || item.status === 'paused') && (
                    <button
                      onClick={() => toggleStatus(item)}
                      disabled={updatingId === item._id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                        isDarkMode ? 'border-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-300 text-slate-700 hover:border-slate-400'
                      } disabled:opacity-60`}
                    >
                      {updatingId === item._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : item.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      {item.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/analytics', { state: { adCampaignId: item._id } })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ffcc29]/15 text-[#ffcc29] hover:bg-[#ffcc29]/25"
                  >
                    View Performance Insights
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {renderCreateModal()}
      {renderDeleteModal()}
    </div>
  );
};

export default AdCampaigns;
