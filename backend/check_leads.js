const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const Lead = require('./models/Lead');
  
  // Find all users
  console.log('=== ALL USERS ===');
  const users = await User.find({}).select('_id email businessName');
  users.forEach(u => console.log(u._id.toString(), '-', u.email, '-', u.businessName || 'no business name'));
  
  // Check lead distribution
  console.log('\n=== LEADS BY USER ===');
  const leadGroups = await Lead.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);
  
  for (const group of leadGroups) {
    const user = users.find(u => u._id.toString() === group._id?.toString());
    console.log(group._id?.toString(), '-', group.count, 'leads', '-', user?.email || 'UNKNOWN USER');
  }
  
  mongoose.disconnect();
});
