const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const { INTERESTS } = require("./constants");

/**
 * Creates a prompt for a specific image and interest category, and saves it to the 'humans' sub collection.
 * @param {Object} request - The request object containing data and auth information.
 * @returns {Promise<Object>} - An object indicating the result of the operation.
 * @throws {HttpsError} - Throws an error if the user is not authenticated or if an invalid interest category is provided.
 */
exports.createPrompt = async (request) => {
  const { imageId, interest, prompt } = request.data;
  const { uid } = request.auth;

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to call this function"
    );
  }

  if (!INTERESTS.includes(interest)) {
    throw new HttpsError("invalid-argument", "Invalid interest category.");
  }

  const db = getFirestore();

  const imageQuerySnapshot = await db
    .collection(interest)
    .where("id", "==", imageId)
    .get();

  if (!imageQuerySnapshot.empty) {
    const imageRef = imageQuerySnapshot.docs[0].ref;
    const userRecord = imageRef.collection("humans").doc(uid);

    await userRecord.set(
      {
        id: uid,
        [Date.now()]: prompt,
      },
      { merge: true }
    );
  }

  return { result: "Submitted!" };
};
