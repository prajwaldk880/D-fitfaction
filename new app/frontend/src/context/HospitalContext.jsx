import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { BENGALURU_DEFAULT, requestBrowserLocation } from '../utils/geo';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const HospitalContext = createContext(null);

export function HospitalProvider({ children }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [location, setLocation] = useState(BENGALURU_DEFAULT);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | requesting | granted | denied
  const [hospitals, setHospitals] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [dataOrigin, setDataOrigin] = useState('database_cached');
  const [cacheWarning, setCacheWarning] = useState(null);
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem('lp_demo_mode') === 'true');
  const [compareIds, setCompareIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lp_compare_ids') || '[]');
    } catch {
      return [];
    }
  });
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lp_saved_ids') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('lp_demo_mode', String(demoMode));
  }, [demoMode]);

  useEffect(() => {
    localStorage.setItem('lp_compare_ids', JSON.stringify(compareIds));
  }, [compareIds]);

  useEffect(() => {
    localStorage.setItem('lp_saved_ids', JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    api
      .get('/hospitals/specialties')
      .then((res) => setSpecialties(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      api
        .get('/users/saved')
        .then((res) => setSavedIds(res.data.map((h) => h.id)))
        .catch(() => {});
    }
  }, [user]);

  const fetchNearby = useCallback(
    async (params = {}) => {
      setLoadingHospitals(true);
      try {
        const query = {
          lat: params.lat ?? location.latitude,
          lon: params.lon ?? location.longitude,
          radius_km: params.radius_km ?? 15,
          demo_mode: params.demo_mode ?? demoMode,
          sync_overpass: params.sync_overpass ?? false,
          ...(params.location ? { location: params.location } : {}),
          ...(params.facility_type ? { facility_type: params.facility_type } : {}),
          ...(params.specialty ? { specialty: params.specialty } : {}),
          ...(params.service ? { service: params.service } : {}),
          ...(params.emergency_only ? { emergency_only: true } : {}),
          ...(params.q ? { q: params.q } : {}),
        };
        const endpoint = params.q ? '/hospitals/search' : '/hospitals/nearby';
        const res = await api.get(endpoint, { params: query });
        setHospitals(res.data.items);
        setDataOrigin(res.data.data_origin);
        setCacheWarning(res.data.cache_warning || null);
        if (params.location && res.data.center_latitude && res.data.center_longitude) {
          setLocation({
            latitude: res.data.center_latitude,
            longitude: res.data.center_longitude,
            label: params.location,
          });
        }
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to load hospital records right now.';
        addToast(msg, 'error');
        throw err;
      } finally {
        setLoadingHospitals(false);
      }
    },
    [location.latitude, location.longitude, demoMode, addToast]
  );

  const requestUserGps = useCallback(async () => {
    setGpsStatus('requesting');
    try {
      const coords = await requestBrowserLocation();
      setLocation(coords);
      setGpsStatus('granted');
      addToast('Current GPS location acquired.', 'success');
      await fetchNearby({ lat: coords.latitude, lon: coords.longitude, sync_overpass: true });
      return coords;
    } catch (err) {
      setGpsStatus('denied');
      addToast('GPS permission unavailable. Enter a Bengaluru locality or Indian city manually.', 'error');
      return null;
    }
  }, [addToast, fetchNearby]);

  const toggleCompare = useCallback(
    (hospitalId) => {
      setCompareIds((prev) => {
        if (prev.includes(hospitalId)) {
          return prev.filter((id) => id !== hospitalId);
        }
        if (prev.length >= 3) {
          addToast('You can compare up to 3 hospitals at a time.', 'error');
          return prev;
        }
        addToast('Added hospital to comparison.', 'success');
        return [...prev, hospitalId];
      });
    },
    [addToast]
  );

  const toggleSaveHospital = useCallback(
    async (hospitalId) => {
      const isAlreadySaved = savedIds.includes(hospitalId);
      if (user) {
        try {
          if (isAlreadySaved) {
            await api.delete(`/users/saved/${hospitalId}`);
            setSavedIds((prev) => prev.filter((id) => id !== hospitalId));
            addToast('Removed from saved hospitals.', 'info');
          } else {
            await api.post(`/users/saved/${hospitalId}`);
            setSavedIds((prev) => [...prev, hospitalId]);
            addToast('Hospital saved to your account.', 'success');
          }
        } catch {
          addToast('Could not update saved hospitals.', 'error');
        }
      } else {
        setSavedIds((prev) =>
          isAlreadySaved ? prev.filter((id) => id !== hospitalId) : [...prev, hospitalId]
        );
        addToast(
          isAlreadySaved ? 'Removed from saved hospitals.' : 'Saved locally on this device.',
          'success'
        );
      }
    },
    [savedIds, user, addToast]
  );

  return (
    <HospitalContext.Provider
      value={{
        location,
        setLocation,
        gpsStatus,
        requestUserGps,
        hospitals,
        specialties,
        loadingHospitals,
        dataOrigin,
        cacheWarning,
        fetchNearby,
        demoMode,
        setDemoMode,
        compareIds,
        setCompareIds,
        toggleCompare,
        savedIds,
        toggleSaveHospital,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospitals() {
  return useContext(HospitalContext);
}
