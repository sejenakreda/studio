# SiAP Smapna

This is a Next.js starter project for SiAP Smapna, built with Firebase.

## Getting Started

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Required Setup: Environment Variables

Before deploying, you must secure your Firebase configuration keys.

1.  **Create `.env.local` file:** In the root directory of your project, create a file named `.env.local`.

2.  **Add Your Keys:** Open your new `.env.local` file and add your Firebase project's configuration keys. You can find these in your Firebase project settings.

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

3.  **Important:** Make sure your `.gitignore` file includes a line for `.env.local` to prevent your secret keys from being pushed to GitHub.

## Deploying

This project is set up for easy deployment on Vercel.

### 1. Deploying Firestore Security Rules (Crucial First Step)

Your project includes a `firestore.rules` file with the final, secure rules for your database. You **must** deploy these rules to make your database secure and functional for all user roles.

**a. Install Firebase CLI:**
If you don't have it installed, run this command once:
`npm install -g firebase-tools`

**b. Login to Firebase:**
`firebase login`
This will open a browser window to log in to your Google account.

**c. Select Your Firebase Project:**
Run this command to link your project folder to your Firebase project:
`firebase use --add`
Then, select your project ID from the list.

**d. Deploy the Rules:**
Finally, run this command to deploy *only* the Firestore rules:
`firebase deploy --only firestore:rules`

You should see a "Deploy complete!" message. Your database is now secure and ready.

### 2. Deploying the App to Vercel

1.  **Push to GitHub:** Push your completed project code to a new GitHub repository.
2.  **Import to Vercel:** Go to your Vercel dashboard, click "Add New... > Project", and import the repository from GitHub.
3.  **Configure Environment Variables (CRITICAL STEP):** In the Vercel project settings, go to "Settings" > "Environment Variables". You must add all the `NEXT_PUBLIC_` variables from your `.env.local` file here. This is a critical step for the deployed app to connect to Firebase.
    *   **Key:** `NEXT_PUBLIC_FIREBASE_API_KEY`, **Value:** `your_api_key`
    *   **Key:** `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, **Value:** `your_auth_domain`
    *   ...and so on for all 6 variables.
4.  **Deploy:** Click the "Deploy" button. Vercel will automatically build and deploy your Next.js application, and it will be live on the web!
