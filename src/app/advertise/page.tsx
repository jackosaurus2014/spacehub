'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';

const sponsorshipTiers = [
  {
    name: 'Bronze',
    price: '$500',
    period: '/mo',
    description: 'Get your brand in front of the space industry with foundational visibility.',
    features: [
      'Logo in footer',
      '1 sponsored post/month',
    ],
    highlight: false,
    color: 'amber',
  },
  {
    name: 'Silver',
    price: '$1,500',
    period: '/mo',
    description: 'Amplify your reach with multi-channel exposure across the SpaceNexus platform.',
    features: [
      'Banner ad rotation',
      '4 sponsored posts/month',
      'Newsletter mention',
    ],
    highlight: true,
    color: 'slate',
  },
  {
    name: 'Gold',
    price: '$3,000',
    period: '/mo',
    description: 'Maximum brand impact with dedicated sponsorship across content and events.',
    features: [
      'Dedicated module sponsorship',
      'Co-branded content',
      'Event sponsorship',
    ],
    highlight: false,
    color: 'yellow',
  },
];

const audienceStats = [
  { value: '10K+', label: 'Monthly Active Users' },
  { value: '85%', label: 'Space Industry Professionals' },
  { value: '45%', label: 'Decision Makers (Director+)' },
  { value: '8 min', label: 'Average Session Duration' },
];

const audienceDemographics = [
  {
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1h14.25M4.5 19.5h15" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Space Engineers',
    description: 'Systems, propulsion, thermal, and communications engineers building spacecraft and space systems.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
    title: 'Executives & Decision-Makers',
    description: 'C-suite leaders, VPs, and directors from aerospace companies making procurement and strategy decisions.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18v-.008zm-12 0h.008v.008H6v-.008z" />
      </svg>
    ),
    title: 'Investors & Analysts',
    description: 'Venture capitalists, private equity analysts, and financial professionals focused on the space economy.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    title: 'Government Professionals',
    description: 'Program managers, contracting officers, and policy staff from NASA, DoD, Space Force, and allied agencies.',
  },
];

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
}

export default function AdvertisePage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: 'Advertising Inquiry',
          message: `Company: ${formData.company}\n\n${formData.message}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(extractApiError(data, 'Failed to submit inquiry'));
      }

      setStatus('success');
      toast.success('Inquiry sent! Our partnerships team will be in touch.');
      setFormData({ name: '', email: '', company: '', message: '' });
    } catch (error) {
      setStatus('error');
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <AnimatedPageHeader
          title="Advertise on SpaceNexus"
          subtitle="Reach thousands of space industry decision-makers"
          accentColor="emerald"
        />

        <ScrollReveal className="mt-4 mb-16">
          <p className="text-center text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Space engineers, executives, investors, analysts, and government professionals rely on SpaceNexus for industry intelligence every day.
          </p>
        </ScrollReveal>

        {/* Audience Stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16" staggerDelay={0.1}>
          {audienceStats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="card p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-400 mt-2 font-medium">{stat.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Sponsorship Tiers */}
        <ScrollReveal className="mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
            Sponsorship Tiers
          </h2>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            Choose the level of visibility that matches your goals. All tiers include performance reporting and a dedicated account manager.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16" staggerDelay={0.12}>
          {sponsorshipTiers.map((tier) => (
            <StaggerItem key={tier.name}>
              <div
                className={`card p-8 relative h-full flex flex-col ${
                  tier.highlight ? 'border-white/15 glow-border' : ''
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{tier.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-400 text-sm">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                    tier.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/[0.05]'
                      : 'border border-white/[0.12] text-white hover:bg-white/[0.06]'
                  }`}
                >
                  Get Started
                </a>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Why Advertise With Us */}
        <ScrollReveal className="mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
            Why Advertise With Us
          </h2>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            SpaceNexus attracts the most engaged audience of space industry professionals across every segment of the value chain.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16" staggerDelay={0.12}>
          {audienceDemographics.map((demo) => (
            <StaggerItem key={demo.title}>
              <div className="card p-6 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    {demo.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{demo.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{demo.description}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Contact Form */}
        <ScrollReveal className="mb-16">
          <div className="max-w-2xl mx-auto" id="contact">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
              Get in Touch
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Interested in advertising on SpaceNexus? Tell us about your goals and our partnerships team will reach out with a tailored proposal.
            </p>

            {status === 'success' ? (
              <div className="card p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Inquiry Sent!</h3>
                <p className="text-slate-400 mb-6">
                  Thank you for your interest. Our partnerships team will be in touch within 1-2 business days.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="btn-primary"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <div className="card p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {status === 'error' && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label htmlFor="adv-name" className="block text-slate-400 text-sm mb-2">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adv-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      enterKeyHint="next"
                      value={formData.name}
                      onChange={handleChange}
                      className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Your name"
                      aria-required="true"
                      aria-invalid={errors.name ? true : undefined}
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="adv-email" className="block text-slate-400 text-sm mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adv-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      enterKeyHint="next"
                      value={formData.email}
                      onChange={handleChange}
                      className={`input w-full ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="you@company.com"
                      aria-required="true"
                      aria-invalid={errors.email ? true : undefined}
                    />
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="adv-company" className="block text-slate-400 text-sm mb-2">
                      Company <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adv-company"
                      name="company"
                      type="text"
                      autoComplete="organization"
                      enterKeyHint="next"
                      value={formData.company}
                      onChange={handleChange}
                      className={`input w-full ${errors.company ? 'border-red-500' : ''}`}
                      placeholder="Your company"
                      aria-required="true"
                      aria-invalid={errors.company ? true : undefined}
                    />
                    {errors.company && <p className="text-red-400 text-sm mt-1">{errors.company}</p>}
                  </div>

                  <div>
                    <label htmlFor="adv-message" className="block text-slate-400 text-sm mb-2">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="adv-message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className={`input w-full resize-none ${errors.message ? 'border-red-500' : ''}`}
                      placeholder="Tell us about your advertising goals, target audience, and budget range..."
                      aria-required="true"
                      aria-invalid={errors.message ? true : undefined}
                    />
                    {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </span>
                    ) : (
                      'Send Inquiry'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
