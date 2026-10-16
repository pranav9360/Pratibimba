import express from "express";
import { rateLimit } from "express-rate-limit";
import authenticate from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { sendMail } from "../services/emailService.js";
import { changeOwnPassword } from "../services/accountPasswordService.js";

const router = express.Router();
router.use(authenticate);
const limited = rateLimit({windowMs:15*60*1000, limit:5, standardHeaders:"draft-8", legacyHeaders:false,
  handler:(_req,res)=>res.status(429).json({success:false,message:"Too many requests. Please try later."})});
const adminEmails = async () => {
  const users = await User.find({active:true,role:"admin"}).select("email").lean();
  return [...new Set(users.map(u=>String(u.email||"").trim().toLowerCase()).filter(Boolean))];
};
router.get("/support-recipients", asyncHandler(async (_req,res)=>{
  res.json(new ApiResponse(200,"Support recipients",{recipients:await adminEmails()}));
}));
router.post("/support",limited,asyncHandler(async(req,res)=>{
  const subject=String(req.body?.subject||"").trim();
  const message=String(req.body?.message||"").trim();
  if(subject.length<3||subject.length>160||message.length<10||message.length>5000)
    throw new AppError("Subject must be 3–160 characters and issue description 10–5000 characters.",400);
  const recipients=await adminEmails();
  const sender=req.user;
  const text=`Pratibimba Help & Support\n\nFrom: ${sender.name}\nEmail: ${sender.email}\nRole: ${sender.role}\n\nSubject: ${subject}\n\n${message}`;
  await sendMail({to:"superadmin@pratibimba.com",cc:recipients.filter(email=>email!=="superadmin@pratibimba.com"),subject:`[Pratibimba Support] ${subject}`,text});
  res.json(new ApiResponse(200,"Your support request was emailed to the administrators."));
}));
router.post("/change-password",limited,asyncHandler(async(req,res)=>{
  await changeOwnPassword(req.user, req.body || {}, req.authClaims);
  res.json(new ApiResponse(200,"Password changed successfully. Sign in again with the new password."));
}));
export default router;
