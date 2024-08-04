const { HttpsError } = require("firebase-functions/v2/https");
const INTERESTS = ["Business", "Entertainment", "Politics", "Sports"];
const NEXT_PAGE_COLLECTION = "NextPage";

// https://firebase.google.com/docs/firestore/query-data/queries#limits_on_or_queries
const MAX_LEFT_HAND_LIST_SIZE = 30;

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

module.exports = {
  INTERESTS,
  MAX_LEFT_HAND_LIST_SIZE,
  NEXT_PAGE_COLLECTION,

  getImageCollectionName,
  getPromptCollectionName,
  getResponseCollectionName,

  validateRequest,
};
