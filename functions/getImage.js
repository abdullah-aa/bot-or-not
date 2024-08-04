const { HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");

const {
  MAX_LEFT_HAND_LIST_SIZE,
  NEXT_PAGE_COLLECTION,
  getPromptCollectionName,
  getImageCollectionName,
  validateRequest,
} = require("./constants");

const createOrUpdateNextPageDocument = async (
  db,
  interest,
  newNextPage = 0
) => {
  const nextPageDoc = { nextPage: newNextPage };

  await db.runTransaction(async (transaction) => {
    const nextPageDocRef = db.collection(NEXT_PAGE_COLLECTION).doc(interest);

    const currentNextPageDoc = await transaction.get(nextPageDocRef);
    if (currentNextPageDoc.exists && newNextPage === 0) {
      nextPageDoc.nextPage = currentNextPageDoc.data().nextPage;
    } else {
      transaction.set(nextPageDocRef, nextPageDoc);
    }
  });

  return nextPageDoc;
};

const callNewsAPI = async (db, interest, attempts, nextPage) => {
  const newsQueryString = `https://newsdata.io/api/1/archive?apikey=${process.env.NEWSDATA_API_KEY}&category=${interest}&language=en&image=1`;

  try {
    const nextPageDoc = nextPage
      ? { nextPage }
      : await createOrUpdateNextPageDocument(db, interest);

    const newsResponse = await fetch(
      newsQueryString +
        (nextPageDoc.nextPage > 0 ? `&page=${nextPageDoc.nextPage}` : "")
    );
    const newsJson = await newsResponse.json();

    await createOrUpdateNextPageDocument(db, interest, newsJson.nextPage);

    return newsJson;
  } catch (error) {
    logger.error(
      `Error fetching news data (attempt #${attempts}): ${newsQueryString}`,
      error
    );
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError("internal", "Error fetching news data");
    }
  }
};

const createImagesFromNewsAPI = async (db, interest) => {
  const imageCollection = db.collection(getImageCollectionName(interest));
  const imagesToReturnFrom = [];

  for (
    let attempts = 0, newsResultsObj = { nextPage: 0, results: [] };
    attempts < 5 && imagesToReturnFrom.length === 0;
    attempts++
  ) {
    newsResultsObj = await callNewsAPI(
      db,
      interest,
      attempts,
      newsResultsObj.nextPage
    );

    // Check for existing documents in batches of size MAX_LEFT_HAND_LIST_SIZE
    const articlesWithExistingDocuments = [];
    const articleIds = newsResultsObj.results.map(
      (article) => article.article_id
    );

    for (
      let counter = 0;
      counter < articleIds.length;
      counter += MAX_LEFT_HAND_LIST_SIZE
    ) {
      const articlesWithExistingDocumentsSlice = await imageCollection
        .where(
          "articleId",
          "in",
          articleIds.slice(counter, counter + MAX_LEFT_HAND_LIST_SIZE)
        )
        .get();

      articlesWithExistingDocuments.push(
        ...articlesWithExistingDocumentsSlice.docs.map(
          (doc) => doc.data().articleId
        )
      );
    }

    const articlesToSave = newsResultsObj.results.filter(
      (article) =>
        !articlesWithExistingDocuments.some(
          (articleId) => articleId === article.article_id
        )
    );

    if (articlesToSave.length > 0) {
      const batch = db.batch();

      articlesToSave.forEach((article) => {
        const imageRef = imageCollection.doc();
        const imageData = {
          createdAt: FieldValue.serverTimestamp(),
          description: article.description,
          articleId: article.article_id,
          imageUrl: article.image_url,
          link: article.link,
        };

        batch.set(imageRef, imageData, { merge: true });
        imagesToReturnFrom.push({
          id: imageRef.id,
          imageUrl: imageData.imageUrl,
          description: imageData.description,
        });
      });

      await batch.commit();
    }
  }

  return imagesToReturnFrom;
};

const retrieveImagesWithoutUserInput = async (db, interest, uid) => {
  const imageCollection = db.collection(getImageCollectionName(interest));
  const allImagesSnapshot = await imageCollection.get();
  let retrievedImages = allImagesSnapshot.docs;

  if (retrievedImages.length > 0) {
    const userPromptsSnapshot = await db
      .collection(getPromptCollectionName(interest))
      .where("uid", "==", uid)
      .get();

    if (!userPromptsSnapshot.empty) {
      // Create a set of image document IDs the user has already interacted with
      const imagesWithUserInputSet = new Set(
        userPromptsSnapshot.docs.map((doc) => doc.id)
      );

      // Filter out images that the user has already interacted with
      retrievedImages = retrievedImages.filter(
        (image) => !imagesWithUserInputSet.has(image.id)
      );
    }
  }

  return retrievedImages;
};

exports.getImage = async (request) => {
  const { uid, data } = validateRequest(request);
  const { interest } = data;

  const db = getFirestore();
  let imageToReturn, randomIndex;

  const imagesWithoutUserInput = await retrieveImagesWithoutUserInput(
    db,
    interest,
    uid
  );

  if (imagesWithoutUserInput.length > 0) {
    randomIndex = Math.floor(Math.random() * imagesWithoutUserInput.length);
    const imageObject = imagesWithoutUserInput[randomIndex].data();

    imageToReturn = {
      id: imagesWithoutUserInput[randomIndex].id,
      imageUrl: imageObject.imageUrl,
      description: imageObject.description,
    };
  }

  if (!imageToReturn) {
    const imagesToReturnFrom = await createImagesFromNewsAPI(db, interest);

    if (imagesToReturnFrom.length > 0) {
      randomIndex = Math.floor(Math.random() * imagesToReturnFrom.length);
      imageToReturn = imagesToReturnFrom[randomIndex];
    }
  }

  return { result: imageToReturn };
};
