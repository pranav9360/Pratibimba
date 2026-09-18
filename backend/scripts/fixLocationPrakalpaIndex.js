import "dotenv/config";
import mongoose from "mongoose";

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const collection =
      mongoose.connection.db.collection("locations");

    const indexes =
      await collection.indexes();

    console.log("\nCurrent location indexes:");
    console.table(
      indexes.map((index) => ({
        name: index.name,
        key: JSON.stringify(index.key),
        unique: Boolean(index.unique),
      }))
    );

    const oldIndex =
      indexes.find(
        (index) =>
          index.name === "domain_1_name_1"
      );

    if (oldIndex) {
      console.log(
        "\nDropping legacy index: domain_1_name_1"
      );

      await collection.dropIndex(
        "domain_1_name_1"
      );
    } else {
      console.log(
        "\nLegacy domain_1_name_1 index not present."
      );
    }

    const updatedIndexes =
      await collection.indexes();

    const hasNewIndex =
      updatedIndexes.some(
        (index) =>
          index.name ===
          "prakalpa_1_name_1"
      );

    if (!hasNewIndex) {
      console.log(
        "Creating new unique index: prakalpa_1_name_1"
      );

      await collection.createIndex(
        {
          prakalpa: 1,
          name: 1,
        },
        {
          unique: true,
          name: "prakalpa_1_name_1",
        }
      );
    }

    console.log(
      "\nLocation index repair complete."
    );
  } catch (error) {
    console.error(
      "\nINDEX REPAIR FAILED:"
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
