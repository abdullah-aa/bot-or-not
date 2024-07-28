const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const fetch = require("node-fetch");

const { INTERESTS } = require("./constants");

require("dotenv").config();

initializeApp();

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
  const collectionRef = db.collection(interest);

  let nextPageDoc = await createOrUpdateNextPageDocument(db, interest);
  let imagesToReturnFrom = [];

  const imagesWithoutUserInputSnapshot = await collectionRef
    .where(`human_${uid}`, "==", null)
    .get();

  if (!imagesWithoutUserInputSnapshot.empty) {
    imagesToReturnFrom = imagesWithoutUserInputSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        imageUrl: data.imageUrl,
        description: data.description,
      };
    });
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

      const articleIds = newsData.results.map((article) => article.article_id);
      const articlesWithExistingDocuments = [];

      for (let counter = 0; counter < articleIds.length; counter += 10) {
        const articleIdsSlice = articleIds.slice(counter, counter + 10);
        const articlesWithExistingDocumentsSlice = await collectionRef
          .where(FieldPath.documentId(), "in", articleIdsSlice)
          .get();
        articlesWithExistingDocuments.push(
          ...articlesWithExistingDocumentsSlice.docs
        );
      }

      const articlesToSave = newsData.results.filter(
        (article) =>
          !articlesWithExistingDocuments.some(
            (doc) => doc.id === article.article_id
          )
      );

      if (articlesToSave.length > 0) {
        const batch = db.batch();

        articlesToSave.forEach((article) => {
          const articleRef = collectionRef.doc(article.article_id);

          batch.set(
            articleRef,
            {
              description: article.description,
              imageUrl: article.image_url,
              link: article.link,
            },
            { merge: true }
          );

          imagesToReturnFrom.push({
            id: article.article_id,
            imageUrl: article.image_url,
            description: article.description,
          });
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
