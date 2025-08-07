"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Search } from "lucide-react";
import { Spinner } from "@/components/ui/ios-spinner";
import { WaitlistEntry, getWaitlistEntries, updateWaitlistEntry, deleteWaitlistEntry } from "./api";

export function WaitlistTable() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WaitlistEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<WaitlistEntry | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchWaitlistEntries = async () => {
    setLoading(true);
    try {
      const data = await getWaitlistEntries();
      console.log('Waitlist API response:', data);
      
      // Set entries from API response
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        console.error('Unexpected API response format:', data);
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching waitlist entries:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch waitlist entries',
        variant: "destructive",
      });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlistEntries();
  }, []);

  // Add search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEntries(entries);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = entries.filter(entry => 
        entry.email.toLowerCase().includes(query) ||
        (entry.name && entry.name.toLowerCase().includes(query)) ||
        entry.status.toLowerCase().includes(query)
      );
      setFilteredEntries(filtered);
    }
  }, [searchQuery, entries]);

  const handleEdit = (entry: WaitlistEntry) => {
    setCurrentEntry(entry);
    setEditStatus(entry.status);
    setEditNotes(entry.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentEntry) return;
    
    setIsUpdating(true);
    try {
      // Use the API module function
      await updateWaitlistEntry(currentEntry.id, {
        status: editStatus,
        notes: editNotes,
      });
      
      toast({
        title: "Success",
        description: "Waitlist entry updated successfully",
      });
      setIsEditDialogOpen(false);
      
      // Refresh the waitlist entries
      fetchWaitlistEntries();
    } catch (error) {
      console.error('Error updating waitlist entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update waitlist entry',
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setDeleteId(id);
    
    try {
      // Use the API module function
      await deleteWaitlistEntry(id);
      
      toast({
        title: "Success", 
        description: "Waitlist entry deleted successfully",
      });
      
      // Refresh the waitlist entries
      fetchWaitlistEntries();
    } catch (error) {
      console.error('Error deleting waitlist entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete waitlist entry',
        variant: "destructive", 
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          onClick={fetchWaitlistEntries}
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Loading...
            </>
          ) : (
            "Refresh"
          )}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="md" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted">
          <p className="text-muted-foreground">No waitlist entries found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.email}</TableCell>
                  <TableCell>{entry.name || 'N/A'}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      entry.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : entry.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(entry.created_at)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.notes || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isDeleting && deleteId === entry.id}
                      >
                        {isDeleting && deleteId === entry.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Waitlist Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status
              </label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[100px]"
                placeholder="Add any notes about this entry..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                "Update Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
