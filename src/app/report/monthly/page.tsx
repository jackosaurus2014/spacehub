import { Metadata } from 'next';
import { generateMonthlyReport } from '@/lib/monthly-report-generator';
import StateOfSpaceReport from '@/components/report/StateOfSpaceReport';

export const metadata: Metadata = {
  title: 'State of Space — Monthly Industry Report | SpaceNexus',
  description: 'The monthly State of Space report: launch activity, funding trends, market movers, regulatory developments, technology milestones, and the month ahead. Data-driven intelligence for the space industry.',
  keywords: ['state of space', 'space industry report', 'monthly space report', 'space economy analysis', 'launch activity', 'space funding', 'space market intelligence'],
  alternates: { canonical: 'https://spacenexus.us/report/monthly' },
  openGraph: {
    title: 'State of Space — Monthly Industry Report',
    description: 'Data-driven monthly intelligence on launches, funding, market movers, regulation, and technology across the space industry.',
    type: 'article',
    url: 'https://spacenexus.us/report/monthly',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of Space — Monthly Industry Report',
    description: 'Data-driven monthly intelligence on launches, funding, market movers, regulation, and technology across the space industry.',
  },
};

export const revalidate = 3600;

export default async function MonthlyReportPage() {
  let report;
  try {
    report = await generateMonthlyReport();
  } catch {
    report = null;
  }

  return <StateOfSpaceReport report={report} />;
}
