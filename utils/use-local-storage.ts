"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook for syncing state with localStorage
 * @param key The localStorage key
 * @param initialValue The initial value to use if no value exists in localStorage
 * @returns A stateful value and a function to update it, similar to useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void] {
  // Create state to store the value
  // Pass a function to useState to only evaluate the initial value once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Use useEffect to update localStorage when the state changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // Save state to localStorage
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
