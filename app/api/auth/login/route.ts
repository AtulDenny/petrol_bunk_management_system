import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { getCollection } from "@/lib/mongodb";
import { cookies } from "next/headers";

const JWT_SECRET =
  process.env.JWT_SECRET || "petrol-pump-management-secret-key-2023";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get users collection
    const usersCollection = await getCollection("loginDB", "users");

    // Find user by email
    const user = await usersCollection.findOne({ email });

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if password is correct
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set cookie (Next.js 15 requires awaiting cookies() in route handlers)
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "strict",
    });

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        message: "An error occurred during login",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
