# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deploying Firestore Security Rules

Your project now includes a `firestore.rules` file with secure, permanent rules for your database. To apply these rules to your Firebase project, follow these steps in your terminal:

**1. Install Firebase CLI:**
If you don't have it installed, run this command once:
`npm install -g firebase-tools`

**2. Login to Firebase:**
`firebase login`
This will open a browser window to log in to your Google account.

**3. Select Your Firebase Project:**
Run this command to link your project folder to your Firebase project:
`firebase use --add`
Then, select your project ID from the list.

**4. Deploy the Rules:**
Finally, run this command to deploy *only* the Firestore rules:
`firebase deploy --only firestore:rules`

You should see a "Deploy complete!" message. Your database is now secure and will not expire.
