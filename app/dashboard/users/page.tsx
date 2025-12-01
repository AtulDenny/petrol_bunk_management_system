"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Trash2, PencilLine, BarChart as BarChartIcon, Users, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  password?: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Data for charts
  const [userChartData, setUserChartData] = useState<{
    usersByMonth: Array<{ month: string; count: number }>;
    userDomains: Array<{ domain: string; count: number }>;
    usersByDay: Array<{ day: string; count: number }>;
  }>({
    usersByMonth: [],
    userDomains: [],
    usersByDay: []
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Prepare chart data when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      prepareChartData();
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const prepareChartData = () => {
    // Count users by month
    const usersByMonth: Record<string, number> = {};
    const usersByDay: Record<string, number> = {};
    const domains: Record<string, number> = {};
    
    users.forEach(user => {
      // Process creation date for monthly data
      const creationDate = new Date(user.createdAt);
      const month = creationDate.toLocaleString('default', { month: 'short' });
      const year = creationDate.getFullYear();
      const monthYear = `${month} ${year}`;
      
      if (!usersByMonth[monthYear]) {
        usersByMonth[monthYear] = 0;
      }
      usersByMonth[monthYear]++;
      
      // Process creation date for daily data
      const day = creationDate.toISOString().split('T')[0];
      if (!usersByDay[day]) {
        usersByDay[day] = 0;
      }
      usersByDay[day]++;
      
      // Extract email domains
      if (user.email) {
        const domain = user.email.split('@')[1];
        if (domain) {
          if (!domains[domain]) {
            domains[domain] = 0;
          }
          domains[domain]++;
        }
      }
    });
    
    // Convert to array format for charts
    const usersByMonthData = Object.entries(usersByMonth)
      .map(([month, count]) => ({ 
        month, 
        count
      }))
      .sort((a, b) => {
        // Sort by year and month
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        
        if (aYear !== bYear) {
          return parseInt(aYear) - parseInt(bYear);
        }
        
        // Convert month names to numbers for sorting
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
    
    const usersByDayData = Object.entries(usersByDay)
      .map(([day, count]) => ({ 
        day, 
        count 
      }))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      // Limit to last 14 days for better visualization
      .slice(-14);
    
    const domainData = Object.entries(domains)
      .map(([domain, count]) => ({ 
        domain, 
        count 
      }))
      .sort((a, b) => Number(b.count) - Number(a.count))
      // Limit to top 5 domains for better visualization
      .slice(0, 5);
    
    setUserChartData({
      usersByMonth: usersByMonthData,
      userDomains: domainData,
      usersByDay: usersByDayData
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editUser) {
      setEditUser({ ...editUser, [name]: value });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add user");
      }
      
      await fetchUsers(); // Refresh the user list
      
      // Reset form and close dialog
      setNewUser({ name: "", email: "", password: "" });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "User added successfully",
      });
    } catch (err) {
      console.error("Error adding user:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUser) return;
    
    // Basic validation
    if (!editUser.name || !editUser.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const updateData: any = {
        name: editUser.name,
        email: editUser.email,
      };
      
      // Only include password if it was provided (not empty)
      if (editUser.hasOwnProperty('password') && editUser.password) {
        updateData.password = editUser.password;
      }
      
      const response = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      
      await fetchUsers(); // Refresh the user list
      
      // Reset form and close dialog
      setEditUser(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    } catch (err) {
      console.error("Error updating user:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/users/${userToDelete}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      
      // Remove the user from our local state
      setUsers(prev => prev.filter(user => user.id !== userToDelete));
      
      // Close dialog and reset state
      setIsConfirmDeleteOpen(false);
      setUserToDelete(null);
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditUser({ ...user, password: "" });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        
        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new user account.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter user's full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter user's email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter a secure password"
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 w-full"
                >
                  Add User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update user information.
              </DialogDescription>
            </DialogHeader>
            
            {editUser && (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-white">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={editUser.name}
                    onChange={handleEditInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter user's full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-white">Email</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={editUser.email}
                    onChange={handleEditInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter user's email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-password" className="text-white">
                    Password (leave blank to keep current)
                  </Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    value={editUser.password || ""}
                    onChange={handleEditInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter new password"
                  />
                </div>
                
                <DialogFooter>
                  <Button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 w-full"
                  >
                    Update User
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent className="bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
            <p className="text-white text-lg">Loading users...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-2">
              Error Loading Users
            </h2>
            <p className="text-white mb-4">{error}</p>
            <Button
              onClick={fetchUsers}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Users</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{users.length}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Latest User</p>
                    <h3 className="text-xl font-bold text-white mt-1">
                      {users.length > 0 ? users[0].name : "None"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {users.length > 0 ? new Date(users[0].createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Email Domains</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {new Set(users.map(user => user.email.split('@')[1])).size}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Data Visualization Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="usergrowth"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
              >
                User Growth
              </TabsTrigger>
              <TabsTrigger
                value="domains"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
              >
                Email Domains
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Monthly User Registration</CardTitle>
                    <CardDescription className="text-gray-400">
                      Number of users registered by month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {userChartData.usersByMonth.length > 0 ? (
                        <BarChart
                          data={userChartData.usersByMonth}
                          index="month"
                          categories={["count"]}
                          colors={["amber"]}
                          valueFormatter={(value: number) => `${value} users`}
                          yAxisWidth={60}
                          className="text-gray-400"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          No data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Daily User Registration</CardTitle>
                    <CardDescription className="text-gray-400">
                      Number of users registered per day (last 14 days)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {userChartData.usersByDay.length > 0 ? (
                        <LineChart
                          data={userChartData.usersByDay}
                          index="day"
                          categories={["count"]}
                          colors={["blue"]}
                          valueFormatter={(value: number) => `${value} users`}
                          yAxisWidth={60}
                          className="text-gray-400"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          No data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="usergrowth" className="mt-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">User Growth Trend</CardTitle>
                  <CardDescription className="text-gray-400">
                    Cumulative user count over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    {userChartData.usersByDay.length > 0 ? (
                      <LineChart
                        data={
                          // Transform data to show cumulative growth
                          userChartData.usersByMonth.map((item, index, arr) => {
                            let cumulative = 0;
                            for (let i = 0; i <= index; i++) {
                              cumulative += arr[i].count;
                            }
                            return {
                              month: item.month,
                              cumulative
                            };
                          })
                        }
                        index="month"
                        categories={["cumulative"]}
                        colors={["green"]}
                        valueFormatter={(value: number) => `${value} users`}
                        yAxisWidth={60}
                        className="text-gray-400"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="domains" className="mt-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Email Domain Distribution</CardTitle>
                  <CardDescription className="text-gray-400">
                    Distribution of users by email domain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    {userChartData.userDomains.length > 0 ? (
                      <PieChart
                        data={userChartData.userDomains}
                        category="count"
                        index="domain"
                        colors={["amber", "blue", "green", "purple", "cyan"]}
                        valueFormatter={(value: number) => `${value} users`}
                        className="text-gray-400"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Users Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Users</CardTitle>
              <CardDescription className="text-gray-400">
                Manage users who have access to the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 w-1/3">Name</TableHead>
                      <TableHead className="text-gray-300 w-1/3">Email</TableHead>
                      <TableHead className="text-gray-300 w-1/4">Created</TableHead>
                      <TableHead className="text-gray-300 w-1/6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow className="border-gray-700">
                        <TableCell
                          colSpan={4}
                          className="text-center py-10 text-gray-400"
                        >
                          No users found. Add a new user to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} className="border-gray-700">
                          <TableCell className="font-medium text-white">
                            {user.name}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                                title="Edit user"
                                onClick={() => handleEditUser(user)}
                              >
                                <PencilLine className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-gray-700"
                                title="Delete user"
                                onClick={() => confirmDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 