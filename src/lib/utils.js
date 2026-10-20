// src/lib/utils.js

import { NextResponse } from "next/server";
import corsHeaders from "./cors";

export function printExceptionLog(logMessage, error) {
  console.log(`==>${logMessage} Exception`);
  console.log(error);
}

export function errorResponse(message, status) {
  return NextResponse.json(
    {
      message: message,
    },
    {
      status: status,
      headers: corsHeaders,
    },
  );
}

export function successResponse(jsonData, status) {
  return NextResponse.json(jsonData, {
    status: status,
    headers: corsHeaders,
  });
}

// CORS preflight response, used by every route's OPTIONS handler.
export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}
