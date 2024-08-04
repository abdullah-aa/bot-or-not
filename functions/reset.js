const { HttpsError } = require("firebase-functions/v1/auth");
const { getFirestore } = require("firebase-admin/firestore");
const {
  INTERESTS,
  NEXT_PAGE_COLLECTION,
  getPromptCollectionName,
  getImageCollectionName,
  getResponseCollectionName,
} = require("./constants");

/**
 * Resets the Firestore database by deleting all documents in the specified collections.
 * @returns {Promise<Object>} - An object indicating the result of the operation.
 * @throws {HttpsError} - Throws an error if the user is not authenticated.
 */
exports.reset = async (request) => {
  const { uid } = request.auth;

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to call this function"
    );
  }

  const db = await getFirestore();
  for (const interest of INTERESTS) {
    const responses = await db
      .collection(getResponseCollectionName(interest))
      .get();
    for (const response of responses.docs) {
      await response.ref.delete();
    }

    const prompts = await db
      .collection(getPromptCollectionName(interest))
      .get();
    for (const prompt of prompts.docs) {
      await prompt.ref.delete();
    }

    const images = await db.collection(getImageCollectionName(interest)).get();
    for (const image of images.docs) {
      await image.ref.delete();
    }
  }

  const nextPageSnapshot = await db.collection(NEXT_PAGE_COLLECTION).get();
  for (const nextPage of nextPageSnapshot.docs) {
    await nextPage.ref.delete();
  }

  return { result: "Reset complete!" };
};
