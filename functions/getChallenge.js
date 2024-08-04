const { getFirestore } = require("firebase-admin/firestore");

const {
  validateRequest,
  getPromptCollectionName,
  getResponseCollectionName,
  getImageCollectionName,
} = require("./constants");

exports.getChallenge = async (request) => {
  const { uid, data } = validateRequest(request);
  const { interest } = data;

  const db = getFirestore();

  const responsesSnapshot = await db
    .collection(getResponseCollectionName(interest))
    .where("uid", "==", uid)
    .get();

  const promptsWithUserResponses = responsesSnapshot.docs.map(
    (response) => response.data().promptId
  );

  const allPromptsSnapshot = await db
    .collection(getPromptCollectionName(interest))
    .get();

  const promptsWithoutUserResponses = allPromptsSnapshot.docs.filter(
    (prompt) => !promptsWithUserResponses.includes(prompt.id)
  );

  let result = "No more challenges available.";
  if (promptsWithoutUserResponses.length > 0) {
    const randomIndex = Math.floor(
      Math.random() * promptsWithoutUserResponses.length
    );
    const promptDoc = promptsWithoutUserResponses[randomIndex].data();
    const imageDoc = (
      await db
        .collection(getImageCollectionName(interest))
        .doc(promptDoc.imageId)
        .get()
    ).data();

    result = {
      id: promptsWithoutUserResponses[randomIndex].id,
      prompt: promptDoc.prompt,
      imageUrl: imageDoc.imageUrl,
      description: imageDoc.description,
    };
  }

  return { result };
};
