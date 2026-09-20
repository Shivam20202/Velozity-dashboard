import jwt from 'jsonwebtoken'; import crypto from 'crypto'; import { env } from '../config/env.js';
export type AccessPayload={sub:string;role:string};
export const signAccess=(payload:AccessPayload)=>jwt.sign(payload,env.JWT_ACCESS_SECRET,{expiresIn:env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn']});
export const verifyAccess=(token:string)=>jwt.verify(token,env.JWT_ACCESS_SECRET) as AccessPayload;
export const newRefreshToken=()=>crypto.randomBytes(48).toString('hex');
export const hashToken=(token:string)=>crypto.createHash('sha256').update(token).digest('hex');
