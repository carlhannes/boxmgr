// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/authMiddleware";

type Data = {
  name: string;
};

function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  res.status(200).json({ name: "John Doe" });
}

// Protect this test endpoint with authentication middleware
export default withAuth(handler);
