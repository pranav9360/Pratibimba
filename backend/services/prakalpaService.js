import Prakalpa from "../models/Prakalpa.js";
import AppError from "../utils/AppError.js";

export const getPrakalpas = async () => {
  return await Prakalpa.find({
    active: true,
  }).sort({
    name: 1,
  });
};

export const createPrakalpa = async (
  data
) => {
  const exists =
    await Prakalpa.findOne({
      name: data.name,
    });

  if (exists) {
    throw new AppError(
      "Prakalpa already exists",
      409
    );
  }

  return await Prakalpa.create(
    data
  );
};

export const updatePrakalpa = async (
  id,
  data
) => {
  const prakalpa =
    await Prakalpa.findById(id);

  if (!prakalpa) {
    throw new AppError(
      "Prakalpa not found",
      404
    );
  }

  Object.assign(
    prakalpa,
    data
  );

  await prakalpa.save();

  return prakalpa;
};

export const deletePrakalpa = async (
  id
) => {
  const prakalpa =
    await Prakalpa.findById(id);

  if (!prakalpa) {
    throw new AppError(
      "Prakalpa not found",
      404
    );
  }

  prakalpa.active = false;

  await prakalpa.save();

  return prakalpa;
};
