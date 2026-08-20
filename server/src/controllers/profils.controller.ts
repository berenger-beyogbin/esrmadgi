import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { FONCTIONNALITES, profilsService } from '../services/profils.service';
const role=z.enum(['GESTIONNAIRE','ADMINISTRATEUR']);
const schema=z.object({code_profil:z.string().min(2).max(40),lib_profil:z.string().min(2).max(80),description:z.string().max(240).optional(),role_base:role,permissions:z.array(z.enum(FONCTIONNALITES)).min(1),actif:z.boolean().optional()});
const update=schema.omit({code_profil:true}).partial();
export const profilsController={
 async list(_req:Request,res:Response,next:NextFunction){try{res.json({data:await profilsService.list(),error:null});}catch(e){next(e);}},
 async create(req:Request,res:Response,next:NextFunction){try{const p=schema.safeParse(req.body);if(!p.success)throw new AppError(400,p.error.errors[0]?.message||'Donnees invalides');res.status(201).json({data:await profilsService.create(p.data),error:null});}catch(e){next(e);}},
 async update(req:Request,res:Response,next:NextFunction){try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<=0)throw new AppError(400,'ID profil invalide');const p=update.safeParse(req.body);if(!p.success)throw new AppError(400,p.error.errors[0]?.message||'Donnees invalides');res.json({data:await profilsService.update(id,p.data),error:null});}catch(e){next(e);}},
};
