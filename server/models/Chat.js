import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  textWithFiles: {
    type: String,
    required: false  // Optional field for messages with file contents
  },
  timestamp: {
    type: Date,
    required: true
  },
  files: [{
    id: String,
    name: String,
    size: Number,
    type: String,
    content: String,
    preview: String,  // Data URL for image/video previews
    extractedFiles: [{  // For ZIP files
      name: String,
      content: String,
      size: Number
    }],
    isSupabaseUpload: Boolean,  // Flag for large files uploaded to Supabase
    supabaseUrl: String,  // Supabase storage URL
    fileName: String,  // Supabase storage filename
    uploading: Boolean,  // Upload in progress
    uploadProgress: Number  // Upload progress percentage
  }],
  streaming: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  messages: [messageSchema],
  lastModified: {
    type: Date,
    default: Date.now
  },
  // Metadata
  metadata: {
    messageCount: {
      type: Number,
      default: 0
    },
    participatingAIs: [{
      type: String
    }],
    hasFiles: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Update lastModified and metadata before saving
chatSchema.pre('save', function(next) {
  this.lastModified = new Date();
  this.metadata.messageCount = this.messages.length;
  
  // Track participating AIs
  const ais = new Set();
  let hasFiles = false;
  
  this.messages.forEach(msg => {
    if (msg.sender !== 'user') {
      ais.add(msg.sender);
    }
    if (msg.files && msg.files.length > 0) {
      hasFiles = true;
    }
  });
  
  this.metadata.participatingAIs = Array.from(ais);
  this.metadata.hasFiles = hasFiles;
  
  next();
});

// Index for faster queries
chatSchema.index({ userId: 1, lastModified: -1 });
chatSchema.index({ userId: 1, 'metadata.participatingAIs': 1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;