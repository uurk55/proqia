// src/hooks/useCompanyOptions.ts

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";

type DepartmentDoc = {
  id: string;
  name: string;
  is_active?: boolean;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

type LocationDoc = {
  id: string;
  name: string;
  is_active?: boolean;
  company_id: string;
  created_at?: Timestamp | Date | null;
};

export function useCompanyOptions() {
  const { proqiaUser } = useAuth();

  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchOptions = async () => {
      if (!proqiaUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        // Departmanlar
        const deptSnap = await getDocs(
          query(
            collection(db, "departments"),
            where("company_id", "==", proqiaUser.company_id),
            where("is_active", "==", true)
          )
        );

        const deptNames: string[] = deptSnap.docs
          .map((d) => (d.data() as DepartmentDoc).name ?? "")
          .filter((name) => !!name)
          .sort((a, b) => a.localeCompare(b));

        // Lokasyonlar
        const locSnap = await getDocs(
          query(
            collection(db, "locations"),
            where("company_id", "==", proqiaUser.company_id),
            where("is_active", "==", true)
          )
        );

        const locNames: string[] = locSnap.docs
          .map((d) => (d.data() as LocationDoc).name ?? "")
          .filter((name) => !!name)
          .sort((a, b) => a.localeCompare(b));

        setDepartments(deptNames);
        setLocations(locNames);
      } catch (err) {
        console.error("Departman/lokasyon seçenekleri alınamadı:", err);
        setError("Departman ve lokasyon bilgileri alınırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [proqiaUser]);

  return {
    departments,
    locations,
    loading,
    error,
  };
}
