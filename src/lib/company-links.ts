// Maps well-known company/agency names to their company profile slugs
const COMPANY_SLUG_MAP: Record<string, string> = {
  'SpaceX': 'spacex',
  'Blue Origin': 'blue-origin',
  'United Launch Alliance': 'united-launch-alliance',
  'ULA': 'united-launch-alliance',
  'Rocket Lab': 'rocket-lab',
  'NASA': 'nasa',
  'Northrop Grumman': 'northrop-grumman',
  'Lockheed Martin': 'lockheed-martin',
  'Boeing': 'boeing',
  'Arianespace': 'arianespace',
  'L3Harris': 'l3harris-technologies',
  'Raytheon': 'raytheon-technologies',
  'Virgin Orbit': 'virgin-orbit',
  'Virgin Galactic': 'virgin-galactic',
  'Relativity Space': 'relativity-space',
  'Astra': 'astra',
  'Firefly Aerospace': 'firefly-aerospace',
  'Planet Labs': 'planet-labs',
  'Spire Global': 'spire-global',
  'Maxar': 'maxar-technologies',
  'SES': 'ses',
  'Intelsat': 'intelsat',
  'Viasat': 'viasat',
  'Iridium': 'iridium-communications',
  'OneWeb': 'oneweb',
  'Amazon': 'amazon-project-kuiper',
  'Sierra Space': 'sierra-space',
  'Axiom Space': 'axiom-space',
  'Astroscale': 'astroscale',
  'ISRO': 'isro',
  'ESA': 'esa',
  'JAXA': 'jaxa',
  'CNSA': 'cnsa',
  'Roscosmos': 'roscosmos',
};

export function getCompanySlug(name: string): string | null {
  return COMPANY_SLUG_MAP[name] || COMPANY_SLUG_MAP[name.trim()] || null;
}

export function getCompanyProfileUrl(name: string): string | null {
  const slug = getCompanySlug(name);
  return slug ? `/company-profiles/${slug}` : null;
}
