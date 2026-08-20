import { Router } from 'express';
import { profilsController } from '../controllers/profils.controller';
export const profilsRouter=Router();
profilsRouter.get('/',(req,res,next)=>profilsController.list(req,res,next));
profilsRouter.post('/',(req,res,next)=>profilsController.create(req,res,next));
profilsRouter.put('/:id',(req,res,next)=>profilsController.update(req,res,next));
