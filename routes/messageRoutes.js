const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const messagesCollection = db.collection("messages");
const conversationCollection = db.collection("conversation");

// Get messages for a conversation
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const db = req.app.locals.db;

    const messages = await messagesCollection
      .find({ conversationId: new ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;