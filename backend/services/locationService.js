import Location from "../models/Location.js";
import Prakalpa from "../models/Prakalpa.js";
import AppError from "../utils/AppError.js";

export const getLocations = async () => {
  return await Location.find({
    active: true,
  }).sort({
    prakalpa: 1,
    name: 1,
  });
};

export const getLocationsByPrakalpa =
  async (prakalpa) => {
    return await Location.find({
      prakalpa,
      active: true,
    }).sort({
      name: 1,
    });
  };

export const createLocation = async (
  data
) => {
  const prakalpa =
    await Prakalpa.findOne({
      name: data.prakalpa,
      active: true,
    });

  if (!prakalpa) {
    throw new AppError(
      "Prakalpa not found",
      404
    );
  }

  const exists =
    await Location.findOne({
      prakalpa:
        data.prakalpa,
      name:
        data.name,
    });

  if (exists) {
    throw new AppError(
      "Location already exists",
      409
    );
  }

  return await Location.create(
    data
  );
};

export const updateLocation = async (
  id,
  data
) => {
  const location =
    await Location.findById(id);

  if (!location) {
    throw new AppError(
      "Location not found",
      404
    );
  }

  if (data.prakalpa) {
    const exists =
      await Prakalpa.findOne({
        name:
          data.prakalpa,
        active: true,
      });

    if (!exists) {
      throw new AppError(
        "Prakalpa not found",
        404
      );
    }
  }

  Object.assign(
    location,
    data
  );

  await location.save();

  return location;
};

export const deleteLocation =
  async (id) => {
    const location =
      await Location.findById(
        id
      );

    if (!location) {
      throw new AppError(
        "Location not found",
        404
      );
    }

    location.active = false;

    await location.save();

    return location;
  };
