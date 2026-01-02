/**
 * Reachouts Page
 * 
 * CRM-style leads inbox with AI-powered outreach generation.
 * Features:
 * - Leads table with filtering and search
 * - Lead detail view with activity timeline
 * - AI content generation (emails, call scripts, LinkedIn)
 * - Outreach status indicators
 * - Automation status
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, getThemeClasses } from '../context/ThemeContext';
import { apiService } from '../services/api';
import OutreachModal from '../components/OutreachModal';
import {
  Users, Search, Plus, Filter, Mail, Phone, Linkedin,
  MoreVertical, ChevronRight, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, Send, RefreshCw, MessageSquare,
  Building2, MapPin, Calendar, Activity, Eye, MousePointer,
  TrendingUp, FileText, Loader2, X, ChevronDown, Upload,
  Zap, Target, ArrowRight, Copy, Check, Edit3, Trash2,
  FileSpreadsheet, Link2, Database, CloudDownload, Facebook,
  Chrome, Table, ExternalLink
} from 'lucide-react';

// Lead status configuration
const LEAD_STATUSES = {
  new: { label: 'New', color: 'bg-blue-500', textColor: 'text-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  engaged: { label: 'Engaged', color: 'bg-purple-500', textColor: 'text-purple-500' },
  qualified: { label: 'Qualified', color: 'bg-green-500', textColor: 'text-green-500' },
  meeting_scheduled: { label: 'Meeting', color: 'bg-indigo-500', textColor: 'text-indigo-500' },
  proposal_sent: { label: 'Proposal', color: 'bg-orange-500', textColor: 'text-orange-500' },
  negotiating: { label: 'Negotiating', color: 'bg-pink-500', textColor: 'text-pink-500' },
  won: { label: 'Won', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  lost: { label: 'Lost', color: 'bg-red-500', textColor: 'text-red-500' },
  unresponsive: { label: 'Unresponsive', color: 'bg-gray-500', textColor: 'text-gray-500' },
  not_interested: { label: 'Not Interested', color: 'bg-slate-500', textColor: 'text-slate-500' },
  do_not_contact: { label: 'DNC', color: 'bg-red-700', textColor: 'text-red-700' }
};

// Types
interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  role?: string;
  seniority?: string;
  company: {
    name: string;
    website?: string;
    industry?: string;
    size?: string;
    location?: string;
  };
  source: string;
  status: string;
  score: number;
  outreachStatus: {
    emailsSent: number;
    emailsOpened: number;
    emailsReplied: number;
    callsAttempted: number;
    callsConnected: number;
    lastContactedAt?: string;
    lastResponseAt?: string;
  };
  automation: {
    isActive: boolean;
    currentStep: number;
  };
  activities: Array<{
    type: string;
    description: string;
    createdAt: string;
    metadata?: any;
  }>;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  outreach: {
    emailsSent: number;
    emailsOpened: number;
    emailsReplied: number;
    openRate: string;
    replyRate: string;
  };
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  connected: boolean;
  available: boolean;
}

// Lead source options for filtering
const LEAD_SOURCES = {
  manual: { label: 'Manual', icon: 'edit' },
  import: { label: 'Excel/CSV', icon: 'file-spreadsheet' },
  meta_ads: { label: 'Meta Ads', icon: 'facebook' },
  google_ads: { label: 'Google Ads', icon: 'chrome' },
  hubspot: { label: 'HubSpot', icon: 'database' },
  zoho_crm: { label: 'Zoho CRM', icon: 'database' },
  salesforce: { label: 'Salesforce', icon: 'database' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin' },
  website: { label: 'Website', icon: 'globe' },
  referral: { label: 'Referral', icon: 'users' },
  other: { label: 'Other', icon: 'folder' }
};

const Reachouts: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = getThemeClasses(isDarkMode);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  
  // Generation state
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [generateType, setGenerateType] = useState('cold_email');
  
  // Readiness state
  const [isReady, setIsReady] = useState(true);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  
  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  
  // Add lead form
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    companyName: '',
    companyWebsite: '',
    companyIndustry: '',
    source: 'manual'
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    checkReadiness();
    fetchIntegrations();
  }, [statusFilter, sourceFilter, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch separately to identify which call fails
      console.log('=== FETCHING DATA ===');
      
      let leadsRes: any = null;
      let statsRes: any = null;
      
      try {
        console.log('Calling getLeads...');
        leadsRes = await apiService.getLeads({ 
          status: statusFilter || undefined,
          source: sourceFilter || undefined,
          search: searchQuery || undefined 
        });
        console.log('getLeads returned:', leadsRes);
      } catch (leadsErr: any) {
        console.error('getLeads THREW ERROR:', leadsErr.message);
      }
      
      try {
        console.log('Calling getLeadStats...');
        statsRes = await apiService.getLeadStats();
        console.log('getLeadStats returned:', statsRes);
      } catch (statsErr: any) {
        console.error('getLeadStats THREW ERROR:', statsErr.message);
      }
      
      console.log('=== PROCESSING RESULTS ===');
      console.log('leadsRes:', leadsRes);
      console.log('statsRes:', statsRes);
      
      if (leadsRes?.success && leadsRes?.data?.leads) {
        console.log('✅ Setting leads:', leadsRes.data.leads.length, 'leads');
        setLeads(leadsRes.data.leads);
      } else {
        console.error('❌ leadsRes failed or no leads:', leadsRes);
        setLeads([]);
      }
      
      if (statsRes?.success && statsRes?.data) {
        console.log('✅ Setting stats:', statsRes.data);
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('fetchData outer catch:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkReadiness = async () => {
    try {
      const res = await apiService.checkReachoutReadiness();
      if (res.success) {
        setIsReady(res.data.isReady);
        setMissingFields(res.data.missingFields || []);
      }
    } catch (error) {
      console.error('Failed to check readiness:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await apiService.getIntegrations();
      if (res.success) {
        setIntegrations(res.data.integrations);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(ext)) {
      setUploadError('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    setUploadProgress(null);
    
    try {
      const result = await apiService.uploadLeadsFile(file);
      
      if (result.success) {
        setUploadProgress({
          imported: result.data.imported,
          failed: result.data.failed,
          duplicates: result.data.duplicates,
          skippedByAI: result.data.skippedByAI,
          totalProcessed: result.data.totalProcessed
        });
        
        // Refresh leads list
        fetchData();
        
        // Close modal after 3 seconds if successful
        if (result.data.imported > 0) {
          setTimeout(() => {
            setShowImportModal(false);
            setUploadProgress(null);
          }, 3000);
        }
      }
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddLead = async () => {
    try {
      const leadData = {
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        email: newLead.email,
        phone: newLead.phone,
        role: newLead.role,
        company: {
          name: newLead.companyName,
          website: newLead.companyWebsite,
          industry: newLead.companyIndustry
        },
        source: newLead.source
      };
      
      const res = await apiService.createLead(leadData);
      if (res.success) {
        setShowAddLeadModal(false);
        setNewLead({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: '',
          companyName: '',
          companyWebsite: '',
          companyIndustry: '',
          source: 'manual'
        });
        fetchData();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add lead');
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedLead) return;
    
    setGeneratingContent(true);
    setGeneratedContent(null);
    
    try {
      let res;
      if (generateType === 'call_script') {
        res = await apiService.generateCallScript({ leadId: selectedLead._id });
      } else if (generateType === 'linkedin_connection' || generateType === 'linkedin_message') {
        res = await apiService.generateLinkedIn({ 
          leadId: selectedLead._id, 
          type: generateType === 'linkedin_connection' ? 'connection' : 'message' 
        });
      } else {
        res = await apiService.generateEmail({ leadId: selectedLead._id, type: generateType });
      }
      
      if (res.success) {
        setGeneratedContent(res.data);
      } else {
        alert(res.message || 'Failed to generate content');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to generate content');
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await apiService.updateLead(leadId, { status: newStatus });
      fetchData();
      if (selectedLead?._id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      await apiService.deleteLead(leadId);
      setSelectedLead(null);
      setShowLeadModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  // Render stats cards
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className={`p-4 rounded-xl ${theme.bgCard}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${theme.text}`}>{stats?.total || 0}</p>
            <p className={`text-sm ${theme.textSecondary}`}>Total Leads</p>
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${theme.bgCard}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Send className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${theme.text}`}>{stats?.outreach.emailsSent || 0}</p>
            <p className={`text-sm ${theme.textSecondary}`}>Emails Sent</p>
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${theme.bgCard}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Eye className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${theme.text}`}>{stats?.outreach.openRate || 0}%</p>
            <p className={`text-sm ${theme.textSecondary}`}>Open Rate</p>
          </div>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${theme.bgCard}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <MessageSquare className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className={`text-2xl font-bold ${theme.text}`}>{stats?.outreach.replyRate || 0}%</p>
            <p className={`text-sm ${theme.textSecondary}`}>Reply Rate</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render readiness warning
  const renderReadinessWarning = () => {
    if (isReady) return null;
    
    return (
      <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-500">Complete Your Profile</h3>
            <p className={`text-sm ${theme.textSecondary} mt-1`}>
              AI-powered outreach requires your company context. Please complete these fields:
            </p>
            <ul className="mt-2 text-sm text-yellow-500">
              {missingFields.map(field => (
                <li key={field}>• {field.replace('.', ' → ')}</li>
              ))}
            </ul>
            <button 
              onClick={() => navigate('/onboarding')}
              className="mt-3 px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors"
            >
              Complete Profile
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render leads table
  const renderLeadsTable = () => (
    <div className={`rounded-xl overflow-hidden ${theme.bgCard}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-3">
        <h2 className={`text-lg font-semibold ${theme.text}`}>Leads Inbox</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-2 rounded-lg text-sm ${theme.bgSecondary} ${theme.text} border-none outline-none w-64`}
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme.bgSecondary} ${statusFilter || sourceFilter ? 'text-[#ffcc29]' : theme.textSecondary} hover:text-white text-sm`}
            >
              <Filter className="w-4 h-4" />
              {statusFilter || sourceFilter ? 'Filtered' : 'Filter'}
              {(statusFilter || sourceFilter) && (
                <span className="bg-[#ffcc29] text-black text-xs px-1.5 rounded-full">
                  {(statusFilter ? 1 : 0) + (sourceFilter ? 1 : 0)}
                </span>
              )}
            </button>
            
            {showFilters && (
              <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl ${theme.bgCard} border border-slate-700/50 z-20`}>
                <div className="p-3 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <p className={`text-xs font-semibold ${theme.textSecondary} mb-2`}>STATUS</p>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                    >
                      <option value="">All Statuses</option>
                      {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Source Filter */}
                  <div>
                    <p className={`text-xs font-semibold ${theme.textSecondary} mb-2`}>SOURCE</p>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                    >
                      <option value="">All Sources</option>
                      {Object.entries(LEAD_SOURCES).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Clear Filters */}
                  {(statusFilter || sourceFilter) && (
                    <button
                      onClick={() => { setStatusFilter(''); setSourceFilter(''); setShowFilters(false); }}
                      className="w-full px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${theme.bgSecondary} ${theme.text} hover:bg-[#ffcc29]/20 hover:text-[#ffcc29] transition-colors`}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          
          {/* Bulk Outreach Button - shows when leads selected */}
          {selectedLeadIds.size > 0 && (
            <button
              onClick={() => setShowOutreachModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Outreach ({selectedLeadIds.size})
            </button>
          )}
          
          {/* Add Lead */}
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ffcc29] text-black rounded-lg text-sm font-semibold hover:bg-[#ffcc29]/80"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>
      
      {/* Bulk Selection Bar */}
      {selectedLeadIds.size > 0 && (
        <div className={`mb-4 p-3 rounded-lg ${theme.bgSecondary} border ${theme.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className={`font-medium ${theme.text}`}>{selectedLeadIds.size} leads selected</span>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className={`text-sm ${theme.textSecondary} hover:text-red-400`}
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOutreachModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#ffcc29] text-black rounded-lg text-sm font-medium hover:bg-[#ffcc29]/80"
            >
              <Sparkles className="w-4 h-4" />
              AI Outreach Campaign
            </button>
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b border-slate-700/50 ${theme.bgSecondary}`}>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeadIds(new Set(leads.map(l => l._id)));
                    } else {
                      setSelectedLeadIds(new Set());
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-400 text-[#ffcc29] focus:ring-[#ffcc29]"
                />
              </th>
              <th className={`text-left p-3 text-xs font-semibold ${theme.textSecondary}`}>LEAD</th>
              <th className={`text-left p-3 text-xs font-semibold ${theme.textSecondary}`}>COMPANY</th>
              <th className={`text-left p-3 text-xs font-semibold ${theme.textSecondary}`}>STATUS</th>
              <th className={`text-left p-3 text-xs font-semibold ${theme.textSecondary}`}>OUTREACH</th>
              <th className={`text-left p-3 text-xs font-semibold ${theme.textSecondary}`}>AUTOMATION</th>
              <th className={`text-left p-3 text-xs font-semibold ${theme.textSecondary}`}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr 
                key={lead._id} 
                className={`border-b border-slate-700/30 hover:${theme.bgSecondary} cursor-pointer transition-colors ${selectedLeadIds.has(lead._id) ? 'bg-[#ffcc29]/10' : ''}`}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.has(lead._id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedLeadIds);
                      if (e.target.checked) {
                        newSelected.add(lead._id);
                      } else {
                        newSelected.delete(lead._id);
                      }
                      setSelectedLeadIds(newSelected);
                    }}
                    className="w-4 h-4 rounded border-gray-400 text-[#ffcc29] focus:ring-[#ffcc29]"
                  />
                </td>
                <td className="p-3" onClick={() => { setSelectedLead(lead); setShowLeadModal(true); }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffcc29] to-[#ffcc29]/60 flex items-center justify-center text-black font-bold">
                      {lead.firstName?.[0] || '?'}{lead.lastName?.[0] || ''}
                    </div>
                    <div>
                      <p className={`font-medium ${theme.text}`}>{lead.firstName || 'Unknown'} {lead.lastName || ''}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>{lead.role || 'No role'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div>
                    <p className={`font-medium ${theme.text}`}>{lead.company?.name || 'Unknown Company'}</p>
                    <p className={`text-sm ${theme.textSecondary}`}>{lead.company?.industry || 'Unknown industry'}</p>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${LEAD_STATUSES[lead.status as keyof typeof LEAD_STATUSES]?.color || 'bg-gray-500'} text-white`}>
                    {LEAD_STATUSES[lead.status as keyof typeof LEAD_STATUSES]?.label || lead.status || 'New'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Emails sent">
                      <Mail className={`w-4 h-4 ${theme.textSecondary}`} />
                      <span className={`text-sm ${theme.text}`}>{lead.outreachStatus?.emailsSent || 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Opens">
                      <Eye className={`w-4 h-4 ${theme.textSecondary}`} />
                      <span className={`text-sm ${theme.text}`}>{lead.outreachStatus?.emailsOpened || 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Replies">
                      <MessageSquare className={`w-4 h-4 ${theme.textSecondary}`} />
                      <span className={`text-sm ${theme.text}`}>{lead.outreachStatus?.emailsReplied || 0}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {lead.automation?.isActive ? (
                    <span className="flex items-center gap-1 text-green-500 text-sm">
                      <Zap className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className={`text-sm ${theme.textSecondary}`}>—</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => { setSelectedLead(lead); setShowGenerateModal(true); }}
                      className="p-2 rounded-lg hover:bg-[#ffcc29]/20 text-[#ffcc29]"
                      title="Generate AI content"
                      disabled={!isReady}
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button 
                      className={`p-2 rounded-lg hover:${theme.bgSecondary} ${theme.textSecondary}`}
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {leads.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Users className={`w-12 h-12 mx-auto mb-4 ${theme.textSecondary}`} />
            <p className={`text-lg font-medium ${theme.text}`}>No leads yet</p>
            <p className={`text-sm ${theme.textSecondary} mt-1`}>Add your first lead to get started</p>
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="mt-4 px-4 py-2 bg-[#ffcc29] text-black rounded-lg text-sm font-semibold"
            >
              Add Lead
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render lead detail modal
  const renderLeadModal = () => {
    if (!showLeadModal || !selectedLead) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${theme.bgCard}`}>
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffcc29] to-[#ffcc29]/60 flex items-center justify-center text-black text-2xl font-bold">
                {selectedLead.firstName[0]}{selectedLead.lastName?.[0] || ''}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${theme.text}`}>
                  {selectedLead.firstName} {selectedLead.lastName}
                </h2>
                <p className={`${theme.textSecondary}`}>
                  {selectedLead.role || 'No role'} at {selectedLead.company.name}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${LEAD_STATUSES[selectedLead.status as keyof typeof LEAD_STATUSES]?.color || 'bg-gray-500'} text-white`}>
                    {LEAD_STATUSES[selectedLead.status as keyof typeof LEAD_STATUSES]?.label || selectedLead.status}
                  </span>
                  {selectedLead.score > 0 && (
                    <span className={`text-sm ${theme.textSecondary}`}>Score: {selectedLead.score}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setShowLeadModal(false)} className={`p-2 rounded-lg hover:${theme.bgSecondary}`}>
              <X className={`w-5 h-5 ${theme.textSecondary}`} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 grid grid-cols-3 gap-6">
            {/* Left column - Details */}
            <div className="col-span-2 space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3`}>CONTACT INFORMATION</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Mail className={`w-4 h-4 ${theme.textSecondary}`} />
                    <span className={theme.text}>{selectedLead.email}</span>
                  </div>
                  {selectedLead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className={`w-4 h-4 ${theme.textSecondary}`} />
                      <span className={theme.text}>{selectedLead.phone}</span>
                    </div>
                  )}
                  {selectedLead.linkedinUrl && (
                    <div className="flex items-center gap-3">
                      <Linkedin className={`w-4 h-4 ${theme.textSecondary}`} />
                      <a href={selectedLead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#ffcc29] hover:underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Company Info */}
              <div>
                <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3`}>COMPANY</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-4 h-4 ${theme.textSecondary}`} />
                    <span className={theme.text}>{selectedLead.company.name}</span>
                  </div>
                  {selectedLead.company.industry && (
                    <div className="flex items-center gap-3">
                      <Target className={`w-4 h-4 ${theme.textSecondary}`} />
                      <span className={theme.text}>{selectedLead.company.industry}</span>
                    </div>
                  )}
                  {selectedLead.company.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className={`w-4 h-4 ${theme.textSecondary}`} />
                      <span className={theme.text}>{selectedLead.company.location}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Activity Timeline */}
              <div>
                <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3`}>ACTIVITY TIMELINE</h3>
                <div className="space-y-3">
                  {selectedLead.activities.slice(0, 10).map((activity, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${theme.bgSecondary}`}>
                      <div className="p-1.5 rounded-full bg-[#ffcc29]/20">
                        <Activity className="w-3 h-3 text-[#ffcc29]" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${theme.text}`}>{activity.description || activity.type.replace('_', ' ')}</p>
                        <p className={`text-xs ${theme.textSecondary} mt-1`}>
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedLead.activities.length === 0 && (
                    <p className={`text-sm ${theme.textSecondary}`}>No activity yet</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right column - Actions */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className={`p-4 rounded-xl ${theme.bgSecondary}`}>
                <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => { setShowLeadModal(false); setShowGenerateModal(true); }}
                    disabled={!isReady}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[#ffcc29] text-black rounded-lg text-sm font-semibold hover:bg-[#ffcc29]/80 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate AI Content
                  </button>
                  <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${theme.text} hover:${theme.bgCard}`}>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </button>
                  <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${theme.text} hover:${theme.bgCard}`}>
                    <Phone className="w-4 h-4" />
                    Log Call
                  </button>
                </div>
              </div>
              
              {/* Status Change */}
              <div className={`p-4 rounded-xl ${theme.bgSecondary}`}>
                <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Change Status</h3>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleStatusChange(selectedLead._id, e.target.value)}
                  className={`w-full p-2 rounded-lg ${theme.bgCard} ${theme.text} border-none outline-none text-sm`}
                >
                  {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Outreach Stats */}
              <div className={`p-4 rounded-xl ${theme.bgSecondary}`}>
                <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Outreach Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme.textSecondary}`}>Emails Sent</span>
                    <span className={`text-sm font-medium ${theme.text}`}>{selectedLead.outreachStatus.emailsSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme.textSecondary}`}>Opens</span>
                    <span className={`text-sm font-medium ${theme.text}`}>{selectedLead.outreachStatus.emailsOpened}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme.textSecondary}`}>Replies</span>
                    <span className={`text-sm font-medium ${theme.text}`}>{selectedLead.outreachStatus.emailsReplied}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme.textSecondary}`}>Calls</span>
                    <span className={`text-sm font-medium ${theme.text}`}>{selectedLead.outreachStatus.callsAttempted}</span>
                  </div>
                </div>
              </div>
              
              {/* Delete */}
              <button
                onClick={() => handleDeleteLead(selectedLead._id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/20 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render add lead modal
  const renderAddLeadModal = () => {
    if (!showAddLeadModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className={`w-full max-w-lg rounded-2xl ${theme.bgCard}`}>
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className={`text-xl font-bold ${theme.text}`}>Add New Lead</h2>
            <button onClick={() => setShowAddLeadModal(false)} className={`p-2 rounded-lg hover:${theme.bgSecondary}`}>
              <X className={`w-5 h-5 ${theme.textSecondary}`} />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>First Name *</label>
                <input
                  type="text"
                  value={newLead.firstName}
                  onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
                  className={`w-full p-3 rounded-lg ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                  placeholder="John"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Last Name</label>
                <input
                  type="text"
                  value={newLead.lastName}
                  onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
                  className={`w-full p-3 rounded-lg ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Email *</label>
              <input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className={`w-full p-3 rounded-lg ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                placeholder="john@company.com"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Role</label>
              <input
                type="text"
                value={newLead.role}
                onChange={(e) => setNewLead({ ...newLead, role: e.target.value })}
                className={`w-full p-3 rounded-lg ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                placeholder="Marketing Director"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Company Name *</label>
              <input
                type="text"
                value={newLead.companyName}
                onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                className={`w-full p-3 rounded-lg ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                placeholder="Acme Inc."
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${theme.textSecondary} mb-1`}>Industry</label>
              <input
                type="text"
                value={newLead.companyIndustry}
                onChange={(e) => setNewLead({ ...newLead, companyIndustry: e.target.value })}
                className={`w-full p-3 rounded-lg ${theme.bgSecondary} ${theme.text} border-none outline-none`}
                placeholder="SaaS, E-commerce, etc."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowAddLeadModal(false)}
                className={`flex-1 py-3 rounded-lg ${theme.bgSecondary} ${theme.text} font-semibold`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                disabled={!newLead.firstName || !newLead.email || !newLead.companyName}
                className="flex-1 py-3 rounded-lg bg-[#ffcc29] text-black font-semibold disabled:opacity-50"
              >
                Add Lead
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render import modal with integrations
  const renderImportModal = () => {
    if (!showImportModal) return null;
    
    const getIntegrationIcon = (iconName: string) => {
      switch (iconName) {
        case 'facebook': return <Facebook className="w-6 h-6" />;
        case 'google': return <Chrome className="w-6 h-6" />;
        case 'database': return <Database className="w-6 h-6" />;
        case 'file-spreadsheet': return <FileSpreadsheet className="w-6 h-6" />;
        default: return <Link2 className="w-6 h-6" />;
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl ${theme.bgCard}`}>
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${theme.text}`}>Import Leads</h2>
              <p className={`text-sm ${theme.textSecondary} mt-1`}>
                Connect your ad accounts, CRMs, or upload spreadsheets
              </p>
            </div>
            <button 
              onClick={() => { setShowImportModal(false); setUploadProgress(null); setUploadError(null); }} 
              className={`p-2 rounded-lg hover:${theme.bgSecondary}`}
            >
              <X className={`w-5 h-5 ${theme.textSecondary}`} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Ad Platforms Section */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3 flex items-center gap-2`}>
                <TrendingUp className="w-4 h-4" />
                AD PLATFORMS
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Meta Ads */}
                <div className={`p-4 rounded-xl border-2 border-dashed ${theme.bgSecondary} border-slate-600 opacity-60`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Facebook className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme.text}`}>Meta Ads</h4>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Import leads from Facebook & Instagram ads
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Google Ads */}
                <div className={`p-4 rounded-xl border-2 border-dashed ${theme.bgSecondary} border-slate-600 opacity-60`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <Chrome className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme.text}`}>Google Ads</h4>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Import leads from Google Ads campaigns
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CRM Integrations Section */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3 flex items-center gap-2`}>
                <Database className="w-4 h-4" />
                CRM INTEGRATIONS
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* HubSpot */}
                <div className={`p-4 rounded-xl border-2 border-dashed ${theme.bgSecondary} border-slate-600 opacity-60`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <Database className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme.text}`}>HubSpot</h4>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Sync leads with HubSpot CRM
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Zoho CRM */}
                <div className={`p-4 rounded-xl border-2 border-dashed ${theme.bgSecondary} border-slate-600 opacity-60`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Database className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme.text}`}>Zoho CRM</h4>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Sync leads with Zoho CRM
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Salesforce */}
                <div className={`p-4 rounded-xl border-2 border-dashed ${theme.bgSecondary} border-slate-600 opacity-60`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-400/20">
                      <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme.text}`}>Salesforce</h4>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Sync leads with Salesforce CRM
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Pipedrive */}
                <div className={`p-4 rounded-xl border-2 border-dashed ${theme.bgSecondary} border-slate-600 opacity-60`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Database className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme.text}`}>Pipedrive</h4>
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        Sync leads with Pipedrive CRM
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Excel/CSV Upload Section */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3 flex items-center gap-2`}>
                <FileSpreadsheet className="w-4 h-4" />
                SPREADSHEET UPLOAD
              </h3>
              
              <div 
                className={`p-6 rounded-xl border-2 border-dashed transition-colors ${
                  uploading 
                    ? 'border-[#ffcc29] bg-[#ffcc29]/10' 
                    : uploadError 
                      ? 'border-red-500 bg-red-500/10'
                      : uploadProgress 
                        ? 'border-green-500 bg-green-500/10'
                        : `border-slate-600 hover:border-[#ffcc29] ${theme.bgSecondary}`
                }`}
              >
                {!uploading && !uploadProgress && !uploadError && (
                  <div className="text-center">
                    <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${theme.textSecondary}`} />
                    <h4 className={`font-semibold ${theme.text} mb-1`}>Upload Excel or CSV</h4>
                    <p className={`text-sm ${theme.textSecondary} mb-4`}>
                      AI will automatically detect and filter relevant lead data
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="lead-file-upload"
                    />
                    <label
                      htmlFor="lead-file-upload"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#ffcc29] text-black rounded-lg font-semibold cursor-pointer hover:bg-[#ffcc29]/80 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </label>
                    <p className={`text-xs ${theme.textSecondary} mt-3`}>
                      Supported formats: .xlsx, .xls, .csv (max 10MB)
                    </p>
                  </div>
                )}
                
                {uploading && (
                  <div className="text-center py-4">
                    <Loader2 className="w-10 h-10 mx-auto mb-3 text-[#ffcc29] animate-spin" />
                    <h4 className={`font-semibold ${theme.text} mb-1`}>Processing File...</h4>
                    <p className={`text-sm ${theme.textSecondary}`}>
                      AI is analyzing and filtering your data
                    </p>
                  </div>
                )}
                
                {uploadError && (
                  <div className="text-center py-4">
                    <XCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
                    <h4 className="font-semibold text-red-500 mb-1">Upload Failed</h4>
                    <p className={`text-sm ${theme.textSecondary} mb-4`}>{uploadError}</p>
                    <button
                      onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                )}
                
                {uploadProgress && !uploading && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
                    <h4 className="font-semibold text-green-500 mb-2">Import Complete!</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div className={`p-3 rounded-lg ${theme.bgCard}`}>
                        <p className={`text-2xl font-bold text-green-500`}>{uploadProgress.imported}</p>
                        <p className={`text-xs ${theme.textSecondary}`}>Imported</p>
                      </div>
                      <div className={`p-3 rounded-lg ${theme.bgCard}`}>
                        <p className={`text-2xl font-bold text-yellow-500`}>{uploadProgress.duplicates}</p>
                        <p className={`text-xs ${theme.textSecondary}`}>Duplicates</p>
                      </div>
                      <div className={`p-3 rounded-lg ${theme.bgCard}`}>
                        <p className={`text-2xl font-bold text-purple-500`}>{uploadProgress.skippedByAI}</p>
                        <p className={`text-xs ${theme.textSecondary}`}>Filtered by AI</p>
                      </div>
                      <div className={`p-3 rounded-lg ${theme.bgCard}`}>
                        <p className={`text-2xl font-bold text-red-500`}>{uploadProgress.failed}</p>
                        <p className={`text-xs ${theme.textSecondary}`}>Failed</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setUploadProgress(null); }}
                      className="mt-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm"
                    >
                      Upload Another File
                    </button>
                  </div>
                )}
              </div>
              
              {/* AI Features Callout */}
              <div className={`mt-4 p-4 rounded-xl ${theme.bgSecondary} flex items-start gap-3`}>
                <Sparkles className="w-5 h-5 text-[#ffcc29] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className={`font-semibold ${theme.text} text-sm`}>AI-Powered Data Cleaning</h4>
                  <p className={`text-xs ${theme.textSecondary} mt-1`}>
                    Our AI automatically detects column headers, filters out unnecessary data like IDs and timestamps, 
                    validates emails, cleans phone numbers, and identifies duplicates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render generate content modal
  const renderGenerateModal = () => {
    if (!showGenerateModal || !selectedLead) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${theme.bgCard}`}>
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${theme.text}`}>Generate AI Content</h2>
              <p className={`text-sm ${theme.textSecondary} mt-1`}>
                For {selectedLead.firstName} {selectedLead.lastName} at {selectedLead.company.name}
              </p>
            </div>
            <button onClick={() => { setShowGenerateModal(false); setGeneratedContent(null); }} className={`p-2 rounded-lg hover:${theme.bgSecondary}`}>
              <X className={`w-5 h-5 ${theme.textSecondary}`} />
            </button>
          </div>
          
          <div className="p-6">
            {/* Content Type Selection */}
            <div className="mb-6">
              <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Content Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cold_email', label: 'Cold Email', icon: Mail },
                  { value: 'follow_up', label: 'Follow-up Email', icon: RefreshCw },
                  { value: 'meeting_request', label: 'Meeting Request', icon: Calendar },
                  { value: 'call_script', label: 'Call Script', icon: Phone },
                  { value: 'linkedin_connection', label: 'LinkedIn Invite', icon: Linkedin },
                  { value: 'linkedin_message', label: 'LinkedIn Message', icon: MessageSquare },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setGenerateType(type.value)}
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${
                      generateType === type.value 
                        ? 'bg-[#ffcc29] text-black' 
                        : `${theme.bgSecondary} ${theme.text} hover:bg-[#ffcc29]/20`
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Generate Button */}
            <button
              onClick={handleGenerateContent}
              disabled={generatingContent}
              className="w-full py-3 bg-[#ffcc29] text-black rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generatingContent ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Content
                </>
              )}
            </button>
            
            {/* Generated Content */}
            {generatedContent && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold ${theme.text}`}>Generated Content</h3>
                  <button
                    onClick={() => handleCopyContent(JSON.stringify(generatedContent.content, null, 2))}
                    className={`flex items-center gap-1 text-sm ${theme.textSecondary} hover:text-[#ffcc29]`}
                  >
                    <Copy className="w-4 h-4" />
                    Copy All
                  </button>
                </div>
                
                <div className={`p-4 rounded-xl ${theme.bgSecondary} space-y-4`}>
                  {generatedContent.content.subject && (
                    <div>
                      <label className={`block text-xs font-semibold ${theme.textSecondary} mb-1`}>SUBJECT</label>
                      <div className={`flex items-center justify-between p-2 rounded ${theme.bgCard}`}>
                        <p className={`text-sm ${theme.text}`}>{generatedContent.content.subject}</p>
                        <button 
                          onClick={() => handleCopyContent(generatedContent.content.subject)}
                          className={`p-1 ${theme.textSecondary} hover:text-[#ffcc29]`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {generatedContent.content.body && (
                    <div>
                      <label className={`block text-xs font-semibold ${theme.textSecondary} mb-1`}>BODY</label>
                      <div className={`p-3 rounded ${theme.bgCard}`}>
                        <p className={`text-sm ${theme.text} whitespace-pre-wrap`}>{generatedContent.content.body}</p>
                        <button 
                          onClick={() => handleCopyContent(generatedContent.content.body)}
                          className={`mt-2 flex items-center gap-1 text-xs ${theme.textSecondary} hover:text-[#ffcc29]`}
                        >
                          <Copy className="w-3 h-3" />
                          Copy Body
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {generatedContent.content.message && (
                    <div>
                      <label className={`block text-xs font-semibold ${theme.textSecondary} mb-1`}>MESSAGE</label>
                      <div className={`p-3 rounded ${theme.bgCard}`}>
                        <p className={`text-sm ${theme.text} whitespace-pre-wrap`}>{generatedContent.content.message}</p>
                        <button 
                          onClick={() => handleCopyContent(generatedContent.content.message)}
                          className={`mt-2 flex items-center gap-1 text-xs ${theme.textSecondary} hover:text-[#ffcc29]`}
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {generatedContent.content.opener && (
                    <div>
                      <label className={`block text-xs font-semibold ${theme.textSecondary} mb-1`}>CALL OPENER</label>
                      <p className={`text-sm ${theme.text} p-2 rounded ${theme.bgCard}`}>{generatedContent.content.opener}</p>
                    </div>
                  )}
                  
                  {generatedContent.content.pitch && (
                    <div>
                      <label className={`block text-xs font-semibold ${theme.textSecondary} mb-1`}>PITCH</label>
                      <p className={`text-sm ${theme.text} p-2 rounded ${theme.bgCard}`}>{generatedContent.content.pitch}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 text-[#ffcc29] animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${theme.text}`}>Reachouts</h1>
            <p className={`${theme.textSecondary} mt-1`}>
              AI-powered lead management and outreach
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ffcc29] text-black rounded-lg font-semibold hover:bg-[#ffcc29]/80"
          >
            <CloudDownload className="w-5 h-5" />
            Import Leads
          </button>
        </div>
        
        {/* Readiness Warning */}
        {renderReadinessWarning()}
        
        {/* Stats */}
        {renderStats()}
        
        {/* Quick Import Sources */}
        <div className={`mb-6 p-4 rounded-xl ${theme.bgCard}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${theme.text} flex items-center gap-2`}>
              <Link2 className="w-4 h-4 text-[#ffcc29]" />
              Import Sources
            </h3>
            <button 
              onClick={() => setShowImportModal(true)}
              className={`text-sm ${theme.textSecondary} hover:text-[#ffcc29] flex items-center gap-1`}
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Meta Ads */}
            <div className={`p-3 rounded-lg ${theme.bgSecondary} flex items-center gap-3 opacity-50 cursor-not-allowed`}>
              <Facebook className="w-5 h-5 text-blue-500" />
              <div>
                <p className={`text-sm font-medium ${theme.text}`}>Meta Ads</p>
                <p className="text-xs text-slate-500">Coming Soon</p>
              </div>
            </div>
            
            {/* Google Ads */}
            <div className={`p-3 rounded-lg ${theme.bgSecondary} flex items-center gap-3 opacity-50 cursor-not-allowed`}>
              <Chrome className="w-5 h-5 text-red-500" />
              <div>
                <p className={`text-sm font-medium ${theme.text}`}>Google Ads</p>
                <p className="text-xs text-slate-500">Coming Soon</p>
              </div>
            </div>
            
            {/* CRM */}
            <div className={`p-3 rounded-lg ${theme.bgSecondary} flex items-center gap-3 opacity-50 cursor-not-allowed`}>
              <Database className="w-5 h-5 text-orange-500" />
              <div>
                <p className={`text-sm font-medium ${theme.text}`}>CRM Sync</p>
                <p className="text-xs text-slate-500">Coming Soon</p>
              </div>
            </div>
            
            {/* Excel Upload */}
            <button 
              onClick={() => setShowImportModal(true)}
              className={`p-3 rounded-lg ${theme.bgSecondary} flex items-center gap-3 hover:bg-[#ffcc29]/20 transition-colors cursor-pointer text-left`}
            >
              <FileSpreadsheet className="w-5 h-5 text-green-500" />
              <div>
                <p className={`text-sm font-medium ${theme.text}`}>Excel/CSV</p>
                <p className="text-xs text-green-500">Available</p>
              </div>
            </button>
            
            {/* Manual */}
            <button 
              onClick={() => setShowAddLeadModal(true)}
              className={`p-3 rounded-lg ${theme.bgSecondary} flex items-center gap-3 hover:bg-[#ffcc29]/20 transition-colors cursor-pointer text-left`}
            >
              <Plus className="w-5 h-5 text-[#ffcc29]" />
              <div>
                <p className={`text-sm font-medium ${theme.text}`}>Add Manual</p>
                <p className="text-xs text-[#ffcc29]">Available</p>
              </div>
            </button>
          </div>
        </div>
        
        {/* Leads Table */}
        {renderLeadsTable()}
        
        {/* Modals */}
        {renderLeadModal()}
        {renderAddLeadModal()}
        {renderImportModal()}
        {renderGenerateModal()}
        
        {/* Outreach Campaign Modal */}
        <OutreachModal
          isOpen={showOutreachModal}
          onClose={() => {
            setShowOutreachModal(false);
            setSelectedLeadIds(new Set());
          }}
          selectedLeads={leads.filter(l => selectedLeadIds.has(l._id))}
          onSuccess={() => {
            fetchData();
            setSelectedLeadIds(new Set());
          }}
        />
      </div>
    </div>
  );
};

export default Reachouts;
