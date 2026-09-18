import "dotenv/config";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

const log = (message = "") =>
  console.log(message);

const collectionExists = async (
  db,
  name
) => {
  const result =
    await db
      .listCollections({
        name,
      })
      .toArray();

  return result.length > 0;
};

async function inspectCollection(
  db,
  collectionName
) {
  const collection =
    db.collection(
      collectionName
    );

  const total =
    await collection.countDocuments(
      {}
    );

  const withDomain =
    await collection.countDocuments({
      domain: {
        $exists: true,
      },
    });

  const withPrakalpa =
    await collection.countDocuments({
      prakalpa: {
        $exists: true,
      },
    });

  return {
    collection:
      collectionName,
    total,
    withDomain,
    withPrakalpa,
  };
}

async function migrateField(
  db,
  collectionName
) {
  const collection =
    db.collection(
      collectionName
    );

  const records =
    await collection
      .find({
        domain: {
          $exists: true,
        },
      })
      .project({
        _id: 1,
        domain: 1,
        prakalpa: 1,
        iqaNumber: 1,
        iqrNumber: 1,
        name: 1,
        email: 1,
      })
      .toArray();

  log(
    `\n${collectionName}: ${records.length} record(s) require domain → prakalpa`
  );

  if (
    records.length === 0
  ) {
    return;
  }

  console.table(
    records.map(
      (record) => ({
        id:
          String(
            record._id
          ),
        identity:
          record.iqaNumber ||
          record.iqrNumber ||
          record.name ||
          record.email ||
          "",
        oldDomain:
          record.domain ||
          "",
        oldPrakalpa:
          record.prakalpa ||
          "",
        newPrakalpa:
          record.domain ||
          "",
      })
    )
  );

  if (!APPLY) {
    return;
  }

  for (
    const record of records
  ) {
    await collection.updateOne(
      {
        _id:
          record._id,
      },
      {
        $set: {
          prakalpa:
            record.domain,
        },

        $unset: {
          domain: "",
        },
      }
    );
  }
}

async function migrateUsers(
  db
) {
  const users =
    db.collection(
      "users"
    );

  const records =
    await users
      .find({
        $or: [
          {
            domain: {
              $exists: true,
            },
          },
          {
            assignedDomains: {
              $exists: true,
            },
          },
        ],
      })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        domain: 1,
        prakalpa: 1,
        assignedDomains: 1,
        assignedPrakalpas: 1,
      })
      .toArray();

  log(
    `\nusers: ${records.length} record(s) require migration`
  );

  console.table(
    records.map(
      (user) => ({
        user:
          user.name ||
          user.email,
        domain:
          user.domain ||
          "",
        newPrakalpa:
          user.domain ||
          user.prakalpa ||
          "",
        assignedDomains:
          (
            user.assignedDomains ||
            []
          ).join(", "),
      })
    )
  );

  if (!APPLY) {
    return;
  }

  for (
    const user of records
  ) {
    const set = {};
    const unset = {};

    if (
      user.domain !==
      undefined
    ) {
      set.prakalpa =
        user.domain;

      unset.domain = "";
    }

    if (
      user.assignedDomains !==
      undefined
    ) {
      set.assignedPrakalpas =
        Array.isArray(
          user.assignedDomains
        )
          ? user.assignedDomains
          : [];

      unset.assignedDomains =
        "";
    }

    await users.updateOne(
      {
        _id:
          user._id,
      },
      {
        ...(Object.keys(set)
          .length
          ? {
              $set: set,
            }
          : {}),

        ...(Object.keys(unset)
          .length
          ? {
              $unset:
                unset,
            }
          : {}),
      }
    );
  }
}

async function migrateMasterCollection(
  db
) {
  const hasDomains =
    await collectionExists(
      db,
      "domains"
    );

  const hasPrakalpas =
    await collectionExists(
      db,
      "prakalpas"
    );

  if (!hasDomains) {
    log(
      "\nNo domains collection exists."
    );

    return;
  }

  const domains =
    await db
      .collection(
        "domains"
      )
      .find({})
      .toArray();

  log(
    `\nMaster domains collection: ${domains.length} record(s)`
  );

  console.table(
    domains.map(
      (d) => ({
        name:
          d.name,
        active:
          d.active,
      })
    )
  );

  if (!APPLY) {
    log(
      `Would copy these into "prakalpas".`
    );

    return;
  }

  const prakalpas =
    db.collection(
      "prakalpas"
    );

  for (
    const domain of domains
  ) {
    await prakalpas.updateOne(
      {
        name:
          domain.name,
      },
      {
        $set: {
          name:
            domain.name,
          active:
            domain.active !==
            false,
          updatedAt:
            domain.updatedAt ||
            new Date(),
        },

        $setOnInsert: {
          createdAt:
            domain.createdAt ||
            new Date(),
        },
      },
      {
        upsert: true,
      }
    );
  }

  /*
   * DO NOT drop domains yet.
   *
   * We keep the old collection until the
   * new backend/frontend have been tested.
   */
  log(
    '\nCopied master data into "prakalpas". Original "domains" collection retained for rollback.'
  );

  if (hasPrakalpas) {
    log(
      'Existing "prakalpas" collection was merged safely.'
    );
  }
}

async function run() {
  try {
    if (
      !process.env.MONGO_URI
    ) {
      throw new Error(
        "MONGO_URI is not configured."
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    const db =
      mongoose.connection.db;

    log(
      "=============================================="
    );

    log(
      " PRATIBIMBA DOMAIN → PRAKALPA MIGRATION"
    );

    log(
      "=============================================="
    );

    log(
      `Mode: ${
        APPLY
          ? "APPLY"
          : "DRY RUN"
      }`
    );

    const collections = [
      "auditplans",
      "scheduledaudits",
      "reports",
      "locations",
    ];

    log(
      "\nCURRENT STORAGE"
    );

    const stats = [];

    for (
      const name of collections
    ) {
      if (
        await collectionExists(
          db,
          name
        )
      ) {
        stats.push(
          await inspectCollection(
            db,
            name
          )
        );
      }
    }

    console.table(
      stats
    );

    for (
      const name of collections
    ) {
      if (
        await collectionExists(
          db,
          name
        )
      ) {
        await migrateField(
          db,
          name
        );
      }
    }

    if (
      await collectionExists(
        db,
        "users"
      )
    ) {
      await migrateUsers(
        db
      );
    }

    await migrateMasterCollection(
      db
    );

    log(
      "\n=============================================="
    );

    if (APPLY) {
      log(
        "MIGRATION APPLIED."
      );

      log(
        "The old domains master collection was NOT deleted."
      );
    } else {
      log(
        "DRY RUN COMPLETE — NO DATABASE RECORDS CHANGED."
      );

      log(
        "\nReview this output before running:"
      );

      log(
        "node scripts/migrateDomainToPrakalpa.js --apply"
      );
    }

    log(
      "=============================================="
    );
  } catch (error) {
    console.error(
      "\nMIGRATION FAILED:"
    );

    console.error(
      error
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
