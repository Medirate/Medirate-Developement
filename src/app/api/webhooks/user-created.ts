import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user } = req.body.data;

    const existingUser = await prisma.user.findUnique({
      where: { kindeId: user.id },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          kindeId: user.id,
          email: user.email,
          role: "user", // Default role or based on webhook payload
          subscriptionStatus: "inactive",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    res.status(200).json({ message: "User created successfully!" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
