"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart4,
  Droplets,
  TrendingUp,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NozzleData = {
  nozzle: string;
  sales: number;
  volume: number;
  pricePerLiter: number;
};

type NozzleComparisonData = {
  nozzle: string;
  currentSales: number;
  previousSales: number;
  salesDiff: number;
  salesPercentChange: number;
  currentVolume: number;
  previousVolume: number;
  volumeDiff: number;
  volumePercentChange: number;
};

type FuelDistributionData = {
  name: string;
  value: number;
};

type ComparisonData = {
  current: {
    date: string;
    totalSales: number;
    totalVolume: number;
    revenuePerLiter: number;
    nozzleData: NozzleData[];
    receiptId: string;
    pumpSerial: string;
  };
  previous: {
    date: string;
    totalSales: number;
    totalVolume: number;
    revenuePerLiter: number;
    nozzleData: NozzleData[];
    receiptId: string;
    pumpSerial: string;
  };
  difference: {
    sales: number;
    volume: number;
    salesPercentChange: number;
    volumePercentChange: number;
  };
};

// Type definitions for chart data
type TimeSeriesData = {
  date: string;
  sales: number;
  volume: number;
};

export default function DailyComparisonPage() {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasEnoughData, setHasEnoughData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/dashboard/daily-comparison");

        if (!response.ok) {
          throw new Error(
            `Failed to fetch comparison data: ${response.statusText}`
          );
        }

        const data = await response.json();
        
        if (data.hasEnoughData) {
          setComparisonData(data.comparison);
          setHasEnoughData(true);
        } else {
          setHasEnoughData(false);
        }
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );

        toast({
          title: "Error",
          description: "Failed to load comparison data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparisonData();
  }, [toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-2">
            Error Loading Data
          </h2>
          <p className="text-white mb-4">{error}</p>
          <p className="text-gray-400">
            Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!hasEnoughData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-amber-500 mb-2">
            Need More Receipts
          </h2>
          <p className="text-white mb-4">
            Upload at least two receipts to see comparison data.
          </p>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-amber-500 mb-2">
            No Data Available
          </h2>
          <p className="text-white mb-4">
            There was a problem processing your receipt data.
          </p>
        </div>
      </div>
    );
  }
  
  // Prepare nozzle comparison data
  const nozzleComparisonData: NozzleComparisonData[] = [];
  const combinedNozzles = new Set<string>();
  
  // Get all unique nozzles
  comparisonData.current.nozzleData.forEach(nozzle => combinedNozzles.add(nozzle.nozzle));
  comparisonData.previous.nozzleData.forEach(nozzle => combinedNozzles.add(nozzle.nozzle));
  
  // Create comparison data for each nozzle
  combinedNozzles.forEach(nozzleId => {
    const currentNozzle = comparisonData.current.nozzleData.find(n => n.nozzle === nozzleId);
    const previousNozzle = comparisonData.previous.nozzleData.find(n => n.nozzle === nozzleId);
    
    const currentSales = currentNozzle?.sales || 0;
    const previousSales = previousNozzle?.sales || 0;
    const currentVolume = currentNozzle?.volume || 0;
    const previousVolume = previousNozzle?.volume || 0;
    
    const salesDiff = currentSales - previousSales;
    const volumeDiff = currentVolume - previousVolume;
    
    const salesPercentChange = previousSales > 0 
      ? (salesDiff / previousSales) * 100 
      : 0;
    const volumePercentChange = previousVolume > 0 
      ? (volumeDiff / previousVolume) * 100 
      : 0;
    
    nozzleComparisonData.push({
      nozzle: nozzleId,
      currentSales,
      previousSales,
      salesDiff,
      salesPercentChange,
      currentVolume,
      previousVolume,
      volumeDiff,
      volumePercentChange
    });
  });
  
  // Prepare time series data (assuming current is more recent than previous)
  const timeSeriesData: TimeSeriesData[] = [
    {
      date: comparisonData.previous.date,
      sales: comparisonData.previous.totalSales,
      volume: comparisonData.previous.totalVolume
    },
    {
      date: comparisonData.current.date,
      sales: comparisonData.current.totalSales,
      volume: comparisonData.current.totalVolume
    }
  ];
  
  // Prepare fuel distribution data
  const currentDistribution: FuelDistributionData[] = [];
  const previousDistribution: FuelDistributionData[] = [];
  
  // Helper function to determine fuel type (simple version)
  const getFuelType = (nozzleId: string) => {
    const id = parseInt(nozzleId, 10);
    if (isNaN(id) || id === 0) return "Other";
    if (id === 1) return "Petrol";
    if (id === 2) return "Diesel";
    return "Premium";
  };
  
  // Create fuel type distribution
  combinedNozzles.forEach(nozzleId => {
    const fuelType = getFuelType(nozzleId);
    const currentNozzle = comparisonData.current.nozzleData.find(n => n.nozzle === nozzleId);
    const previousNozzle = comparisonData.previous.nozzleData.find(n => n.nozzle === nozzleId);
    
    currentDistribution.push({
      name: fuelType,
      value: currentNozzle?.volume || 0
    });
    
    previousDistribution.push({
      name: fuelType,
      value: previousNozzle?.volume || 0
    });
  });
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Daily Comparison</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Current Sales</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(comparisonData.current.totalSales)}
                </h3>
                <p className={`text-sm flex items-center mt-1 ${comparisonData.difference.sales >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {comparisonData.difference.sales >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {comparisonData.difference.sales >= 0 ? '+' : ''}{formatCurrency(comparisonData.difference.sales)} 
                  ({comparisonData.difference.salesPercentChange >= 0 ? '+' : ''}{comparisonData.difference.salesPercentChange.toFixed(1)}%)
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Current Volume</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {comparisonData.current.totalVolume.toLocaleString()} L
                </h3>
                <p className={`text-sm flex items-center mt-1 ${comparisonData.difference.volume >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {comparisonData.difference.volume >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {comparisonData.difference.volume >= 0 ? '+' : ''}{comparisonData.difference.volume.toLocaleString()} L
                  ({comparisonData.difference.volumePercentChange >= 0 ? '+' : ''}{comparisonData.difference.volumePercentChange.toFixed(1)}%)
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Droplets className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Current Price/L</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  ₹{comparisonData.current.revenuePerLiter.toFixed(2)}
                </h3>
                <p className={`text-sm flex items-center mt-1 ${comparisonData.current.revenuePerLiter >= comparisonData.previous.revenuePerLiter ? 'text-green-500' : 'text-red-500'}`}>
                  {comparisonData.current.revenuePerLiter >= comparisonData.previous.revenuePerLiter ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(comparisonData.current.revenuePerLiter - comparisonData.previous.revenuePerLiter).toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Comparison Dates</p>
                <h3 className="text-lg font-bold text-white mt-1">
                  {comparisonData.current.date}
                </h3>
                <p className="text-sm text-gray-400 mt-1">vs {comparisonData.previous.date}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="nozzles"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            Nozzle Analysis
          </TabsTrigger>
          <TabsTrigger
            value="distribution"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            Fuel Distribution
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Sales Comparison</CardTitle>
                <CardDescription className="text-gray-400">
                  Comparing sales between current and previous receipt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <BarChart
                    data={timeSeriesData}
                    index="date"
                    categories={["sales"]}
                    colors={["amber"]}
                    valueFormatter={(value: number) => formatCurrency(value)}
                    yAxisWidth={80}
                    className="text-gray-400"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Volume Comparison</CardTitle>
                <CardDescription className="text-gray-400">
                  Comparing volume between current and previous receipt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <BarChart
                    data={timeSeriesData}
                    index="date"
                    categories={["volume"]}
                    colors={["blue"]}
                    valueFormatter={(value: number) => `${value.toLocaleString()} L`}
                    yAxisWidth={80}
                    className="text-gray-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="nozzles" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Nozzle Performance Comparison</CardTitle>
              <CardDescription className="text-gray-400">
                Detailed analysis by nozzle between current and previous receipt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Nozzle</TableHead>
                      <TableHead className="text-gray-300">Current Sales</TableHead>
                      <TableHead className="text-gray-300">Previous Sales</TableHead>
                      <TableHead className="text-gray-300">Difference</TableHead>
                      <TableHead className="text-gray-300">Current Volume</TableHead>
                      <TableHead className="text-gray-300">Previous Volume</TableHead>
                      <TableHead className="text-gray-300">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nozzleComparisonData.map((nozzle, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell className="font-medium text-white">
                          Nozzle {nozzle.nozzle}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatCurrency(nozzle.currentSales)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatCurrency(nozzle.previousSales)}
                        </TableCell>
                        <TableCell className={nozzle.salesDiff >= 0 ? "text-green-500" : "text-red-500"}>
                          {nozzle.salesDiff >= 0 ? "+" : ""}{formatCurrency(nozzle.salesDiff)} 
                          ({nozzle.salesPercentChange >= 0 ? "+" : ""}{nozzle.salesPercentChange.toFixed(1)}%)
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {nozzle.currentVolume.toLocaleString()} L
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {nozzle.previousVolume.toLocaleString()} L
                        </TableCell>
                        <TableCell className={nozzle.volumeDiff >= 0 ? "text-green-500" : "text-red-500"}>
                          {nozzle.volumeDiff >= 0 ? "+" : ""}{nozzle.volumeDiff.toLocaleString()} L
                          ({nozzle.volumePercentChange >= 0 ? "+" : ""}{nozzle.volumePercentChange.toFixed(1)}%)
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Current Fuel Distribution</CardTitle>
                <CardDescription className="text-gray-400">
                  Distribution of fuel types in current receipt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <PieChart
                    data={currentDistribution}
                    index="name"
                    valueFormatter={(value: number) => `${value.toLocaleString()} L`}
                    category="value"
                    colors={["amber", "blue", "purple", "green"]}
                    className="text-gray-400"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Previous Fuel Distribution</CardTitle>
                <CardDescription className="text-gray-400">
                  Distribution of fuel types in previous receipt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <PieChart
                    data={previousDistribution}
                    index="name"
                    valueFormatter={(value: number) => `${value.toLocaleString()} L`}
                    category="value"
                    colors={["amber", "blue", "purple", "green"]}
                    className="text-gray-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 