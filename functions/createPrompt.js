const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const {
  getPromptCollectionName,
  validateRequest,
  IS_BOT,
  IS_NOT,
} = require("./constants");

exports.createPrompt = async (request) => {
  const { uid, data } = validateRequest(request);
  const { imageId, interest, prompt } = data;

  const db = getFirestore();

  await db.collection(getPromptCollectionName(interest)).add({
    createdAt: FieldValue.serverTimestamp(),
    imageId,
    [IS_BOT]: false,
    [IS_NOT]: true,
    prompt,
    uid,
  });

  return { result: "Submitted!" };
};
