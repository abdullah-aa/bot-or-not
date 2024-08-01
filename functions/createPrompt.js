const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { INTERESTS } = require("./constants");

/**
 * Creates a prompt for a specific image and interest category, and saves it to the 'humans' sub collection.
 * @param {string} request.data.imageId - The ID of the image to associate the prompt with.
 * @param {string} request.data.interest - The interest category the image belongs to.
 * @param {string} request.data.prompt - The content of the prompt.
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

  db.collection(interest)
    .where("id", "==", imageId)
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        const imageRef = querySnapshot.docs[0];

        imageRef
          .collection("humans")
          .doc(uid)
          .set(
            {
              [FieldValue.serverTimestamp()]: prompt,
            },
            { merge: true }
          );
      }
    });

  return { result: "Submitted!" };
};
