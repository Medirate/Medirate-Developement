"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface ServiceData {
  state_name: string;
  service_category: string;
  service_code: string;
  service_description?: string;
  modifier_1?: string;
  modifier_1_details?: string;
  modifier_2?: string;
  modifier_2_details?: string;
  modifier_3?: string;
  modifier_3_details?: string;
  modifier_4?: string;
  modifier_4_details?: string;
  rate: string;
  rate_effective_date: string;
  program: string;
  location_region: string;
  rate_per_hour?: string;
  duration_unit?: string;
  [key: string]: string | undefined;
}

interface DataContextType {
  data: ServiceData[];
  loading: boolean;
  error: string;
}

const DataContext = createContext<DataContextType>({
  data: [],
  loading: false,
  error: "",
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("Fetching data...");
    if (typeof window !== "undefined" && window.__INITIAL_DATA__) {
      setData(window.__INITIAL_DATA__);
    } else {
      setLoading(true);
      fetch("/api/state-payment-comparison")
        .then((response) => response.json())
        .then((data) => setData(data))
        .catch((error) => setError("Failed to load data"))
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext); 