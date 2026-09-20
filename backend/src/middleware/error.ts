import type { ErrorRequestHandler } from 'express';
export const errorHandler:ErrorRequestHandler=(err,req,res,_next)=>{console.error(err);const status=err.statusCode??500;res.status(status).json({success:false,error:{code:err.code??'INTERNAL_ERROR',message:status>=500?'Internal server error':err.message,requestId:req.headers['x-request-id']??null}})};
