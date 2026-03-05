
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Kode fungsi terjadwal dihapus untuk menghindari permintaan upgrade billing (Blaze Plan).
// Proyek sekarang tetap berada di paket gratis (Spark Plan).

export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("SiAP Smapna Backend Active");
});
