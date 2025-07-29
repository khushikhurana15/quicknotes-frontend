// src/db.js
import Dexie from 'dexie';

const db = new Dexie('NotesAppDatabase'); // Your database name
db.version(1).stores({
  notes: '++id, &backendId, title, content, isPublic, isArchived, mediaPath, mediaType, tags, createdAt, updatedAt', // Primary key 'id', unique index on 'backendId'
  // You might also need a 'syncQueue' table for offline writes
  syncQueue: '++id, endpoint, method, data, timestamp'
});

export default db;