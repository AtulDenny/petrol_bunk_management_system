import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

const DEFAULT_SECRET = "petrol-pump-management-secret-key-2023";

export type AuthResult = {
	authenticated: boolean;
	userId?: string;
	error?: string;
};

export async function authenticateUser(request: Request): Promise<AuthResult> {
	try {
		const cookieStore = await cookies();
		const token = cookieStore.get("auth_token")?.value;
		if (!token) {
			return { authenticated: false, error: "Missing token" };
		}
		const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
		const decoded = verify(token, secret) as { userId?: string };
		if (!decoded?.userId) {
			return { authenticated: false, error: "Invalid token" };
		}
		return { authenticated: true, userId: decoded.userId };
	} catch (error) {
		return { authenticated: false, error: (error as Error).message };
	}
}

export function handleAuthError(message: string) {
	return NextResponse.json({ message }, { status: 401 });
}


