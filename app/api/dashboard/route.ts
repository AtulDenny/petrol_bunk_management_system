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

    // Get all receipts for the user
    const receipts = await receiptsCollection
      .find({ userId })
      .sort({ processedAt: -1 })
      .toArray();

    // Calculate dashboard metrics
    let totalSales = 0;
    let volumeSold = 0;
    const transactions = receipts.length;
    let densitySum = 0;
    let densityCount = 0;

    // Data for charts
    const salesByMonth: { [key: string]: number } = {};
    const volumeByMonth: { [key: string]: number } = {};
    // Track distribution by total volume per fuel type for accurate percentages
    const fuelDistributionVolume: { [key: string]: number } = {
      Petrol: 0,
      Diesel: 0,
      Premium: 0,
    };

    // Process each receipt
    receipts.forEach((receipt) => {
      if (receipt.ocrData && receipt.ocrData.nozzles) {
        // Extract month from receipt date
        let month = "Unknown";
        if (receipt.ocrData.printDate) {
          const dateParts = receipt.ocrData.printDate.split("-");
          if (dateParts.length >= 2) {
            month = dateParts[1]; // Month part
          } else {
            // Try to extract month from processedAt
            const processedDate = new Date(receipt.processedAt);
            month = processedDate.toLocaleString("default", { month: "short" });
          }
        } else if (receipt.processedAt) {
          const processedDate = new Date(receipt.processedAt);
          month = processedDate.toLocaleString("default", { month: "short" });
        }

        // Initialize month data if not exists
        if (!salesByMonth[month]) salesByMonth[month] = 0;
        if (!volumeByMonth[month]) volumeByMonth[month] = 0;

        // Process each nozzle
        receipt.ocrData.nozzles.forEach((nozzle: any) => {
          // Add to total sales
          if (nozzle.totSales) {
            const sales = Number.parseInt(nozzle.totSales, 10) || 0;
            totalSales += sales;
            salesByMonth[month] += sales;
          }

          // Add to volume sold
          if (nozzle.v) {
            const volume = Number.parseFloat(nozzle.v) || 0;
            volumeSold += volume;
            volumeByMonth[month] += volume;
          }

          // Calculate density if both A and V are available
          if (nozzle.a && nozzle.v) {
            const a = Number.parseFloat(nozzle.a) || 0;
            const v = Number.parseFloat(nozzle.v) || 0;
            if (v > 0) {
              const density = a / v;
              densitySum += density;
              densityCount++;
            }
          }

          // Determine fuel type based on nozzle number (simplified mapping)
          const nozzleNum = Number.parseInt(nozzle.nozzle, 10) || 0;
          const vol = Number.parseFloat(nozzle.v) || 0;
          if (nozzleNum === 1) {
            fuelDistributionVolume["Petrol"] += vol;
          } else if (nozzleNum === 2) {
            fuelDistributionVolume["Diesel"] += vol;
          } else {
            fuelDistributionVolume["Premium"] += vol;
          }
        });
      }
    });

    // Calculate average density
    const averageDensity = densityCount > 0 ? densitySum / densityCount : 0;

    // Format chart data
    const salesChartData = Object.entries(salesByMonth).map(
      ([name, total]) => ({ name, total })
    );
    const volumeChartData = Object.entries(volumeByMonth).map(
      ([name, volume]) => ({ name, volume })
    );
    // Convert volume totals to percentage of total volume across all types
    const totalVolumeForDistribution = Object.values(fuelDistributionVolume).reduce(
      (sum, v) => sum + v,
      0
    );
    const fuelTypeData = Object.entries(fuelDistributionVolume).map(
      ([name, value]) => ({
        name,
        value: totalVolumeForDistribution > 0 ? (value / totalVolumeForDistribution) * 100 : 0,
      })
    );

    // Return dashboard data
    return NextResponse.json({
      totalSales,
      volumeSold,
      averageDensity,
      transactions,
      salesChartData,
      volumeChartData,
      fuelTypeData,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
