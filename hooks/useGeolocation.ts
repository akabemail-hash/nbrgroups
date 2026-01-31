
import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const useGeolocation = (userId: string | undefined) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const updateLocationInSupabase = async (latitude: number, longitude: number) => {
    if (!userId) return;
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_known_latitude: latitude,
          last_known_longitude: longitude,
          last_location_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    } catch (e: any) {
      setError(e.message);
      console.error("Error updating location in Supabase:", e);
    }
  };
  
  const getCapacitorLocation = async () => {
    try {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted') {
          throw new Error('Location permission was denied.');
        }
      }

      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      await updateLocationInSupabase(position.coords.latitude, position.coords.longitude);
    } catch (e: any) {
      const errorMessage = e.message || 'Error getting location via Capacitor.';
      setError(errorMessage);
      console.error("Capacitor Geolocation error:", e);
      throw new Error(errorMessage);
    }
  };

  const getWebLocation = () => {
    return new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) {
            const message = 'Geolocation is not supported by your browser';
            setError(message);
            reject(new Error(message));
            return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await updateLocationInSupabase(position.coords.latitude, position.coords.longitude);
            resolve();
          },
          (err) => {
            setError(err.message);
            console.error("Web Geolocation error:", err);
            reject(err);
          },
          { enableHighAccuracy: true }
        );
    });
  };

  const updateLocation = useCallback(async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
        if (Capacitor.isNativePlatform()) {
          await getCapacitorLocation();
        } else {
          await getWebLocation();
        }
    } catch (e) {
        console.error("Location update failed.", e);
    } finally {
        setLoading(false);
    }
  }, [userId]);

  return { updateLocation, error, loading };
};
