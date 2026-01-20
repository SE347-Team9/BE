// Socket.IO event emitter utility
// Use this to emit real-time events from controllers

const emitToRole = (io, role, event, data) => {
  if (io) {
    io.to(role).emit(event, data);
  }
};

const emitToUser = (io, userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

const emitToAll = (io, event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Event types
const EVENTS = {
  // Distribution events
  DISTRIBUTION_CREATED: 'distribution:created',
  DISTRIBUTION_UPDATED: 'distribution:updated',
  DISTRIBUTION_APPROVED: 'distribution:approved',
  DISTRIBUTION_CANCELLED: 'distribution:cancelled',
  
  // Payment events
  PAYMENT_CREATED: 'payment:created',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  PAYMENT_CANCELLED: 'payment:cancelled',
  
  // Import events
  IMPORT_CREATED: 'import:created',
  IMPORT_CONFIRMED: 'import:confirmed',
  
  // Agency events
  AGENCY_CREATED: 'agency:created',
  AGENCY_UPDATED: 'agency:updated',
  AGENCY_DEBT_CHANGED: 'agency:debt_changed',
  
  // Product events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_STOCK_CHANGED: 'product:stock_changed',
  
  // Account events
  ACCOUNT_CREATED: 'account:created',
  ACCOUNT_UPDATED: 'account:updated',
  
  // Report events
  REPORT_CREATED: 'report:created',
  REPORT_UPDATED: 'report:updated',
};

module.exports = {
  emitToRole,
  emitToUser,
  emitToAll,
  EVENTS
};
