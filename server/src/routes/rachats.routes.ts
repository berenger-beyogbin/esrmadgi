import { Router } from 'express';
import { rachatsController as c } from '../controllers/rachats.controller';
export const rachatsRouter=Router();
rachatsRouter.patch('/:id/paiement',(q,s,n)=>c.pay(q,s,n));
rachatsRouter.patch('/:id/statut',(q,s,n)=>c.transition(q,s,n));
rachatsRouter.get('/:id/liquidation.pdf',(q,s,n)=>c.pdf(q,s,n));
rachatsRouter.post('/',(q,s,n)=>c.create(q,s,n));
rachatsRouter.get('/',(q,s,n)=>c.list(q,s,n));
