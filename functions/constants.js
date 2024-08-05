const { HttpsError } = require("firebase-functions/v2/https");
const fetch = require("node-fetch");
const os = require("os");
const path = require("path");
const fs = require("fs");

const INTERESTS = ["Business", "Entertainment", "Politics", "Sports"];
const NEXT_PAGE_COLLECTION = "NextPage";

// https://firebase.google.com/docs/firestore/query-data/queries#limits_on_or_queries
const MAX_LEFT_HAND_LIST_SIZE = 30;

const IS_BOT = "isBot";
const IS_NOT = "isNot";

const getImageCollectionName = (interest = "Uncategorized") =>
  `${interest}_Images`;
const getPromptCollectionName = (interest = "Uncategorized") =>
  `${interest}_Prompts`;
const getResponseCollectionName = (interest = "Uncategorized") =>
  `${interest}_Responses`;

const validateRequest = (request) => {
  const { interest } = request.data;
  const { uid } = request.auth;

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to call this function"
    );
  }

  if (interest && !INTERESTS.includes(interest)) {
    throw new HttpsError("invalid-argument", "Invalid interest category.");
  }

  return { uid, data: request.data };
};

const downloadFile = async (fileUrl) => {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
  }

  const tempDir = os.tmpdir();
  const fileName = path.basename(fileUrl);
  const filePath = path.join(tempDir, fileName);

  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  return filePath;
};

module.exports = {
  IS_BOT,
  IS_NOT,
  INTERESTS,
  MAX_LEFT_HAND_LIST_SIZE,
  NEXT_PAGE_COLLECTION,

  getImageCollectionName,
  getPromptCollectionName,
  getResponseCollectionName,

  downloadFile,
  validateRequest,
};
