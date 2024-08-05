const {
  IS_BOT,
  IS_NOT,
  validateRequest,
  getPromptCollectionName,
  getResponseCollectionName,
} = require("./constants");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

exports.submitGuess = async (request) => {
  const { uid, data } = validateRequest(request);
  const { interest, promptId, guess } = data;

  const db = getFirestore();

  const promptSnapshot = await db
    .collection(getPromptCollectionName(interest))
    .doc(promptId)
    .get();

  const promptData = promptSnapshot.data();
  const win =
    (guess === IS_BOT && promptData[IS_BOT]) ||
    (guess === IS_NOT && promptData[IS_NOT]);

  await db.collection(getResponseCollectionName(interest)).add({
    createdAt: FieldValue.serverTimestamp(),
    promptId,
    uid,
    win,
  });

  return { result: win };
};
