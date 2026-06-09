import { Router } from 'express';
import { crudFactory } from '../controllers/crudFactory.js';
import { requireModule } from '../middleware/authorize.js';

// Builds a REST router (list/get/create/update/delete) for a model, guarded by
// the module's access matrix. requireModule attaches req.access; the factory
// enforces write permission and scoping.
export function crudRouter(Model, options) {
  const router = Router();
  const ctrl = crudFactory(Model, options);
  const guard = requireModule(options.module);

  router.get('/', guard, ctrl.list);
  router.get('/:id', guard, ctrl.getOne);
  router.post('/', guard, ctrl.create);
  router.put('/:id', guard, ctrl.update);
  router.delete('/:id', guard, ctrl.remove);

  return { router, ctrl };
}
