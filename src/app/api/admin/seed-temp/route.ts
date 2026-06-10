import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    const hashedPassword = await bcrypt.hash("12345678", 10);

    if (adminExists) {
      // Update existing admin to match uv@gmail.com and 12345678
      await prisma.user.update({
        where: { id: adminExists.id },
        data: {
          email: "uv@gmail.com",
          name: "Urban Ventures Admin",
          password: hashedPassword
        }
      });
      return NextResponse.json({ 
        success: true, 
        message: "Admin credentials successfully updated in the database to uv@gmail.com / 12345678!" 
      });
    }

    // Create a new admin user if none exists
    const adminUser = await prisma.user.create({
      data: {
        email: "uv@gmail.com",
        name: "Urban Ventures Admin",
        phone: "+919999999999",
        password: hashedPassword,
        role: "ADMIN"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Admin user seeded successfully in the database!", 
      email: adminUser.email 
    });
  } catch (error: any) {
    console.error("Temp seed error:", error);
    return NextResponse.json({ error: "Database seeding failed", details: error.message }, { status: 500 });
  }
}
