import Location from "../models/Location.js";
import Prakalpa from "../models/Prakalpa.js";
import AppError from "../utils/AppError.js";
import { withManagementMutation as withAdministrativeMutation } from "./administrativeMutation.js";
import { organizationalFields } from "./organizationalFields.js";

const editable = (data, creating = false) => organizationalFields(data, {
  text: ["name", "prakalpa"], arrays: ["sublocations"], creating,
});
const requirePrakalpa = async (name, session) => {
  const prakalpa = await Prakalpa.findOne({ name, active: true }).session(session);
  if (!prakalpa) throw new AppError("Prakalpa not found", 404);
};

const locationLookup = (query, actor) => {
  if (actor?.role !== "super_admin") query.select("_id prakalpa name sublocations active");
  return query;
};

export const getLocations = async (actor) => locationLookup(
  Location.find({ active: true }).sort({ prakalpa: 1, name: 1 }), actor
);

export const getLocationsByPrakalpa = async (prakalpa, actor) => locationLookup(
  Location.find({ prakalpa, active: true }).sort({ name: 1 }), actor
);

export const createLocation = async (data, actor) => {
  return withAdministrativeMutation(actor, async (_freshActor, session) => {
    const fields = editable(data, true);
    if (!fields.prakalpa) throw new AppError("Prakalpa is required", 400);
    await requirePrakalpa(fields.prakalpa, session);
    const exists = await Location.findOne({ prakalpa: fields.prakalpa, name: fields.name }).session(session);
    if (exists) throw new AppError("Location already exists", 409);
    const [location] = await Location.create([fields], { session });
    return location;
  });
};

export const updateLocation = async (id, data, actor) => {
  return withAdministrativeMutation(actor, async (_freshActor, session) => {
    const fields = editable(data);
    const location = await Location.findById(id).session(session);
    if (!location) throw new AppError("Location not found", 404);
    if (fields.prakalpa !== undefined) {
      if (!fields.prakalpa) throw new AppError("Prakalpa is required", 400);
      await requirePrakalpa(fields.prakalpa, session);
    }
    for (const [key, value] of Object.entries(fields)) location[key] = value;
    await location.save({ session });
    return location;
  });
};

export const deleteLocation = async (id, actor) => {
  return withAdministrativeMutation(actor, async (_freshActor, session) => {
    const location = await Location.findById(id).session(session);
    if (!location) throw new AppError("Location not found", 404);
    location.active = false;
    await location.save({ session });
    return location;
  });
};
