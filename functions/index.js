const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const fetch = require("node-fetch");

const { INTERESTS, TO_DELETE_KEY } = require("./constants");

require("dotenv").config();

initializeApp();

/**
 * Creates or updates the next page document for a given interest.
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance.
 * @param {string} interest - The interest category.
 * @param {Object} [newNextPageDoc=null] - The new next page document data.
 * @returns {Promise<Object>} - The next page document data.
 */
async function createOrUpdateNextPageDocument(
  db,
  interest,
  newNextPageDoc = null
) {
  let docToReturn = { nextPage: 0 };
  await db.runTransaction(async (transaction) => {
    const nextPageDocRef = db.collection("NextPage").doc(interest);

    if (newNextPageDoc !== null) {
      docToReturn = newNextPageDoc;
      transaction.set(nextPageDocRef, docToReturn);
    } else {
      const currentNextPageDoc = await transaction.get(nextPageDocRef);
      if (currentNextPageDoc.exists) {
        docToReturn = currentNextPageDoc.data();
      } else {
        transaction.set(nextPageDocRef, docToReturn);
      }
    }
  });

  return docToReturn;
}

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

  let nextPageDoc = await createOrUpdateNextPageDocument(db, interest);
  const imagesToReturnFrom = [];

  // Fetch 'humans' collections which contain user's id
  const humansWithUserInputSnapshot = await db
    .collectionGroup("humans")
    .where("id", "==", uid)
    .get();
  // Create set of image document id's the user has already interacted with
  const imagesWithUserInputSet = new Set(
    humansWithUserInputSnapshot.docs.map((doc) => doc.ref.parent.parent.id)
  );

  const allImagesSnapshot = await imageCollection.get();
  const allImagesWithoutUserInput = allImagesSnapshot.docs
    .filter((image) => !imagesWithUserInputSet.has(image.id))
    .map((doc) => doc.data());

  if (allImagesWithoutUserInput.length > 0) {
    imagesToReturnFrom.push(...allImagesWithoutUserInput);
  } else {
    for (
      let attempts = 0;
      attempts < 5 && imagesToReturnFrom.length === 0;
      attempts++
    ) {
      let newsQueryString = `https://newsdata.io/api/1/archive?apikey=${process.env.NEWSDATA_API_KEY}&category=${interest}&language=en&image=1`;
      if (nextPageDoc.nextPage > 0) {
        newsQueryString += `&page=${nextPageDoc.nextPage}`;
      }

      let newsData;
      try {
        const newsResponse = await fetch(newsQueryString);
        newsData = await newsResponse.json();
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

      nextPageDoc = await createOrUpdateNextPageDocument(db, interest, {
        nextPage: newsData.nextPage,
      });

      // Check for existing documents in batches of 10
      const articlesWithExistingDocuments = [];
      for (
        let counter = 0,
          articleIds = newsData.results.map((article) => article.article_id);
        counter < articleIds.length;
        counter += 10
      ) {
        const articleIdsSlice = articleIds.slice(counter, counter + 10);
        const articlesWithExistingDocumentsSlice = await imageCollection
          .where("id", "in", articleIdsSlice)
          .get();

        if (articlesWithExistingDocumentsSlice.docs.length > 0) {
          articlesWithExistingDocuments.push(
            ...articlesWithExistingDocumentsSlice.docs
          );
        }
      }

      // Filter out articles that already have documents
      const articlesToSave = newsData.results.filter(
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
          imagesToReturnFrom.push(imageDocument);

          batch.set(imageRef, imageDocument, { merge: true });
          batch.set(imageRef.collection("humans").doc(TO_DELETE_KEY), {});
          batch.set(imageRef.collection("bots").doc(TO_DELETE_KEY), {});
        });

        await batch.commit();
      }
    }
  }

  if (imagesToReturnFrom.length === 0) {
    throw new HttpsError("not-found", "No images found - try again later");
  } else {
    const randomIndex = Math.floor(Math.random() * imagesToReturnFrom.length);
    return imagesToReturnFrom[randomIndex];
  }
});
