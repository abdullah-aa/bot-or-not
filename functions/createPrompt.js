const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { getPromptCollectionName, validateRequest } = require("./constants");

exports.createPrompt = async (request) => {
  const { uid, data } = validateRequest(request);
  const { imageId, interest, prompt } = data;

  const db = getFirestore();

  await db.collection(getPromptCollectionName(interest)).add({
    createdAt: FieldValue.serverTimestamp(),
    uid,
    imageId,
    prompt,
  });

  return { result: "Submitted!" };
};
