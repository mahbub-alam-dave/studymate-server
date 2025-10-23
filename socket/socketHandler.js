const { ObjectId } = require('mongodb');

// Store active users: { userId: socketId }
const activeUsers = new Map();

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const messagesCollection = db.collection("messages");
const conversationCollection = db.collection("conversation");

module.exports = (io, db) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // User joins with their ID
    socket.on('user:join', (userId) => {
      activeUsers.set(userId, socket.id);
      console.log(`User ${userId} joined with socket ${socket.id}`);
      
      // Notify all users about online status
      io.emit('user:online', userId);
    });

    // Join a conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Send message
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, senderId, senderName, text, receiverId } = data;

        // Save message to database
        const message = {
          conversationId: new ObjectId(conversationId),
          senderId,
          senderName,
          text,
          read: false,
          createdAt: new Date(),
          type: 'text'
        };

        const result = await messagesCollection.insertOne(message);
        message._id = result.insertedId;

        // Update conversation's last message
        await conversationCollection.updateOne(
          { _id: new ObjectId(conversationId) },
          {
            $set: {
              lastMessage: {
                text,
                senderId,
                timestamp: new Date()
              },
              updatedAt: new Date()
            }
          }
        );

        // Emit to conversation room
        io.to(conversationId).emit('message:receive', message);

        // Send notification to receiver if online
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('notification:new_message', {
            conversationId,
            senderName,
            text
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message:error', 'Failed to send message');
      }
    });

    // Mark messages as read
    socket.on('message:read', async (conversationId) => {
      try {
        await messagesCollection.updateMany(
          { 
            conversationId: new ObjectId(conversationId),
            read: false 
          },
          { $set: { read: true } }
        );

        io.to(conversationId).emit('messages:marked_read', conversationId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Typing indicator
    socket.on('typing:start', (data) => {
      socket.to(data.conversationId).emit('typing:user', {
        userId: data.userId,
        userName: data.userName
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.conversationId).emit('typing:stop', data.userId);
    });

    // User disconnect
    socket.on('disconnect', () => {
      // Find and remove user from activeUsers
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          io.emit('user:offline', userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};