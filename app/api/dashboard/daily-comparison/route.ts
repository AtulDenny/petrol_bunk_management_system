import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { authenticateUser, handleAuthError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request);

    if (!auth.authenticated) {
      return handleAuthError(auth.error || "Unauthorized");
    }

    const userId = auth.userId;

    // Get receipts collection
    const receiptsCollection = await getCollection("loginDB", "receipts");

    // Get two most recent receipts for the user
    const receipts = await receiptsCollection
      .find({ userId })
      .sort({ processedAt: -1 })
      .limit(2)
      .toArray();

    // Check if we have enough data for comparison
    if (receipts.length < 2) {
      return NextResponse.json({
        hasEnoughData: false,
        message: "Need at least two receipts for comparison"
      });
    }

    const currentReceipt = receipts[0];
    const previousReceipt = receipts[1];

    // Process current receipt
    const current = processReceipt(currentReceipt);

    // Process previous receipt
    const previous = processReceipt(previousReceipt);

    // Calculate differences (current - previous)
    const salesDiff = current.totalSales - previous.totalSales;
    const volumeDiff = current.totalVolume - previous.totalVolume;
    
    const salesPercentChange = previous.totalSales > 0 
      ? (salesDiff / previous.totalSales) * 100 
      : 0;
    
    const volumePercentChange = previous.totalVolume > 0 
      ? (volumeDiff / previous.totalVolume) * 100 
      : 0;

    // Build comparison data
    const comparison = {
      current,
      previous,
      difference: {
        sales: salesDiff,
        volume: volumeDiff,
        salesPercentChange,
        volumePercentChange
      }
    };

    return NextResponse.json({
      hasEnoughData: true,
      comparison
    });
  } catch (error) {
    console.error("Error fetching comparison data:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to process receipt data
function processReceipt(receipt: any) {
  const nozzleData = [];
  let totalSales = 0;
  let totalVolume = 0;
  
  // Extract receipt date
  let date = "Unknown";
  if (receipt.ocrData?.printDate) {
    date = receipt.ocrData.printDate;
  } else {
    date = new Date(receipt.processedAt).toISOString().split('T')[0];
  }
  
  // Process nozzle data
  if (receipt.ocrData?.nozzles) {
    for (const nozzle of receipt.ocrData.nozzles) {
      const sales = parseInt(nozzle.totSales) || 0;
      const volume = parseFloat(nozzle.v) || 0;
      const pricePerLiter = volume > 0 ? sales / volume : 0;
      
      nozzleData.push({
        nozzle: nozzle.nozzle,
        sales,
        volume,
        pricePerLiter
      });
      
      totalSales += sales;
      totalVolume += volume;
    }
  }
  
  // Calculate revenue per liter
  const revenuePerLiter = totalVolume > 0 ? totalSales / totalVolume : 0;
  
  return {
    date,
    totalSales,
    totalVolume,
    revenuePerLiter,
    nozzleData,
    receiptId: receipt._id.toString(),
    pumpSerial: receipt.ocrData?.pumpSerial || "Unknown"
  };
} 