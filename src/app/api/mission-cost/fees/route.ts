export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type OrbitType = 'LEO' | 'SSO' | 'GTO' | 'GEO' | 'Lunar' | 'Mars' | 'Beyond';
export type PayloadType = 'communications' | 'earth_observation' | 'technology_demo' | 'science' | 'navigation' | 'military' | 'crewed';
export type LaunchSite = 'USA' | 'EU' | 'India' | 'Japan' | 'NewZealand' | 'International';

interface RegulatoryFee {
  agency: string;
  feeType: string;
  description: string;
  amount: number;
  required: boolean;
  processingTime: string;
  notes: string[];
  url: string;
}

interface RegulatoryFeesResponse {
  fees: RegulatoryFee[];
  totalFees: number;
  requiredFees: number;
  optionalFees: number;
  timeline: {
    minMonths: number;
    maxMonths: number;
    criticalPath: string[];
  };
  input: {
    payloadType: PayloadType;
    orbitType: OrbitType;
    launchSite: LaunchSite;
    hasSpectrum: boolean;
    hasRemoteSensing: boolean;
    isReentry: boolean;
  };
}

// ────────────────────────────────────────
// Fee Schedules
// ────────────────────────────────────────

interface FeeCalculationParams {
  payloadType: PayloadType;
  orbitType: OrbitType;
  launchSite: LaunchSite;
  hasSpectrum: boolean;
  hasRemoteSensing: boolean;
  isReentry: boolean;
}

function calculateFees(params: FeeCalculationParams): RegulatoryFee[] {
  const fees: RegulatoryFee[] = [];
  const { payloadType, orbitType, launchSite, hasSpectrum, hasRemoteSensing, isReentry } = params;

  // FAA Fees - Required for US launches
  if (launchSite === 'USA') {
    // FAA Launch License Application Fee
    fees.push({
      agency: 'FAA/AST',
      feeType: 'Launch License Application',
      description: 'Federal Aviation Administration launch or reentry license processing fee',
      amount: payloadType === 'crewed' ? 250000 : 84000,
      required: true,
      processingTime: '180 days (expedited: 120 days)',
      notes: [
        'Fee covers initial application review',
        'Additional fees for license modifications',
        'Expedited review available for additional fee',
        payloadType === 'crewed' ? 'Human spaceflight requires additional safety reviews' : 'Standard commercial payload',
      ],
      url: 'https://www.faa.gov/space/licenses',
    });

    // FAA Safety Review Fee
    fees.push({
      agency: 'FAA/AST',
      feeType: 'Safety Review Package',
      description: 'Flight safety analysis, collision avoidance, and debris assessment',
      amount: 35000 + (orbitType === 'GEO' ? 15000 : 0) + (orbitType === 'Lunar' || orbitType === 'Mars' ? 25000 : 0),
      required: true,
      processingTime: 'Concurrent with license review',
      notes: [
        'Includes orbital debris assessment',
        'Collision avoidance analysis',
        'Flight termination system review',
        orbitType === 'GEO' ? 'GEO slot coordination required' : '',
      ].filter(Boolean),
      url: 'https://www.faa.gov/space/safety',
    });

    // Reentry License
    if (isReentry) {
      fees.push({
        agency: 'FAA/AST',
        feeType: 'Reentry License',
        description: 'License for reentry vehicle operations',
        amount: 50000,
        required: true,
        processingTime: '180 days',
        notes: [
          'Required for any vehicle returning from orbit',
          'Covers reentry trajectory and landing zone',
          'Includes environmental impact assessment',
        ],
        url: 'https://www.faa.gov/space/licenses',
      });
    }
  }

  // FCC Fees - Required for US spectrum use
  if (launchSite === 'USA' && (hasSpectrum || payloadType === 'communications' || payloadType === 'navigation')) {
    // FCC Space Station Authorization
    fees.push({
      agency: 'FCC',
      feeType: 'Space Station Authorization',
      description: 'Authorization for satellite communications in US frequencies',
      amount: payloadType === 'communications' ? 156185 : 35000,
      required: true,
      processingTime: '12-18 months',
      notes: [
        'Covers uplink and downlink frequencies',
        'Requires ITU coordination',
        'NGSO systems require additional constellation analysis',
        'Annual regulatory fees apply post-authorization',
      ],
      url: 'https://www.fcc.gov/space',
    });

    // FCC Annual Regulatory Fee
    fees.push({
      agency: 'FCC',
      feeType: 'Annual Regulatory Fee',
      description: 'Ongoing annual fee for licensed space stations',
      amount: payloadType === 'communications' ? 135000 : 25000,
      required: true,
      processingTime: 'Annual - due October 1',
      notes: [
        'Annual fee for each fiscal year of operation',
        'Pro-rated for first partial year',
        'Late fees apply for missed payments',
      ],
      url: 'https://www.fcc.gov/regulatory-fees',
    });

    // Experimental License (for tech demos)
    if (payloadType === 'technology_demo') {
      fees.push({
        agency: 'FCC',
        feeType: 'Experimental License',
        description: 'Special temporary authority for experimental operations',
        amount: 15700,
        required: false,
        processingTime: '30-60 days',
        notes: [
          'Required for non-standard frequency use',
          'Limited duration authorization',
          'Cannot interfere with licensed services',
        ],
        url: 'https://www.fcc.gov/experimental-licensing',
      });
    }
  }

  // NOAA Remote Sensing License
  if (hasRemoteSensing || payloadType === 'earth_observation') {
    fees.push({
      agency: 'NOAA',
      feeType: 'Remote Sensing License',
      description: 'License for commercial remote sensing space systems',
      amount: 30000,
      required: true,
      processingTime: '120 days',
      notes: [
        'Required for Earth imaging satellites',
        'Covers ground resolution and distribution rights',
        'Shutter control provisions may apply',
        'Annual compliance reporting required',
      ],
      url: 'https://www.nesdis.noaa.gov/commercial-space',
    });

    // NOAA Annual License Fee
    fees.push({
      agency: 'NOAA',
      feeType: 'Annual License Fee',
      description: 'Annual license maintenance fee',
      amount: 11000,
      required: true,
      processingTime: 'Annual',
      notes: [
        'Due each year of satellite operation',
        'Includes compliance monitoring',
      ],
      url: 'https://www.nesdis.noaa.gov/commercial-space',
    });
  }

  // ITU Filing Fees
  if (hasSpectrum || payloadType === 'communications' || payloadType === 'navigation') {
    // ITU Coordination Request
    fees.push({
      agency: 'ITU',
      feeType: 'Advance Publication & Coordination',
      description: 'International frequency coordination filing',
      amount: orbitType === 'GEO' ? 87000 : 45000,
      required: true,
      processingTime: '4-7 years for GEO, 2-3 years for NGSO',
      notes: [
        'API (Advance Publication Information) filing',
        'Coordination with affected administrations',
        'Due diligence milestones required',
        orbitType === 'GEO' ? 'GEO arc coordination is competitive' : 'NGSO milestone requirements apply',
      ],
      url: 'https://www.itu.int/en/ITU-R/',
    });

    // ITU Notification Fee
    fees.push({
      agency: 'ITU',
      feeType: 'Notification & Recording',
      description: 'Master International Frequency Register recording',
      amount: 35000,
      required: true,
      processingTime: '6-12 months after coordination',
      notes: [
        'Recording in MIFR',
        'International protection of assignments',
        'Notification examination fee',
      ],
      url: 'https://www.itu.int/en/ITU-R/',
    });

    // Cost recovery fees for consultation
    fees.push({
      agency: 'ITU',
      feeType: 'Cost Recovery (Annual)',
      description: 'Annual cost recovery contribution',
      amount: 15000,
      required: true,
      processingTime: 'Annual',
      notes: [
        'Based on number of frequency assignments',
        'Supports ITU technical examination',
      ],
      url: 'https://www.itu.int/en/ITU-R/',
    });
  }

  // Environmental Review (NEPA)
  if (launchSite === 'USA') {
    fees.push({
      agency: 'FAA/EPA',
      feeType: 'Environmental Review',
      description: 'National Environmental Policy Act (NEPA) review',
      amount: payloadType === 'crewed' ? 150000 : 75000,
      required: true,
      processingTime: '12-24 months (EIS may be longer)',
      notes: [
        'Environmental Assessment or EIS required',
        'Covers launch site and landing zone impacts',
        'Public comment period required',
        'May be covered by existing site-wide EIS',
      ],
      url: 'https://www.faa.gov/space/environmental',
    });
  }

  // Debris Mitigation Filing
  if (orbitType !== 'Lunar' && orbitType !== 'Mars' && orbitType !== 'Beyond') {
    fees.push({
      agency: 'FCC/FAA',
      feeType: 'Orbital Debris Mitigation Plan',
      description: 'Debris mitigation plan review and approval',
      amount: 25000,
      required: true,
      processingTime: 'Concurrent with license review',
      notes: [
        '25-year deorbit rule compliance',
        'Passivation requirements',
        'Collision avoidance capability',
        'Post-mission disposal plan',
      ],
      url: 'https://www.fcc.gov/space-innovation',
    });
  }

  // Space Situational Awareness (if applicable)
  if (orbitType === 'LEO' || orbitType === 'SSO') {
    fees.push({
      agency: 'Space Force/FAA',
      feeType: 'Conjunction Assessment Service',
      description: 'Space situational awareness and conjunction warnings',
      amount: 0,
      required: false,
      processingTime: 'Ongoing service',
      notes: [
        'Currently free for licensed operators',
        'Commercial services available for enhanced data',
        'Maneuver coordination support',
        'Close approach notifications',
      ],
      url: 'https://www.space-track.org',
    });
  }

  // European Space Agency coordination
  if (launchSite === 'EU') {
    fees.push({
      agency: 'ESA/CNES',
      feeType: 'European Space Authorization',
      description: 'Launch authorization from European space agency',
      amount: 95000,
      required: true,
      processingTime: '6-12 months',
      notes: [
        'French Space Operations Act compliance',
        'Technical dossier review',
        'Third-party liability coverage verification',
      ],
      url: 'https://www.cnes.fr',
    });
  }

  // ISRO authorization
  if (launchSite === 'India') {
    fees.push({
      agency: 'IN-SPACe',
      feeType: 'Space Activity Authorization',
      description: 'Indian National Space Promotion and Authorization Centre',
      amount: 50000,
      required: true,
      processingTime: '4-6 months',
      notes: [
        'Authorization for private space activities',
        'Technical evaluation',
        'Frequency coordination with DoT',
      ],
      url: 'https://www.inspace.gov.in',
    });
  }

  // JAXA/Ministry authorization
  if (launchSite === 'Japan') {
    fees.push({
      agency: 'MEXT/JAXA',
      feeType: 'Space Activity License',
      description: 'Japanese space activity licensing',
      amount: 60000,
      required: true,
      processingTime: '6-9 months',
      notes: [
        'Ministry of Education, Culture, Sports, Science and Technology',
        'Safety and liability review',
        'Coordination with JAXA',
      ],
      url: 'https://www.jaxa.jp',
    });
  }

  // Rocket Lab NZ
  if (launchSite === 'NewZealand') {
    fees.push({
      agency: 'NZSA',
      feeType: 'Payload Permit',
      description: 'New Zealand Space Agency payload authorization',
      amount: 35000,
      required: true,
      processingTime: '3-6 months',
      notes: [
        'Outer Space and High-altitude Activities Act compliance',
        'Simplified process for approved operators',
        'Dual US/NZ regulatory pathway available',
      ],
      url: 'https://www.mbie.govt.nz/science-and-technology/space/',
    });
  }

  return fees;
}

// ────────────────────────────────────────
// API Handler
// ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const payloadType = (searchParams.get('type') || 'communications') as PayloadType;
    const orbitType = (searchParams.get('orbit') || 'LEO') as OrbitType;
    const launchSite = (searchParams.get('site') || 'USA') as LaunchSite;
    const hasSpectrum = searchParams.get('spectrum') !== 'false';
    const hasRemoteSensing = searchParams.get('remoteSensing') === 'true' || payloadType === 'earth_observation';
    const isReentry = searchParams.get('reentry') === 'true';

    const params: FeeCalculationParams = {
      payloadType,
      orbitType,
      launchSite,
      hasSpectrum: hasSpectrum && (payloadType === 'communications' || payloadType === 'navigation'),
      hasRemoteSensing,
      isReentry,
    };

    const fees = calculateFees(params);

    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const requiredFees = fees.filter(f => f.required).reduce((sum, fee) => sum + fee.amount, 0);
    const optionalFees = fees.filter(f => !f.required).reduce((sum, fee) => sum + fee.amount, 0);

    // Estimate timeline
    let minMonths = 6;
    let maxMonths = 12;
    const criticalPath: string[] = [];

    if (launchSite === 'USA') {
      criticalPath.push('FAA Launch License (6 months)');
      minMonths = Math.max(minMonths, 6);
      maxMonths = Math.max(maxMonths, 9);
    }

    if (hasSpectrum || payloadType === 'communications') {
      criticalPath.push('FCC Authorization (12-18 months)');
      criticalPath.push('ITU Coordination (24-36 months)');
      minMonths = Math.max(minMonths, 12);
      maxMonths = Math.max(maxMonths, 36);
    }

    if (hasRemoteSensing) {
      criticalPath.push('NOAA Remote Sensing License (4 months)');
    }

    if (payloadType === 'crewed') {
      criticalPath.push('Human Spaceflight Certification (24+ months)');
      minMonths = Math.max(minMonths, 24);
      maxMonths = Math.max(maxMonths, 36);
    }

    const response: RegulatoryFeesResponse = {
      fees,
      totalFees,
      requiredFees,
      optionalFees,
      timeline: {
        minMonths,
        maxMonths,
        criticalPath,
      },
      input: {
        payloadType,
        orbitType,
        launchSite,
        hasSpectrum: params.hasSpectrum,
        hasRemoteSensing,
        isReentry,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to calculate regulatory fees:', error);
    return NextResponse.json(
      { error: 'Failed to calculate regulatory fees' },
      { status: 500 }
    );
  }
}
