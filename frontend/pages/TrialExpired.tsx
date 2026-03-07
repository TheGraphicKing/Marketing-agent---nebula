import React, { useState } from 'react';
import { Clock, CreditCard, ArrowRight, Zap, CheckCircle, Loader2, ExternalLink, Check } from 'lucide-react';
import { apiService } from '../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface TrialExpiredProps {
  reason: 'time' | 'credits';
  daysUsed?: number;
  creditsUsed?: number;
  onLogout: () => void;
}

const TrialExpired: React.FC<TrialExpiredProps> = ({ reason, daysUsed = 7, creditsUsed = 100, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'gravity' | 'gravity_pulsar' | null>(null);

  const handleSubscribe = async (plan: 'gravity' | 'gravity_pulsar') => {
    setLoading(true);
    setSelectedPlan(plan);
    setError('');

    try {
      // Step 1: Create Razorpay order
      const orderData = await apiService.createPaymentOrder(plan);
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Nebulaa Gravity',
        description: orderData.plan?.description || 'Subscription',
        order_id: orderData.order.id,
        prefill: orderData.prefill,
        theme: {
          color: '#ffcc29',
          backdrop_color: 'rgba(7, 10, 18, 0.85)'
        },
        handler: async (response: any) => {
          // Payment successful — verify & migrate
          setLoading(false);
          setMigrating(true);
          try {
            const verifyResult = await apiService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResult.success) {
              setSuccess(true);
              setMigrating(false);
            } else {
              throw new Error(verifyResult.message || 'Verification failed');
            }
          } catch (err: any) {
            setMigrating(false);
            setError(err.message || 'Payment verified but migration failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setSelectedPlan(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setLoading(false);
        setSelectedPlan(null);
        setError(response.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();

    } catch (err: any) {
      setLoading(false);
      setSelectedPlan(null);
      setError(err.message || 'Something went wrong');
    }
  };

  // Success state — show prod URL
  if (success) {
    return (
      <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-4">
        <div className="max-w-lg w-full relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#ffcc29]/8 rounded-full blur-[128px]" />
          </div>

          <div className="relative bg-[#0d1117] border border-[#ffcc29]/30 rounded-2xl p-8 md:p-10 text-center">
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-[#ededed] mb-3">
              You're All Set! 🎉
            </h1>

            <p className="text-[#ededed]/60 text-base mb-8">
              Payment received and all your data has been migrated to your production account.
              Log in at your new URL with the same email and password.
            </p>

            <a
              href="https://gravity.nebulaa.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#ffcc29] hover:bg-[#e6b825] text-[#070A12] font-bold text-lg rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#ffcc29]/20"
            >
              Go to Gravity Production
              <ExternalLink className="w-5 h-5" />
            </a>

            <p className="text-[#ededed]/40 text-xs mt-4">
              gravity.nebulaa.ai — 1,000 credits/month + daily bonus
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Migrating state
  if (migrating) {
    return (
      <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-4">
        <div className="max-w-lg w-full relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#ffcc29]/5 rounded-full blur-[128px]" />
          </div>

          <div className="relative bg-[#0d1117] border border-slate-700/50 rounded-2xl p-8 md:p-10 text-center">
            <Loader2 className="w-12 h-12 text-[#ffcc29] animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-[#ededed] mb-2">Migrating Your Data...</h2>
            <p className="text-[#ededed]/50 text-sm">
              Transferring campaigns, analytics, brand assets and everything else to your production account. This takes a few seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const plans = [
    {
      key: 'gravity' as const,
      name: 'Gravity',
      price: '₹5,000',
      priceNum: 5000,
      tag: null,
      features: [
        '1,000 AI credits/month (auto-resets)',
        '+10 daily login bonus credits',
        'All demo data migrated instantly',
        'AI campaign & content generation',
        'Multi-platform social posting',
        'Competitor intelligence & tracking',
        'Gravity AI agent'
      ]
    },
    {
      key: 'gravity_pulsar' as const,
      name: 'Gravity + Pulsar',
      price: '₹10,000',
      priceNum: 10000,
      tag: 'BEST VALUE',
      features: [
        '1,000 AI credits/month (shared across agents)',
        '+10 daily login bonus credits',
        'All demo data migrated instantly',
        'AI campaign & content generation',
        'Multi-platform social posting',
        'Competitor intelligence & tracking',
        'Gravity AI agent',
        'Pulsar AI agent'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Glowing background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#ffcc29]/5 rounded-full blur-[128px]" />
        </div>

        <div className="relative text-center mb-8">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-[#ffcc29]/10 rounded-full flex items-center justify-center mb-6">
            {reason === 'time' ? (
              <Clock className="w-10 h-10 text-[#ffcc29]" />
            ) : (
              <Zap className="w-10 h-10 text-[#ffcc29]" />
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed] mb-3">
            {reason === 'time' 
              ? 'Your Free Trial Has Ended' 
              : 'Trial Credits Exhausted'}
          </h1>

          {/* Subtitle */}
          <p className="text-[#ededed]/60 text-base">
            {reason === 'time'
              ? `You've explored Nebulaa Gravity for ${daysUsed} days. Choose a plan to continue with all your data intact.`
              : `You've used all ${creditsUsed} trial credits. Choose a plan to get 1,000 monthly credits and keep growing.`}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative bg-[#0d1117] rounded-2xl p-6 md:p-8 text-left border transition-all duration-300 ${
                plan.tag
                  ? 'border-[#ffcc29]/40 shadow-lg shadow-[#ffcc29]/5'
                  : 'border-slate-700/50'
              }`}
            >
              {plan.tag && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ffcc29] text-[#070A12] text-xs font-bold px-3 py-1 rounded-full">
                  {plan.tag}
                </div>
              )}

              <h3 className="text-lg font-bold text-[#ededed] mb-1">{plan.name}</h3>
              <div className="mb-5">
                <span className="text-3xl font-bold text-[#ededed]">{plan.price}</span>
                <span className="text-[#ededed]/50 text-sm ml-1">/month</span>
              </div>

              <div className="space-y-2.5 mb-6">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#ffcc29] flex-shrink-0 mt-0.5" />
                    <span className="text-[#ededed]/75 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan.key)}
                disabled={loading}
                className={`w-full py-3.5 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                  plan.tag
                    ? 'bg-[#ffcc29] hover:bg-[#e6b825] text-[#070A12] shadow-lg shadow-[#ffcc29]/20 hover:shadow-[#ffcc29]/30'
                    : 'bg-[#ffcc29]/10 hover:bg-[#ffcc29]/20 text-[#ffcc29] border border-[#ffcc29]/30'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {loading && selectedPlan === plan.key ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Opening Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Choose {plan.name}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Secure badge */}
        <p className="text-[#ededed]/40 text-xs text-center">
          🔒 Secured by Razorpay • UPI, Cards, Net Banking accepted
        </p>

        {/* Logout link */}
        <div className="text-center mt-4">
          <button
            onClick={onLogout}
            className="text-[#ededed]/40 hover:text-[#ededed]/70 text-sm transition-colors underline"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialExpired;
