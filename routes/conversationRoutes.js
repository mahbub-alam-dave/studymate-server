const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const messagesCollection = db.collection("messages");
const conversationCollection = db.collection("conversation");

// Get or Create Conversation between two users
router.post('/get-or-create', async (req, res) => {
  try {
    const { user1Id, user1Name, user1Photo, user1Role, user2Id, user2Name, user2Photo, user2Role } = req.body;
    const db = req.app.locals.db;

    // Check if conversation already exists
    let conversation = await conversationCollection.findOne({
      type: 'direct',
      participants: { $all: [user1Id, user2Id] }
    });

    if (!conversation) {
      // Create new conversation
      const newConversation = {
        type: 'direct',
        participants: [user1Id, user2Id],
        participantDetails: [
          { id: user1Id, name: user1Name, photo: user1Photo, role: user1Role },
          { id: user2Id, name: user2Name, photo: user2Photo, role: user2Role }
        ],
        lastMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await conversationCollection.insertOne(newConversation);
      conversation = { _id: result.insertedId, ...newConversation };
    }

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all conversations for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.locals.db;

    const conversations = await conversationCollection
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get unread count for user
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.locals.db;

    // Get all conversations for user
    const conversations = await conversationCollection
      .find({ participants: userId })
      .toArray();

    const conversationIds = conversations.map(c => c._id);

    // Count unread messages
    const unreadCount = await messagesCollection.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      read: false
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;