import axios from 'axios';
export const API=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
let accessToken=''; export const setAccessToken=(t:string)=>{accessToken=t}; export const getAccessToken=()=>accessToken;
export const api=axios.create({baseURL:API,withCredentials:true}); api.interceptors.request.use(c=>{if(accessToken)c.headers.Authorization=`Bearer ${accessToken}`;return c});
let refreshing:Promise<string>|null=null; api.interceptors.response.use(r=>r,async err=>{const original=err.config;if(err.response?.status===401&&!original._retry&&!original.url?.includes('/auth/')){original._retry=true;refreshing??=api.post('/auth/refresh').then(r=>{setAccessToken(r.data.data.accessToken);return r.data.data.accessToken}).finally(()=>refreshing=null);try{await refreshing;return api(original)}catch{setAccessToken('')}}throw err});
export async function login(email:string,password:string){const r=await api.post('/auth/login',{email,password});setAccessToken(r.data.data.accessToken);return r.data.data} export async function logout(){await api.post('/auth/logout');setAccessToken('')}
