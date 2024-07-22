/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
// const {onDocumenrCreated} = require("firebase-functions/v2/firestore");
// const logger = require("firebase-functions/logger");

const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

const fetch = require("node-fetch");

require("dotenv").config();

initializeApp();

exports.getImage = onCall(async (request) => {
  const {interest} = request.data;
  const {uid} = request.auth;

  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to call this function");
  }

  const db = getFirestore();
  const collectionRef = db.collection(interest);

  const allDocumentsSnapshot = await collectionRef.get();
  const documentsWithoutUid = allDocumentsSnapshot.docs.filter(doc => {
    const data = doc.data();
    return data[uid] === undefined;
  });

  if (documentsWithoutUid.length === 0) {
    const response = await fetch(`https://newsdata.io/api/1/archive?apikey=${process.env.NEWSDATA_API_KEY}&category=${interest}&language=en`);
    const json = await response.json();

    const batch = db.batch();
    for (const obj of json.results) {
      const docRef = db.collection(interest).doc(obj.article_id);
      batch.set(docRef, { image_url: obj.image_url }, { merge: true });
    }
    const writeResults = await batch.commit();

    writeResults.forEach(result => {
      const docRef = result.ref;
      docRef.get().then(docSnapshot => {
        if (docSnapshot.exists) {
          const data = docSnapshot.data();
          documentsWithoutUid.push({
            id: docSnapshot.id,
            image_url: data.image_url
          });
        }
      })
    });
  }

  const randomDocument = documentsWithoutUid[Math.floor(Math.random() * documentsWithoutUid.length)];
  const data = randomDocument.data();
  return {
    interest,
    id: randomDocument.id,
    image_url: data.image_url
  };
});