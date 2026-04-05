import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

let client: MongoClient | null = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI || "");
  }
  await client.connect();
  return client.db(process.env.MONGODB_DB || "answermydocs");
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.collection("users").insertOne({
      email,
      name: name || "",
      password: hashedPassword,
      provider: "credentials",
      avatar: null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Account created successfully." });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
