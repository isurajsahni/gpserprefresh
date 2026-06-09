import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Under Review', 'Completed'],
      default: 'To Do',
    },
    dueDate: { type: Date },
    timeLogged: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Task = mongoose.model('Task', taskSchema);
