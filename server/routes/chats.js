import express from 'express';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/chats
 * Get all chats for the authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(50); // Limit to last 50 chats
    
    res.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

/**
 * GET /api/chats/:id
 * Get a specific chat by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

/**
 * POST /api/chats
 * Create or update a chat
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { chatId, title, messages, participatingAIs, fileAttachments } = req.body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    // Ensure all messages have an ID field and clean up structure
    const processedMessages = messages.map(msg => ({
      sender: msg.sender || 'user',
      text: msg.text || '',
      timestamp: msg.timestamp || new Date(),
      id: msg.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    // Check if chatId is a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = chatId && /^[0-9a-fA-F]{24}$/.test(chatId);
    
    // If chatId provided and valid, update existing chat
    if (isValidObjectId) {
      try {
        const chat = await Chat.findOneAndUpdate(
          { _id: chatId, userId: req.user._id },
          {
            title: title || 'Conversation',
            messages: processedMessages,
            participatingAIs: participatingAIs || [],
            fileAttachments: fileAttachments || [],
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );
        
        if (!chat) {
          console.log(`Chat not found for update: ${chatId}`);
          return res.status(404).json({ error: 'Chat not found' });
        }
        
        return res.json({ chat });
      } catch (updateError) {
        console.error('Error updating chat:', updateError);
        return res.status(500).json({
          error: 'Failed to update chat',
          details: updateError.message
        });
      }
    }
    
    // Create new chat (if chatId is invalid or not provided)
    try {
      const chat = new Chat({
        userId: req.user._id,
        title: title || 'New Conversation',
        messages: processedMessages,
        participatingAIs: participatingAIs || [],
        fileAttachments: fileAttachments || []
      });
      
      await chat.save();
      console.log(`Chat created successfully: ${chat._id}`);
      return res.status(201).json({ chat });
    } catch (saveError) {
      console.error('Error creating chat:', saveError);
      return res.status(500).json({
        error: 'Failed to create chat',
        details: saveError.message
      });
    }
  } catch (error) {
    console.error('Error in chat POST route:', error);
    return res.status(500).json({
      error: 'Failed to save chat',
      details: error.message
    });
  }
});

/**
 * PUT /api/chats/:id
 * Update a chat
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, messages, participatingAIs, fileAttachments } = req.body;
    
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        title,
        messages,
        participatingAIs,
        fileAttachments,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ chat });
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

/**
 * DELETE /api/chats/:id
 * Delete a chat
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

/**
 * POST /api/chats/search
 * Search chats by keyword
 */
router.post('/search', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    
    const chats = await Chat.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'messages.text': { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(20);
    
    res.json({ chats });
  } catch (error) {
    console.error('Error searching chats:', error);
    res.status(500).json({ error: 'Failed to search chats' });
  }
});

export default router;