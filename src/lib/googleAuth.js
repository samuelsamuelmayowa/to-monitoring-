import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from 'firebase/auth'

// Public Firebase web configuration shared with T.O. Analytics.
const app = initializeApp({
  apiKey: 'AIzaSyDQcOL2CB4f8cYB5zyenvr-LiYn9FGfYxw',
  authDomain: 'to-backend-50da6.firebaseapp.com',
  projectId: 'to-backend-50da6',
  appId: '1:74029561052:web:813cc92877d47b98163019',
})
const auth = getAuth(app)
export async function getGoogleIdToken() {
  await setPersistence(auth, inMemoryPersistence)
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    return await result.user.getIdToken()
  } finally { await signOut(auth) }
}
