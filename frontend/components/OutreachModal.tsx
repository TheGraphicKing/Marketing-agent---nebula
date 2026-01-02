/**
 * OutreachModal Component
 * 
 * Modal for generating and sending AI-powered email campaigns.
 * Supports:
 * - AI-generated email sequences (initial + follow-ups)
 * - Email editing before sending
 * - Bulk email sending
 * - Email provider configuration
 */

import React, { useState, useEffect } from 'react';
import {
  X, Mail, Wand2, Send, Settings, ChevronDown, ChevronUp,
  Loader2, Check, AlertCircle, Edit3, Copy, Plus, Trash2,
  Users, Clock, Sparkles, Eye, EyeOff
} from 'lucide-react';
import { useTheme, getThemeClasses } from '../context/ThemeContext';
import { apiService } from '../services/api';

interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  company?: {
    name?: string;
    industry?: string;
  };
}

interface EmailMessage {
  stage: string;
  subject: string;
  body: string;
  delayDays: number;
  isEdited?: boolean;
}

interface OutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: Lead[];
  onSuccess?: () => void;
}

const OutreachModal: React.FC<OutreachModalProps> = ({
  isOpen,
  onClose,
  selectedLeads,
  onSuccess
}) => {
  const { isDarkMode } = useTheme();
  const theme = getThemeClasses(isDarkMode);
  
  // State
  const [step, setStep] = useState<'configure' | 'generate' | 'review' | 'send'>('configure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Email configuration
  const [emailProvider, setEmailProvider] = useState<string>('gmail');
  const [emailConfig, setEmailConfig] = useState({
    email: '',
    appPassword: '',
    apiKey: '',
    password: '',
    host: '',
    port: 587
  });
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  
  // Campaign settings
  const [campaignType, setCampaignType] = useState('cold_outreach');
  const [numFollowUps, setNumFollowUps] = useState(3);
  const [customInstructions, setCustomInstructions] = useState('');
  
  // Generated sequence
  const [sequence, setSequence] = useState<EmailMessage[]>([]);
  const [expandedEmail, setExpandedEmail] = useState<number>(0);
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  
  // Sending state
  const [sendingProgress, setSendingProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [sendResults, setSendResults] = useState<any[]>([]);
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Stage labels
  const stageLabels: Record<string, string> = {
    'initial': 'Initial Email',
    'follow_up_1': 'Follow-up #1 (3 days)',
    'follow_up_2': 'Follow-up #2 (5 days)',
    'follow_up_3': 'Follow-up #3 (7 days)',
    'follow_up_4': 'Follow-up #4 (14 days)'
  };

  if (!isOpen) return null;

  const handleConfigureEmail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const config: any = { provider: emailProvider };
      
      if (emailProvider === 'sendgrid') {
        config.apiKey = emailConfig.apiKey;
      } else if (emailProvider === 'gmail') {
        config.email = emailConfig.email;
        config.appPassword = emailConfig.appPassword;
      } else if (emailProvider === 'outlook') {
        config.email = emailConfig.email;
        config.password = emailConfig.password;
      } else if (emailProvider === 'smtp') {
        config.email = emailConfig.email;
        config.password = emailConfig.password;
        config.host = emailConfig.host;
        config.port = emailConfig.port;
      }
      
      const result = await apiService.configureEmail(config);
      
      if (result.success) {
        setIsEmailConfigured(true);
        setStep('generate');
      } else {
        setError(result.error || 'Failed to configure email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to configure email');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSequence = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.generateEmailSequence({
        leadIds: selectedLeads.map(l => l._id),
        campaignType,
        numFollowUps,
        customInstructions: customInstructions || undefined
      });
      
      if (result.success && result.data?.sequence?.sequence) {
        setSequence(result.data.sequence.sequence);
        setStep('review');
      } else {
        setError(result.error || result.message || 'Failed to generate sequence');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate sequence');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = (index: number, field: 'subject' | 'body', value: string) => {
    const updated = [...sequence];
    updated[index] = { ...updated[index], [field]: value, isEdited: true };
    setSequence(updated);
  };

  const handleSendEmails = async () => {
    setLoading(true);
    setError(null);
    setStep('send');
    setSendingProgress({ sent: 0, failed: 0, total: selectedLeads.length });
    
    try {
      const initialEmail = sequence.find(s => s.stage === 'initial');
      if (!initialEmail) {
        setError('No initial email in sequence');
        return;
      }
      
      const result = await apiService.sendDirectEmails({
        recipients: selectedLeads.map(l => ({
          email: l.email,
          firstName: l.firstName,
          lastName: l.lastName,
          company: l.company,
          role: l.role
        })),
        subject: initialEmail.subject,
        body: initialEmail.body,
        senderEmail: emailConfig.email,
        senderName: ''
      });
      
      if (result.success !== undefined) {
        setSendingProgress({
          sent: result.data?.sent || 0,
          failed: result.data?.failed || 0,
          total: result.data?.total || selectedLeads.length
        });
        setSendResults(result.data?.details || []);
        
        if (result.data?.sent > 0 && onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Configure Email Provider</h3>
        <p className={`${theme.textSecondary} text-sm mb-4`}>
          Connect your email account to send campaigns. Your credentials are used securely and not stored.
        </p>
      </div>
      
      {/* Provider Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'gmail', name: 'Gmail', icon: '📧' },
          { id: 'outlook', name: 'Outlook', icon: '📨' },
          { id: 'sendgrid', name: 'SendGrid', icon: '⚡' },
          { id: 'smtp', name: 'Custom SMTP', icon: '🔧' }
        ].map(provider => (
          <button
            key={provider.id}
            onClick={() => setEmailProvider(provider.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              emailProvider === provider.id
                ? 'border-yellow-500 bg-yellow-500/10'
                : `${theme.border} hover:border-yellow-500/50`
            }`}
          >
            <div className="text-2xl mb-2">{provider.icon}</div>
            <div className={`text-sm font-medium ${theme.text}`}>{provider.name}</div>
          </button>
        ))}
      </div>
      
      {/* Provider-specific fields */}
      <div className="space-y-4">
        {emailProvider === 'gmail' && (
          <>
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>Gmail Address</label>
              <input
                type="email"
                value={emailConfig.email}
                onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                placeholder="your@gmail.com"
                className={`w-full px-4 py-2 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>App Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={emailConfig.appPassword}
                  onChange={(e) => setEmailConfig({ ...emailConfig, appPassword: e.target.value })}
                  placeholder="Your Gmail App Password"
                  className={`w-full px-4 py-2 pr-10 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:${theme.text}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-xs ${theme.textSecondary} mt-1`}>
                <a 
                  href="https://myaccount.google.com/apppasswords" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-500 hover:underline"
                >
                  Generate an App Password
                </a> (requires 2-Step Verification)
              </p>
            </div>
          </>
        )}
        
        {emailProvider === 'sendgrid' && (
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-1`}>SendGrid API Key</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={emailConfig.apiKey}
                onChange={(e) => setEmailConfig({ ...emailConfig, apiKey: e.target.value })}
                placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                className={`w-full px-4 py-2 pr-10 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:${theme.text}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        
        {emailProvider === 'outlook' && (
          <>
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>Outlook Email</label>
              <input
                type="email"
                value={emailConfig.email}
                onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                placeholder="your@outlook.com"
                className={`w-full px-4 py-2 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                  placeholder="Your password"
                  className={`w-full px-4 py-2 pr-10 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:${theme.text}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
        
        {emailProvider === 'smtp' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-1`}>SMTP Host</label>
                <input
                  type="text"
                  value={emailConfig.host}
                  onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                  placeholder="smtp.example.com"
                  className={`w-full px-4 py-2 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-1`}>Port</label>
                <input
                  type="number"
                  value={emailConfig.port}
                  onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) })}
                  placeholder="587"
                  className={`w-full px-4 py-2 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>Email</label>
              <input
                type="email"
                value={emailConfig.email}
                onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                placeholder="your@email.com"
                className={`w-full px-4 py-2 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                  placeholder="Your password"
                  className={`w-full px-4 py-2 pr-10 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:${theme.text}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-500 text-sm">{error}</span>
        </div>
      )}
      
      <button
        onClick={handleConfigureEmail}
        disabled={loading || !emailConfig.email}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Settings className="w-5 h-5" />
            Connect Email
          </>
        )}
      </button>
    </div>
  );

  const renderGenerateStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Generate Email Sequence</h3>
        <p className={`${theme.textSecondary} text-sm`}>
          AI will generate personalized emails based on your company context and selected leads.
        </p>
      </div>
      
      {/* Selected Leads Summary */}
      <div className={`p-4 rounded-lg ${theme.bgCard} border ${theme.border}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className={`font-medium ${theme.text}`}>{selectedLeads.length} Recipients Selected</p>
            <p className={`text-sm ${theme.textSecondary}`}>
              {selectedLeads.slice(0, 3).map(l => l.firstName).join(', ')}
              {selectedLeads.length > 3 && ` +${selectedLeads.length - 3} more`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Campaign Type */}
      <div>
        <label className={`block text-sm font-medium ${theme.text} mb-2`}>Campaign Type</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'cold_outreach', name: 'Cold Outreach', desc: 'First contact' },
            { id: 'warm_lead', name: 'Warm Lead', desc: 'Showed interest' },
            { id: 'follow_up', name: 'Follow-up', desc: 'Continue conversation' },
            { id: 're_engagement', name: 'Re-engagement', desc: 'Win back' }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setCampaignType(type.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                campaignType === type.id
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : `${theme.border} hover:border-yellow-500/50`
              }`}
            >
              <p className={`font-medium ${theme.text}`}>{type.name}</p>
              <p className={`text-xs ${theme.textSecondary}`}>{type.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Number of Follow-ups */}
      <div>
        <label className={`block text-sm font-medium ${theme.text} mb-2`}>
          Follow-up Emails: {numFollowUps}
        </label>
        <input
          type="range"
          min="1"
          max="4"
          value={numFollowUps}
          onChange={(e) => setNumFollowUps(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
      </div>
      
      {/* Custom Instructions */}
      <div>
        <label className={`block text-sm font-medium ${theme.text} mb-2`}>
          Custom Instructions (Optional)
        </label>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="E.g., Mention our new product launch, focus on cost savings..."
          rows={3}
          className={`w-full px-4 py-2 rounded-lg ${theme.bgCard} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
        />
      </div>
      
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-500 text-sm">{error}</span>
        </div>
      )}
      
      <button
        onClick={handleGenerateSequence}
        disabled={loading}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating with AI...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Generate Email Sequence
          </>
        )}
      </button>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme.text}`}>Review Email Sequence</h3>
          <p className={`${theme.textSecondary} text-sm`}>
            Edit any email before sending. Click to expand.
          </p>
        </div>
        <button
          onClick={handleGenerateSequence}
          disabled={loading}
          className={`px-3 py-1.5 text-sm rounded-lg ${theme.bgCard} ${theme.text} border ${theme.border} hover:border-yellow-500 flex items-center gap-1`}
        >
          <Wand2 className="w-4 h-4" />
          Regenerate
        </button>
      </div>
      
      {/* Email Sequence */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {sequence.map((email, index) => (
          <div 
            key={index}
            className={`rounded-lg border ${theme.border} overflow-hidden`}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedEmail(expandedEmail === index ? -1 : index)}
              className={`w-full p-4 flex items-center justify-between ${theme.bgCard} hover:bg-opacity-80`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
                }`}>
                  {index + 1}
                </div>
                <div className="text-left">
                  <p className={`font-medium ${theme.text}`}>
                    {stageLabels[email.stage] || email.stage}
                  </p>
                  <p className={`text-sm ${theme.textSecondary} truncate max-w-[250px]`}>
                    {email.subject}
                  </p>
                </div>
                {email.isEdited && (
                  <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">
                    Edited
                  </span>
                )}
              </div>
              {expandedEmail === index ? (
                <ChevronUp className={`w-5 h-5 ${theme.textSecondary}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${theme.textSecondary}`} />
              )}
            </button>
            
            {/* Content */}
            {expandedEmail === index && (
              <div className={`p-4 border-t ${theme.border} space-y-4`}>
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-1`}>Subject</label>
                  <input
                    type="text"
                    value={email.subject}
                    onChange={(e) => handleUpdateEmail(index, 'subject', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg ${theme.bg} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-1`}>Body</label>
                  <textarea
                    value={email.body}
                    onChange={(e) => handleUpdateEmail(index, 'body', e.target.value)}
                    rows={8}
                    className={`w-full px-3 py-2 rounded-lg ${theme.bg} ${theme.text} ${theme.border} border focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm`}
                  />
                </div>
                <p className={`text-xs ${theme.textSecondary}`}>
                  💡 Use {'{{firstName}}'}, {'{{companyName}}'}, {'{{role}}'} for personalization
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Send Button */}
      <div className={`p-4 rounded-lg ${theme.bgCard} border ${theme.border}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-yellow-500" />
            <span className={`font-medium ${theme.text}`}>Ready to Send</span>
          </div>
          <span className={`text-sm ${theme.textSecondary}`}>
            {selectedLeads.length} recipients
          </span>
        </div>
        <p className={`text-sm ${theme.textSecondary} mb-4`}>
          Initial email will be sent now. Follow-ups will be scheduled automatically.
        </p>
        <button
          onClick={handleSendEmails}
          disabled={loading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Initial Email to {selectedLeads.length} Recipients
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderSendStep = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        {loading ? (
          <>
            <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-4" />
            <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Sending Emails...</h3>
            <p className={`${theme.textSecondary}`}>
              {sendingProgress.sent} of {sendingProgress.total} sent
            </p>
          </>
        ) : sendingProgress.failed === 0 ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Emails Sent Successfully!</h3>
            <p className={`${theme.textSecondary}`}>
              {sendingProgress.sent} emails delivered
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Partially Completed</h3>
            <p className={`${theme.textSecondary}`}>
              {sendingProgress.sent} sent, {sendingProgress.failed} failed
            </p>
          </>
        )}
      </div>
      
      {/* Results */}
      {sendResults.length > 0 && !loading && (
        <div className={`max-h-[200px] overflow-y-auto rounded-lg border ${theme.border}`}>
          {sendResults.map((result, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 border-b ${theme.border} last:border-b-0`}
            >
              <span className={`text-sm ${theme.text}`}>{result.to}</span>
              {result.success ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <span className="text-xs text-red-500">{result.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={onClose}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl ${theme.bgCard} rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-6 border-b ${theme.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme.text}`}>AI Outreach Campaign</h2>
              <p className={`text-sm ${theme.textSecondary}`}>
                {step === 'configure' && 'Step 1: Connect your email'}
                {step === 'generate' && 'Step 2: Generate sequence'}
                {step === 'review' && 'Step 3: Review & edit'}
                {step === 'send' && 'Step 4: Sending'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-500/20 ${theme.textSecondary}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Indicator */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {['configure', 'generate', 'review', 'send'].map((s, i) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-yellow-500 text-black' :
                  ['configure', 'generate', 'review', 'send'].indexOf(step) > i ? 'bg-green-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {['configure', 'generate', 'review', 'send'].indexOf(step) > i ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-1 rounded ${
                    ['configure', 'generate', 'review', 'send'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'configure' && renderConfigureStep()}
          {step === 'generate' && renderGenerateStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'send' && renderSendStep()}
        </div>
      </div>
    </div>
  );
};

export default OutreachModal;
