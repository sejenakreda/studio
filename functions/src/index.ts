
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Set the time zone for the function to run in Asia/Jakarta (WIB)
const TIME_ZONE = "Asia/Jakarta";

/**
 * A scheduled function that runs every weekday (Monday-Friday) at 10:00 AM WIB.
 * It checks which teachers have not submitted their daily attendance and sends
 * a push notification to them as a reminder.
 */
export const sendAttendanceReminder = functions.pubsub
  .schedule("0 10 * * 1-5") // Cron syntax for 10:00 AM, Monday to Friday
  .timeZone(TIME_ZONE)
  .onRun(async (context) => {
    console.log("Starting sendAttendanceReminder function execution.");

    try {
      // Get today's date at the beginning of the day in WIB.
      const now = new Date();
      const today = new Date(now.toLocaleString("en-US", {timeZone: TIME_ZONE}));
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

      // 1. Get all users with the 'guru' role.
      const usersSnapshot = await db.collection("users")
          .where("role", "==", "guru").get();
      if (usersSnapshot.empty) {
        console.log("No users with role 'guru' found. Exiting function.");
        return null;
      }
      const allTeachers = usersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      console.log(`Found ${allTeachers.length} teachers.`);

      // 2. Get all attendance records for today.
      const attendanceSnapshot = await db.collection("teacherDailyAttendance")
          .where("date", "==", todayTimestamp).get();
      const teachersWhoAttended = new Set(
          attendanceSnapshot.docs.map((doc) => doc.data().teacherUid),
      );
      console.log(`${teachersWhoAttended.size} teachers have already recorded attendance today.`);

      // 3. Find teachers who have NOT attended and have an FCM token.
      const teachersToNotify = allTeachers.filter((teacher) =>
        !teachersWhoAttended.has(teacher.uid) && teacher.fcmToken,
      );

      if (teachersToNotify.length === 0) {
        console.log("All teachers have recorded attendance or have no FCM token. No notifications to send.");
        return null;
      }

      console.log(`Found ${teachersToNotify.length} teachers to notify.`);

      // 4. Prepare and send notifications.
      const tokens = teachersToNotify.map((teacher) => teacher.fcmToken) as string[];

      if (tokens.length === 0) {
        console.log("No valid FCM tokens found for teachers to be notified.");
        return null;
      }

      const message = {
        notification: {
          title: "Pengingat Kehadiran Harian",
          body: "Anda belum mencatat kehadiran untuk hari ini. Mohon segera catat kehadiran Anda di aplikasi SiAP Smapna.",
        },
        tokens: tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`Successfully sent ${response.successCount} messages.`);

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.warn("List of tokens that caused failures: " + failedTokens);
        // Optional: Clean up invalid tokens from Firestore here.
      }
    } catch (error) {
      console.error("Error executing sendAttendanceReminder function: ", error);
    }
    return null;
  });

