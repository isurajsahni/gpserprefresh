import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { buildScope, isOwnerScoped } from '../utils/scope.js';
import { canWrite } from '../config/accessMatrix.js';

// Generates standard CRUD handlers for a Mongoose model, applying role-based
// scoping from the access matrix on every operation.
//
// options:
//   module     - matrix module key (used for scoping)
//   populate   - array of populate specs applied to list/get
//   sort       - default sort
//   ownerField - field set to req.auth.id on create for owner-scoped roles
export function crudFactory(Model, options = {}) {
  const { module, populate = [], sort = '-createdAt', ownerField } = options;

  const applyPopulate = (q) => populate.reduce((acc, p) => acc.populate(p), q);

  const list = asyncHandler(async (req, res) => {
    const scope = buildScope(module, req.access, req.auth.id);
    const filter = { ...scope };

    // Lightweight query filters from ?status=&category=&project= etc.
    for (const key of ['status', 'category', 'priority', 'type', 'source', 'month', 'project']) {
      if (req.query[key]) filter[key] = req.query[key];
    }

    const docs = await applyPopulate(Model.find(filter)).sort(sort);
    res.json(docs);
  });

  const getOne = asyncHandler(async (req, res) => {
    const scope = buildScope(module, req.access, req.auth.id);
    const doc = await applyPopulate(Model.findOne({ _id: req.params.id, ...scope }));
    if (!doc) throw new ApiError(404, `${Model.modelName} not found`);
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    if (!canWrite(module, req.auth.role)) throw new ApiError(403, 'No write permission');
    const payload = { ...req.body };

    // Owner-scoped roles always create records owned by themselves.
    if (ownerField && isOwnerScoped(module, req.access)) {
      payload[ownerField] = req.auth.id;
    }

    const doc = await Model.create(payload);
    const populated = await applyPopulate(Model.findById(doc._id));
    res.status(201).json(populated);
  });

  const update = asyncHandler(async (req, res) => {
    if (!canWrite(module, req.auth.role)) throw new ApiError(403, 'No write permission');
    const scope = buildScope(module, req.access, req.auth.id);
    const doc = await Model.findOne({ _id: req.params.id, ...scope });
    if (!doc) throw new ApiError(404, `${Model.modelName} not found`);

    const payload = { ...req.body };
    // Prevent owner-scoped roles from reassigning ownership.
    if (ownerField && isOwnerScoped(module, req.access)) delete payload[ownerField];

    Object.assign(doc, payload);
    await doc.save();
    const populated = await applyPopulate(Model.findById(doc._id));
    res.json(populated);
  });

  const remove = asyncHandler(async (req, res) => {
    if (!canWrite(module, req.auth.role)) throw new ApiError(403, 'No write permission');
    const scope = buildScope(module, req.access, req.auth.id);
    const doc = await Model.findOneAndDelete({ _id: req.params.id, ...scope });
    if (!doc) throw new ApiError(404, `${Model.modelName} not found`);
    res.json({ success: true, id: req.params.id });
  });

  return { list, getOne, create, update, remove };
}
