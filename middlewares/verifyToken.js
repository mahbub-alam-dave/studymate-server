// middlewares/verifyToken.js
const admin = require("firebase-admin");
const serviceAccount = require("../fir-advance-project-sdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  const firebaseToken = req.headers?.authorization;

  if (!firebaseToken || !firebaseToken.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = firebaseToken.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    res.status(401).send({ message: "Unauthorized access" });
  }
};

module.exports = verifyToken;
