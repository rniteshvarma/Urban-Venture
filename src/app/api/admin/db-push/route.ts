import { exec } from "child_process";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec("node ./node_modules/prisma/build/index.js db push", {
        env: {
          ...process.env,
          // Ensure DATABASE_URL is explicitly forwarded if child process needs it
          DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || "",
          HOME: "/tmp"
        }
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(error.message + "\nStderr: " + stderr + "\nStdout: " + stdout));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Database schema successfully pushed and synced at runtime!",
      stdout: result.stdout,
      stderr: result.stderr
    });
  } catch (error: any) {
    console.error("Runtime DB Push Error:", error);
    return NextResponse.json({
      success: false,
      error: "Runtime database push failed",
      details: error.message
    }, { status: 500 });
  }
}
