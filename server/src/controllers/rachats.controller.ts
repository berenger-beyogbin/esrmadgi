import { NextFunction,Request,Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { rachatsService } from '../services/rachats.service';
const user=(r:Request)=>{if(!r.user)throw new AppError(401,'Authentification requise');return r.user;};
const create=z.object({adherentId:z.string().min(1),dateDemande:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),motif:z.string().max(1000).optional()});
const transition=z.object({statut:z.enum(['EN_CONTROLE','VALIDE','REJETE','ANNULE']),observation:z.string().max(2000).optional()});
const pay=z.object({datePaiement:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),referencePaiement:z.string().min(2).max(120),modePaiement:z.enum(['VIREMENT','CHEQUE']),observation:z.string().max(2000).optional()});
export const rachatsController={
 async list(req:Request,res:Response,next:NextFunction){try{res.json({data:await rachatsService.list({search:String(req.query.search??''),statut:String(req.query.statut??'')}),error:null});}catch(e){next(e)}},
 async create(req:Request,res:Response,next:NextFunction){try{const p=create.safeParse(req.body);if(!p.success)throw new AppError(400,p.error.errors[0]?.message??'Donnees invalides');res.status(201).json({data:await rachatsService.create(user(req),p.data),error:null});}catch(e){next(e)}},
 async transition(req:Request,res:Response,next:NextFunction){try{const p=transition.safeParse(req.body);if(!p.success)throw new AppError(400,p.error.errors[0]?.message??'Donnees invalides');res.json({data:await rachatsService.transition(user(req),String(req.params.id),p.data),error:null});}catch(e){next(e)}},
 async pay(req:Request,res:Response,next:NextFunction){try{const p=pay.safeParse(req.body);if(!p.success)throw new AppError(400,p.error.errors[0]?.message??'Donnees invalides');res.json({data:await rachatsService.pay(user(req),String(req.params.id),p.data),error:null});}catch(e){next(e)}},
 async pdf(req:Request,res:Response,next:NextFunction){try{const b=await rachatsService.pdf(String(req.params.id));res.type('application/pdf').setHeader('Content-Disposition',`attachment; filename="rachat-${req.params.id}.pdf"`);res.send(Buffer.from(b));}catch(e){next(e)}},
};
