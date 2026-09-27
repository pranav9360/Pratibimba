import api from "./api";

export interface Location {
  _id?: string;
  id?: string;
  prakalpa: string;
  name: string;
  sublocations: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationPayload {
  prakalpa: string;
  name: string;
  sublocations?: string[];
  active?: boolean;
}

export const getLocations = async (): Promise<Location[]> => {
  const res = await api.get("/locations");
  return res.data?.data || [];
};

export const getLocationsByPrakalpa = async (
  prakalpa: string
): Promise<Location[]> => {
  const res = await api.get(
    `/locations/prakalpa/${encodeURIComponent(prakalpa)}`
  );

  return res.data?.data || [];
};

export const createLocation = async (
  data: LocationPayload
): Promise<Location> => {
  const res = await api.post("/locations", data);
  return res.data?.data;
};

export const updateLocation = async (
  id: string,
  data: Partial<LocationPayload>
): Promise<Location> => {
  const res = await api.put(`/locations/${id}`, data);
  return res.data?.data;
};

export const deleteLocation = async (
  id: string
): Promise<Location> => {
  const res = await api.delete(`/locations/${id}`);
  return res.data?.data;
};
