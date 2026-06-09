import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['Laptop', 'Mobile', 'Monitor', 'Software', 'Furniture'],
      default: 'Laptop',
    },
    serialNo: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Assigned', 'Available'], default: 'Available' },
    purchaseDate: { type: Date },
    value: { type: Number, default: 0 },
    condition: { type: String, default: 'Good' },
  },
  { timestamps: true }
);

export const Asset = mongoose.model('Asset', assetSchema);
