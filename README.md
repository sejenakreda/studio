# SiAP Smapna

This is a Next.js starter project for SiAP Smapna, built with Firebase.

## Getting Started

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Required Setup: Environment Variables

Before running or deploying the app, you **must** configure your Firebase connection keys.

1.  **Find your keys:** Go to your **Firebase project settings**, and on the **General** tab, find your web app configuration. You will need values like `apiKey`, `authDomain`, etc.

2.  **Fill `.env.local`:** This project now includes a `.env.local` file with placeholders. Open it and replace each placeholder (like `your_api_key_here`) with the corresponding value from your Firebase project.

    ```
    # Example for .env.local file
    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
    # ... and so on for all 6 variables.
    ```
    
3.  **Restart the server:** After saving `.env.local`, you must restart your development server (`Ctrl+C` then `npm run dev`) for the changes to take effect.

4.  **Important:** The `.env.local` file is automatically ignored by Git, so your secret keys will not be pushed to GitHub. This is a crucial security feature.

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
