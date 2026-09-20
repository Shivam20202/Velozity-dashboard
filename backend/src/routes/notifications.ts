import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { prisma } from "../lib/prisma.js";
import { emitUnread } from "../socket.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
const r = Router();
r.use(requireAuth);
r.get(
  "/",
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    }),
  ),
);
r.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
 const n = await prisma.notification.updateMany({
  where: {
    id: String(req.params.id),
    userId: req.user!.id,
  },
  data: {
    read: true,
  },
});
    emitUnread(
      req.user!.id,
      await prisma.notification.count({
        where: { userId: req.user!.id, read: false },
      }),
    );
    res.json({ success: true, data: n.count });
  }),
);
r.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    emitUnread(req.user!.id, 0);
    res.json({ success: true });
  }),
);
export default r;
