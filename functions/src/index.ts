import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Kode fungsi premium dihapus untuk memastikan kompatibilitas dengan Spark Plan (Gratis).

export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("SiAP Smapna Backend Active - Spark Plan Compatible");
});