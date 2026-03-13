'use client';

import { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// =============================================================================
// TYPES
// =============================================================================

type LaunchStatus = 'successful' | 'upcoming' | 'failed' | 'delayed';

interface Launch {
  id: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM UTC
  vehicle: string;
  vehicleFamily: string;
  payload: string;
  site: string;
  siteShort: string;
  status: LaunchStatus;
  orbit: string;
  description: string;
  customer: string;
}

// =============================================================================
// LAUNCH DATA — 60+ launches from Feb-Dec 2026
// =============================================================================

const LAUNCHES: Launch[] = [
  // FEBRUARY 2026
  { id: 'f9-sl-feb01', date: '2026-02-03', time: '02:15', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-1', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'successful', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites to 550 km shell.', customer: 'SpaceX' },
  { id: 'f9-crs-feb05', date: '2026-02-05', time: '11:42', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'CRS-33 Dragon', site: 'Kennedy Space Center LC-39A, FL', siteShort: 'Cape Canaveral, FL', status: 'successful', orbit: 'LEO / ISS', description: 'Commercial resupply mission to the International Space Station carrying 2,500 kg of cargo.', customer: 'NASA' },
  { id: 'electron-feb08', date: '2026-02-08', time: '21:00', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'StriX-Gamma', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'successful', orbit: 'SSO', description: 'Dedicated launch for Synspective SAR imaging satellite.', customer: 'Synspective' },
  { id: 'f9-sl-feb10', date: '2026-02-10', time: '06:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-2', site: 'Vandenberg SLC-4E, CA', siteShort: 'Vandenberg, CA', status: 'successful', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites to polar orbit.', customer: 'SpaceX' },
  { id: 'lm5b-feb12', date: '2026-02-12', time: '08:45', vehicle: 'Long March 5B', vehicleFamily: 'China Long March', payload: 'Tiangong Cargo Module', site: 'Wenchang Space Launch Center, China', siteShort: 'Wenchang, China', status: 'successful', orbit: 'LEO', description: 'Resupply cargo module docking with Tiangong space station.', customer: 'CNSA' },
  { id: 'f9-gps-feb15', date: '2026-02-15', time: '14:18', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'GPS III SV08', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'successful', orbit: 'MEO', description: 'Next-generation GPS navigation satellite for USSF.', customer: 'USSF' },
  { id: 'f9-sl-feb18', date: '2026-02-18', time: '03:22', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-3', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'successful', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'electron-feb20', date: '2026-02-20', time: '19:30', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'PREFIRE-3', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'successful', orbit: 'SSO', description: 'NASA Polar Radiant Energy in the Far Infrared Experiment satellite.', customer: 'NASA' },
  { id: 'lm2d-feb22', date: '2026-02-22', time: '04:10', vehicle: 'Long March 2D', vehicleFamily: 'China Long March', payload: 'Yaogan-41 Group A', site: 'Jiuquan Satellite Launch Center, China', siteShort: 'Jiuquan, China', status: 'successful', orbit: 'LEO', description: 'Three-satellite constellation for Earth observation.', customer: 'CNSA' },
  { id: 'f9-sl-feb25', date: '2026-02-25', time: '07:55', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-4', site: 'Kennedy Space Center LC-39A, FL', siteShort: 'Cape Canaveral, FL', status: 'successful', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'starship-feb27', date: '2026-02-27', time: '16:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-8', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 8 — full stack with satellite deployment demonstration.', customer: 'SpaceX' },

  // MARCH 2026
  { id: 'f9-sl-mar02', date: '2026-03-02', time: '01:45', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-5', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'ariane6-mar05', date: '2026-03-05', time: '18:30', vehicle: 'Ariane 6', vehicleFamily: 'Arianespace Ariane 6', payload: 'Syracuse 4C', site: 'Guiana Space Centre ELA-4, Kourou', siteShort: 'Kourou, French Guiana', status: 'upcoming', orbit: 'GTO', description: 'French military communications satellite to geostationary transfer orbit.', customer: 'DGA/French MoD' },
  { id: 'f9-transporter-mar08', date: '2026-03-08', time: '15:00', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Transporter-13', site: 'Vandenberg SLC-4E, CA', siteShort: 'Vandenberg, CA', status: 'upcoming', orbit: 'SSO', description: 'Rideshare mission carrying 45+ small satellites to sun-synchronous orbit.', customer: 'Various' },
  { id: 'electron-mar10', date: '2026-03-10', time: '22:15', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'Kineis IoT-6', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'Five Kineis IoT connectivity nanosatellites.', customer: 'Kineis' },
  { id: 'f9-sl-mar13', date: '2026-03-13', time: '04:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-6', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'lm3b-mar15', date: '2026-03-15', time: '10:00', vehicle: 'Long March 3B', vehicleFamily: 'China Long March', payload: 'Beidou-3 M27', site: 'Xichang Satellite Launch Center, China', siteShort: 'Wenchang, China', status: 'upcoming', orbit: 'MEO', description: 'Beidou navigation constellation replenishment satellite.', customer: 'CNSA' },
  { id: 'vulcan-mar18', date: '2026-03-18', time: '12:45', vehicle: 'Vulcan Centaur', vehicleFamily: 'ULA Vulcan Centaur', payload: 'USSF-106', site: 'Cape Canaveral SLC-41, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'GEO', description: 'Classified USSF national security payload to geosynchronous orbit.', customer: 'USSF' },
  { id: 'f9-sl-mar20', date: '2026-03-20', time: '09:12', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-7', site: 'Kennedy Space Center LC-39A, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'pslv-mar22', date: '2026-03-22', time: '05:30', vehicle: 'PSLV-C62', vehicleFamily: 'ISRO PSLV/GSLV', payload: 'RISAT-1B', site: 'Satish Dhawan Space Centre, Sriharikota, India', siteShort: 'Sriharikota, India', status: 'upcoming', orbit: 'SSO', description: 'Radar imaging satellite for all-weather Earth observation.', customer: 'ISRO' },
  { id: 'starship-mar28', date: '2026-03-28', time: '17:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-9', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 9 — orbital refueling demonstration.', customer: 'SpaceX' },
  { id: 'f9-sl-mar30', date: '2026-03-30', time: '02:48', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 12-8', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },

  // APRIL 2026
  { id: 'f9-crew9-apr02', date: '2026-04-02', time: '11:00', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Crew-10 Dragon', site: 'Kennedy Space Center LC-39A, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO / ISS', description: 'Commercial Crew rotation mission to the ISS with 4 astronauts.', customer: 'NASA' },
  { id: 'electron-apr05', date: '2026-04-05', time: '20:45', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'BlackSky Gen-3 x2', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'Two BlackSky Gen-3 high-revisit Earth observation satellites.', customer: 'BlackSky' },
  { id: 'f9-sl-apr08', date: '2026-04-08', time: '05:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 13-1', site: 'Vandenberg SLC-4E, CA', siteShort: 'Vandenberg, CA', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites to polar shell.', customer: 'SpaceX' },
  { id: 'lm2c-apr11', date: '2026-04-11', time: '07:20', vehicle: 'Long March 2C', vehicleFamily: 'China Long March', payload: 'Shiyan-24', site: 'Jiuquan Satellite Launch Center, China', siteShort: 'Jiuquan, China', status: 'upcoming', orbit: 'LEO', description: 'Technology demonstration and verification satellite.', customer: 'CNSA' },
  { id: 'newglenn-apr15', date: '2026-04-15', time: '14:00', vehicle: 'New Glenn', vehicleFamily: 'Blue Origin New Glenn', payload: 'Blue Ring Pathfinder', site: 'Cape Canaveral LC-36, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'MEO', description: 'Blue Origin in-space transportation node demonstration mission.', customer: 'Blue Origin' },
  { id: 'f9-sl-apr18', date: '2026-04-18', time: '03:10', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 13-2', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'electron-apr22', date: '2026-04-22', time: '18:00', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'Capella-14', site: 'Rocket Lab LC-2, Wallops Island, VA', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'SSO', description: 'Capella Space SAR imaging satellite.', customer: 'Capella Space' },
  { id: 'ariane6-apr25', date: '2026-04-25', time: '19:45', vehicle: 'Ariane 6', vehicleFamily: 'Arianespace Ariane 6', payload: 'Galileo L13', site: 'Guiana Space Centre ELA-4, Kourou', siteShort: 'Kourou, French Guiana', status: 'upcoming', orbit: 'MEO', description: 'Two Galileo second-generation navigation satellites.', customer: 'ESA / EU' },
  { id: 'starship-apr29', date: '2026-04-29', time: '16:30', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-10', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 10 — cargo bay deployment test.', customer: 'SpaceX' },

  // MAY 2026
  { id: 'f9-sl-may02', date: '2026-05-02', time: '01:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 13-3', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'h3-may06', date: '2026-05-06', time: '06:00', vehicle: 'H3', vehicleFamily: 'Japan H3', payload: 'ALOS-4 Companion', site: 'Tanegashima Space Center, Japan', siteShort: 'Tanegashima, Japan', status: 'upcoming', orbit: 'SSO', description: 'Earth observation companion satellite to augment ALOS-4 coverage.', customer: 'JAXA' },
  { id: 'f9-onewebmay', date: '2026-05-10', time: '10:15', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'OneWeb Group 21', site: 'Vandenberg SLC-4E, CA', siteShort: 'Vandenberg, CA', status: 'upcoming', orbit: 'LEO', description: 'Batch of 40 OneWeb Gen-2 broadband satellites.', customer: 'Eutelsat OneWeb' },
  { id: 'electron-may13', date: '2026-05-13', time: '23:00', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'NASA ELaNa-52', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'Educational launch of nanosatellites for universities.', customer: 'NASA' },
  { id: 'f9-sl-may16', date: '2026-05-16', time: '04:45', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 13-4', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'lm7a-may20', date: '2026-05-20', time: '09:30', vehicle: 'Long March 7A', vehicleFamily: 'China Long March', payload: 'Zhongxing-27', site: 'Wenchang Space Launch Center, China', siteShort: 'Wenchang, China', status: 'upcoming', orbit: 'GTO', description: 'Communications satellite for China Satcom.', customer: 'China Satcom' },
  { id: 'f9-sl-may24', date: '2026-05-24', time: '08:20', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 13-5', site: 'Kennedy Space Center LC-39A, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'starship-may30', date: '2026-05-30', time: '15:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-11', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 11 — ship-to-ship refueling test.', customer: 'SpaceX' },

  // JUNE 2026
  { id: 'f9-sl-jun03', date: '2026-06-03', time: '02:00', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 14-1', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'vulcan-jun08', date: '2026-06-08', time: '13:30', vehicle: 'Vulcan Centaur', vehicleFamily: 'ULA Vulcan Centaur', payload: 'STP-S29A', site: 'Cape Canaveral SLC-41, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'Various', description: 'USSF Space Test Program rideshare to multiple orbits.', customer: 'USSF' },
  { id: 'electron-jun11', date: '2026-06-11', time: '20:30', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'HawkEye Cluster-6', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'HawkEye 360 RF geolocation cluster of 3 satellites.', customer: 'HawkEye 360' },
  { id: 'gslv-jun15', date: '2026-06-15', time: '04:00', vehicle: 'GSLV Mk III', vehicleFamily: 'ISRO PSLV/GSLV', payload: 'GSAT-24', site: 'Satish Dhawan Space Centre, Sriharikota, India', siteShort: 'Sriharikota, India', status: 'upcoming', orbit: 'GTO', description: 'High-throughput communications satellite for DTH services.', customer: 'ISRO / NewSpace India' },
  { id: 'f9-sl-jun18', date: '2026-06-18', time: '06:45', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 14-2', site: 'Vandenberg SLC-4E, CA', siteShort: 'Vandenberg, CA', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites to polar shell.', customer: 'SpaceX' },
  { id: 'ariane6-jun22', date: '2026-06-22', time: '21:15', vehicle: 'Ariane 6', vehicleFamily: 'Arianespace Ariane 6', payload: 'MTG-S1', site: 'Guiana Space Centre ELA-4, Kourou', siteShort: 'Kourou, French Guiana', status: 'upcoming', orbit: 'GTO', description: 'Meteosat Third Generation sounder satellite for EUMETSAT.', customer: 'ESA / EUMETSAT' },
  { id: 'lm2d-jun25', date: '2026-06-25', time: '03:50', vehicle: 'Long March 2D', vehicleFamily: 'China Long March', payload: 'Gaofen-14B', site: 'Jiuquan Satellite Launch Center, China', siteShort: 'Jiuquan, China', status: 'upcoming', orbit: 'SSO', description: 'High-resolution optical imaging satellite.', customer: 'CNSA' },
  { id: 'starship-jun28', date: '2026-06-28', time: '16:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-12', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 12 — Starlink v3 satellite deployment.', customer: 'SpaceX' },

  // JULY 2026
  { id: 'f9-sl-jul04', date: '2026-07-04', time: '01:20', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 14-3', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'newglenn-jul10', date: '2026-07-10', time: '14:30', vehicle: 'New Glenn', vehicleFamily: 'Blue Origin New Glenn', payload: 'Kuiper Prototype Batch', site: 'Cape Canaveral LC-36, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Amazon Kuiper broadband constellation prototype satellites.', customer: 'Amazon / Project Kuiper' },
  { id: 'electron-jul15', date: '2026-07-15', time: '22:00', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'Planet SkySat-26/27', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'SSO', description: 'Two Planet SkySat high-resolution imaging satellites.', customer: 'Planet Labs' },
  { id: 'f9-sl-jul19', date: '2026-07-19', time: '05:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 14-4', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'h3-jul22', date: '2026-07-22', time: '07:45', vehicle: 'H3', vehicleFamily: 'Japan H3', payload: 'DRTS-2', site: 'Tanegashima Space Center, Japan', siteShort: 'Tanegashima, Japan', status: 'upcoming', orbit: 'GEO', description: 'Data relay test satellite for JAXA inter-orbit data relay.', customer: 'JAXA' },
  { id: 'lm5-jul26', date: '2026-07-26', time: '11:00', vehicle: 'Long March 5', vehicleFamily: 'China Long March', payload: 'Shijian-25', site: 'Wenchang Space Launch Center, China', siteShort: 'Wenchang, China', status: 'upcoming', orbit: 'GTO', description: 'Technology experiment platform in geostationary orbit.', customer: 'CNSA' },
  { id: 'starship-jul30', date: '2026-07-30', time: '15:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-13', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 13 — crew cabin qualification.', customer: 'SpaceX' },

  // AUGUST 2026
  { id: 'f9-sl-aug04', date: '2026-08-04', time: '03:00', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 15-1', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'electron-aug08', date: '2026-08-08', time: '19:45', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'TROPICS-B1/B2', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'NASA TROPICS storm observation microsatellites.', customer: 'NASA' },
  { id: 'ariane6-aug12', date: '2026-08-12', time: '20:00', vehicle: 'Ariane 6', vehicleFamily: 'Arianespace Ariane 6', payload: 'Eutelsat 10C', site: 'Guiana Space Centre ELA-4, Kourou', siteShort: 'Kourou, French Guiana', status: 'upcoming', orbit: 'GTO', description: 'High-capacity Eutelsat communications satellite.', customer: 'Eutelsat' },
  { id: 'f9-sl-aug16', date: '2026-08-16', time: '07:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 15-2', site: 'Vandenberg SLC-4E, CA', siteShort: 'Vandenberg, CA', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites to polar shell.', customer: 'SpaceX' },
  { id: 'pslv-aug20', date: '2026-08-20', time: '05:15', vehicle: 'PSLV-C63', vehicleFamily: 'ISRO PSLV/GSLV', payload: 'Oceansat-4', site: 'Satish Dhawan Space Centre, Sriharikota, India', siteShort: 'Sriharikota, India', status: 'upcoming', orbit: 'SSO', description: 'Ocean observation satellite for monitoring sea surface temperature.', customer: 'ISRO' },
  { id: 'starship-aug27', date: '2026-08-27', time: '16:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-14', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 14 — payload fairing jettison test.', customer: 'SpaceX' },

  // SEPTEMBER 2026
  { id: 'f9-sl-sep02', date: '2026-09-02', time: '02:30', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 15-3', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'vulcan-sep06', date: '2026-09-06', time: '11:00', vehicle: 'Vulcan Centaur', vehicleFamily: 'ULA Vulcan Centaur', payload: 'NROL-107', site: 'Vandenberg SLC-3E, CA', siteShort: 'Vandenberg, CA', status: 'upcoming', orbit: 'Classified', description: 'National Reconnaissance Office classified intelligence payload.', customer: 'NRO' },
  { id: 'electron-sep10', date: '2026-09-10', time: '21:30', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'Spire Lemur x4', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'Four Spire Global weather and maritime tracking nanosatellites.', customer: 'Spire Global' },
  { id: 'lm2d-sep14', date: '2026-09-14', time: '08:00', vehicle: 'Long March 2D', vehicleFamily: 'China Long March', payload: 'Yaogan-42 Group B', site: 'Jiuquan Satellite Launch Center, China', siteShort: 'Jiuquan, China', status: 'upcoming', orbit: 'LEO', description: 'Earth observation satellite constellation batch.', customer: 'CNSA' },
  { id: 'f9-sl-sep20', date: '2026-09-20', time: '04:15', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 15-4', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'starship-sep25', date: '2026-09-25', time: '15:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-15', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 15 — full mission profile with landing.', customer: 'SpaceX' },

  // OCTOBER 2026
  { id: 'newglenn-oct05', date: '2026-10-05', time: '13:00', vehicle: 'New Glenn', vehicleFamily: 'Blue Origin New Glenn', payload: 'Kuiper Batch-1', site: 'Cape Canaveral LC-36, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'First operational Amazon Kuiper constellation deployment.', customer: 'Amazon / Project Kuiper' },
  { id: 'f9-sl-oct10', date: '2026-10-10', time: '06:00', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 16-1', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'ariane6-oct15', date: '2026-10-15', time: '18:00', vehicle: 'Ariane 6', vehicleFamily: 'Arianespace Ariane 6', payload: 'Viasat-3 EMEA', site: 'Guiana Space Centre ELA-4, Kourou', siteShort: 'Kourou, French Guiana', status: 'upcoming', orbit: 'GTO', description: 'Viasat broadband satellite serving Europe, Middle East, and Africa.', customer: 'Viasat' },
  { id: 'h3-oct20', date: '2026-10-20', time: '08:30', vehicle: 'H3', vehicleFamily: 'Japan H3', payload: 'ETS-9', site: 'Tanegashima Space Center, Japan', siteShort: 'Tanegashima, Japan', status: 'upcoming', orbit: 'GEO', description: 'Engineering test satellite for next-gen satellite bus technology.', customer: 'JAXA' },
  { id: 'starship-oct28', date: '2026-10-28', time: '15:30', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-16', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 16 — reuse demonstration with rapid turnaround.', customer: 'SpaceX' },

  // NOVEMBER 2026
  { id: 'f9-sl-nov03', date: '2026-11-03', time: '03:15', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 16-2', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'electron-nov07', date: '2026-11-07', time: '22:15', vehicle: 'Electron', vehicleFamily: 'Rocket Lab Electron', payload: 'Unseenlabs BRO-14', site: 'Rocket Lab LC-1, Mahia, NZ', siteShort: 'Mahia, NZ', status: 'upcoming', orbit: 'LEO', description: 'Electromagnetic intelligence nanosatellite for Unseenlabs.', customer: 'Unseenlabs' },
  { id: 'gslv-nov12', date: '2026-11-12', time: '04:45', vehicle: 'GSLV Mk II', vehicleFamily: 'ISRO PSLV/GSLV', payload: 'NavIC-L1', site: 'Satish Dhawan Space Centre, Sriharikota, India', siteShort: 'Sriharikota, India', status: 'upcoming', orbit: 'GEO', description: 'Navigation with Indian Constellation replacement satellite with L1 signal.', customer: 'ISRO' },
  { id: 'lm3b-nov18', date: '2026-11-18', time: '10:30', vehicle: 'Long March 3B', vehicleFamily: 'China Long March', payload: 'Fengyun-4C', site: 'Xichang Satellite Launch Center, China', siteShort: 'Wenchang, China', status: 'upcoming', orbit: 'GEO', description: 'Second-generation geostationary weather satellite.', customer: 'CMA / CNSA' },
  { id: 'starship-nov22', date: '2026-11-22', time: '16:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-17', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 17 — first crewed Starship qualification.', customer: 'SpaceX' },

  // DECEMBER 2026
  { id: 'vulcan-dec03', date: '2026-12-03', time: '12:00', vehicle: 'Vulcan Centaur', vehicleFamily: 'ULA Vulcan Centaur', payload: 'SBIRS GEO-7', site: 'Cape Canaveral SLC-41, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'GEO', description: 'Space-Based Infrared System missile warning satellite.', customer: 'USSF' },
  { id: 'f9-sl-dec08', date: '2026-12-08', time: '05:00', vehicle: 'Falcon 9', vehicleFamily: 'SpaceX Falcon 9', payload: 'Starlink Group 16-3', site: 'Cape Canaveral SLC-40, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Deployment of 23 Starlink v2 Mini satellites.', customer: 'SpaceX' },
  { id: 'newglenn-dec12', date: '2026-12-12', time: '14:00', vehicle: 'New Glenn', vehicleFamily: 'Blue Origin New Glenn', payload: 'ESCAPADE Mars Orbiters', site: 'Cape Canaveral LC-36, FL', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'Heliocentric', description: 'NASA Mars twin-orbiter mission studying the magnetosphere.', customer: 'NASA' },
  { id: 'ariane6-dec16', date: '2026-12-16', time: '19:30', vehicle: 'Ariane 6', vehicleFamily: 'Arianespace Ariane 6', payload: 'CSO-4', site: 'Guiana Space Centre ELA-4, Kourou', siteShort: 'Kourou, French Guiana', status: 'upcoming', orbit: 'SSO', description: 'French military optical reconnaissance satellite.', customer: 'DGA/French MoD' },
  { id: 'h3-dec20', date: '2026-12-20', time: '07:00', vehicle: 'H3', vehicleFamily: 'Japan H3', payload: 'GOSAT-GW', site: 'Tanegashima Space Center, Japan', siteShort: 'Tanegashima, Japan', status: 'upcoming', orbit: 'SSO', description: 'Greenhouse gas and water cycle observing satellite.', customer: 'JAXA / MOE' },
  { id: 'starship-dec28', date: '2026-12-28', time: '16:00', vehicle: 'Starship', vehicleFamily: 'SpaceX Starship', payload: 'Starship IFT-18', site: 'SpaceX Starbase, Boca Chica, TX', siteShort: 'Cape Canaveral, FL', status: 'upcoming', orbit: 'LEO', description: 'Integrated flight test 18 — end-of-year heavy lift demonstration.', customer: 'SpaceX' },
];

// =============================================================================
// CONSTANTS
// =============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VEHICLE_FAMILIES = [
  'SpaceX Falcon 9',
  'SpaceX Starship',
  'Rocket Lab Electron',
  'ULA Vulcan Centaur',
  'Blue Origin New Glenn',
  'Arianespace Ariane 6',
  'ISRO PSLV/GSLV',
  'China Long March',
  'Japan H3',
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
  { value: 'delayed', label: 'Delayed' },
];

const STATUS_COLORS: Record<LaunchStatus, { bg: string; text: string; dot: string; border: string }> = {
  successful: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400', border: 'border-emerald-500/40' },
  upcoming: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400', border: 'border-blue-500/40' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400', border: 'border-red-500/40' },
  delayed: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400', border: 'border-yellow-500/40' },
};

const LAUNCH_SITES = Array.from(new Set(LAUNCHES.map((l) => l.siteShort))).sort();

// =============================================================================
// LAUNCH SITES MAP DATA
// =============================================================================

interface LaunchSiteInfo {
  name: string;
  location: string;
  latitude: string;
  longitude: string;
}

const LAUNCH_SITE_MAP: LaunchSiteInfo[] = [
  { name: 'Cape Canaveral / KSC', location: 'Florida, USA', latitude: '28.6 N', longitude: '80.6 W' },
  { name: 'Vandenberg SFB', location: 'California, USA', latitude: '34.7 N', longitude: '120.6 W' },
  { name: 'Rocket Lab LC-1', location: 'Mahia Peninsula, NZ', latitude: '39.3 S', longitude: '177.9 E' },
  { name: 'Guiana Space Centre', location: 'Kourou, French Guiana', latitude: '5.2 N', longitude: '52.8 W' },
  { name: 'Jiuquan SLC', location: 'Inner Mongolia, China', latitude: '40.9 N', longitude: '100.3 E' },
  { name: 'Wenchang SLC', location: 'Hainan, China', latitude: '19.6 N', longitude: '110.9 E' },
  { name: 'Satish Dhawan SC', location: 'Sriharikota, India', latitude: '13.7 N', longitude: '80.2 E' },
  { name: 'Tanegashima SC', location: 'Kagoshima, Japan', latitude: '30.4 N', longitude: '131.0 E' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatsSummary({ launches }: { launches: Launch[] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthLaunches = launches.filter((l) => {
    const d = new Date(l.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisYearLaunches = launches.filter((l) => {
    const d = new Date(l.date + 'T00:00:00');
    return d.getFullYear() === currentYear;
  });

  const vehicleCounts: Record<string, number> = {};
  const siteCounts: Record<string, number> = {};
  launches.forEach((l) => {
    vehicleCounts[l.vehicle] = (vehicleCounts[l.vehicle] || 0) + 1;
    siteCounts[l.siteShort] = (siteCounts[l.siteShort] || 0) + 1;
  });

  const topVehicle = Object.entries(vehicleCounts).sort((a, b) => b[1] - a[1])[0];
  const topSite = Object.entries(siteCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">This Month</p>
        <p className="text-2xl font-bold text-slate-300">{thisMonthLaunches.length}</p>
        <p className="text-xs text-slate-500 mt-1">launches scheduled</p>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">This Year</p>
        <p className="text-2xl font-bold text-blue-400">{thisYearLaunches.length}</p>
        <p className="text-xs text-slate-500 mt-1">total launches</p>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Top Vehicle</p>
        <p className="text-2xl font-bold text-emerald-400">{topVehicle?.[0] || 'N/A'}</p>
        <p className="text-xs text-slate-500 mt-1">{topVehicle?.[1] || 0} launches</p>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Top Site</p>
        <p className="text-2xl font-bold text-amber-400 text-lg">{topSite?.[0] || 'N/A'}</p>
        <p className="text-xs text-slate-500 mt-1">{topSite?.[1] || 0} launches</p>

        <RelatedModules modules={PAGE_RELATIONS['launch-manifest']} />
      </div>
    </div>
  );
}

function FilterPanel({
  vehicleFilter,
  setVehicleFilter,
  siteFilter,
  setSiteFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
}: {
  vehicleFilter: Set<string>;
  setVehicleFilter: (v: Set<string>) => void;
  siteFilter: string;
  setSiteFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const toggleVehicle = (family: string) => {
    const next = new Set(vehicleFilter);
    if (next.has(family)) {
      next.delete(family);
    } else {
      next.add(family);
    }
    setVehicleFilter(next);
  };

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Filters</h3>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">Search payload / mission</label>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g. Starlink, GPS, Dragon..."
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/15/60 transition-colors"
        />
      </div>

      {/* Status and Site row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-white/15/60 transition-colors"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Launch Site</label>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-white/15/60 transition-colors"
          >
            <option value="all">All Sites</option>
            {LAUNCH_SITES.map((site) => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vehicle family checkboxes */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Vehicle Family</label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_FAMILIES.map((family) => {
            const isActive = vehicleFilter.size === 0 || vehicleFilter.has(family);
            const shortName = family.split(' ').slice(-1)[0];
            return (
              <button
                key={family}
                onClick={() => toggleVehicle(family)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-white/10 border-white/15 text-slate-200'
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-500'
                }`}
              >
                {shortName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LaunchDetailModal({
  launch,
  onClose,
}: {
  launch: Launch;
  onClose: () => void;
}) {
  const colors = STATUS_COLORS[launch.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
                {launch.status.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-700/60 text-slate-300">
                {launch.orbit}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close detail panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-slate-100 mb-1">{launch.payload}</h3>
          <p className="text-sm text-slate-300 mb-4">{launch.vehicle}</p>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm text-slate-200">{formatFullDate(launch.date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Time (UTC)</p>
              <p className="text-sm text-slate-200 font-mono">{launch.time} UTC</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Launch Site</p>
              <p className="text-sm text-slate-200">{launch.site}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Customer</p>
              <p className="text-sm text-slate-200">{launch.customer}</p>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-slate-700/40 pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Mission Description</p>
            <p className="text-sm text-slate-300 leading-relaxed">{launch.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarView({
  launches,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  selectedDay,
}: {
  launches: Launch[];
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number | null) => void;
  selectedDay: number | null;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group launches by day for this month
  const launchByDay: Record<number, Launch[]> = {};
  launches.forEach((l) => {
    const d = new Date(l.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!launchByDay[day]) launchByDay[day] = [];
      launchByDay[day].push(l);
    }
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDate = new Date(todayStr + 'T00:00:00');
  const isTodayMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
  const todayDay = todayDate.getDate();

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last week
  while (cells.length % 7 !== 0) cells.push(null);

  // Get primary status color for a day
  const getDayColor = (dayLaunches: Launch[]): string => {
    const statuses = dayLaunches.map((l) => l.status);
    if (statuses.includes('failed')) return 'bg-red-500/30 border-red-500/50';
    if (statuses.includes('delayed')) return 'bg-yellow-500/20 border-yellow-500/40';
    if (statuses.includes('successful')) return 'bg-emerald-500/20 border-emerald-500/40';
    return 'bg-blue-500/20 border-blue-500/40';
  };

  return (
    <div className="card p-5 mb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 hover:border-white/15 text-slate-300 hover:text-white transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-slate-100">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 hover:border-white/15 text-slate-300 hover:text-white transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-20 rounded-lg" />;
          }

          const dayLaunches = launchByDay[day] || [];
          const hasLaunches = dayLaunches.length > 0;
          const isTodayCell = isTodayMonth && day === todayDay;
          const isSelected = selectedDay === day;

          return (
            <button
              key={`day-${day}`}
              onClick={() => onSelectDay(isSelected ? null : (hasLaunches ? day : null))}
              disabled={!hasLaunches}
              className={`h-20 rounded-lg border text-left p-1.5 transition-all relative ${
                isSelected
                  ? 'border-white/10/80 bg-white/8 ring-1 ring-white/10/40'
                  : hasLaunches
                    ? `${getDayColor(dayLaunches)} hover:scale-[1.03] cursor-pointer`
                    : 'border-slate-800/30 bg-slate-800/10'
              } ${isTodayCell ? 'ring-2 ring-white/15/60' : ''}`}
            >
              <span className={`text-xs font-medium ${
                isTodayCell ? 'text-slate-300 font-bold' : hasLaunches ? 'text-slate-200' : 'text-slate-600'
              }`}>
                {day}
              </span>
              {hasLaunches && (
                <div className="mt-0.5">
                  <span className="text-[10px] text-slate-300 font-medium">
                    {dayLaunches.length} launch{dayLaunches.length > 1 ? 'es' : ''}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap">
                    {dayLaunches.slice(0, 3).map((l) => (
                      <span
                        key={l.id}
                        className={`w-2 h-2 rounded-full ${STATUS_COLORS[l.status].dot}`}
                        title={l.vehicle}
                      />
                    ))}
                    {dayLaunches.length > 3 && (
                      <span className="text-[9px] text-slate-400">+{dayLaunches.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
              {isTodayCell && (
                <span className="absolute bottom-1 right-1 text-[8px] text-slate-300 font-bold uppercase">Today</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700/30">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-400">Successful</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-400" />
          <span className="text-xs text-slate-400">Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-slate-400">Failed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-xs text-slate-400">Delayed</span>
        </div>
      </div>
    </div>
  );
}

function DayDetailPanel({
  launches,
  year,
  month,
  day,
  onSelectLaunch,
}: {
  launches: Launch[];
  year: number;
  month: number;
  day: number;
  onSelectLaunch: (l: Launch) => void;
}) {
  const dayLaunches = launches.filter((l) => {
    const d = new Date(l.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className="card p-5 mb-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        {formatFullDate(dateStr)} &mdash; {dayLaunches.length} Launch{dayLaunches.length > 1 ? 'es' : ''}
      </h3>
      <div className="space-y-3">
        {dayLaunches.map((launch) => {
          const colors = STATUS_COLORS[launch.status];
          return (
            <button
              key={launch.id}
              onClick={() => onSelectLaunch(launch)}
              className={`w-full text-left p-4 rounded-xl border ${colors.border} ${colors.bg} hover:scale-[1.01] transition-all`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-semibold text-slate-100">{launch.payload}</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-1">{launch.vehicle}</p>
                  <p className="text-xs text-slate-400">{launch.site}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono text-slate-200">{launch.time} UTC</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${colors.bg} ${colors.text} font-semibold uppercase`}>
                    {launch.status}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  launches,
  onSelectLaunch,
}: {
  launches: Launch[];
  onSelectLaunch: (l: Launch) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by month
  const grouped: Record<string, Launch[]> = {};
  launches.forEach((l) => {
    const d = new Date(l.date + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(l);
  });

  const sortedKeys = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {sortedKeys.map((key) => {
        const [y, m] = key.split('-').map(Number);
        const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`;
        const monthLaunches = grouped[key];

        return (
          <div key={key}>
            <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {monthLabel}
              <span className="text-sm font-normal text-slate-500">({monthLaunches.length} launches)</span>
            </h3>
            <div className="space-y-2">
              {monthLaunches.map((launch) => {
                const colors = STATUS_COLORS[launch.status];
                const isExpanded = expandedId === launch.id;

                return (
                  <div key={launch.id} className={`rounded-xl border ${colors.border} overflow-hidden transition-all`}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : launch.id)}
                      className={`w-full text-left p-4 ${colors.bg} hover:brightness-110 transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 text-center min-w-[56px]">
                          <p className="text-xs text-slate-400">{formatDateShort(launch.date)}</p>
                          <p className="text-sm font-mono text-slate-200">{launch.time}</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-100 truncate">{launch.payload}</p>
                          <p className="text-xs text-slate-400">{launch.vehicle} &middot; {launch.siteShort}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${colors.bg} ${colors.text} font-semibold uppercase border ${colors.border}`}>
                            {launch.status}
                          </span>
                          <svg
                            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-slate-800/20 border-t border-slate-700/20">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Date</p>
                            <p className="text-xs text-slate-200">{formatFullDate(launch.date)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Time (UTC)</p>
                            <p className="text-xs text-slate-200 font-mono">{launch.time} UTC</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Orbit</p>
                            <p className="text-xs text-slate-200">{launch.orbit}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Customer</p>
                            <p className="text-xs text-slate-200">{launch.customer}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed mb-3">{launch.description}</p>
                        <p className="text-xs text-slate-500">Launch site: {launch.site}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {sortedKeys.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">No launches match your filters.</p>
        </div>
      )}
    </div>
  );
}

function LaunchSitesMap({ launches }: { launches: Launch[] }) {
  // Count launches per site (using siteShort)
  const siteCounts: Record<string, number> = {};
  launches.forEach((l) => {
    siteCounts[l.siteShort] = (siteCounts[l.siteShort] || 0) + 1;
  });

  return (
    <div className="card p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Global Launch Sites
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LAUNCH_SITE_MAP.map((site) => {
          // Match site to siteShort in launches
          const matchKey = Object.keys(siteCounts).find((k) =>
            site.name.toLowerCase().includes(k.split(',')[0].toLowerCase()) ||
            k.toLowerCase().includes(site.location.split(',')[0].toLowerCase())
          );
          const count = matchKey ? siteCounts[matchKey] : 0;

          return (
            <div
              key={site.name}
              className={`p-3 rounded-lg border transition-colors ${
                count > 0
                  ? 'border-white/10 bg-white/5'
                  : 'border-slate-700/20 bg-slate-800/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{site.name}</p>
                  <p className="text-xs text-slate-400">{site.location}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{site.latitude}, {site.longitude}</p>
                </div>
                {count > 0 && (
                  <span className="text-lg font-bold text-slate-300">{count}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function LaunchManifestPage() {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filters
  const [vehicleFilter, setVehicleFilter] = useState<Set<string>>(new Set());
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handlePrevMonth = useCallback(() => {
    setSelectedDay(null);
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }, [calMonth]);

  const handleNextMonth = useCallback(() => {
    setSelectedDay(null);
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }, [calMonth]);

  // Filtered launches
  const filteredLaunches = useMemo(() => {
    return LAUNCHES.filter((l) => {
      // Vehicle filter
      if (vehicleFilter.size > 0 && !vehicleFilter.has(l.vehicleFamily)) return false;
      // Site filter
      if (siteFilter !== 'all' && l.siteShort !== siteFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !l.payload.toLowerCase().includes(q) &&
          !l.vehicle.toLowerCase().includes(q) &&
          !l.customer.toLowerCase().includes(q) &&
          !l.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [vehicleFilter, siteFilter, statusFilter, searchQuery]);

  // Build Event JSON-LD structured data for upcoming launches (SEO)
  const upcomingLaunches = LAUNCHES.filter((l) => l.status === 'upcoming');
  const launchSchemaData = upcomingLaunches.slice(0, 30).map((launch) => ({
    '@type': 'Event',
    name: `${launch.vehicle} - ${launch.payload}`,
    description: launch.description,
    startDate: `${launch.date}T${launch.time}:00Z`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: launch.site,
      address: launch.site,
    },
    organizer: {
      '@type': 'Organization',
      name: launch.customer,
    },
  }));

  const launchesSchema = {
    '@context': 'https://schema.org',
    '@graph': launchSchemaData,
  };

  return (
    <div className="min-h-screen py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(launchesSchema).replace(/</g, '\\u003c') }}
      />
      <div className="container mx-auto px-4 max-w-7xl">

        <AnimatedPageHeader
          title="Space Launch Manifest"
          subtitle="Visual calendar of upcoming and recent space launches worldwide. Track every rocket from every spaceport."
          accentColor="cyan"
        />

        {/* Stats summary */}
        <ScrollReveal>
        <StatsSummary launches={filteredLaunches} />
        </ScrollReveal>

        {/* View toggle + filter toggle */}
        <ScrollReveal delay={0.1}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setViewMode('calendar'); setSelectedDay(null); }}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white/10 border-white/15 text-slate-200'
                  : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </span>
            </button>
            <button
              onClick={() => { setViewMode('list'); setSelectedDay(null); }}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/10 border-white/15 text-slate-200'
                  : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </span>
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              showFilters
                ? 'bg-white/10 border-white/15 text-slate-200'
                : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(vehicleFilter.size > 0 || siteFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </span>
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <FilterPanel
            vehicleFilter={vehicleFilter}
            setVehicleFilter={setVehicleFilter}
            siteFilter={siteFilter}
            setSiteFilter={setSiteFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        </ScrollReveal>

        {/* Results count */}
        <p className="text-xs text-slate-500 mb-4">
          Showing {filteredLaunches.length} of {LAUNCHES.length} launches
        </p>

        {/* Calendar or List */}
        {viewMode === 'calendar' ? (
          <>
            <CalendarView
              launches={filteredLaunches}
              year={calYear}
              month={calMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onSelectDay={setSelectedDay}
              selectedDay={selectedDay}
            />
            {selectedDay !== null && (
              <DayDetailPanel
                launches={filteredLaunches}
                year={calYear}
                month={calMonth}
                day={selectedDay}
                onSelectLaunch={setSelectedLaunch}
              />
            )}
          </>
        ) : (
          <ListView
            launches={filteredLaunches}
            onSelectLaunch={setSelectedLaunch}
          />
        )}

        {/* Launch Sites Map */}
        <LaunchSitesMap launches={filteredLaunches} />

        {/* Launch detail modal */}
        {selectedLaunch && (
          <LaunchDetailModal
            launch={selectedLaunch}
            onClose={() => setSelectedLaunch(null)}
          />
        )}
      </div>
    </div>
  );
}
