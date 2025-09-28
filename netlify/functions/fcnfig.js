// netlify
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      apiKey: process.env.PUBLIC_FIRE_API,
      authDomain: "devtemple0.firebaseapp.com",
  projectId: "devtemple0",
  storageBucket: "devtemple0.firebasestorage.app",
  messagingSenderId: "70957783581",
  appId: "1:70957783581:web:8abb8c66c4a7eb258244f4",
  measurementId: "G-79T0JMS2KE"
    }),
  };
};


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
