import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { getCollection } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { exec } from "child_process";
import { promisify } from "util";
import { join, resolve } from "path";
import fs from "fs";

const execPromise = promisify(exec);
const JWT_SECRET =
  process.env.JWT_SECRET || "petrol-pump-management-secret-key-2023";

// Use environment variable for Python executable or default to 'python'
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';

export async function GET(request: Request) {
  try {
    // Get token from cookies using proper Next.js cookies API
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let userId;
    try {
      const decoded = verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Get receipts from database
    const receiptsCollection = await getCollection("loginDB", "receipts");

    const receipts = await receiptsCollection
      .find({ userId })
      .sort({ processedAt: -1 })
      .toArray();

    // Transform receipts for the frontend
    const transformedReceipts = receipts.map((receipt) => {
      // Calculate total sales and volume from nozzles
      let totalSales = 0;
      let totalVolume = 0;

      if (receipt.ocrData && receipt.ocrData.nozzles) {
        receipt.ocrData.nozzles.forEach((nozzle: any) => {
          if (nozzle.totSales) {
            totalSales += Number.parseInt(nozzle.totSales, 10) || 0;
          }
          if (nozzle.v) {
            totalVolume += Number.parseFloat(nozzle.v) || 0;
          }
        });
      }

      return {
        id: receipt._id.toString(),
        date:
          receipt.ocrData?.printDate ||
          new Date(receipt.processedAt).toISOString().split("T")[0],
        pumpSerial: receipt.ocrData?.pumpSerialNumber || "Unknown",
        totalSales: totalSales || 0,
        volume: Number.parseFloat(totalVolume.toFixed(2)) || 0,
        fileUrl: receipt.fileUrl,
        processedAt: receipt.processedAt,
        rawData: receipt.ocrData,
      };
    });

    return NextResponse.json({
      success: true,
      receipts: transformedReceipts,
    });
  } catch (error: any) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error fetching receipts: ${error.message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get token from cookies using proper Next.js cookies API
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let userId;
    try {
      const decoded = verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Parse request body
    const { fileUrl } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json(
        { message: "File URL is required" },
        { status: 400 }
      );
    }

    // Get the actual file path from the URL
    const filePath = join(process.cwd(), "public", fileUrl);
    console.log(`Processing receipt at path: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        { message: "Receipt image file not found" },
        { status: 404 }
      );
    }

    // Log file stats for debugging
    try {
      const stats = fs.statSync(filePath);
      console.log(`File size: ${stats.size} bytes`);
      console.log(`File permissions: ${stats.mode}`);
      console.log(`File last modified: ${stats.mtime}`);
    } catch (error) {
      console.error(`Error getting file stats: ${error}`);
    }

    // Process receipt using Python script; on failure, fallback to Node OCR (tesseract.js)
    let ocrData: any;
    let pythonError: any = null;
    
    try {
      // Get absolute path to script
      const scriptPath = resolve(join(process.cwd(), "lib", "receipt_processor.py"));
      console.log(`Processing receipt: ${filePath}`);
      console.log(`Python script path: ${scriptPath}`);
      console.log(`Python executable: ${PYTHON_EXECUTABLE}`);
      
      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Python OCR script not found at: ${scriptPath}`);
      }
      
      const command = `${PYTHON_EXECUTABLE} "${scriptPath}" "${filePath}"`;
      console.log(`Executing command: ${command}`);
      
      const { stdout, stderr } = await execPromise(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        timeout: 60000 // 60 second timeout
      });
      
      if (stderr && !stderr.includes("Warning")) {
        console.warn("Python script stderr output:", stderr);
      }
      
      if (stdout && stdout.trim()) {
        console.log("Python script stdout length:", stdout.length);
        console.log("Python script stdout preview:", stdout.substring(0, 500));
        
        try {
          // Parse the JSON output from the Python script
          ocrData = JSON.parse(stdout.trim());
          console.log("Successfully parsed OCR data");
          
          // Check if the result contains an error
          if (ocrData.error) {
            console.error("OCR script returned error:", ocrData.error);
            pythonError = new Error(ocrData.error);
            ocrData = null;
          } else {
            console.log(`Extracted data: ${ocrData.nozzles?.length || 0} nozzles, Date: ${ocrData.printDate || 'N/A'}`);
          }
        } catch (parseError) {
          console.error("Error parsing OCR output:", parseError);
          console.log("Raw OCR output:", stdout.substring(0, 1000));
          pythonError = new Error("Failed to parse OCR output");
          ocrData = null;
        }
      } else {
        console.error("No output from Python script");
        pythonError = new Error("No output from OCR processor");
        ocrData = null;
      }
    } catch (error: any) {
      console.error("Error executing OCR script:", error.message);
      pythonError = error;
      ocrData = null;
    }

    // If Python OCR failed, try Node-based OCR fallback (only when explicitly enabled)
    if (!ocrData && process.env.USE_NODE_OCR === "true") {
      try {
        const Tesseract = (await import("tesseract.js")).default;
        const { data: { text } } = await Tesseract.recognize(filePath, "eng");

        // Normalize whitespace and lines
        const normalized = text
          .replace(/\r/g, "\n")
          .replace(/\n+/g, "\n")
          .replace(/\s+:/g, ":")
          .trim();

        // Helpers
        const find = (re: RegExp, def: string = "") => {
          const m = normalized.match(re);
          return m ? m[1].trim() : def;
        };
        const findIn = (text: string, re: RegExp, def: string = "") => {
          const m = text.match(re);
          return m ? m[1].trim() : def;
        };

        // Extract header values
        const pumpSerialNumber = find(/\b(\d{6})\b(?:[^\n]*$)?/m, "");
        const printDate = find(/PRINT\s*DATE\s*[:\-]?\s*([0-9]{1,2}[\/-][A-Z]{3}[\/-][0-9]{2,4})/i);
        const model = find(/MODEL\s*[:\-]?\s*(\d{3,5})/i);

        // Extract nozzles
        const nozzles: any[] = [];
        const blockRegex = /NOZZLE\s*[:\-]?\s*(\d+)[\s\S]*?(?=NOZZLE\s*:|$)/gi;
        let block: RegExpExecArray | null;
        while ((block = blockRegex.exec(normalized)) !== null) {
          const nozzleNum = block[1];
          const segment = block[0];
          const a = findIn(segment, /A\s*[:\-]?\s*([0-9.,]+)/i, "");
          const v = findIn(segment, /V\s*[:\-]?\s*([0-9.,]+)/i, "");
          const totSales = findIn(segment, /TOT\s*SALES\s*[:\-]?\s*([0-9.,]+)/i, "");
          nozzles.push({ nozzle: nozzleNum, a, v, totSales });
        }

        // Fallback if regex failed to split blocks: try line-by-line grouping of first 4 occurrences
        if (nozzles.length === 0) {
          const lines = normalized.split("\n");
          let current: any = null;
          for (const line of lines) {
            const nz = line.match(/NOZZLE\s*[:\-]?\s*(\d+)/i);
            if (nz) {
              if (current) nozzles.push(current);
              current = { nozzle: nz[1], a: "", v: "", totSales: "" };
              continue;
            }
            if (!current) continue;
            const ma = line.match(/\bA\s*[:\-]?\s*([0-9.,]+)/i);
            if (ma) current.a = ma[1];
            const mv = line.match(/\bV\s*[:\-]?\s*([0-9.,]+)/i);
            if (mv) current.v = mv[1];
            const ms = line.match(/TOT\s*SALES\s*[:\-]?\s*([0-9.,]+)/i);
            if (ms) current.totSales = ms[1];
          }
          if (current) nozzles.push(current);
        }
        
        // Build OCR data from parsed values
        ocrData = {
          pumpSerialNumber,
          printDate,
          model,
          nozzles,
        };
        console.log("Node OCR fallback succeeded");
      } catch (fallbackErr) {
        console.error("Node OCR fallback failed:", fallbackErr);
        ocrData = null;
      }
    }

    // If still no OCR data, return error instead of fake data
    if (!ocrData) {
      console.error("All OCR methods failed. No data extracted from receipt.");
      return NextResponse.json(
        {
          success: false,
          message: "Failed to extract data from receipt image. Please ensure the image is clear and readable.",
          error: "OCR processing failed"
        },
        { status: 422 }
      );
    }

    // Validate that OCR data contains actual extracted information
    if (ocrData.error) {
      console.error("OCR returned error:", ocrData.error);
      return NextResponse.json(
        {
          success: false,
          message: `OCR processing error: ${ocrData.error}`,
          error: ocrData.error
        },
        { status: 422 }
      );
    }

    // Ensure we have at least some data (not empty structure)
    if (!ocrData.nozzles || ocrData.nozzles.length === 0) {
      console.warn("OCR completed but no nozzle data extracted");
      // Still save it but warn the user
    }

    console.log("Final OCR data:", JSON.stringify(ocrData, null, 2));

    // Save the receipt data to the database
    const receiptsCollection = await getCollection("loginDB", "receipts");
    const receiptData = {
      userId,
      fileUrl,
      ocrData,
      processedAt: new Date()
    };

    const result = await receiptsCollection.insertOne(receiptData);
    console.log(`Receipt saved with ID: ${result.insertedId.toString()}`);

    return NextResponse.json({
      success: true,
      data: ocrData,
      receiptId: result.insertedId.toString()
    });
  } catch (error: any) {
    console.error("Error processing receipt:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error processing receipt: ${error.message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}