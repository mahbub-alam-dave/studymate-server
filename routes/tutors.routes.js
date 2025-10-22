const express = require("express");
const router = express.Router();

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const users = db.collection("users");

router.get("/find-tutors", async (req, res) => {
  try {
    const {
      search = "",
      subject = "",
      experience = "",
      minFee = 0,
      maxFee = 100000,
      page = 1,
      limit = 6,
    } = req.query;


    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.max(parseInt(limit) || 6, 1);

    console.log("Page:", pageNumber, "Limit:", limitNumber, "Skip:", (pageNumber - 1) * limitNumber);


    // Build aggregation pipeline
    const pipeline = [{ $match: { role: "tutor" } }];

    // Add numeric conversion fields
    pipeline.push({
      $addFields: {
        feeNumber: {
          $convert: { input: "$fee", to: "int", onError: 0, onNull: 0 },
        },
        experienceYears: {
          $convert: {
            input: { $arrayElemAt: [{ $split: ["$experience", " "] }, 0] },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    });

    // Build match conditions
    const matchConditions = {};

    // Search filter
    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: "i" } },
        { expertise: { $elemMatch: { $regex: search, $options: "i" } } },
        { qualification: { $regex: search, $options: "i" } },
      ];
    }

    // Subject filter
    if (subject) {
      matchConditions.expertise = { $in: [subject] };
    }

    // Experience filter
    if (experience) {
      if (experience === "0-2") {
        matchConditions.experienceYears = { $lte: 2 };
      } else if (experience === "3-5") {
        matchConditions.experienceYears = { $gte: 3, $lte: 5 };
      } else if (experience === "6-10") {
        matchConditions.experienceYears = { $gte: 6, $lte: 10 };
      } else if (experience === "10+") {
        matchConditions.experienceYears = { $gt: 10 };
      }
    }

    // Fee filter
    matchConditions.feeNumber = {
      $gte: parseInt(minFee),
      $lte: parseInt(maxFee),
    };

    // Apply filters
    pipeline.push({ $match: matchConditions });

    // Add pagination
    pipeline.push({ $skip: (pageNumber - 1) * limitNumber });
    pipeline.push({ $limit: limitNumber });

    // Remove password field
    pipeline.push({ $project: { password: 0 } });

    // Execute aggregation
    const tutors = await users.aggregate(pipeline).toArray();

    // Count pipeline (fix: add both fields + clone matchConditions)
    const countMatch = JSON.parse(JSON.stringify(matchConditions));

    const countPipeline = [
      { $match: { role: "tutor" } },
      {
        $addFields: {
          feeNumber: {
            $convert: { input: "$fee", to: "int", onError: 0, onNull: 0 },
          },
          experienceYears: {
            $convert: {
              input: { $arrayElemAt: [{ $split: ["$experience", " "] }, 0] },
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $match: countMatch },
      { $count: "total" },
    ];

    const countResult = await users.aggregate(countPipeline).toArray();
    const totalTutors = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalTutors / limitNumber);

    res.status(200).json({
      success: true,
      data: tutors,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalTutors,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching tutors:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tutors",
      error: error.message,
    });
  }
});


module.exports = router;