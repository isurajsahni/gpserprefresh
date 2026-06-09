import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Under Review', 'Completed'],
      default: 'To Do',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    startDate: { type: Date },
    endDate: { type: Date },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', projectSchema);
