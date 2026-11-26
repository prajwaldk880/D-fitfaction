import { describe, it, expect } from 'vitest';
import { haversineDistanceKm } from '../utils/geo';
import { getGoogleMapsDirectionsUrl } from '../services/api';

describe('haversineDistanceKm', () => {
  it('returns 0 for same coordinates', () => {
    expect(haversineDistanceKm(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });

  it('calculates ~3-4 km between MG Road and Victoria Hospital', () => {
    const dist = haversineDistanceKm(12.9756, 77.6066, 12.9635, 77.5739);
    expect(dist).toBeGreaterThan(2.5);
    expect(dist).toBeLessThan(5.0);
  });

  it('calculates ~128 km between Bengaluru and Mysuru', () => {
    const dist = haversineDistanceKm(12.9716, 77.5946, 12.2958, 76.6394);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(170);
  });

  it('is symmetric', () => {
    const d1 = haversineDistanceKm(12.9716, 77.5946, 13.0358, 77.5970);
    const d2 = haversineDistanceKm(13.0358, 77.5970, 12.9716, 77.5946);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.01);
  });
});

describe('getGoogleMapsDirectionsUrl', () => {
  it('generates a correct directions URL with real coordinates', () => {
    const url = getGoogleMapsDirectionsUrl(12.9635, 77.5739);
    expect(url).toContain('12.9635');
    expect(url).toContain('77.5739');
    expect(url).toContain('google.com/maps/dir');
    expect(url).toContain('destination=');
  });

  it('never hardcodes sample coordinates', () => {
    const url = getGoogleMapsDirectionsUrl(13.0, 77.6);
    expect(url).not.toContain('0.0,0.0');
  });
});
