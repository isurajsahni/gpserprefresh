import mongoose from 'mongoose';

const designAssetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Logo', 'Document', 'Template', 'Image', 'Icons'],
      default: 'Image',
    },
    format: { type: String, default: '' },
    size: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedOn: { type: Date, default: Date.now },
    version: { type: String, default: 'v1.0' },
    tags: [{ type: String }],
    url: { type: String, default: '' },
  },
  { timestamps: true }
);

export const DesignAsset = mongoose.model('DesignAsset', designAssetSchema);
