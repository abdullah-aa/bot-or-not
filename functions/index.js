const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const fetch = require("node-fetch");

const { INTERESTS, MAX_LEFT_HAND_LIST_SIZE } = require("./constants");

require("dotenv").config();

initializeApp();

/**
 * Creates or updates the next page document for a given interest.
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance.
 * @param {string} interest - The interest category.
 * @param {number} [newNextPage=0] - The new next page number.
 * @returns {Promise<Object>} - The next page document data.
 */
const createOrUpdateNextPageDocument = async (
  db,
  interest,
  newNextPage = 0
) => {
  const nextPageDoc = { nextPage: newNextPage };

  await db.runTransaction(async (transaction) => {
    const nextPageDocRef = db.collection("NextPage").doc(interest);

    const currentNextPageDoc = await transaction.get(nextPageDocRef);
    if (currentNextPageDoc.exists && newNextPage === 0) {
      nextPageDoc.nextPage = currentNextPageDoc.data().nextPage;
    } else {
      transaction.set(nextPageDocRef, nextPageDoc);
    }
  });

  return nextPageDoc;
};

/**
 * Calls the News API to fetch news articles based on the given interest and updates the next page document.
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance.
 * @param {string} interest - The interest category for fetching news articles.
 * @param {number} attempts - The current attempt number for fetching news articles.
 * @returns {Promise<Array<Object>>} - Array of news articles fetched from the News API.
 * @throws {HttpsError} - Throws an error if fetching news data fails.
 */
const callNewsAPI = async (db, interest, attempts) => {
  const newsQueryString = `https://newsdata.io/api/1/archive?apikey=${process.env.NEWSDATA_API_KEY}&category=${interest}&language=en&image=1`;

  try {
    const nextPageDoc = await createOrUpdateNextPageDocument(db, interest);

    const newsResponse = await fetch(
      newsQueryString +
        (nextPageDoc.nextPage > 0 ? `&page=${nextPageDoc.nextPage}` : "")
    );
    const newsJson = await newsResponse.json();

    await createOrUpdateNextPageDocument(db, interest, newsJson.nextPage);

    return newsJson.results;
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

/**
 * Fetches images from the News API and saves them to the specified Firestore collection.
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance.
 * @param {FirebaseFirestore.CollectionReference} imageCollection - Firestore collection reference for the images.
 * @returns {Promise<Array<Object>>} - Array of image documents fetched from the News API.
 */
const createImagesFromNewsAPI = async (db, imageCollection) => {
  const imagesToReturnFrom = [];

  for (
    let attempts = 0, newsResults;
    attempts < 5 && imagesToReturnFrom.length === 0;
    attempts++
  ) {
    newsResults = await callNewsAPI(db, imageCollection.id, attempts);

    // Check for existing documents in batches of size MAX_LEFT_HAND_LIST_SIZE
    const articlesWithExistingDocuments = [];
    const articleIds = newsResults.map((article) => article.article_id);

    for (
      let counter = 0;
      counter < articleIds.length;
      counter += MAX_LEFT_HAND_LIST_SIZE
    ) {
      const articleIdsSlice = articleIds.slice(
        counter,
        counter + MAX_LEFT_HAND_LIST_SIZE
      );
      const articlesWithExistingDocumentsSlice = await imageCollection
        .where("id", "in", articleIdsSlice)
        .get();

      if (!articlesWithExistingDocumentsSlice.empty) {
        articlesWithExistingDocuments.push(
          ...articlesWithExistingDocumentsSlice.docs
        );
      }
    }

    // Filter out articles that already have documents
    const articlesToSave = newsResults.filter(
      (article) =>
        !articlesWithExistingDocuments.some(
          (doc) => doc.id === article.article_id
        )
    );

    if (articlesToSave.length > 0) {
      const batch = db.batch();

      articlesToSave.forEach((article) => {
        const imageRef = imageCollection.doc(article.article_id);
        const imageDocument = {
          id: article.article_id,
          description: article.description,
          imageUrl: article.image_url,
          link: article.link,
        };

        batch.set(imageRef, imageDocument, { merge: true });
        imagesToReturnFrom.push(imageDocument);
      });

      await batch.commit();
    }
  }

  return imagesToReturnFrom;
};

/**
 * Retrieves images from the specified collection that do not have a record for the user in the 'humans' sub-collection.
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance.
 * @param {FirebaseFirestore.CollectionReference} imageCollection - Firestore collection reference for the images.
 * @param {string} uid - User ID to filter out images the user has interacted with.
 * @returns {Promise<Array<Object>>} - Array of image documents that the user has not interacted with.
 */
const retrieveImagesWithoutUserInput = async (db, imageCollection, uid) => {
  const allImagesSnapshot = await imageCollection.get();
  let retrievedImages;

  // Fetch 'humans' sub-collections which contain a document with the user's ID
  const humansWithUserInputSnapshot = await db
    .collectionGroup("humans")
    .where("id", "==", uid)
    .get();

  if (!humansWithUserInputSnapshot.empty) {
    // Create a set of image document IDs the user has already interacted with
    const imagesWithUserInputSet = new Set(
      humansWithUserInputSnapshot.docs.map((doc) => doc.ref.parent.parent.id)
    );

    // Filter out images that the user has already interacted with
    retrievedImages = allImagesSnapshot.docs
      .filter((image) => !imagesWithUserInputSet.has(image.id))
      .map((doc) => doc.data());
  } else {
    // If no interactions are found, return all saved images
    retrievedImages = allImagesSnapshot.docs.map((doc) => doc.data());
  }

  return retrievedImages;
};

/**
 * Cloud Function to get an image based on user interest.
 * @param {Object} request - The request object containing data and auth information.
 * @returns {Promise<Object>} - The image document data.
 * @throws {HttpsError} - Throws an error if the user is not authenticated or if an invalid interest is provided.
 */
exports.getImage = onCall(async (request) => {
  const { interest } = request.data;
  const { uid } = request.auth;

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to call this function"
    );
  }

  if (!INTERESTS.includes(interest)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid interest provided",
      interest
    );
  }

  const db = getFirestore();
  const imageCollection = db.collection(interest);

  let imagesToReturnFrom = await retrieveImagesWithoutUserInput(
    db,
    imageCollection,
    uid
  );

  if (imagesToReturnFrom.length === 0) {
    imagesToReturnFrom = await createImagesFromNewsAPI(db, imageCollection);
  }

  if (imagesToReturnFrom.length === 0) {
    throw new HttpsError("not-found", "No images found - try again later");
  } else {
    const randomIndex = Math.floor(Math.random() * imagesToReturnFrom.length);
    return imagesToReturnFrom[randomIndex];
  }
});
